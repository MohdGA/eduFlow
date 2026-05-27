# ── Build stage ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for better layer caching
COPY ["Backend.csproj", "./"]
RUN dotnet restore "Backend.csproj"

# Copy the rest of the source and publish
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ── Runtime stage ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# wwwroot/media is mounted from a persistent disk at runtime (see render.yaml)
# so uploaded videos & thumbnails survive deploys. The DB file lives next to it.
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EduFlow.Backend.dll"]
