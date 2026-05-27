using EduFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).UseCollation("NOCASE");
        });

        b.Entity<Course>(e =>
        {
            e.HasOne(c => c.Instructor)
                .WithMany()
                .HasForeignKey(c => c.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasMany(c => c.Sections)
                .WithOne(s => s.Course)
                .HasForeignKey(s => s.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            e.Property(c => c.Price).HasPrecision(7, 2);
            e.HasIndex(c => c.Category);
            e.HasIndex(c => c.IsPublished);
        });

        b.Entity<Section>(e =>
        {
            e.HasMany(s => s.Lessons)
                .WithOne(l => l.Section)
                .HasForeignKey(l => l.SectionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => new { s.CourseId, s.OrderIndex });
        });

        b.Entity<Lesson>(e =>
        {
            e.HasIndex(l => new { l.SectionId, l.OrderIndex });
        });

        b.Entity<Enrollment>(e =>
        {
            e.HasIndex(en => new { en.UserId, en.CourseId }).IsUnique();
            e.HasOne(en => en.User)
                .WithMany(u => u.Enrollments)
                .HasForeignKey(en => en.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(en => en.Course)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(en => en.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<AuditLog>(e =>
        {
            e.HasIndex(a => a.CreatedAt);
            e.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(t => t.TokenHash).IsUnique();
            e.HasIndex(t => t.ExpiresAt);
            e.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
