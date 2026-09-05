# ClassLens

A classroom monitoring system for **school-owned, managed Chromebooks with disclosed monitoring**.
Three pieces:

- `backend/` — Node/Express + SQLite API server
- `extension/` — Chrome Manifest V3 extension (runs on student Chromebooks)
- `dashboard/` — React admin dashboard (staff view)

This is a working prototype, not a hardened production system. Before any real
classroom rollout, see "Before you deploy for real" at the bottom.

---

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set real values:

- `JWT_SECRET` — long random string
- `ENROLLMENT_KEY` — long random string; this is the shared secret devices use to register. Treat it like a password.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — creates your first staff login on first boot

```bash
npm start
```

Server runs at `http://localhost:4000` by default. Screenshots are stored in `backend/data/screenshots/`,
and the SQLite database is at `backend/data/classlens.db`.

Quick health check: `curl http://localhost:4000/api/health`

## 2. Dashboard setup

```bash
cd dashboard
npm install
npm run build
npm run preview   # serves the production build, or use `npm run dev` while developing
```

By default the dashboard talks to `http://localhost:4000`. To point it at a different backend
(e.g. once it's deployed on a real server), create `dashboard/.env`:

```
VITE_API_URL=https://your-server-address:4000
```

then rebuild with `npm run build`.

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in the backend `.env`.

## 3. Extension setup (for testing, before pushing via Google Admin)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**, select the `extension/` folder
4. Click the ClassLens icon → right-click → **Options** (or go to `chrome://extensions`, find
   ClassLens, click "Extension options")
5. Fill in:
   - **Server URL**: `http://localhost:4000` (or wherever your backend is running)
   - **Enrollment Key**: the same value as `ENROLLMENT_KEY` in the backend `.env`
   - **Classroom** / **Student name**: optional labels for the dashboard
6. Click **Save & Reconnect**

The extension icon badge turns **green "ON"** once it successfully registers. A red "!" means
it can't reach the server or the enrollment key is wrong — check both.

Refresh the dashboard's Roster page and the device should appear within a few seconds.

### Deploying to real managed Chromebooks

For an actual classroom rollout, don't use "Load unpacked" — push the extension through the
[Google Admin console](https://admin.google.com) as a force-installed extension, and set
`serverUrl` / `enrollmentKey` / `classroom` via **Chrome device policy → Extension policy for
extensions → Policy for extensions** (JSON managed storage), so students can't see or edit those
values from the Options page. The current Options page is meant for your own testing only.

---

## What the extension actually does (so you can audit it yourself)

Read `extension/background.js` — it's short and commented. In summary:

- Reports the active tab's URL + title when it changes (not keystrokes, not typed content)
- Takes a JPEG screenshot of the active tab on an interval (default 45s) — periodic snapshots,
  not a continuous live stream
- Blocks sites matching the server's blocklist using Chrome's `declarativeNetRequest` API
- Shows a permanent badge on the extension icon whenever monitoring is active — there is no
  silent/hidden mode
- Does **not** access the microphone, camera, or keystrokes, and does not run on non-active tabs

## Before you deploy for real

This prototype is intentionally simple. Before using it with actual students, at minimum:

- Replace the shared `ENROLLMENT_KEY` with a unique per-device secret/certificate
- Put the backend behind HTTPS (a reverse proxy like Caddy or nginx is enough)
- Set a real retention policy and actually delete old screenshots/activity (there's a
  `RETENTION_DAYS` value in `.env` but no cron job enforcing it yet — you'll need to add one)
- Review your district/state's student data privacy policy (e.g. FERPA in the US) and make sure
  students and parents are notified as required
- Add rate limiting and stronger password requirements on admin accounts
- Consider running the backend on a real always-on server rather than a laptop
