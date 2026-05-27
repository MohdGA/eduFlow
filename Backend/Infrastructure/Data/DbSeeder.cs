using EduFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

/// <summary>
/// Seeds the database with realistic users, courses, sections, lessons and audit history.
/// Skips if Users already exist.
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);
        if (await db.Users.AnyAsync(ct))
        {
            logger.LogInformation("DB already seeded, skipping.");
            return;
        }
        logger.LogInformation("Seeding database with rich content…");

        // ── Users ────────────────────────────────────────────
        var admin = NewUser("Admin", "User", "admin@eduflow.com", "Admin123!", UserRole.Admin,
            title: "Platform Administrator", bio: "Keeps the lights on.");
        var sarah = NewUser("Sarah", "Chen", "sarah@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Senior Software Engineer & Educator",
            bio: "Former Google engineer with 12+ years of experience. I've helped over 84,000 students launch careers in tech. My teaching style is practical, project-based, and fun.");
        var james = NewUser("James", "Liu", "james@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Data Scientist & ML Researcher",
            bio: "PhD in Machine Learning from Stanford. Built recommendation systems at Netflix and Meta. I demystify complex ML concepts with crystal-clear analogies.");
        var alex = NewUser("Alex", "Kim", "alex@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Product Designer & Design Systems Lead",
            bio: "Design lead at Airbnb and Stripe. I've shipped design systems used by millions. Learn the process behind beautiful, usable products.");
        var maria = NewUser("Maria", "Santos", "maria@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Cloud Solutions Architect (AWS Certified)",
            bio: "AWS Hero. Architecting and teaching cloud solutions for Fortune 500s. 25 AWS courses, 100k+ students certified.");
        var tom   = NewUser("Tom", "Walsh", "tom@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Frontend Architect & React Core Contributor",
            bio: "React contributor since 2017. Tech lead at Vercel. Author of 'Production React Patterns'. I obsess over DX and performance.");
        var lisa  = NewUser("Lisa", "Park", "lisa@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "Growth Marketer & Founder",
            bio: "Scaled three SaaS startups from $0 to $10M ARR. I teach what actually moves the needle — not vanity metrics.");
        var ryan  = NewUser("Ryan", "Cooper", "ryan@eduflow.com", "Instructor1!", UserRole.Instructor,
            title: "iOS Engineer (ex-Apple)",
            bio: "Shipped features on iOS 12-17 at Apple. Now indie. 8 apps in the App Store with 5M+ downloads combined.");
        var demo  = NewUser("Demo", "Student", "demo@eduflow.com", "Demo1234!", UserRole.Student);

        db.Users.AddRange(admin, sarah, james, alex, maria, tom, lisa, ryan, demo);
        await db.SaveChangesAsync(ct);

        // ── Courses ────────────────────────────────────────────
        // 15 focused courses. Every title contains a keyword matched by
        // CoursePoolByKeyword above so every Video lesson gets a verified-
        // embeddable YouTube URL. Pools cycle so lessons within a course
        // play different (but topic-relevant) videos.
        var courses = new List<Course>();

        foreach (var c in courses) c.IsPublished = true;
        db.Courses.AddRange(courses);
        await db.SaveChangesAsync(ct);

        // ── Enrollments ─────────────────────────────────────────
        // No seeded enrollments — admin starts with an empty catalog.
        var demoEnrollments = Array.Empty<Enrollment>();
        db.Enrollments.AddRange(demoEnrollments);

        // ── Audit log entries ────────────────────────────────
        var audit = new List<AuditLog>
        {
            Log(admin.Id, "USER_LOGIN", "Auth", "Admin signed in", "192.168.1.10",  DateTime.UtcNow.AddMinutes(-5)),
            Log(null,     "USER_REGISTER",  "Auth", "New user registered", "203.0.113.42", DateTime.UtcNow.AddHours(-8)),
            Log(null,     "LOGIN_FAILED",   "Auth", "Invalid password attempt", "203.0.113.42", DateTime.UtcNow.AddHours(-9)),
            Log(admin.Id, "USER_UPDATE",    "User", "Changed role for user marcus@example.com to Instructor", "192.168.1.10", DateTime.UtcNow.AddDays(-1)),
            Log(null,     "RATE_LIMIT",     "System", "Rate limit hit on /api/Auth/login", "198.51.100.7", DateTime.UtcNow.AddDays(-3)),
        };
        db.AuditLogs.AddRange(audit);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("✅ Seed complete: {Users} users, {Courses} courses, {Enrollments} enrollments, {Audit} audit entries",
            await db.Users.CountAsync(ct), await db.Courses.CountAsync(ct),
            await db.Enrollments.CountAsync(ct), await db.AuditLogs.CountAsync(ct));
    }

    private static User NewUser(string first, string last, string email, string pw, UserRole role,
                                string? title = null, string? bio = null)
        => new()
        {
            FirstName = first, LastName = last,
            Email = email.ToLowerInvariant(),
            // Low work-factor for seeded demo users only — keeps startup fast on
            // free-tier CPUs (work-factor 12 took up to 5s per hash, saturating
            // the 0.1 vCPU and starving Render's health-check thread). Real
            // user registrations via AuthService still use BCryptWorkFactor=12.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(pw, 4),
            Role = role,
            Title = title, Bio = bio,
            AvatarSeed = first[..1],
            IsActive = true,
        };

    private static AuditLog Log(Guid? userId, string action, string resource, string detail, string ip, DateTime at)
        => new() { UserId = userId, Action = action, Resource = resource, Detail = detail, IpAddress = ip, CreatedAt = at };

    // Reliable MP4 sample videos from Google's public CDN — every URL plays in <video> with no
    // embedding/restriction issues. Instructors can swap these out via the Curriculum editor
    // (URL or upload). YouTube embeds are intentionally avoided here because individual videos
    // can have embedding disabled by their owner (YouTube Error 153).
    // ── Lesson video defaults ─────────────────────────────────────────────
    // Topic-relevant YouTube URLs per course (mostly Fireship "100 Seconds"
    // and freeCodeCamp — channels that broadly allow embedding). If a specific
    // video shows YouTube's "Error 153" / "Video player configuration error"
    // for some users (region/extension/restriction), the Learn page surfaces
    // an "Open on YouTube" fallback link, and instructors can replace the URL
    // per-lesson in the Curriculum editor.
    // Multiple topic videos per keyword — cycled per lesson so a course's
    // lessons get *different* relevant videos (not the same one repeated).
    private static readonly Dictionary<string, string[]> CoursePoolByKeyword =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Web Developer Bootcamp"] = new[]{
                "https://www.youtube.com/watch?v=W6NZfCO5SIk", // JS in 100s
                "https://www.youtube.com/watch?v=OEV8gMkCHXQ", // CSS in 100s
                "https://www.youtube.com/watch?v=Tn6-PIqc4UM", // React in 100s
                "https://www.youtube.com/watch?v=fBNz5xF-Kx4", // Node Crash Course
                "https://www.youtube.com/watch?v=zsjvFFKOm3c", // SQL in 100s
            },
            ["Advanced CSS"] = new[]{
                "https://www.youtube.com/watch?v=OEV8gMkCHXQ",
                "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            },
            ["React"] = new[]{
                "https://www.youtube.com/watch?v=Tn6-PIqc4UM",
                "https://www.youtube.com/watch?v=zQnBQ4tB3ZA", // TS in 100s
                "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            },
            ["TypeScript"] = new[]{
                "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
                "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            },
            ["Next.js"] = new[]{
                "https://www.youtube.com/watch?v=Sklc_fQBmcs", // Next.js walkthrough
                "https://www.youtube.com/watch?v=Tn6-PIqc4UM",
                "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
            },
            ["Vue 3"] = new[]{
                "https://www.youtube.com/watch?v=nhBVL41-_Cw", // Vue Crash Course
            },
            ["Node.js"] = new[]{
                "https://www.youtube.com/watch?v=fBNz5xF-Kx4",
                "https://www.youtube.com/watch?v=zsjvFFKOm3c",
            },
            ["SaaS"] = new[]{
                "https://www.youtube.com/watch?v=Sklc_fQBmcs",
                "https://www.youtube.com/watch?v=zsjvFFKOm3c",
            },
            ["SQL"] = new[]{
                "https://www.youtube.com/watch?v=zsjvFFKOm3c",
                "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
            },
            ["UI/UX"] = new[]{
                "https://www.youtube.com/watch?v=c9Wg6Cb_YlU",
                "https://www.youtube.com/watch?v=jwCmIBJ8Jtc",
            },
            ["Figma"] = new[]{
                "https://www.youtube.com/watch?v=jwCmIBJ8Jtc",
                "https://www.youtube.com/watch?v=c9Wg6Cb_YlU",
            },
            ["Mobile UI"] = new[]{
                "https://www.youtube.com/watch?v=c9Wg6Cb_YlU",
                "https://www.youtube.com/watch?v=jwCmIBJ8Jtc",
            },
            ["Python for Data Science"] = new[]{
                "https://www.youtube.com/watch?v=Y8Tko2YC5hA", // Python in 100s
                "https://www.youtube.com/watch?v=i_LwzRVP7bg", // ML in 100s
                "https://www.youtube.com/watch?v=6M5VXKLf4D4", // Deep learning in 100s
            },
            ["Machine Learning"] = new[]{
                "https://www.youtube.com/watch?v=i_LwzRVP7bg",
                "https://www.youtube.com/watch?v=Y8Tko2YC5hA",
                "https://www.youtube.com/watch?v=6M5VXKLf4D4",
            },
            ["Deep Learning"] = new[]{
                "https://www.youtube.com/watch?v=6M5VXKLf4D4",
                "https://www.youtube.com/watch?v=i_LwzRVP7bg",
                "https://www.youtube.com/watch?v=Y8Tko2YC5hA",
            },
            ["AWS"] = new[]{
                "https://www.youtube.com/watch?v=SOTamWNgDKc", // AWS Cloud Practitioner — freeCodeCamp
                "https://www.youtube.com/watch?v=PziYflu8cB8", // K8s in 100s
            },
            ["Kubernetes"] = new[]{
                "https://www.youtube.com/watch?v=PziYflu8cB8",
                "https://www.youtube.com/watch?v=SOTamWNgDKc",
            },
            ["iOS"] = new[]{
                "https://www.youtube.com/watch?v=09TeUXjzpKs", // Swift in 100s
                "https://www.youtube.com/watch?v=fq4N0hgOWzU", // Flutter in 100s
            },
            ["SwiftUI"] = new[]{
                "https://www.youtube.com/watch?v=09TeUXjzpKs",
            },
            ["Flutter"] = new[]{
                "https://www.youtube.com/watch?v=fq4N0hgOWzU",
                "https://www.youtube.com/watch?v=09TeUXjzpKs",
            },
            ["Digital Marketing"] = new[]{
                "https://www.youtube.com/watch?v=bixR-KIJKYM",
                "https://www.youtube.com/watch?v=nU-IIXBWlS4",
            },
            ["Content Marketing"] = new[]{
                "https://www.youtube.com/watch?v=nU-IIXBWlS4",
                "https://www.youtube.com/watch?v=bixR-KIJKYM",
            },
            ["Content Strategy"] = new[]{
                "https://www.youtube.com/watch?v=nU-IIXBWlS4",
                "https://www.youtube.com/watch?v=bixR-KIJKYM",
            },
            ["Email Marketing"] = new[]{
                "https://www.youtube.com/watch?v=nU-IIXBWlS4",
                "https://www.youtube.com/watch?v=bixR-KIJKYM",
            },
            ["Cybersecurity"] = new[]{
                "https://www.youtube.com/watch?v=z5nc9MDbvkw",
            },
            ["Photography"] = new[]{
                "https://www.youtube.com/watch?v=V7z7BAZdt2M",
            },
        };

    private static readonly Dictionary<string, string> CourseVideoByTitleKeyword =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Web Dev / JS / HTML / CSS
            ["Web Developer Bootcamp"] = "https://www.youtube.com/watch?v=W6NZfCO5SIk", // JS in 100s
            ["Advanced CSS"]           = "https://www.youtube.com/watch?v=OEV8gMkCHXQ", // CSS in 100s

            // React & TypeScript & Next & Vue
            ["React"]      = "https://www.youtube.com/watch?v=Tn6-PIqc4UM", // React in 100s
            ["TypeScript"] = "https://www.youtube.com/watch?v=zQnBQ4tB3ZA", // TS in 100s
            ["Next.js"]    = "https://www.youtube.com/watch?v=Sklc_fQBmcs", // Next.js 13 walkthrough
            ["Vue 3"]      = "https://www.youtube.com/watch?v=nhBVL41-_Cw", // Vue.js Crash Course

            // Backend / Node / SaaS
            ["Node.js"]   = "https://www.youtube.com/watch?v=fBNz5xF-Kx4", // Node Crash Course
            ["SaaS"]      = "https://www.youtube.com/watch?v=Sklc_fQBmcs", // Next.js walkthrough
            ["SQL"]       = "https://www.youtube.com/watch?v=zsjvFFKOm3c", // SQL in 100s

            // Design
            ["UI/UX"]   = "https://www.youtube.com/watch?v=c9Wg6Cb_YlU", // UI/UX intro
            ["Figma"]   = "https://www.youtube.com/watch?v=jwCmIBJ8Jtc", // Figma tutorial
            ["Mobile UI"] = "https://www.youtube.com/watch?v=c9Wg6Cb_YlU",

            // Data Science / ML / DL
            ["Python for Data Science"] = "https://www.youtube.com/watch?v=Y8Tko2YC5hA", // Python in 100s
            ["Machine Learning"]        = "https://www.youtube.com/watch?v=i_LwzRVP7bg", // ML in 100s (Fireship)
            ["Deep Learning"]           = "https://www.youtube.com/watch?v=6M5VXKLf4D4", // Deep learning in 100s (Fireship)

            // Cloud / DevOps
            ["AWS"]        = "https://www.youtube.com/watch?v=SOTamWNgDKc", // AWS Cloud Practitioner — freeCodeCamp
            ["Kubernetes"] = "https://www.youtube.com/watch?v=PziYflu8cB8", // K8s in 100s

            // Mobile
            ["iOS"]      = "https://www.youtube.com/watch?v=09TeUXjzpKs", // Swift in 100s
            ["SwiftUI"]  = "https://www.youtube.com/watch?v=09TeUXjzpKs", // Swift in 100s (covers SwiftUI basics)
            ["Flutter"]  = "https://www.youtube.com/watch?v=fq4N0hgOWzU", // Flutter in 100s

            // Marketing
            ["Digital Marketing"] = "https://www.youtube.com/watch?v=bixR-KIJKYM", // SEO crash course
            ["Content Strategy"]  = "https://www.youtube.com/watch?v=nU-IIXBWlS4", // content marketing
            ["Content Marketing"] = "https://www.youtube.com/watch?v=nU-IIXBWlS4",
            ["Email Marketing"]   = "https://www.youtube.com/watch?v=nU-IIXBWlS4",

            // Security
            ["Cybersecurity"] = "https://www.youtube.com/watch?v=z5nc9MDbvkw", // Cybersec in 100s

            // Photography
            ["Photography"] = "https://www.youtube.com/watch?v=V7z7BAZdt2M", // exposure triangle
        };

    // Direct MP4 fallback for any course title that doesn't match a keyword.
    private static readonly string[] LessonVideoPool = new[]
    {
        "https://media.w3.org/2010/05/sintel/trailer.mp4",
        "https://media.w3.org/2010/05/bunny/trailer.mp4",
        "https://media.w3.org/2010/05/bunny/movie.mp4",
        "https://media.w3.org/2010/05/video/movie_300.mp4",
        "https://www.w3schools.com/html/mov_bbb.mp4",
        "https://www.w3schools.com/html/movie.mp4",
    };

    // Course keyword → locally hosted .mp4 in wwwroot/media/lessons/
    // These files were downloaded once via yt-dlp and are served by the backend's
    // static-files middleware. They play in <video> with zero embedding/region/
    // extension issues, AND they are topic-relevant educational content.
    private static readonly Dictionary<string, string> LocalVideoByTitleKeyword =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Web Developer Bootcamp"] = "/media/lessons/javascript.mp4",
            ["TypeScript"]             = "/media/lessons/typescript.mp4",
            ["React"]                  = "/media/lessons/react.mp4",
            ["Next.js"]                = "/media/lessons/nextjs.mp4",
            ["Vue 3"]                  = "/media/lessons/vue.mp4",
            ["Advanced CSS"]           = "/media/lessons/css.mp4",
            ["Python for Data Science"]= "/media/lessons/python.mp4",
            ["Machine Learning"]       = "/media/lessons/machinelearning.mp4",
            ["Deep Learning"]          = "/media/lessons/deeplearning.mp4",
            ["SQL"]                    = "/media/lessons/sql.mp4",
            ["Kubernetes"]             = "/media/lessons/kubernetes.mp4",
            ["AWS"]                    = "/media/lessons/docker.mp4", // generic ops/cloud fallback
            ["iOS"]                    = "/media/lessons/swift.mp4",
            ["Flutter"]                = "/media/lessons/flutter.mp4",
            ["Cybersecurity"]          = "/media/lessons/cybersecurity.mp4",
        };

    // Secondary topic videos for cycling through lessons within a course.
    private static readonly Dictionary<string, string[]> LocalPoolByKeyword =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Web Developer Bootcamp"] = new[]{
                "/media/lessons/javascript.mp4",
                "/media/lessons/css.mp4",
                "/media/lessons/react.mp4",
                "/media/lessons/sql.mp4",
            },
            ["React"] = new[]{
                "/media/lessons/react.mp4",
                "/media/lessons/typescript.mp4",
                "/media/lessons/javascript.mp4",
            },
            ["Next.js"] = new[]{
                "/media/lessons/nextjs.mp4",
                "/media/lessons/react.mp4",
                "/media/lessons/typescript.mp4",
            },
            ["TypeScript"] = new[]{
                "/media/lessons/typescript.mp4",
                "/media/lessons/javascript.mp4",
            },
            ["Python for Data Science"] = new[]{
                "/media/lessons/python.mp4",
                "/media/lessons/machinelearning.mp4",
                "/media/lessons/deeplearning.mp4",
            },
            ["Machine Learning"] = new[]{
                "/media/lessons/machinelearning.mp4",
                "/media/lessons/python.mp4",
                "/media/lessons/deeplearning.mp4",
            },
            ["Deep Learning"] = new[]{
                "/media/lessons/deeplearning.mp4",
                "/media/lessons/machinelearning.mp4",
                "/media/lessons/python.mp4",
            },
            ["Kubernetes"] = new[]{
                "/media/lessons/docker.mp4",
                "/media/lessons/kubernetes.mp4",
            },
            ["iOS"] = new[]{
                "/media/lessons/swift.mp4",
                "/media/lessons/flutter.mp4",
            },
            ["Flutter"] = new[]{
                "/media/lessons/flutter.mp4",
                "/media/lessons/swift.mp4",
            },
        };

    private static string PickVideoForCourse(string courseTitle, int lessonIndex)
    {
        // 1) Multi-video pool — different topic-relevant video per lesson within a course.
        foreach (var kv in LocalPoolByKeyword)
            if (courseTitle.Contains(kv.Key, StringComparison.OrdinalIgnoreCase) && kv.Value.Length > 0)
                return kv.Value[lessonIndex % kv.Value.Length];

        // 2) Single-video keyword map — same topic video repeated across lessons.
        foreach (var kv in LocalVideoByTitleKeyword)
            if (courseTitle.Contains(kv.Key, StringComparison.OrdinalIgnoreCase))
                return kv.Value;

        // 3) Last-resort fallback — generic W3C sample (still plays).
        return LessonVideoPool[lessonIndex % LessonVideoPool.Length];
    }

    // Course thumbnail images — public Unsplash photos selected per category. Stable IDs
    // (no API key needed). Rotates so each course in a category gets a distinct image.
    private static readonly Dictionary<string, string[]> ImagePoolByCategory = new()
    {
        ["Development"] = new[]
        {
            "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80", // code on screen
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",     // colorful code
            "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80",     // dev workspace
            "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80",  // js code
            "https://images.unsplash.com/photo-1581276879432-15e50529f34b?w=800&q=80",  // terminal
        },
        ["Design"] = new[]
        {
            "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80",     // design tools
            "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80",  // ui swatches
            "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&q=80",  // mockups
            "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80",     // colorful design
        },
        ["Data Science"] = new[]
        {
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",     // charts
            "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80",  // analytics
            "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",  // AI brain
            "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&q=80",  // data viz
        },
        ["Cloud"] = new[]
        {
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",  // server room
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80",     // data center
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",     // network
            "https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80",  // racks
        },
        ["Marketing"] = new[]
        {
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",  // analytics dashboard
            "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80",  // marketing strategy
            "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80",  // marketing tools
        },
        ["Mobile"] = new[]
        {
            "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",  // iphone with code
            "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=800&q=80",  // app design
            "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80",     // mobile mockups
        },
        ["Business"] = new[]
        {
            "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",  // business meeting
            "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",     // strategy
        },
        ["Photography"] = new[]
        {
            "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",  // camera
            "https://images.unsplash.com/photo-1502136969935-8d8eef54d77b?w=800&q=80",  // photographer
        },
    };

    private static readonly Dictionary<string, int> _imageCounter = new();
    private static string PickImage(string category)
    {
        if (!ImagePoolByCategory.TryGetValue(category, out var pool) || pool.Length == 0)
            return "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80";
        _imageCounter.TryGetValue(category, out var idx);
        var url = pool[idx % pool.Length];
        _imageCounter[category] = idx + 1;
        return url;
    }

    private static Course Build(
        Guid instructorId, string title, string subtitle, string description,
        string category, CourseLevel level, decimal price, string duration,
        double rating, int reviewCount, int studentCount,
        bool isBestseller = false, bool isNew = false, string thumb = "grad-purple",
        params (string Title, (string Title, string Duration)[] Lessons)[] sections)
    {
        var course = new Course
        {
            InstructorId = instructorId,
            Title = title, Subtitle = subtitle, Description = description,
            Category = category, Level = level, Price = price,
            Duration = duration, Rating = rating, ReviewCount = reviewCount, StudentCount = studentCount,
            IsBestseller = isBestseller, IsNew = isNew, ThumbnailGradient = thumb,
            ImageUrl = PickImage(category),
            IsPublished = false,
        };
        var videoCounter = 0; // flat index across the course so we vary videos lesson-to-lesson
        for (int i = 0; i < sections.Length; i++)
        {
            var section = new Section { Title = sections[i].Title, OrderIndex = i };
            for (int j = 0; j < sections[i].Lessons.Length; j++)
            {
                var (lt, dur) = sections[i].Lessons[j];
                var isQuiz = lt.Contains("Quiz", StringComparison.OrdinalIgnoreCase)
                          || lt.Contains("Project", StringComparison.OrdinalIgnoreCase);
                var type = isQuiz ? LessonType.Quiz : LessonType.Video;
                var lesson = new Lesson { Title = lt, Duration = dur, Type = type, OrderIndex = j };
                if (!isQuiz)
                {
                    lesson.VideoUrl = PickVideoForCourse(title, videoCounter++);
                    lesson.Description =
                        $"In this lesson you'll learn about {lt.ToLowerInvariant()}. " +
                        $"We'll walk through the core concepts step-by-step with hands-on examples " +
                        $"so you can apply them right away.";
                }
                section.Lessons.Add(lesson);
            }
            course.Sections.Add(section);
        }
        return course;
    }
}
