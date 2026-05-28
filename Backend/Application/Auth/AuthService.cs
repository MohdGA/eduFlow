using System.Security.Cryptography;
using System.Text;
using EduFlow.Application.Dtos;
using EduFlow.Domain.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest req, CancellationToken ct);
    Task<AuthResponse?> LoginAsync(LoginRequest req, CancellationToken ct);
    Task<(string Token, DateTime ExpiresAt)?> RequestPasswordResetAsync(string email, CancellationToken ct);
    Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken ct);
    Task<AuthResponse> OAuthDemoAsync(string provider, CancellationToken ct);
    Task<AuthResponse> OAuthSignInOrLinkAsync(string provider, string externalId, string email, string firstName, string lastName, CancellationToken ct);
}

public sealed class AuthService(
    AppDbContext        db,
    IJwtTokenService    jwt,
    ILogger<AuthService> log
) : IAuthService
{
    // BCrypt work-factor 12 — strong default. Tune up over time on faster hardware.
    private const int BCryptWorkFactor = 12;

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        // Important: check duplicates but DO NOT reveal whether the email exists.
        // Caller returns a generic error on duplicate.
        var exists = await db.Users.AsNoTracking().AnyAsync(u => u.Email == normalizedEmail, ct);
        if (exists) return null;

        // Only Student and Instructor may self-register; anything else defaults to Student.
        var role = req.Role?.Trim() == "Instructor" ? UserRole.Instructor : UserRole.Student;

        var user = new User
        {
            FirstName    = req.FirstName.Trim(),
            LastName     = req.LastName.Trim(),
            Email        = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, BCryptWorkFactor),
            Role         = role,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        log.LogInformation("User registered: {UserId}", user.Id);

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

        // Use constant-time pattern: still hash a dummy if user not found, to avoid timing leaks.
        if (user is null)
        {
            BCrypt.Net.BCrypt.Verify(req.Password, "$2a$12$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUVWX");
            return null;
        }

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        log.LogInformation("User login: {UserId}", user.Id);

        return BuildAuthResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var (token, expiresAt) = jwt.Create(user);
        var dto = new UserDto(user.Id, user.FirstName, user.LastName, user.Email, user.Role.ToString());
        return new AuthResponse(token, expiresAt, dto);
    }

    // ────────────────────────────────────────────────
    //  PASSWORD RESET
    // ────────────────────────────────────────────────
    public async Task<(string Token, DateTime ExpiresAt)?> RequestPasswordResetAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalized, ct);
        if (user is null) return null;       // caller returns generic message either way

        // Generate a random 32-byte URL-safe token; store only its SHA-256 hash.
        var raw = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var hash = ComputeSha256(raw);

        // Invalidate previous unused tokens for this user
        var existing = await db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var t in existing) t.UsedAt = now;

        var expiresAt = now.AddHours(1);
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id, TokenHash = hash, ExpiresAt = expiresAt,
        });
        await db.SaveChangesAsync(ct);

        log.LogInformation("Password reset requested for {UserId}", user.Id);
        return (raw, expiresAt);
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken ct)
    {
        var hash = ComputeSha256(token);
        var record = await db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (record is null || record.UsedAt is not null || record.ExpiresAt <= DateTime.UtcNow)
            return false;

        if (record.User is null) return false;

        record.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, BCryptWorkFactor);
        record.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        log.LogInformation("Password reset completed for {UserId}", record.UserId);
        return true;
    }

    private static string ComputeSha256(string s)
    {
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(s))).ToLowerInvariant();
    }

    // ────────────────────────────────────────────────
    //  OAUTH DEMO
    //  Real OAuth needs provider apps + client secrets.
    //  This creates a real account using a deterministic-but-unique
    //  demo identity per browser session, then logs in.
    // ────────────────────────────────────────────────
    public async Task<AuthResponse> OAuthDemoAsync(string provider, CancellationToken ct)
    {
        provider = provider == "GitHub" ? "GitHub" : "Google";   // sanitize
        var slug = Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant();
        var first = provider == "GitHub" ? "Octo" : "Goog";
        var last  = $"User-{slug.ToUpper()}";
        var email = $"{provider.ToLowerInvariant()}.{slug}@demo.eduflow.com";
        var password = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18));

        var user = new User
        {
            FirstName = first, LastName = last, Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, BCryptWorkFactor),
            Role = UserRole.Student,
            AvatarSeed = first[..1],
        };
        db.Users.Add(user);
        db.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id, Action = "OAUTH_SIGNIN", Resource = "Auth",
            Detail = $"Signed in via {provider} (demo)",
        });
        await db.SaveChangesAsync(ct);

        log.LogInformation("OAuth demo sign-in via {Provider} → user {UserId}", provider, user.Id);
        return BuildAuthResponse(user);
    }

    // ────────────────────────────────────────────────
    //  REAL OAuth — called after the OAuth controller has exchanged the
    //  authorization code for an access token and fetched the user's profile
    //  from Google or GitHub.  Links by email if an account already exists;
    //  otherwise creates a new Student account with no usable password.
    // ────────────────────────────────────────────────
    public async Task<AuthResponse> OAuthSignInOrLinkAsync(
        string provider, string externalId, string email,
        string firstName, string lastName, CancellationToken ct)
    {
        var normalized = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized))
            throw new InvalidOperationException("OAuth profile did not return an email address.");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalized, ct);
        if (user is null)
        {
            // First sign-in via OAuth → create the account. Random password the user can't use;
            // they'll log in via OAuth going forward or reset their password.
            var randomPw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            user = new User
            {
                Email = normalized,
                FirstName = string.IsNullOrWhiteSpace(firstName) ? "User" : firstName.Trim(),
                LastName  = string.IsNullOrWhiteSpace(lastName)  ? "Account" : lastName.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(randomPw, BCryptWorkFactor),
                Role = UserRole.Student,
                AvatarSeed = (firstName?.Length > 0 ? firstName[..1] : "U"),
                IsActive = true,
            };
            db.Users.Add(user);
            db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id, Action = "OAUTH_REGISTER", Resource = "Auth",
                Detail = $"Account created via {provider} (external id: {externalId})",
            });
        }
        else
        {
            db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id, Action = "OAUTH_SIGNIN", Resource = "Auth",
                Detail = $"Signed in via {provider} (external id: {externalId})",
            });
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("OAuth sign-in via {Provider} → user {UserId} ({Email})", provider, user.Id, user.Email);
        return BuildAuthResponse(user);
    }
}
