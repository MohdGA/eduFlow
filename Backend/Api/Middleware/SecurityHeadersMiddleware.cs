namespace EduFlow.Api.Middleware;

/// <summary>
/// Applies common security headers to every response.
/// CSP is intentionally strict — adjust connect-src/img-src for your CDN if needed.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext ctx)
    {
        var h = ctx.Response.Headers;

        h["X-Content-Type-Options"] = "nosniff";
        h["X-Frame-Options"]        = "DENY";
        h["Referrer-Policy"]        = "no-referrer";
        h["Permissions-Policy"]     = "camera=(), microphone=(), geolocation=()";
        h["Cross-Origin-Opener-Policy"]   = "same-origin";
        h["Cross-Origin-Resource-Policy"] = "same-origin";

        // Only for HTTPS in production. Set the header here unconditionally — UseHsts handles the rest.
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

        // For API responses, a tight CSP is fine. Adjust if you serve HTML directly.
        h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";

        await next(ctx);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.UseMiddleware<SecurityHeadersMiddleware>();
}
