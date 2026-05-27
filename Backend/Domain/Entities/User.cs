using System.ComponentModel.DataAnnotations;

namespace EduFlow.Domain.Entities;

public enum UserRole { Student, Instructor, Admin }

public sealed class User
{
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(40)]
    public string FirstName { get; set; } = default!;

    [Required, MaxLength(40)]
    public string LastName  { get; set; } = default!;

    [Required, EmailAddress, MaxLength(120)]
    public string Email { get; set; } = default!;

    // BCrypt hash — NEVER store plain password. Never expose this field via DTOs.
    [Required]
    public string PasswordHash { get; set; } = default!;

    public UserRole Role { get; set; } = UserRole.Student;

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(140)] public string? Title    { get; set; }    // e.g. "Senior Software Engineer & Educator"
    [MaxLength(1200)] public string? Bio     { get; set; }
    [MaxLength(40)]  public string? AvatarSeed { get; set; }  // single char shown in the avatar

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}
