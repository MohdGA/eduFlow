# EduFlow Live Deployment Guide

Goal: get EduFlow running at a real URL on the internet.

**Architecture:**
- **Backend** (Docker container, .NET 10) → **Render.com** Starter plan ($7/mo). Has a 5 GB persistent disk for SQLite + uploaded videos/thumbnails.
- **Frontend** (Angular static build) → **Vercel** free plan.

Estimated total time: **~15 minutes**, plus the Render build (~5 min).

---

## 1. Push the code to GitHub (one-time)

If your code isn't on GitHub yet:

```bash
cd C:\Users\m2med\OneDrive\Desktop\EduFlow
git init
git add .
git commit -m "Initial commit: EduFlow LMS"
```

Then on https://github.com/new create a new **private** repo called `eduflow`. Copy the SSH or HTTPS URL it shows, then:

```bash
git remote add origin <the URL GitHub showed you>
git branch -M main
git push -u origin main
```

> **Heads up:** the file `Backend/appsettings.json` currently contains real OAuth secrets. Because we'll set them as Render env vars instead, edit `appsettings.json` and **replace the real `ClientId` and `ClientSecret` values with empty strings** before pushing. (Your local `.env` is gitignored, but `appsettings.json` is not.) Then `git add Backend/appsettings.json && git commit --amend --no-edit && git push`.

---

## 2. Deploy the backend on Render

1. Sign up at https://render.com (use GitHub to log in for easiest repo access)
2. Top-right **New +** → **Blueprint**
3. Connect the `eduflow` GitHub repo → Apply
4. Render reads `render.yaml` and proposes a **Web Service** + **Persistent Disk**. Click **Apply**.
5. While it builds (~5 min), open the new service → **Environment** tab and fill in the `sync: false` variables — Render won't deploy until they're set:

   | Key | Value |
   |---|---|
   | `Jwt__Key` | Run `openssl rand -base64 48` (or any 32+ random chars) |
   | `Cors__AllowedOrigins__0` | `https://eduflow-<your-vercel-slug>.vercel.app` (fill in after step 3) |
   | `OAuth__FrontendUrl` | Same Vercel URL |
   | `OAuth__Google__ClientId` | from Google Cloud Console |
   | `OAuth__Google__ClientSecret` | from Google Cloud Console |
   | `OAuth__GitHub__ClientId` | from github.com/settings/developers |
   | `OAuth__GitHub__ClientSecret` | from github.com/settings/developers |

6. Click **Save, redeploy**. When it's green, you'll have a URL like `https://eduflow-api-xyz.onrender.com`. Test it:

   ```
   https://eduflow-api-xyz.onrender.com/api/Courses
   ```

   Should return `[]` (empty courses list — admin builds the catalog from scratch).

---

## 3. Deploy the frontend on Vercel

1. Sign up at https://vercel.com (use GitHub to log in)
2. **Add New → Project** → pick the `eduflow` repo
3. **Root Directory** → `frontend`
4. Framework preset auto-detects **Angular**. Override only if needed:
   - Build command: `npm run build`
   - Output: `dist/frontend/browser`
5. Add an **Environment Variable** under the **Build & Development Settings**:

   | Name | Value |
   |---|---|
   | (none required — see step 6) | — |

6. Before deploying, edit `frontend/src/index.html` line:
   ```html
   <script>window.__EDUFLOW_API__ = 'http://localhost:5180';</script>
   ```
   …and change the URL to your Render backend URL, e.g.:
   ```html
   <script>window.__EDUFLOW_API__ = 'https://eduflow-api-xyz.onrender.com';</script>
   ```
   Commit and push — Vercel will rebuild.

7. Click **Deploy**. After ~90 seconds you'll have a URL like `https://eduflow-abc.vercel.app`.

---

## 4. Wire OAuth callbacks to production URLs

On the providers, add the production callbacks **alongside** the localhost ones (don't replace — keep both so local dev still works):

**Google** — https://console.cloud.google.com/apis/credentials → your OAuth client → **Authorized redirect URIs**:
```
https://eduflow-api-xyz.onrender.com/api/oauth/google/callback
```
Also add the Vercel origin to **Authorized JavaScript origins**:
```
https://eduflow-abc.vercel.app
```

**GitHub** — https://github.com/settings/developers → your OAuth App → **Update**:
- Homepage URL: `https://eduflow-abc.vercel.app`
- Authorization callback URL: `https://eduflow-api-xyz.onrender.com/api/oauth/github/callback`

(GitHub only allows one callback per app — if you want both local + prod, register a second OAuth App for production and use its credentials in Render.)

---

## 5. Back to Render — finalize CORS

In the Render dashboard → eduflow-api service → **Environment**:

| Key | Value |
|---|---|
| `Cors__AllowedOrigins__0` | `https://eduflow-abc.vercel.app` |
| `OAuth__FrontendUrl` | `https://eduflow-abc.vercel.app` |

Click **Save, redeploy**.

---

## 6. Test the deployment

1. Visit `https://eduflow-abc.vercel.app`
2. **Register** a new account with email + password — should work
3. **Log in** with that account — JWT issued by Render backend
4. **Sign in with Google** or **GitHub** — should redirect, prompt, then land on `/home` logged in
5. As that user, you'll need an admin account to manage courses. Either:
   - Sign in as `admin@eduflow.com` / `Admin123!` (seeded automatically) → manage other users from `/admin/users`
   - Or, in Render dashboard → **Shell**, run `sqlite3 /data/eduflow.db "UPDATE Users SET Role='Admin' WHERE Email='your@email';"`

---

## Ongoing notes

- **Pushing updates**: just `git push` to main. Render rebuilds the backend, Vercel rebuilds the frontend. ~3 min each.
- **Server-side logs**: Render dashboard → Logs tab. Vercel → Deployments → click a build → Runtime logs.
- **Disk usage**: Render dashboard → Disks. 5 GB holds roughly 10 hrs of 480p video uploads. Bump to 10 GB ($2/mo) when you fill it.
- **Custom domain**: Vercel → Project → Settings → Domains → add e.g. `eduflow.com`. Add the DNS records they show. HTTPS is automatic. Then update `Cors__AllowedOrigins__0` and `OAuth__FrontendUrl` in Render + the OAuth provider URLs.
- **Costs**: Render Starter $7 + 5 GB disk $1 + Vercel Free $0 = **~$8 / month**.
