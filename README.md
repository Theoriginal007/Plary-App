# Plary — Climate-Smart Farming

Plary helps smallholder farmers plan their season, understand climate risks, log inputs and sales, and build a "resilience record" they can share with partners.

## Project structure

| Folder | Description |
| --- | --- |
| [`prototype-v2/`](prototype-v2/) | **Current app.** React + Vite web app with Supabase sign-in and data storage. |
| [`prototype/`](prototype/) | Earlier click-through prototype (no backend). Kept for reference. |

## Features (v2)

- **Season Setup**: crop, farm size, water source, and last season's challenge
- **Farm Climate Profile**: risk drivers and a seasonal checklist
- **Season Plan**: weekly actions matched to your farm, plus reminders
- **Quick Record**: log inputs and sales in seconds
- **Resilience Record**: readiness score, financial summary, and activity timeline
- **USSD preview**: a mock of the `*789#` menu for farmers without smartphones

## Running locally

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
cd prototype-v2
npm install
npm run dev
```

Then open http://localhost:5174.

## Backend (Supabase)

The v2 app uses [Supabase](https://supabase.com/) for authentication and storage.

1. Create a Supabase project.
2. In **SQL Editor**, run [`prototype-v2/supabase-schema.sql`](prototype-v2/supabase-schema.sql). It creates the tables and Row Level Security policies, so each user can only access their own data.
3. Put your project URL and **anon (public)** key in [`prototype-v2/src/supabase.js`](prototype-v2/src/supabase.js).

> The anon key is designed to be public and is safe in client code because Row Level Security is enabled. **Never** commit the `service_role` key.

## Build

```bash
cd prototype-v2
npm run build   # output goes to prototype-v2/dist
```

## Status

This is a prototype. USSD access, PDF summary downloads, and partner support calls are not live yet.
