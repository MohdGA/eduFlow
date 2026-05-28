using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using EduFlow.Application.Dtos;
using EduFlow.Domain.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class CoursesController(AppDbContext db) : ControllerBase
{
    /// <summary>Browse published courses. Public endpoint.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<CourseSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery, Range(1, 100)] int pageSize = 24,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.Courses
            .AsNoTracking()
            .Where(c => c.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(c => c.Category == category);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(c => EF.Functions.Like(c.Title, $"%{term}%")
                          || EF.Functions.Like(c.Subtitle, $"%{term}%"));
        }

        var items = await q
            .OrderByDescending(c => c.IsBestseller).ThenByDescending(c => c.Rating).ThenByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CourseSummaryDto(
                c.Id, c.Title, c.Subtitle, c.Category, c.Level.ToString(),
                c.Price,
                c.Instructor != null ? c.Instructor.FirstName + " " + c.Instructor.LastName : "Unknown",
                c.Instructor != null ? (c.Instructor.AvatarSeed ?? c.Instructor.FirstName.Substring(0,1)) : "?",
                c.Sections.SelectMany(s => s.Lessons).Count(),
                c.Duration, c.Rating, c.ReviewCount, c.StudentCount,
                c.IsBestseller, c.IsNew, c.ThumbnailGradient,
                c.IsPublished, c.ImageUrl))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>List courses owned by the authenticated instructor (including drafts).</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(typeof(IEnumerable<CourseSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MyCourses(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var items = await db.Courses
            .AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Sections).ThenInclude(s => s.Lessons)
            .Where(c => c.InstructorId == userId.Value)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CourseSummaryDto(
                c.Id, c.Title, c.Subtitle, c.Category, c.Level.ToString(),
                c.Price,
                c.Instructor != null ? c.Instructor.FirstName + " " + c.Instructor.LastName : "Unknown",
                c.Instructor != null ? (c.Instructor.AvatarSeed ?? c.Instructor.FirstName.Substring(0, 1)) : "?",
                c.Sections.SelectMany(s => s.Lessons).Count(),
                c.Duration, c.Rating, c.ReviewCount, c.StudentCount,
                c.IsBestseller, c.IsNew, c.ThumbnailGradient,
                c.IsPublished, c.ImageUrl))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>Get full course detail including sections and lessons.
    /// Public for published courses; the owning instructor or any admin can also view drafts.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var course = await db.Courses
            .AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Sections.OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (course is null) return NotFound();

        // Drafts are only visible to the owning instructor or an admin
        if (!course.IsPublished)
        {
            var viewer = GetUserId();
            var isAdmin = User.IsInRole("Admin");
            if (!isAdmin && (viewer is null || course.InstructorId != viewer.Value))
                return NotFound();
        }

        var dto = new CourseDetailDto(
            course.Id, course.Title, course.Subtitle, course.Description,
            course.Category, course.Level.ToString(), course.Price,
            course.Instructor != null
                ? course.Instructor.FirstName + " " + course.Instructor.LastName
                : "Unknown",
            course.Instructor?.Title ?? "",
            course.Instructor?.Bio ?? "",
            course.Instructor != null ? (course.Instructor.AvatarSeed ?? course.Instructor.FirstName[..1]) : "?",
            course.Duration, course.Rating, course.ReviewCount, course.StudentCount,
            course.IsBestseller, course.IsNew, course.ThumbnailGradient,
            course.IsPublished, course.ImageUrl,
            [.. course.Sections.Select(s => new SectionDto(
                s.Id, s.Title, s.OrderIndex,
                [.. s.Lessons.Select(l => new LessonDto(l.Id, l.Title, l.Duration, l.Type.ToString(), l.OrderIndex, l.Description, l.VideoUrl))]
            ))]);

        return Ok(dto);
    }

    /// <summary>Create a new course. Instructor or Admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(typeof(CourseSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateCourseRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid course payload."));

        var instructorId = GetUserId();
        if (instructorId is null) return Unauthorized();

        var course = new Course
        {
            Title        = req.Title.Trim(),
            Subtitle     = req.Subtitle.Trim(),
            Description  = req.Description?.Trim() ?? string.Empty,
            Category     = req.Category.Trim(),
            Level        = req.Level,
            Price        = req.Price,
            Duration     = string.IsNullOrWhiteSpace(req.Duration) ? "0h" : req.Duration.Trim(),
            ThumbnailGradient = string.IsNullOrWhiteSpace(req.ThumbnailGradient) ? "grad-purple" : req.ThumbnailGradient.Trim(),
            ImageUrl     = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim(),
            InstructorId = instructorId.Value,
            IsPublished  = false,
        };

        db.Courses.Add(course);
        await db.SaveChangesAsync(ct);

        var dto = new CourseSummaryDto(course.Id, course.Title, course.Subtitle, course.Category,
                                       course.Level.ToString(), course.Price, "You", "Y",
                                       0, course.Duration, course.Rating, course.ReviewCount, course.StudentCount,
                                       course.IsBestseller, course.IsNew, course.ThumbnailGradient,
                                       course.IsPublished, course.ImageUrl);
        return CreatedAtAction(nameof(Get), new { id = course.Id }, dto);
    }

    /// <summary>Update an existing course. Instructor (owner) or Admin only.</summary>
    [HttpPatch("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(typeof(CourseSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCourseRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(new ApiError("INVALID_REQUEST", "Invalid course payload."));

        var course = await db.Courses.Include(c => c.Instructor).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();

        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && course.InstructorId != userId.Value)
            return StatusCode(StatusCodes.Status403Forbidden,
                              new ApiError("FORBIDDEN", "Only the owning instructor or an admin can edit this course."));

        course.Title       = req.Title.Trim();
        course.Subtitle    = req.Subtitle.Trim();
        course.Description = req.Description?.Trim() ?? string.Empty;
        course.Category    = req.Category.Trim();
        course.Level       = req.Level;
        course.Price       = req.Price;
        if (!string.IsNullOrWhiteSpace(req.Duration))           course.Duration          = req.Duration.Trim();
        if (!string.IsNullOrWhiteSpace(req.ThumbnailGradient))  course.ThumbnailGradient = req.ThumbnailGradient.Trim();
        course.ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim();
        course.UpdatedAt = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = "COURSE_UPDATE",
            Resource = "Course",
            Detail = $"Updated '{course.Title}'",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);

        var dto = new CourseSummaryDto(course.Id, course.Title, course.Subtitle, course.Category,
                                       course.Level.ToString(), course.Price,
                                       course.Instructor != null ? course.Instructor.FirstName + " " + course.Instructor.LastName : "Unknown",
                                       course.Instructor?.AvatarSeed ?? "?",
                                       course.Sections.SelectMany(s => s.Lessons).Count(),
                                       course.Duration, course.Rating, course.ReviewCount, course.StudentCount,
                                       course.IsBestseller, course.IsNew, course.ThumbnailGradient,
                                       course.IsPublished, course.ImageUrl);
        return Ok(dto);
    }

    /// <summary>Enroll the current user in a course.</summary>
    [HttpPost("{id:guid}/enroll")]
    [Authorize]
    [ProducesResponseType(typeof(EnrollmentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Enroll(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.IsPublished, ct);
        if (course is null) return NotFound();

        var existing = await db.Enrollments
            .AnyAsync(e => e.UserId == userId.Value && e.CourseId == id, ct);
        if (existing) return Conflict(new ApiError("ALREADY_ENROLLED", "You are already enrolled in this course."));

        var enrollment = new Enrollment { UserId = userId.Value, CourseId = id };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync(ct);

        var dto = new EnrollmentDto(enrollment.Id, course.Id, course.Title, 0, enrollment.EnrolledAt, null);
        return CreatedAtAction(nameof(Enroll), dto);
    }

    // ── Course thumbnail upload ─────────────────────────────────────────
    private static readonly HashSet<string> AllowedImageExt =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private const long MaxImageBytes = 10L * 1024 * 1024; // 10 MB

    [HttpPost("{id:guid}/thumbnail")]
    [Authorize(Roles = "Instructor,Admin")]
    [RequestSizeLimit(MaxImageBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImageBytes)]
    [ProducesResponseType(typeof(CourseSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadThumbnail(
        Guid id,
        IFormFile file,
        [FromServices] IWebHostEnvironment env,
        [FromServices] IConfiguration cfg,
        CancellationToken ct)
    {
        var course = await db.Courses.Include(c => c.Instructor).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();

        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && course.InstructorId != userId.Value)
            return StatusCode(StatusCodes.Status403Forbidden,
                new ApiError("FORBIDDEN", "Only the owning instructor or an admin can upload a thumbnail."));

        if (file is null || file.Length == 0)
            return BadRequest(new ApiError("NO_FILE", "No file uploaded."));
        if (file.Length > MaxImageBytes)
            return BadRequest(new ApiError("FILE_TOO_LARGE", "Image exceeds the 10 MB limit."));

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedImageExt.Contains(ext))
            return BadRequest(new ApiError("UNSUPPORTED_FORMAT",
                $"Unsupported image format. Allowed: {string.Join(", ", AllowedImageExt)}."));

        var mediaRoot = cfg["Storage:MediaRoot"] ?? Path.Combine(env.ContentRootPath, "wwwroot", "media");
        var dir = Path.Combine(mediaRoot, "courses");
        Directory.CreateDirectory(dir);

        // Remove any previous thumbnail for this course (any extension).
        foreach (var prev in Directory.EnumerateFiles(dir, $"{id:N}.*"))
        {
            try { System.IO.File.Delete(prev); } catch { /* ignore */ }
        }

        var filename = $"{id:N}{ext.ToLowerInvariant()}";
        var fullPath = Path.Combine(dir, filename);
        await using (var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
        {
            await file.CopyToAsync(fs, ct);
        }

        course.ImageUrl = $"/media/courses/{filename}";
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var dto = new CourseSummaryDto(course.Id, course.Title, course.Subtitle, course.Category,
                                       course.Level.ToString(), course.Price,
                                       course.Instructor != null ? course.Instructor.FirstName + " " + course.Instructor.LastName : "Unknown",
                                       course.Instructor?.AvatarSeed ?? "?",
                                       course.Sections.SelectMany(s => s.Lessons).Count(),
                                       course.Duration, course.Rating, course.ReviewCount, course.StudentCount,
                                       course.IsBestseller, course.IsNew, course.ThumbnailGradient,
                                       course.IsPublished, course.ImageUrl);
        return Ok(dto);
    }

    /// <summary>Toggle published/draft state. Admin only.</summary>
    [HttpPatch("{id:guid}/publish")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CourseSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TogglePublish(Guid id, CancellationToken ct)
    {
        var course = await db.Courses.Include(c => c.Instructor)
            .Include(c => c.Sections).ThenInclude(s => s.Lessons)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();

        course.IsPublished = !course.IsPublished;
        course.UpdatedAt   = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            UserId    = GetUserId(),
            Action    = course.IsPublished ? "COURSE_PUBLISH" : "COURSE_UNPUBLISH",
            Resource  = "Course",
            Detail    = $"'{course.Title}' is now {(course.IsPublished ? "published" : "draft")}",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);

        var dto = new CourseSummaryDto(course.Id, course.Title, course.Subtitle, course.Category,
            course.Level.ToString(), course.Price,
            course.Instructor != null ? course.Instructor.FirstName + " " + course.Instructor.LastName : "Unknown",
            course.Instructor?.AvatarSeed ?? "?",
            course.Sections.SelectMany(s => s.Lessons).Count(),
            course.Duration, course.Rating, course.ReviewCount, course.StudentCount,
            course.IsBestseller, course.IsNew, course.ThumbnailGradient,
            course.IsPublished, course.ImageUrl);
        return Ok(dto);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParseExact(sub, "N", out var id) ? id : null;
    }
}
