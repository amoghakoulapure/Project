# To-Do Reminder App (Supabase)

Simple To-Do Reminder front-end using Supabase as a backend.

Files:
- `index.html` — UI
- `styles.css` — styles
- `app.js` — main logic (ES module)
- `config.example.js` — example config. Copy to `config.js` and fill values.
- `.env` — local placeholder; don't commit secrets. Use it only locally.

Setup
1. Create a Supabase project and note the `SUPABASE_URL` and `anon` key.
2. Create a `tasks` table (SQL example below).
3. Copy `config.example.js` to `config.js` and fill `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Serve the folder with a static server and open `index.html`.

Quick local server (from this folder):
```bash
python3 -m http.server 5500
# then open http://localhost:5500
```

Auto-generate `config.js` from `.env`
-----------------------------------
You can generate `config.js` automatically from your `.env` with the included script:

```bash
cd /Users/amoghakoulapure/Downloads/web/Project
chmod +x generate-config.sh
./generate-config.sh
# opens or writes config.js in the same folder
```

This helps keep secrets only in `.env` and avoid accidental commits.

Create the `tasks` table (SQL file)
----------------------------------
You can copy-paste `create_tasks_table.sql` into the Supabase SQL editor, or run it locally against your database if you have direct DB access.

Run SQL locally (optional)
--------------------------
If you have a direct Postgres connection string (e.g. `DATABASE_URL`) you can run the included Node script which executes the SQL file. WARNING: keep this connection string private (don't commit it).

```bash
cd /Users/amoghakoulapure/Downloads/web/Project
npm install
# add DATABASE_URL to your .env with the Postgres connection string
npm run create-table
```

Notification enhancements
-------------------------
- The app requests Notification permission and will show reminders when a task's reminder time is reached.
- Clicking a notification focuses the app and scrolls to the task; you'll be offered a 5-minute snooze which updates the reminder in the DB.
- The app will also play a short tone when a reminder fires.


Database schema (Postgres / Supabase)
```sql
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  is_complete boolean default false,
  reminder timestamptz,
  created_at timestamptz default now()
);
```

Notes
- The front-end uses `@supabase/supabase-js` via ESM CDN.
- For real-time updates the app attempts to subscribe; if it can't, it falls back to polling every 5s.
- Keep your `anon` key secret in public repos — use `config.js` locally and add it to `.gitignore` if committing.
