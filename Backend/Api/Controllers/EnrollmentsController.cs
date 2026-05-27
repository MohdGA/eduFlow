using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using EduFlow.Application.Dtos;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public sealed class EnrollmentsController(AppDbContext db) : ControllerBase
{
    /// <summary>List the current user's enrollments.</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(IEnumerable<EnrollmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> My(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var items = await db.Enrollments
            .AsNoTracking()
            .Where(e => e.UserId == userId.Value)
            .Include(e => e.Course)
            .OrderByDescending(e => e.LastAccessedAt ?? e.EnrolledAt)
            .Select(e => new EnrollmentDto(
                e.Id,
                e.CourseId,
                e.Course != null ? e.Course.Title : "",
                e.ProgressPercent,
                e.EnrolledAt,
                e.CompletedAt))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>Update progress for an enrollment.</summary>
    [HttpPatch("{id:guid}/progress")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody, Range(0, 100)] int percent, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var enrollment = await db.Enrollments
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId.Value, ct);
        if (enrollment is null) return NotFound();

        enrollment.ProgressPercent = percent;
        enrollment.LastAccessedAt = DateTime.UtcNow;
        if (percent >= 100 && enrollment.CompletedAt is null)
            enrollment.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParseExact(sub, "N", out var id) ? id : null;
    }
}
