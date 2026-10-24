# Deploying ztok.site (Vercel Postgres + Render)

ztok.site runs as two pieces:

- **Database (accounts, videos, messages, settings):** Postgres from Vercel, which Vercel provides through Neon.
- **App:** the `ztok/` Docker image on Render, built from this GitHub repo by [`render.yaml`](../../render.yaml). Render keeps uploaded videos on a disk and handles HTTPS for ztok.site.

Vercel can't host the app itself. Uploads need ffmpeg and a disk, and DMs need a websocket that stays open, which Vercel's serverless functions don't support.

Merge the pull request that adds `render.yaml` first, so Render reads it from `main`.

## 1. Create the database on Vercel

1. In the Vercel dashboard, open **Storage → Create Database**, pick **Neon (Serverless Postgres)**, and accept the integration.
2. Pick the region **Washington, D.C. (iad1)**. It sits next to Render's Virginia region, which `render.yaml` uses. Name the database `ztok`. The free plan is enough to start.
3. Open the new database and go to **.env.local / Quickstart**. Copy the value of **`DATABASE_URL_UNPOOLED`**, which starts with `postgresql://` and ends with `?sslmode=require`. You can connect it to a Vercel project if the dashboard asks for one, but ztok doesn't need that.

Treat that URL like a password. Paste it only into Render in the next step.

## 2. Create the app on Render

1. In Render, open **New → Blueprint** and connect the GitHub repo `loxywastaken/portr`, branch `main`.
2. Render reads `render.yaml` and proposes a web service called **ztok**: Starter plan, Virginia, a 10 GB disk and the domain ztok.site. When it asks for **`DATABASE_URL`**, paste the URL from step 1.
3. Click **Apply**. The first build takes a few minutes. When the service shows **Live**, the database tables have been created, because ztok runs its migrations on start.

The Starter plan costs money because disks need a paid instance. A free instance would lose every uploaded video on each deploy.

## 3. Point ztok.site at Render

1. In Render, open the ztok service, then **Settings → Custom Domains**. ztok.site is already listed there from `render.yaml`. Render shows the DNS records it wants, usually:
   - `A` record for `ztok.site` → `216.24.57.1`
   - `CNAME` for `www` → `ztok.onrender.com` (the service's `.onrender.com` name)
2. Add those records wherever ztok.site's DNS lives. If you bought the domain on Vercel, that's **Vercel → Domains → ztok.site → DNS Records**. Remove any older `A`, `ALIAS` or `CNAME` records for `@` and `www` that point at Vercel.
3. Click **Verify** in Render. Render then issues the HTTPS certificate on its own, usually within a few minutes.

The app only answers on `https://ztok.site`, because that is its `PUBLIC_ORIGIN`. The `.onrender.com` address returns `403 InvalidHost` on purpose, and the health check still works there.

## 4. Make your admin account

In Render, open the ztok service, then **Shell**:

```sh
node scripts/create-user.mjs loxy --admin
```

Type a password of 12 or more characters at the prompt; it stays hidden while you type. Then open https://ztok.site/login, choose **Use phone / email / username**, then **Log in with email or username**.

Optional, also from the Shell:

- `node scripts/ip-key.mjs` sets up the IP security key. It prints the key once, so save it.
- Registration starts closed. Change `REGISTRATION_MODE` to `invite` or `open` in Render's **Environment** tab, or create invites from the admin panel.
- For email sign-up codes and password resets, fill in the mail settings in the admin panel, or set `SMTP_URL` and `MAIL_FROM`.

## Updating

Every push to `main` that touches `ztok/` or `render.yaml` redeploys automatically. The database stays on Vercel/Neon, and videos stay on the Render disk.

## Backups

- **Database:** Neon keeps restore history for your plan's window. Use its **Branches/Restore** page, or run `pg_dump "$DATABASE_URL"` from anywhere.
- **Videos and the IP hash key:** Render snapshots the disk daily. The IP hash key is in `/var/lib/ztok/media/private/ip-hash-key`. Keep a copy, because the IP history only matches with the same key.
