# EduFlow

A full-stack Learning Management System (LMS) built with Angular and .NET 10.

**Live Demo:** [edu-flow-sooty.vercel.app](https://edu-flow-sooty.vercel.app)

---

## Features

- **Student** — Browse catalog, enroll in courses, track progress, earn certificates
- **Instructor** — Create and manage courses, sections, and lessons
- **Admin** — Manage users, courses, audit logs, and platform settings
- **Authentication** — Email/password, OAuth (Google & GitHub), forgot/reset password
- **Responsive** — Works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17+, Angular Material, TypeScript |
| Backend | .NET 10, ASP.NET Core, Entity Framework Core |
| Database | SQLite (dev/prod via Render) |
| Auth | JWT, BCrypt, OAuth 2.0 |
| Hosting | Vercel (frontend) · Render (backend) |

---

## Project Structure

```
EduFlow/
├── frontend/          # Angular app
│   └── src/app/
│       ├── core/      # Services, guards, models, config
│       ├── features/  # Auth, home, catalog, course, instructor, admin
│       ├── shared/    # Reusable components
│       └── shell/     # App shell with top nav & footer
└── Backend/
    ├── Api/           # Controllers
    ├── Application/   # Services, DTOs
    ├── Domain/        # Entities
    └── Infrastructure # DbContext, migrations
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- .NET 10 SDK
- Angular CLI (`npm install -g @angular/cli`)

### Backend

```bash
cd Backend
dotnet restore
dotnet run
# API available at https://localhost:7xxx
```

### Frontend

```bash
cd frontend
npm install
ng serve
# App available at http://localhost:4200
```

---

## Roles

| Role | Can do |
|------|--------|
| Student | Browse, enroll, learn, track progress |
| Instructor | All of the above + create & manage own courses |
| Admin | Full platform access — users, courses, audit logs |

To register as an Instructor, select **"I'm an Instructor"** on the sign-up page.  
Admin accounts can only be created by an existing Admin.

---

## Contact

- LinkedIn: [linkedin.com/in/mohdga](https://linkedin.com/in/mohdga)
- Email: m2med2019@gmail.com
