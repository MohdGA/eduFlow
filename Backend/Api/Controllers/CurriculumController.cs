using System.Security.Claims;
using EduFlow.Application.Dtos;
using EduFlow.Domain.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/Courses/{courseId:guid}/curriculum")]
[Produces("application/json")]
[Authorize(Roles = "Instructor,Admin")]
public sealed class CurriculumController(AppDbContext db) : ControllerBase
{
    // ─── Sections ─────────────────────────────────────────────────────────

    [HttpPost("sections")]
    [ProducesResponseType(typeof(SectionDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateSection(Guid courseId, [FromBody] CreateSectionRequest req, CancellationToken ct)
    {
        var (course, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var nextOrder = await db.Sections.Where(s => s.CourseId == courseId)
                          .Select(s => (int?)s.OrderIndex).MaxAsync(ct) ?? -1;
        var section = new Section { CourseId = courseId, Title = req.Title.Trim(), OrderIndex = nextOrder + 1 };
        db.Sections.Add(section);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(CreateSection), new { courseId, id = section.Id },
            new SectionDto(section.Id, section.Title, section.OrderIndex, Array.Empty<LessonDto>()));
    }

    [HttpPatch("sections/{sectionId:guid}")]
    [ProducesResponseType(typeof(SectionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSection(Guid courseId, Guid sectionId, [FromBody] UpdateSectionRequest req, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var section = await db.Sections.Include(s => s.Lessons)
                        .FirstOrDefaultAsync(s => s.Id == sectionId && s.CourseId == courseId, ct);
        if (section is null) return NotFound();

        section.Title = req.Title.Trim();
        if (req.OrderIndex.HasValue) section.OrderIndex = req.OrderIndex.Value;
        await db.SaveChangesAsync(ct);

        return Ok(new SectionDto(section.Id, section.Title, section.OrderIndex,
            [.. section.Lessons.OrderBy(l => l.OrderIndex)
                .Select(l => new LessonDto(l.Id, l.Title, l.Duration, l.Type.ToString(), l.OrderIndex, l.Description, l.VideoUrl))]));
    }

    [HttpDelete("sections/{sectionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSection(Guid courseId, Guid sectionId, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var section = await db.Sections.Include(s => s.Lessons)
                        .FirstOrDefaultAsync(s => s.Id == sectionId && s.CourseId == courseId, ct);
        if (section is null) return NotFound();

        db.Lessons.RemoveRange(section.Lessons);
        db.Sections.Remove(section);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("sections/reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReorderSections(Guid courseId, [FromBody] ReorderRequest req, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var sections = await db.Sections.Where(s => s.CourseId == courseId).ToListAsync(ct);
        for (var i = 0; i < req.Order.Count; i++)
        {
            var s = sections.FirstOrDefault(x => x.Id == req.Order[i]);
            if (s is not null) s.OrderIndex = i;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Lessons ──────────────────────────────────────────────────────────

    [HttpPost("sections/{sectionId:guid}/lessons")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateLesson(Guid courseId, Guid sectionId, [FromBody] CreateLessonRequest req, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var sectionExists = await db.Sections.AnyAsync(s => s.Id == sectionId && s.CourseId == courseId, ct);
        if (!sectionExists) return NotFound();

        var nextOrder = await db.Lessons.Where(l => l.SectionId == sectionId)
                          .Select(l => (int?)l.OrderIndex).MaxAsync(ct) ?? -1;

        var lesson = new Lesson
        {
            SectionId = sectionId,
            Title = req.Title.Trim(),
            Duration = string.IsNullOrWhiteSpace(req.Duration) ? "0:00" : req.Duration.Trim(),
            Type = req.Type,
            Description = req.Description?.Trim() ?? string.Empty,
            VideoUrl = SanitizeVideoUrl(req.VideoUrl),
            OrderIndex = nextOrder + 1,
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(CreateLesson), new { courseId, sectionId, id = lesson.Id },
            new LessonDto(lesson.Id, lesson.Title, lesson.Duration, lesson.Type.ToString(), lesson.OrderIndex, lesson.Description, lesson.VideoUrl));
    }

    [HttpPatch("sections/{sectionId:guid}/lessons/{lessonId:guid}")]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateLesson(Guid courseId, Guid sectionId, Guid lessonId, [FromBody] UpdateLessonRequest req, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.SectionId == sectionId, ct);
        if (lesson is null) return NotFound();

        lesson.Title = req.Title.Trim();
        if (!string.IsNullOrWhiteSpace(req.Duration)) lesson.Duration = req.Duration.Trim();
        lesson.Type = req.Type;
        lesson.Description = req.Description?.Trim() ?? string.Empty;
        lesson.VideoUrl = SanitizeVideoUrl(req.VideoUrl);
        if (req.OrderIndex.HasValue) lesson.OrderIndex = req.OrderIndex.Value;
        await db.SaveChangesAsync(ct);

        return Ok(new LessonDto(lesson.Id, lesson.Title, lesson.Duration, lesson.Type.ToString(), lesson.OrderIndex, lesson.Description, lesson.VideoUrl));
    }

    [HttpDelete("sections/{sectionId:guid}/lessons/{lessonId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteLesson(Guid courseId, Guid sectionId, Guid lessonId, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.SectionId == sectionId, ct);
        if (lesson is null) return NotFound();

        db.Lessons.Remove(lesson);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("sections/{sectionId:guid}/lessons/reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReorderLessons(Guid courseId, Guid sectionId, [FromBody] ReorderRequest req, CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var lessons = await db.Lessons.Where(l => l.SectionId == sectionId).ToListAsync(ct);
        for (var i = 0; i < req.Order.Count; i++)
        {
            var l = lessons.FirstOrDefault(x => x.Id == req.Order[i]);
            if (l is not null) l.OrderIndex = i;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Video upload ─────────────────────────────────────────────────────

    private static readonly HashSet<string> AllowedVideoExt =
        new(StringComparer.OrdinalIgnoreCase) { ".mp4", ".webm", ".ogg", ".mov", ".m4v" };
    private const long MaxVideoBytes = 500L * 1024 * 1024; // 500 MB

    [HttpPost("sections/{sectionId:guid}/lessons/{lessonId:guid}/video")]
    [RequestSizeLimit(MaxVideoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxVideoBytes)]
    [ProducesResponseType(typeof(LessonDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiError), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadVideo(
        Guid courseId, Guid sectionId, Guid lessonId,
        IFormFile file,
        [FromServices] IWebHostEnvironment env,
        [FromServices] IConfiguration cfg,
        CancellationToken ct)
    {
        var (_, forbid) = await LoadOwnedCourse(courseId, ct);
        if (forbid is not null) return forbid;

        var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId && l.SectionId == sectionId, ct);
        if (lesson is null) return NotFound();

        if (file is null || file.Length == 0)
            return BadRequest(new ApiError("NO_FILE", "No file uploaded."));
        if (file.Length > MaxVideoBytes)
            return BadRequest(new ApiError("FILE_TOO_LARGE", "Video exceeds the 500 MB limit."));

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedVideoExt.Contains(ext))
            return BadRequest(new ApiError("UNSUPPORTED_FORMAT",
                $"Unsupported video format. Allowed: {string.Join(", ", AllowedVideoExt)}."));

        var mediaBase = cfg["Storage:MediaRoot"] ?? Path.Combine(env.ContentRootPath, "wwwroot", "media");
        var mediaRoot = Path.Combine(mediaBase, "lessons");
        Directory.CreateDirectory(mediaRoot);

        // Delete any previous file we own for this lesson (different extensions)
        foreach (var prev in Directory.EnumerateFiles(mediaRoot, $"{lessonId:N}.*"))
        {
            try { System.IO.File.Delete(prev); } catch { /* ignore */ }
        }

        var filename = $"{lessonId:N}{ext.ToLowerInvariant()}";
        var fullPath = Path.Combine(mediaRoot, filename);
        await using (var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
        {
            await file.CopyToAsync(fs, ct);
        }

        var relativeUrl = $"/media/lessons/{filename}";
        lesson.VideoUrl = relativeUrl;
        await db.SaveChangesAsync(ct);

        return Ok(new LessonDto(lesson.Id, lesson.Title, lesson.Duration, lesson.Type.ToString(),
                                lesson.OrderIndex, lesson.Description, lesson.VideoUrl));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private static string? SanitizeVideoUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        var trimmed = url.Trim();
        // Allow our own /media/... paths
        if (trimmed.StartsWith("/media/", StringComparison.OrdinalIgnoreCase)) return trimmed;
        // Require http(s) for external URLs
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            return trimmed;
        return null;
    }

    private async Task<(Course? course, IActionResult? forbid)> LoadOwnedCourse(Guid courseId, CancellationToken ct)
    {
        var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId, ct);
        if (course is null) return (null, NotFound());

        var userId = GetUserId();
        if (userId is null) return (null, Unauthorized());

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && course.InstructorId != userId.Value)
            return (null, StatusCode(StatusCodes.Status403Forbidden,
                new ApiError("FORBIDDEN", "Only the owning instructor or an admin can edit this curriculum.")));

        return (course, null);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParseExact(sub, "N", out var id) ? id : null;
    }
}
