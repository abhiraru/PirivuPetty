# Putting PIRIVUPETTY online

Free-tier setup: **Neon** (database), **Vercel** (the app and bill photo storage), **GitHub** (code and nightly backups).
Nothing here has been deployed yet. These steps were written from the project's configuration and have not been run against live accounts, so expect to fix small things on the first try.

## 1. Accounts you need
- GitHub, Neon (neon.tech), Vercel (vercel.com). All have free plans. Sign in to Vercel with GitHub.

## 2. Put the code on GitHub
1. Create a new **private** repository.
2. From the `app` folder: `git init`, `git add .`, `git commit -m "First version"`, then add the repository as the remote and push.
   `.env`, `uploads/` and `backups/` are already ignored, so no secrets or data are uploaded.

## 3. Create the database (Neon)
1. New project. When it asks where to host it, choose cloud **AWS** and region **Asia Pacific (Singapore) `aws-ap-southeast-1`**. It is the nearest Neon region to India (Neon has no Mumbai region). The region cannot be changed later, so pick it carefully. Leave the Postgres version on the default.
2. On the project dashboard, open **Connect**. You need two strings:
   - **Pooled** connection (the host contains `-pooler`): this becomes `DATABASE_URL`.
   - **Direct** connection: this becomes `DIRECT_URL`. Migrations use it.
3. Neon's free plan keeps a short history you can restore from (a few hours to a day). Do not rely on that alone; see section 8.

### Your Neon connection is already set up
The project `green-tooth-69042919` (Singapore) is linked. Its connection strings are in the file `.env.neon` in the app folder. It is ignored by git and is not used by `npm run dev`, so local testing stays on the local database. To run a command against Neon, put `npm run neon --` in front of it, for example:
```
npm run neon -- npx prisma migrate deploy    # create the tables in Neon
npm run neon -- npm run seed                  # first admin account (set ADMIN_PASSWORD first)
```
The Neon tables already exist (3 migrations applied). The three variables Vercel needs are ready in `.env.vercel` (database, direct database, and a fresh signing key). Open it with `open -e .env.vercel` and paste its lines into Vercel's environment variables (step 4). Never paste them into chat or commit them.

## 3b. Option: use Vercel's own Prisma Postgres instead of Neon

Instead of Neon you can use the database that Vercel creates for you (Storage, Prisma Postgres). The app works with either; `src/lib/dbEnv.ts` maps the host's variable names automatically, so there is nothing to convert.

- Vercel creates `DATABASE_URL` (direct), `DATABASE_URL_POOLED`, `POSTGRES_URL` and `PRISMA_DATABASE_URL` itself. **Do not add or overwrite these.** The app uses the pooled one for queries and the direct one for database changes.
- **Do add:** `AUTH_SECRET` (the one line from `.env.vercel`). Optionally `ADMIN_USERNAME` and `ADMIN_PASSWORD`: on the deploy that follows, the build creates your admin account if it does not exist yet. After you have signed in and changed the password you can delete `ADMIN_PASSWORD` from Vercel.
- The build creates the tables itself (`prisma migrate deploy`), so there is nothing to run on your computer.
- **Region:** note where the database was created (Vercel, Storage, your database). Set the project's Function Region (Settings, Functions) to the nearest Vercel region to the database, so pages do not wait on a long round trip.
- **Going back to Neon:** disconnect or delete the Prisma Postgres database in Vercel Storage, then add `DATABASE_URL` and `DIRECT_URL` from `.env.neon`. Do this **before** real data is entered. Anything recorded in the other database does not move by itself (it can be moved with a database dump, see section 8).

**Region is set in code.** `vercel.json` pins the app to Singapore (`sin1`) so it runs next to the Neon database (also Singapore). If the app and database are in different parts of the world every page becomes slow (we measured 1.1 seconds per database call from Washington to Singapore). Keep them together. If you ever move the database, change the region in `vercel.json` to match.

## 4. Create the project (Vercel)
1. **Add New, Project**, import the GitHub repository. Framework is detected as Next.js.
2. In **Build and Output Settings** set the build command to `npm run vercel-build` (it applies database migrations, then builds).
   Then open **Settings, Functions** and set the **Function Region** to **Singapore (`sin1`)**, so the app runs next to the database. Without this it may run in the USA and every page waits on a slow round trip to Singapore.
3. In the project, open **Storage, Create, Blob**, create a store and connect it. This adds `BLOB_READ_WRITE_TOKEN` automatically. It holds bill photos.
4. Under **Settings, Environment Variables** add (for Production):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string, ending `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | Neon direct string, ending `?sslmode=require` |
| `AUTH_SECRET` | output of `openssl rand -base64 32` (never reuse the development one) |
| `ADMIN_USERNAME` | e.g. `admin` |
| `ADMIN_PASSWORD` | a strong password, 12+ characters |

The app refuses to start in production if `AUTH_SECRET` is short, missing or looks like a default, or if the database URL is missing.

## 5. First deploy
1. Click **Deploy**. The build runs the migrations against Neon.
2. Create the first admin account once, from your own computer, pointing at the production database:
   ```
   DATABASE_URL="<neon direct string>" ADMIN_USERNAME=admin ADMIN_PASSWORD="<your password>" npm run seed
   ```
   This also adds the default expense categories. Running it again is harmless.
3. Open the Vercel address, sign in as the admin, and **change the password** (Password link, top bar).

## 6. Check it works (10 minutes)
- Sign in as admin, create a festival, an area, a household, a collector, a treasurer.
- Sign in as the collector on a phone: record a cash payment. Sign in as the treasurer: confirm a handover, add an expense **with a bill photo**, and open the bill.
- On the phone use the browser menu, **Add to Home Screen**. The app opens full screen with the PIRIVUPETTY icon.
- Delete the test records or use a separate festival you never activate for real.

## 7. Security notes
- Sign-in is paused for 15 minutes after 5 wrong passwords for a username.
- Treasurer and admin accounts should each have their own strong password. Disable accounts of people who leave (Admin, Users).
- Bill photos can only be opened by a signed-in treasurer or admin.
- Vercel provides HTTPS automatically. Do not share the address publicly; there is no public sign-up.

## 8. Backups: three layers
1. **Nightly database dump (automatic).** The file `.github/workflows/backup.yml` runs every night and keeps the last 30 dumps. Add the repository secret `DIRECT_DATABASE_URL` (the Neon direct string) under GitHub, Settings, Secrets and variables, Actions. Download dumps from the workflow run's Artifacts.
2. **Excel export (manual).** Admin, Backup, Download. Do this after every festival and before any big change. It is for reference, not for restoring.
3. **Neon history.** Use it for "undo the last hour" mistakes.

Restoring a dump into an empty database: `npm run restore -- path/to/festival-XXXX.sql.gz` (a restore into a scratch database was tested locally and recovered all users and festivals).
Bill photos live in Vercel Blob and are not inside the database dump. Download them from the Blob store in Vercel if you need a copy.

## 9. Limits to know about (free plans)
- Neon free: small storage and the database sleeps when idle, so the first request after a quiet spell can take a few seconds.
- Vercel free: 4.5 MB request size (the app limits bill uploads to 4 MB and shrinks phone photos automatically), and fair-use limits meant for personal or small-organization use.
- If the organization outgrows them, the app runs unchanged on paid plans or on any Node host with PostgreSQL.

## 10. Updating later
Push a change to GitHub and Vercel redeploys. Database changes are applied automatically by `vercel-build`. Take an Excel export and check last night's dump exists before a release during festival season.

## 11. Demo data, then real data

For a presentation, sign in as admin and go to `/admin/demo` (add it to the site address). It is deliberately not in the menu. One click loads a closed 2023 festival and an active 2026 festival with three collectors and a treasurer (logins are shown on that page). One click removes it again.

- The demo only loads into an **empty app** (no festivals, households or payments), so it never mixes with real records.
- Everything in it has an id starting with `demo_`. **Remove demo data** deletes exactly that, plus anything the demo accounts entered while demonstrating. Real records and your admin account are never touched.
- Remove it **before** real data goes in. The demo treasurer can see everything.

**Moving to real data**
1. Admin, Demo data, **Remove demo data**.
2. Admin, Festivals: create the real festival, with the opening cash and bank balances you start with. Activate it.
3. Admin, Users: create the real collectors and treasurer, each with their own strong password.
4. Admin, Households, **Import from Excel**: columns `name, phone, address, area, amount, year`. One row per household per year. Past amounts become history; households with no amount are added as new. The preview shows problems before anything is saved, and an import can be undone.
5. Admin, Areas: assign each collector to their areas for the active festival.
6. Check Reports and the Fund page against your paper records, then give collectors their logins.
