using System.ComponentModel.DataAnnotations;

namespace EduFlow.Domain.Entities;

public sealed class PasswordResetToken
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Required, MaxLength(64)]
    public string TokenHash { get; set; } = default!;   // SHA-256 hex of the raw token

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? UsedAt { get; set; }
}
