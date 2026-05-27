using System.ComponentModel.DataAnnotations;

namespace EduFlow.Domain.Entities;

public enum CourseLevel { Beginner, Intermediate, Advanced }

public sealed class Course
{
    public Guid Id { get; init; } = Guid.NewGuid();

    [Required, MaxLength(140)]
    public string Title { get; set; } = default!;

    [Required, MaxLength(280)]
    public string Subtitle { get; set; } = default!;

    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    [Required, MaxLength(60)]
    public string Category { get; set; } = default!;

    public CourseLevel Level { get; set; } = CourseLevel.Beginner;

    [Range(0, 9999.99)]
    public decimal Price { get; set; }

    public Guid InstructorId { get; set; }
    public User? Instructor { get; set; }

    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Display metadata (kept on the course for fast catalog listing)
    [MaxLength(40)] public string Duration { get; set; } = "0h";
    public double Rating          { get; set; }
    public int    ReviewCount     { get; set; }
    public int    StudentCount    { get; set; }
    public bool   IsBestseller    { get; set; }
    public bool   IsNew           { get; set; }

    [MaxLength(60)] public string ThumbnailGradient { get; set; } = "grad-purple";

    /// <summary>Optional thumbnail image URL — overrides the gradient when set.</summary>
    [MaxLength(2048)] public string? ImageUrl { get; set; }

    public ICollection<Section> Sections { get; set; } = new List<Section>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}

public sealed class Section
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    [Required, MaxLength(140)]
    public string Title { get; set; } = default!;

    public int OrderIndex { get; set; }
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}

public enum LessonType { Video, Reading, Quiz }

public sealed class Lesson
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid SectionId { get; set; }
    public Section? Section { get; set; }

    [Required, MaxLength(160)]
    public string Title { get; set; } = default!;

    [MaxLength(40)]
    public string Duration { get; set; } = "0:00";

    public LessonType Type { get; set; } = LessonType.Video;
    public int OrderIndex { get; set; }

    [MaxLength(4000)]
    public string Description { get; set; } = string.Empty;

    // Video URL — either an external URL (YouTube/Vimeo/MP4) or a relative path
    // like "/media/lessons/<id>.mp4" served by the backend's static-files middleware.
    [MaxLength(2048)]
    public string? VideoUrl { get; set; }

    // External resource URL — validate scheme is http(s) before storing.
    [MaxLength(2048)]
    public string? ResourceUrl { get; set; }
}

public sealed class Enrollment
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    [Range(0, 100)]
    public int ProgressPercent { get; set; }

    public DateTime EnrolledAt { get; init; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}
