using System.Net;
using System.Text.Json;
using EduFlow.Application.Dtos;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Middleware;

/// <summary>
/// Catches unhandled exceptions, logs them, returns a generic error to the client.
/// Never leaks stack traces or internal details outside Development.
/// </summary>
public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> log,
    IHostEnvironment env)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task Invoke(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Unhandled exception on {Path}", ctx.Request.Path);

            if (ctx.Response.HasStarted) throw;

            ctx.Response.Clear();
            ctx.Response.ContentType = "application/json";

            // Translate "stale JWT references a deleted user" (FK violation on save) into a 401
            // so the client knows to log out instead of seeing a cryptic 500.
            if (ex is DbUpdateException due &&
                due.InnerException is SqliteException { SqliteErrorCode: 19 })
            {
                ctx.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                var stale = new ApiError("SESSION_INVALID",
                    "Your session references data that no longer exists. Please log in again.");
                await ctx.Response.WriteAsync(JsonSerializer.Serialize(stale, Json));
                return;
            }

            ctx.Response.StatusCode  = (int)HttpStatusCode.InternalServerError;
            var body = env.IsDevelopment()
                ? new ApiError("SERVER_ERROR", ex.Message)
                : new ApiError("SERVER_ERROR", "An unexpected error occurred.");

            await ctx.Response.WriteAsync(JsonSerializer.Serialize(body, Json));
        }
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app) =>
        app.UseMiddleware<ExceptionHandlingMiddleware>();
}
