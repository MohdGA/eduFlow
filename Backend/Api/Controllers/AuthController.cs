using EduFlow.Application.Auth;
using EduFlow.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>Register a new student account.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiError),     StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiError),     StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid registration payload."));

        var result = await auth.RegisterAsync(req, ct);
        if (result is null)
            // Generic message — do not confirm whether the email is taken.
            return Conflict(new ApiError("REGISTRATION_FAILED", "Could not create account with the provided details."));

        return CreatedAtAction(nameof(Register), result);
    }

    /// <summary>Request a password reset token. Always returns 200 to avoid email enumeration.</summary>
    [HttpPost("forgot")]
    [ProducesResponseType(typeof(ForgotPasswordResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Forgot([FromBody] ForgotPasswordRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid email."));

        var result = await auth.RequestPasswordResetAsync(req.Email, ct);
        // Generic message regardless of whether the email exists — prevents enumeration.
        // The raw token is only returned in this demo build; production would email it.
        return Ok(new ForgotPasswordResponse(
            "If an account exists for that email, a reset link has been generated.",
            result?.Token));
    }

    /// <summary>Reset password using a token from the forgot endpoint.</summary>
    [HttpPost("reset")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Reset([FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid reset payload."));

        var ok = await auth.ResetPasswordAsync(req.Token, req.NewPassword, ct);
        if (!ok) return BadRequest(new ApiError("INVALID_TOKEN", "Reset link is invalid or expired."));
        return NoContent();
    }

    /// <summary>Demo OAuth — creates a real account and returns a JWT.</summary>
    [HttpPost("oauth/demo")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> OAuthDemo([FromBody] OAuthDemoRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Provider required."));
        var result = await auth.OAuthDemoAsync(req.Provider, ct);
        return Ok(result);
    }

    /// <summary>Log in with email + password. Returns short-lived JWT.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiError),     StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid login payload."));

        var result = await auth.LoginAsync(req, ct);
        if (result is null)
            // Generic invalid-credentials message — same response whether email exists or password is wrong.
            return Unauthorized(new ApiError("INVALID_CREDENTIALS", "Email or password is incorrect."));

        return Ok(result);
    }
}
