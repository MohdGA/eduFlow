using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using EduFlow.Domain.Entities;

namespace EduFlow.Application.Dtos;

/// <summary>
/// Input DTOs use strict validation. Output DTOs never include sensitive fields
/// (password hashes, internal IDs are exposed only when safe).
/// </summary>

public sealed record RegisterRequest(
    [Required, MaxLength(40)]               string FirstName,
    [Required, MaxLength(40)]               string LastName,
    [Required, EmailAddress, MaxLength(120)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [property: JsonPropertyName("role")]    string? Role = null
);

public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(120)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password
);

public sealed record AuthResponse(
    string AccessToken,
    DateTime ExpiresAt,
    UserDto User
);

public sealed record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Role
);

public sealed record CourseSummaryDto(
    Guid Id,
    string Title,
    string Subtitle,
    string Category,
    string Level,
    decimal Price,
    string InstructorName,
    string InstructorAvatar,
    int LessonCount,
    string Duration,
    double Rating,
    int ReviewCount,
    int StudentCount,
    bool IsBestseller,
    bool IsNew,
    string ThumbnailGradient,
    bool IsPublished,
    string? ImageUrl
);

public sealed record CourseDetailDto(
    Guid Id,
    string Title,
    string Subtitle,
    string Description,
    string Category,
    string Level,
    decimal Price,
    string InstructorName,
    string InstructorTitle,
    string InstructorBio,
    string InstructorAvatar,
    string Duration,
    double Rating,
    int ReviewCount,
    int StudentCount,
    bool IsBestseller,
    bool IsNew,
    string ThumbnailGradient,
    bool IsPublished,
    string? ImageUrl,
    IReadOnlyList<SectionDto> Sections
);

public sealed record SectionDto(
    Guid Id,
    string Title,
    int OrderIndex,
    IReadOnlyList<LessonDto> Lessons
);

public sealed record LessonDto(
    Guid Id,
    string Title,
    string Duration,
    string Type,
    int OrderIndex,
    string Description,
    string? VideoUrl
);

public sealed record CreateSectionRequest(
    [Required, MaxLength(140)] string Title
);
public sealed record UpdateSectionRequest(
    [Required, MaxLength(140)] string Title,
    int? OrderIndex
);
public sealed record CreateLessonRequest(
    [Required, MaxLength(160)] string Title,
    [MaxLength(40)] string? Duration,
    EduFlow.Domain.Entities.LessonType Type,
    [MaxLength(4000)] string? Description,
    [MaxLength(2048)] string? VideoUrl
);
public sealed record UpdateLessonRequest(
    [Required, MaxLength(160)] string Title,
    [MaxLength(40)] string? Duration,
    EduFlow.Domain.Entities.LessonType Type,
    [MaxLength(4000)] string? Description,
    [MaxLength(2048)] string? VideoUrl,
    int? OrderIndex
);
public sealed record ReorderRequest(IReadOnlyList<Guid> Order);

public sealed record EnrollmentDto(
    Guid Id,
    Guid CourseId,
    string CourseTitle,
    int ProgressPercent,
    DateTime EnrolledAt,
    DateTime? CompletedAt
);

public sealed record CreateCourseRequest(
    [Required, MaxLength(140)]  string Title,
    [Required, MaxLength(280)]  string Subtitle,
    [MaxLength(4000)]           string Description,
    [Required, MaxLength(60)]   string Category,
    [Required]                  CourseLevel Level,
    [Range(0, 9999.99)]         decimal Price,
    [MaxLength(40)]             string? Duration,
    [MaxLength(60)]             string? ThumbnailGradient,
    [MaxLength(2048)]           string? ImageUrl
);

public sealed record UpdateCourseRequest(
    [Required, MaxLength(140)]  string Title,
    [Required, MaxLength(280)]  string Subtitle,
    [MaxLength(4000)]           string Description,
    [Required, MaxLength(60)]   string Category,
    [Required]                  CourseLevel Level,
    [Range(0, 9999.99)]         decimal Price,
    [MaxLength(40)]             string? Duration,
    [MaxLength(60)]             string? ThumbnailGradient,
    [MaxLength(2048)]           string? ImageUrl
);

public sealed record ForgotPasswordRequest(
    [Required, EmailAddress, MaxLength(120)] string Email
);
public sealed record ForgotPasswordResponse(
    string Message,
    string? ResetToken      // returned in demo build only — production would email it
);
public sealed record ResetPasswordRequest(
    [Required, MaxLength(200)]               string Token,
    [Required, MinLength(8), MaxLength(100)] string NewPassword
);

public sealed record OAuthDemoRequest(
    [Required] string Provider                  // "Google" | "GitHub"
);

public sealed record ApiError(string Code, string Message);

// ── Admin DTOs ────────────────────────────────────────
public sealed record AdminStatsDto(
    int TotalUsers,
    int TotalStudents,
    int TotalInstructors,
    int TotalCourses,
    int PublishedCourses,
    int TotalEnrollments,
    decimal MonthRevenue,
    int NewUsersLast30Days
);

public sealed record AdminUserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

public sealed record AdminCourseDto(
    Guid Id,
    string Title,
    string Subtitle,
    string Category,
    string Level,
    decimal Price,
    string InstructorName,
    int Enrollments,
    bool IsPublished,
    DateTime CreatedAt
);

public sealed record AuditEntryDto(
    Guid Id,
    string Action,
    string Resource,
    string Detail,
    string? IpAddress,
    string? UserName,
    DateTime CreatedAt
);

public sealed record UpdateUserRoleRequest(
    [Required] EduFlow.Domain.Entities.UserRole Role
);

public sealed record UpdateUserStatusRequest(bool IsActive);

public sealed record PublishCourseRequest(bool IsPublished);

public sealed record CreateUserRequest(
    [Required, MaxLength(40)]               string FirstName,
    [Required, MaxLength(40)]               string LastName,
    [Required, EmailAddress, MaxLength(120)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    EduFlow.Domain.Entities.UserRole Role = EduFlow.Domain.Entities.UserRole.Instructor,
    [MaxLength(140)]                        string? Title = null,
    [MaxLength(1200)]                       string? Bio   = null
);
