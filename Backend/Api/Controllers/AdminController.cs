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
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public sealed class AdminController(AppDbContext db, ILogger<AdminController> log) : ControllerBase
{
    // ────────────────────────────────────────────────
    //  STATS
    // ────────────────────────────────────────────────
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminStatsDto), 200)]
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var monthAgo = DateTime.UtcNow.AddDays(-30);

        var stats = new AdminStatsDto(
            TotalUsers:        await db.Users.CountAsync(ct),
            TotalStudents:     await db.Users.CountAsync(u => u.Role == UserRole.Student, ct),
            TotalInstructors:  await db.Users.CountAsync(u => u.Role == UserRole.Instructor, ct),
            TotalCourses:      await db.Courses.CountAsync(ct),
            PublishedCourses:  await db.Courses.CountAsync(c => c.IsPublished, ct),
            TotalEnrollments:  await db.Enrollments.CountAsync(ct),
            MonthRevenue:      await db.Enrollments
                                 .Where(e => e.EnrolledAt >= monthAgo)
                                 .Include(e => e.Course)
                                 .SumAsync(e => e.Course == null ? 0m : e.Course.Price, ct),
            NewUsersLast30Days: await db.Users.CountAsync(u => u.CreatedAt >= monthAgo, ct)
        );
        return Ok(stats);
    }

    // ────────────────────────────────────────────────
    //  USERS
    // ────────────────────────────────────────────────
    [HttpGet("users")]
    [ProducesResponseType(typeof(IEnumerable<AdminUserDto>), 200)]
    public async Task<IActionResult> ListUsers([FromQuery] string? search, [FromQuery] string? role, CancellationToken ct)
    {
        var q = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var r))
            q = q.Where(u => u.Role == r);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            q = q.Where(u => EF.Functions.Like(u.Email, term)
                          || EF.Functions.Like(u.FirstName, term)
                          || EF.Functions.Like(u.LastName, term));
        }

        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserDto(
                u.Id, u.FirstName, u.LastName, u.Email, u.Role.ToString(),
                u.IsActive, u.CreatedAt, u.LastLoginAt))
            .ToListAsync(ct);
        return Ok(users);
    }

    [HttpPatch("users/{id:guid}/role")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        var actorId = GetUserId();
        if (actorId == id) return BadRequest(new ApiError("CANNOT_MODIFY_SELF", "You cannot change your own role."));

        var old = user.Role;
        user.Role = req.Role;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = "USER_ROLE_CHANGE",
            Resource = "User",
            Detail = $"Changed role of {user.Email} from {old} to {req.Role}",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
        log.LogInformation("Admin {Actor} changed role of {Target} to {Role}", actorId, id, req.Role);
        return NoContent();
    }

    [HttpPatch("users/{id:guid}/status")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusRequest req, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        var actorId = GetUserId();
        if (actorId == id) return BadRequest(new ApiError("CANNOT_MODIFY_SELF", "You cannot deactivate yourself."));

        user.IsActive = req.IsActive;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = req.IsActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
            Resource = "User",
            Detail = $"{(req.IsActive ? "Activated" : "Deactivated")} {user.Email}",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("users/{id:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        var actorId = GetUserId();
        if (actorId == id) return BadRequest(new ApiError("CANNOT_MODIFY_SELF", "You cannot delete your own account."));

        // Any courses this user owns must be removed first — Course → Instructor is Restrict.
        // Removing the courses also cascade-deletes their sections, lessons, and enrollments.
        var ownedCourses = await db.Courses.Where(c => c.InstructorId == id).ToListAsync(ct);
        if (ownedCourses.Count > 0)
        {
            db.Courses.RemoveRange(ownedCourses);
            db.AuditLogs.Add(new AuditLog
            {
                UserId = actorId,
                Action = "COURSES_DELETED_WITH_USER",
                Resource = "Course",
                Detail = $"Removed {ownedCourses.Count} course(s) owned by {user.Email}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            });
        }

        db.Users.Remove(user);
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = "USER_DELETE",
            Resource = "User",
            Detail = $"Deleted user {user.Email} ({user.Role})",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
        log.LogWarning("Admin {Actor} deleted user {Target} and {Courses} owned courses",
                       actorId, id, ownedCourses.Count);
        return NoContent();
    }

    // ────────────────────────────────────────────────
    //  COURSES
    // ────────────────────────────────────────────────
    [HttpGet("courses")]
    [ProducesResponseType(typeof(IEnumerable<AdminCourseDto>), 200)]
    public async Task<IActionResult> ListCourses([FromQuery] string? search, [FromQuery] bool? published, CancellationToken ct)
    {
        var q = db.Courses.AsNoTracking().Include(c => c.Instructor).AsQueryable();
        if (published is bool p) q = q.Where(c => c.IsPublished == p);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            q = q.Where(c => EF.Functions.Like(c.Title, term) || EF.Functions.Like(c.Subtitle, term));
        }

        var items = await q
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new AdminCourseDto(
                c.Id, c.Title, c.Subtitle, c.Category, c.Level.ToString(), c.Price,
                c.Instructor != null ? c.Instructor.FirstName + " " + c.Instructor.LastName : "Unknown",
                c.Enrollments.Count, c.IsPublished, c.CreatedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPatch("courses/{id:guid}/publish")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetPublished(Guid id, [FromBody] PublishCourseRequest req, CancellationToken ct)
    {
        var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();

        course.IsPublished = req.IsPublished;
        course.UpdatedAt = DateTime.UtcNow;

        db.AuditLogs.Add(new AuditLog
        {
            UserId = GetUserId(),
            Action = req.IsPublished ? "COURSE_PUBLISH" : "COURSE_UNPUBLISH",
            Resource = "Course",
            Detail = $"{(req.IsPublished ? "Published" : "Unpublished")} '{course.Title}'",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("courses/{id:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteCourse(Guid id, CancellationToken ct)
    {
        var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();

        db.Courses.Remove(course);
        db.AuditLogs.Add(new AuditLog
        {
            UserId = GetUserId(),
            Action = "COURSE_DELETE",
            Resource = "Course",
            Detail = $"Deleted '{course.Title}'",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ────────────────────────────────────────────────
    //  AUDIT LOG
    // ────────────────────────────────────────────────
    [HttpDelete("audit")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> ClearAudit(CancellationToken ct)
    {
        var actorId = GetUserId();
        var deleted = await db.AuditLogs.CountAsync(ct);
        db.AuditLogs.RemoveRange(db.AuditLogs);
        await db.SaveChangesAsync(ct);

        // Re-seed one entry that records the clear itself, so the action is auditable.
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId,
            Action = "AUDIT_CLEAR",
            Resource = "System",
            Detail = $"Cleared {deleted} audit entries",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync(ct);

        log.LogWarning("Admin {Actor} cleared {Count} audit entries", actorId, deleted);
        return NoContent();
    }

    [HttpGet("audit")]
    [ProducesResponseType(typeof(IEnumerable<AuditEntryDto>), 200)]
    public async Task<IActionResult> ListAudit([FromQuery, Range(1, 200)] int pageSize = 50, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var items = await db.AuditLogs.AsNoTracking()
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AuditEntryDto(
                a.Id, a.Action, a.Resource, a.Detail, a.IpAddress,
                a.User != null ? (a.User.FirstName + " " + a.User.LastName) : null,
                a.CreatedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParseExact(sub, "N", out var id) ? id : null;
    }
}
