using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EduFlow.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace EduFlow.Application.Auth;

public sealed class JwtOptions
{
    public string Issuer   { get; init; } = default!;
    public string Audience { get; init; } = default!;
    public string Key      { get; init; } = default!;          // 32+ bytes recommended
    public int    AccessTokenMinutes { get; init; } = 60;
}

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) Create(User user);
}

public sealed class JwtTokenService(JwtOptions opts) : IJwtTokenService
{
    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var keyBytes = Encoding.UTF8.GetBytes(opts.Key);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException("JWT signing key must be at least 32 bytes (256 bits).");

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(keyBytes),
            SecurityAlgorithms.HmacSha256
        );

        var expiresAt = DateTime.UtcNow.AddMinutes(opts.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString("N")),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(ClaimTypes.Role, user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             opts.Issuer,
            audience:           opts.Audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
