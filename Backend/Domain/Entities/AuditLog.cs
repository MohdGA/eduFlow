using System.ComponentModel.DataAnnotations;

namespace EduFlow.Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    [Required, MaxLength(80)]
    public string Action { get; set; } = default!;     // e.g. "USER_LOGIN", "COURSE_PUBLISH"

    [Required, MaxLength(80)]
    public string Resource { get; set; } = default!;   // e.g. "Auth", "Course"

    [MaxLength(400)]
    public string Detail { get; set; } = string.Empty;

    [MaxLength(45)]
    public string? IpAddress { get; set; }
}
