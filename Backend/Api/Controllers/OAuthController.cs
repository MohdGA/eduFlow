using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using EduFlow.Application.Auth;
using EduFlow.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Real OAuth 2.0 authorization-code flow for Google and GitHub.
///
/// Flow:
///   1. Browser hits   GET /api/oauth/{provider}/start       (302 to provider's auth URL)
///   2. Provider sends GET /api/oauth/{provider}/callback?code=...
///   3. We exchange code → access token → user profile, then create-or-link
///      a local account and issue our own JWT, then 302 to the SPA with
///      ?token=&lt;JWT&gt; in the URL.
///
/// Required configuration in appsettings.json (or environment variables):
///   "OAuth": {
///     "Google": { "ClientId": "...", "ClientSecret": "..." },
///     "GitHub": { "ClientId": "...", "ClientSecret": "..." },
///     "FrontendUrl": "http://localhost:4200",
///     "RedirectPath": "/oauth/callback"
///   }
/// </summary>
[ApiController]
[Route("api/oauth")]
public sealed class OAuthController(
    IAuthService auth,
    IHttpClientFactory httpFactory,
    IConfiguration cfg,
    ILogger<OAuthController> log) : ControllerBase
{
    private string FrontendUrl  => cfg["OAuth:FrontendUrl"]  ?? "http://localhost:4200";
    private string RedirectPath => cfg["OAuth:RedirectPath"] ?? "/oauth/callback";
    private string CallbackUrl(string provider) =>
        $"{Request.Scheme}://{Request.Host}/api/oauth/{provider}/callback";

    // ── 1. Start: redirect the browser to the provider's authorization page ──

    [HttpGet("google/start")]
    public IActionResult GoogleStart()
    {
        var clientId = cfg["OAuth:Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return RedirectToFrontendError("not_configured");

        var url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?response_type=code"
                + $"&client_id={Uri.EscapeDataString(clientId)}"
                + $"&redirect_uri={Uri.EscapeDataString(CallbackUrl("google"))}"
                + "&scope=" + Uri.EscapeDataString("openid email profile")
                + "&access_type=online"
                + "&prompt=select_account";
        return Redirect(url);
    }

    [HttpGet("github/start")]
    public IActionResult GitHubStart()
    {
        var clientId = cfg["OAuth:GitHub:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            return RedirectToFrontendError("not_configured");

        var url = "https://github.com/login/oauth/authorize"
                + $"?client_id={Uri.EscapeDataString(clientId)}"
                + $"&redirect_uri={Uri.EscapeDataString(CallbackUrl("github"))}"
                + "&scope=" + Uri.EscapeDataString("read:user user:email");
        return Redirect(url);
    }

    // ── 2. Callback: exchange code → token → profile → JWT → redirect to SPA ──

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? error, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(error)) return RedirectToFrontendError(error);
        if (string.IsNullOrEmpty(code))   return RedirectToFrontendError("missing_code");

        var clientId     = cfg["OAuth:Google:ClientId"]     ?? "";
        var clientSecret = cfg["OAuth:Google:ClientSecret"] ?? "";
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            return RedirectToFrontendError("not_configured");

        try
        {
            var http = httpFactory.CreateClient();

            // 2a — exchange code for access token
            var tokenForm = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string,string>("code", code),
                new KeyValuePair<string,string>("client_id", clientId),
                new KeyValuePair<string,string>("client_secret", clientSecret),
                new KeyValuePair<string,string>("redirect_uri", CallbackUrl("google")),
                new KeyValuePair<string,string>("grant_type", "authorization_code"),
            });
            using var tokenResp = await http.PostAsync("https://oauth2.googleapis.com/token", tokenForm, ct);
            if (!tokenResp.IsSuccessStatusCode) return RedirectToFrontendError("token_exchange_failed");
            using var tokenDoc = JsonDocument.Parse(await tokenResp.Content.ReadAsStringAsync(ct));
            var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();
            if (string.IsNullOrEmpty(accessToken)) return RedirectToFrontendError("no_access_token");

            // 2b — fetch user profile
            using var profileReq = new HttpRequestMessage(HttpMethod.Get, "https://openidconnect.googleapis.com/v1/userinfo");
            profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var profileResp = await http.SendAsync(profileReq, ct);
            if (!profileResp.IsSuccessStatusCode) return RedirectToFrontendError("profile_failed");
            using var profileDoc = JsonDocument.Parse(await profileResp.Content.ReadAsStringAsync(ct));
            var p = profileDoc.RootElement;
            var sub        = p.GetProperty("sub").GetString() ?? "";
            var email      = p.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";
            var given      = p.TryGetProperty("given_name", out var g) ? g.GetString() ?? "" : "";
            var family     = p.TryGetProperty("family_name", out var f) ? f.GetString() ?? "" : "";

            var resp = await auth.OAuthSignInOrLinkAsync("Google", sub, email, given, family, ct);
            return RedirectToFrontendSuccess(resp);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Google OAuth callback failed");
            return RedirectToFrontendError("internal_error");
        }
    }

    [HttpGet("github/callback")]
    public async Task<IActionResult> GitHubCallback([FromQuery] string? code, [FromQuery] string? error, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(error)) return RedirectToFrontendError(error);
        if (string.IsNullOrEmpty(code))   return RedirectToFrontendError("missing_code");

        var clientId     = cfg["OAuth:GitHub:ClientId"]     ?? "";
        var clientSecret = cfg["OAuth:GitHub:ClientSecret"] ?? "";
        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            return RedirectToFrontendError("not_configured");

        try
        {
            var http = httpFactory.CreateClient();

            // 2a — exchange code for access token
            using var tokenReq = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
            {
                Content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string,string>("code", code),
                    new KeyValuePair<string,string>("client_id", clientId),
                    new KeyValuePair<string,string>("client_secret", clientSecret),
                    new KeyValuePair<string,string>("redirect_uri", CallbackUrl("github")),
                }),
            };
            tokenReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            using var tokenResp = await http.SendAsync(tokenReq, ct);
            if (!tokenResp.IsSuccessStatusCode) return RedirectToFrontendError("token_exchange_failed");
            using var tokenDoc = JsonDocument.Parse(await tokenResp.Content.ReadAsStringAsync(ct));
            var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();
            if (string.IsNullOrEmpty(accessToken)) return RedirectToFrontendError("no_access_token");

            // 2b — fetch user profile
            using var profileReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
            profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            profileReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("EduFlow", "1.0"));
            profileReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            using var profileResp = await http.SendAsync(profileReq, ct);
            if (!profileResp.IsSuccessStatusCode) return RedirectToFrontendError("profile_failed");
            using var profileDoc = JsonDocument.Parse(await profileResp.Content.ReadAsStringAsync(ct));
            var p = profileDoc.RootElement;
            var id    = p.GetProperty("id").GetRawText();
            var name  = p.TryGetProperty("name",  out var n) ? n.GetString() ?? "" : "";
            var login = p.TryGetProperty("login", out var l) ? l.GetString() ?? "" : "";
            var email = p.TryGetProperty("email", out var e) ? e.GetString() ?? "" : "";

            // GitHub may hide the primary email — fetch it explicitly.
            if (string.IsNullOrEmpty(email))
            {
                using var emailReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
                emailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                emailReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("EduFlow", "1.0"));
                emailReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                using var emailResp = await http.SendAsync(emailReq, ct);
                if (emailResp.IsSuccessStatusCode)
                {
                    using var emailDoc = JsonDocument.Parse(await emailResp.Content.ReadAsStringAsync(ct));
                    foreach (var entry in emailDoc.RootElement.EnumerateArray())
                    {
                        if (entry.TryGetProperty("primary", out var pr) && pr.GetBoolean()
                            && entry.TryGetProperty("email", out var em))
                        {
                            email = em.GetString() ?? "";
                            break;
                        }
                    }
                }
            }
            if (string.IsNullOrEmpty(email))
                email = $"{login}+github@users.noreply.github.com"; // last-resort placeholder

            // Split "name" into first/last for our schema
            var parts = (name ?? "").Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var first = parts.Length > 0 ? parts[0] : (string.IsNullOrEmpty(login) ? "GitHub" : login);
            var last  = parts.Length > 1 ? parts[1] : "User";

            var resp = await auth.OAuthSignInOrLinkAsync("GitHub", id, email, first, last, ct);
            return RedirectToFrontendSuccess(resp);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "GitHub OAuth callback failed");
            return RedirectToFrontendError("internal_error");
        }
    }

    // ── 3. Redirect back to the SPA with token or error in the query string ──

    private IActionResult RedirectToFrontendSuccess(AuthResponse r)
    {
        // The frontend's /oauth/callback page parses these and stores the JWT.
        var qs = new StringBuilder();
        qs.Append("?token=").Append(Uri.EscapeDataString(r.AccessToken));
        qs.Append("&exp=").Append(Uri.EscapeDataString(r.ExpiresAt.ToString("O")));
        qs.Append("&uid=").Append(Uri.EscapeDataString(r.User.Id.ToString()));
        qs.Append("&email=").Append(Uri.EscapeDataString(r.User.Email));
        qs.Append("&fn=").Append(Uri.EscapeDataString(r.User.FirstName));
        qs.Append("&ln=").Append(Uri.EscapeDataString(r.User.LastName));
        qs.Append("&role=").Append(Uri.EscapeDataString(r.User.Role));
        return Redirect($"{FrontendUrl}{RedirectPath}{qs}");
    }

    private IActionResult RedirectToFrontendError(string code) =>
        Redirect($"{FrontendUrl}{RedirectPath}?error={Uri.EscapeDataString(code)}");
}
