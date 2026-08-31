# TSU Campus Guide

This is a web application for helping new students navigate Taraba State University.

Important:

- The campus map, locations, and guide steps in this build are clearly labeled demo placeholders.
- Do not treat any location or route in this repository as verified TSU campus fact.
- Replace the demo data with surveyed, approved campus information before public release.

## What is included

- Interactive campus explorer with search, categories, and location details
- Schematic Leaflet map with custom markers
- New-student guide section
- Prisma PostgreSQL schema for scalable data storage
- Secure admin area protected by an HTTP-only signed session cookie
- Validation and error handling for forms and API routes
- Responsive styling for mobile and desktop

## Demo credentials

These values are loaded from the local environment file:

- Username: `demo-admin`
- Password: `demo-password`

Change them before any real deployment.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add the Supabase transaction-pooler URL as `DATABASE_URL` and the session-pooler URL as `DIRECT_URL` in `.env`, then push the database schema:

   ```bash
   npm run db:push
   ```

3. Seed the demo data:

   ```bash
   npm run db:seed
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Project structure

- `app/` pages, route handlers, and global styles
- `components/` public and admin UI components
- `lib/` Prisma, auth, data access, and validation helpers
- `prisma/` schema and seed script
- `public/` demo map artwork

## Database schema

The Prisma schema models:

- `AdminUser`
- `Category`
- `Place`
- `PlaceTag`
- `GuideStep`

That structure is intentionally normalized so it can grow into a larger multi-campus guide later.

## Security notes

- Admin sessions are stored in an HTTP-only cookie.
- Passwords are hashed with bcrypt.
- The app checks admin access on the server before allowing changes.
