using System.Text;
using System.Threading.RateLimiting;
using EduFlow.Api.Middleware;
using EduFlow.Application.Auth;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Render / Railway / Fly / Heroku-style hosts inject a $PORT env var that the
// app must listen on. Honour it if present; otherwise fall back to
// ASPNETCORE_URLS or 5180. Bind on 0.0.0.0 (IPv4 all-interfaces) explicitly —
// "+" or "::" can resolve to IPv6-only on some container runtimes, which
// makes Render's internal IPv4 health-check probe fail with "connection
// refused" and the deploy times out even though the app is running.
var portEnv = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(portEnv))
    builder.WebHost.UseUrls($"http://0.0.0.0:{portEnv}");

// Allow large video uploads (up to 500 MB).
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 500L * 1024 * 1024);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 500L * 1024 * 1024;
    o.ValueLengthLimit = int.MaxValue;
});

// ── Configuration ───────────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtOptions = new JwtOptions
{
    Issuer             = jwtSection["Issuer"]   ?? throw new InvalidOperationException("Jwt:Issuer missing"),
    Audience           = jwtSection["Audience"] ?? throw new InvalidOperationException("Jwt:Audience missing"),
    Key                = jwtSection["Key"]      ?? throw new InvalidOperationException("Jwt:Key missing"),
    AccessTokenMinutes = jwtSection.GetValue<int?>("AccessTokenMinutes") ?? 60,
};
if (Encoding.UTF8.GetByteCount(jwtOptions.Key) < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 bytes. Generate with: openssl rand -base64 32");

// ── Services ────────────────────────────────────────────────────────────────
builder.Services.AddHttpClient();

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        // Accept and emit enums as strings — matches what the Angular client sends/expects.
        o.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// DB
var connStr = builder.Configuration.GetConnectionString("Default") ?? "Data Source=eduflow.db";
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(connStr));

// Auth
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken            = false; // do not persist token in auth properties
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtOptions.Issuer,
            ValidAudience            = jwtOptions.Audience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew                = TimeSpan.FromSeconds(30),
        };

        // After the JWT signature validates, also confirm the user it identifies
        // still exists. Prevents 500s on save when the DB has been re-seeded and
        // the client still holds an old token — we return a clean 401 instead.
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var sub = ctx.Principal?.FindFirst("sub")?.Value
                       ?? ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParseExact(sub, "N", out var userId))
                {
                    ctx.Fail("Invalid subject claim");
                    return;
                }
                var db = ctx.HttpContext.RequestServices.GetRequiredService<EduFlow.Infrastructure.Data.AppDbContext>();
                var exists = await db.Users.AsNoTracking()
                    .AnyAsync(u => u.Id == userId && u.IsActive, ctx.HttpContext.RequestAborted);
                if (!exists)
                    ctx.Fail("User no longer exists or is inactive");
            },
        };
    });

builder.Services.AddAuthorization();

// CORS — restrict to the Angular dev origin. Tighten further in production.
const string CorsPolicy = "EduFlowFrontend";
builder.Services.AddCors(opts =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                         ?? ["http://localhost:4300"];
    opts.AddPolicy(CorsPolicy, p => p
        .WithOrigins(allowedOrigins)
        .AllowCredentials()
        .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .WithHeaders("Authorization", "Content-Type"));
});

// Rate limiting — basic per-IP fixed window.
builder.Services.AddRateLimiter(opts =>
{
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opts.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory:      _ => new FixedWindowRateLimiterOptions
            {
                Window          = TimeSpan.FromMinutes(1),
                PermitLimit     = 120,
                QueueLimit      = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust all upstream proxies (Render / Railway / Fly manage the network layer).
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Pipeline ────────────────────────────────────────────────────────────────
var app = builder.Build();

// Create the DB schema synchronously BEFORE binding the port. Otherwise the
// platform's health check (e.g. Render hitting /api/Courses) can fire while
// the Courses table is still being created in the background → 500 errors →
// deploy marked unhealthy. Schema creation is fast (~ms) and idempotent.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
}

// Data seeding (users, audit rows) runs AFTER the host starts so we don't
// delay port binding. Brief delay lets the platform's first few health-check
// probes hit a CPU-idle container before BCrypt work begins. Idempotent: if
// users already exist, returns early.
app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5));
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var lf = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
            await EduFlow.Infrastructure.Data.DbSeeder.SeedAsync(db, lf.CreateLogger("EduFlow.Seed"));
        }
        catch (Exception ex)
        {
            app.Services.GetRequiredService<ILoggerFactory>()
               .CreateLogger("EduFlow.Seed")
               .LogError(ex, "Background seed failed");
        }
    });
});

app.UseForwardedHeaders();
app.UseGlobalExceptionHandler();
app.UseSecurityHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

// ── Static media (lesson videos, course thumbnails) ─────────────────────
// In production this mounts a Render persistent disk so uploads survive
// deploys. Locally it falls back to wwwroot/media inside the project.
var mediaRoot = builder.Configuration["Storage:MediaRoot"]
                ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot", "media");
Directory.CreateDirectory(mediaRoot);
Directory.CreateDirectory(Path.Combine(mediaRoot, "lessons"));
Directory.CreateDirectory(Path.Combine(mediaRoot, "courses"));

// The Cross-Origin-Resource-Policy header is required so the SPA on a
// different origin can load <video src> / <img src> without being blocked
// by Chrome's ERR_BLOCKED_BY_RESPONSE.NotSameOrigin.
app.UseStaticFiles(new Microsoft.AspNetCore.Builder.StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(mediaRoot),
    RequestPath  = "/media",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
        ctx.Context.Response.Headers["Access-Control-Allow-Origin"]  = "*";
        // Cache uploaded media for an hour (private CDN can override later).
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=3600";
    },
});

app.UseRouting();
app.UseCors(CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
