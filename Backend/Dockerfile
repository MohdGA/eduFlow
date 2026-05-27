# Build context: REPO ROOT (so both Render and Railway can use this file
# without per-host build-context overrides).
#
# Usage from CLI:   docker build -f Backend/Dockerfile -t eduflow .

# ── Build stage ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore (cached layer)
COPY Backend/Backend.csproj Backend/
RUN dotnet restore "Backend/Backend.csproj"

# Build + publish
COPY Backend/ Backend/
RUN dotnet publish "Backend/Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ── Runtime stage ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Default port — Railway / Fly inject $PORT and Program.cs honours it.
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EduFlow.Backend.dll"]
