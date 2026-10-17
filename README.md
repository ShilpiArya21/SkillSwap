# SkillSwap

SkillSwap is a full-stack skill-exchange app where people can discover other learners, request skill exchanges, accept/reject requests, mark exchanges complete, and leave reviews.

## Stack

- Frontend: React, Vite, Lucide React
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: bcryptjs password hashing and server-side sessions stored in MongoDB

## Features

- Register and log in
- Discover and search members by name, bio, and skills
- Send, accept, reject, and complete skill-exchange requests
- Review completed exchanges (one review per user per exchange, enforced by the API/database)
- Edit profile details, bio, location, experience level, and skills
- View recent exchange activity/status summaries in the in-app notification panel (not push notifications)

## Requirements

- Node.js 20+ recommended
- MongoDB connection string

## Run locally

1. Install dependencies in both folders:

   ```bash
   cd server
   npm install
   ```

   In another terminal:

   ```bash
   cd client
   npm install
   ```

2. Create `server/.env` based on `server/.env.example`, and fill in your own MongoDB URI and a random session secret (at least 32 characters).
3. Optionally create `client/.env` based on `client/.env.example` to change the API URL.
4. Start the API from `server/` using `npm run dev` (or `npm start`).
5. Start the frontend from `client/` using `npm run dev`.
6. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## Security notes

- Do not commit `.env` files, database credentials, or session secrets.
- Passwords are hashed with bcryptjs; the API never returns password fields.
- Session cookies are HTTP-only, use `secure` in production, and sessions are regenerated after login.
- Profile updates validate allowed fields and values.
- Exchange and review actions check session identity and participant permissions.
- Authentication routes include a basic in-memory throttle. For a multi-instance production deployment, use a shared rate-limit store and add monitoring.
- Set `NODE_ENV=production`, `CLIENT_ORIGIN` to your exact HTTPS frontend origin, and deploy behind HTTPS before production use.

## Verification

Run `npm run check` in `server/`, `npm run build` in `client/`, and `npm run lint` in `client/` before publishing. Live MongoDB/session flows should also be tested with a private test database. The build could not be completed in the current review environment because the uploaded Vite dependencies were missing a platform-specific native binding; run `npm ci` in `client/` on your machine before verifying the build.
