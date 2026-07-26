<div align="center">

# 🛰️ NexusBot — Dashboard

**A premium, real-time management dashboard for the NexusBot Discord platform.**

`React` · `Vite` · `TypeScript` · `TailwindCSS` · `Framer Motion` · `Recharts` · `TanStack Query`

</div>

---

A polished dark, glassmorphic SPA: Discord OAuth2 login → pick a server → manage moderation,
welcomes, analytics and settings, with live stats streamed over WebSockets.

> This is the **front-end only**. It talks to the NexusBot **server** (the bot + API), which lives
> in its own project and runs on a Node host. Point this app at that server with `VITE_API_URL`.

## Screens

Landing · Login · Server picker · Dashboard overview (live stats + charts) · Welcome builder
(live Discord preview) · Moderation (action panel + realtime case history) · Analytics · Settings.

## Local development

```bash
npm install
cp .env.example .env          # set VITE_API_URL to your running server
npm run dev                   # http://localhost:5173
```

`.env`:

```dotenv
VITE_API_URL=http://localhost:8080
```

## Push to GitHub

```bash
git init
git add .
git commit -m "NexusBot dashboard"
git branch -M main
git remote add origin https://github.com/loxywastaken/portfolio.git
git push -u origin main
```

*(If the repo already has a README, add `--force` to that first push.)*

## Deploy (Vercel / Netlify)

The app is a static build (`npm run build` → `dist/`). Both platforms auto-detect Vite; the included
`vercel.json` / `netlify.toml` handle SPA routing.

1. Import the repo on **Vercel** or **Netlify**.
2. Set an environment variable **`VITE_API_URL`** = your deployed server URL
   (e.g. `https://nexusbot-server.up.railway.app`).
3. Deploy.

### Connecting to the server (important)

Because the dashboard and server are on different domains, the browser treats them as *cross-site*.
Two ways to make login work:

- **Simplest — cross-domain cookies:** on the **server**, set `COOKIE_SAMESITE=none` and
  `CLIENT_URL=<this site's URL>`, and set `DISCORD_CALLBACK_URL` to the server's own
  `/api/auth/callback` (add it in the Discord portal). Here, set `VITE_API_URL=<server URL>`.
- **Alternative — same-origin proxy:** proxy `/api` and `/socket.io` from this site to the server so
  the browser sees one origin. Add to `vercel.json`:

  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://YOUR-SERVER/api/:path*" },
      { "source": "/socket.io/:path*", "destination": "https://YOUR-SERVER/socket.io/:path*" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

  Then leave `VITE_API_URL` empty, keep the server's `COOKIE_SAMESITE=lax`, and set
  `DISCORD_CALLBACK_URL` to `<this site's URL>/api/auth/callback`.

## Scripts

`npm run dev` · `build` · `preview` · `typecheck` · `lint` · `format`

## License

MIT
