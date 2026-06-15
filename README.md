# Taskify API

Secure Node.js/Express backend for user authentication and task management, backed by embedded SQLite.

## Features

- JWT access tokens with optional refresh tokens
- Bcrypt password hashing for local accounts
- Social login verification for Google (ID token) and GitHub (access token)
- Protected task and profile routes via Bearer token middleware
- SQL migration and seed scripts
- Security middleware: Helmet, CORS, rate limiting, JSON body size limits

## Requirements

- Node.js 18 or later
- npm

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with strong secrets before production use:
   - `JWT_ACCESS_SECRET` — at least 32 random characters
   - `JWT_REFRESH_SECRET` — at least 32 random characters
   - `GOOGLE_CLIENT_ID` — required only if using Google social login

3. **Run database migration and seed data**

   ```bash
   npm run setup
   ```

   Or run individually:

   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start the server**

   ```bash
   npm run dev
   ```

   Production:

   ```bash
   npm start
   ```

   The API listens on `http://localhost:3000` by default.

## Seeded Test Accounts

After running `npm run seed`:

| Email             | Password     |
| ----------------- | ------------ |
| alice@example.com | Password123! |
| bob@example.com   | Password123! |

## API Endpoints

All protected routes require:

```http
Authorization: Bearer <access_token>
```

### Authentication

#### `POST /api/auth/register`

Create a local account.

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Jane Doe"
}
```

#### `POST /api/auth/login`

Authenticate and receive tokens.

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Response includes `accessToken` and `refreshToken`.

#### `POST /api/auth/logout` (Protected)

Log out the authenticated user, revoke all refresh tokens, and invalidate all outstanding access tokens.

```json
{
  "message": "Logged out successfully. All access tokens have been invalidated."
}
```

#### `POST /api/auth/social`

Verify a social provider payload and sign in (or create) the user.

Google example:

```json
{
  "provider": "google",
  "idToken": "<google-id-token>"
}
```

### Tasks (Protected)

| Method | Path             | Description                     |
| ------ | ---------------- | ------------------------------- |
| POST   | `/api/tasks`     | Create a task                   |
| GET    | `/api/tasks`     | List authenticated user's tasks |
| GET    | `/api/tasks/:id` | Get a single task by ID         |
| PUT    | `/api/tasks/:id` | Update task or mark complete    |
| DELETE | `/api/tasks/:id` | Permanently delete a task       |

Create task body:

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "dueDate": "2026-06-20T12:00:00.000Z"
}
```

Update task body (all fields optional):

```json
{
  "title": "Buy groceries",
  "description": "Updated list",
  "completed": true,
  "dueDate": "2026-06-21T12:00:00.000Z"
}
```

### User Profile (Protected)

#### `GET /api/user/profile`

Return the authenticated user's profile.

#### `PUT /api/user/profile`

Update profile fields and optionally change password (local accounts only).

```json
{
  "name": "Jane Doe",
  "avatarUrl": "https://example.com/avatar.png",
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

#### `DELETE /api/user/account`

Permanently delete the authenticated user's account and all associated data (tasks and refresh tokens). Local accounts must confirm with their current password.

```json
{
  "password": "Password123!"
}
```

Returns `204 No Content` on success.

## Example cURL Flow

```bash
# Register
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Password123!","name":"Demo User"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).accessToken")

# Create task
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write tests","description":"Add integration tests"}'

# List tasks
curl -s http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Get a single task (replace TASK_ID)
curl -s http://localhost:3000/api/tasks/TASK_ID \
  -H "Authorization: Bearer $TOKEN"

# Logout and invalidate tokens
curl -s -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Delete account (requires password for local accounts)
curl -s -X DELETE http://localhost:3000/api/user/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"Password123!"}'
```

## Project Structure

```
taskify_apis/
├── sql/
│   ├── migrations/001_initial_schema.sql
│   └── seeds/001_seed_data.sql
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── index.js
├── .env.example
└── package.json
```

## Database

SQLite database file path is controlled by `DATABASE_PATH` (default: `./data/taskify.db`).

Tables:

- `users` — local and social accounts (includes `token_version` for access token invalidation)
- `refresh_tokens` — hashed refresh token store
- `tasks` — per-user task records

Migrations run automatically on server startup and via `npm run migrate`.

## Security Notes

- Passwords are hashed with bcrypt (12 rounds)
- Refresh tokens are stored as SHA-256 hashes, not plaintext
- Logout revokes all refresh tokens and bumps `token_version` to invalidate access tokens
- Auth routes are rate-limited separately from general API traffic
- Use unique, long JWT secrets in production
- Set `NODE_ENV=production` and configure CORS appropriately for deployment

## npm Scripts

| Script    | Description                               |
| --------- | ----------------------------------------- |
| `start`   | Run the API server                        |
| `dev`     | Run with Node watch mode                  |
| `migrate` | Apply SQL schema migration                |
| `seed`    | Insert development users and sample tasks |
| `setup`   | Run migrate + seed                        |

## Health Check

```bash
curl http://localhost:3000/health
```
