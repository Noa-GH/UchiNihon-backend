````markdown
# Akiya Finder — Backend API

A standalone REST API for the Akiya Finder Japan platform.
Built with Node.js, Express, MongoDB, and JWT authentication.

Any frontend (web, mobile, or third-party) can consume this API.

---

## Setup

```bash
git clone <repo-url>
cd akiya-finder-backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

---

## Environment Variables

| Variable      | Required | Description                                                          |
| ------------- | -------- | -------------------------------------------------------------------- |
| `PORT`        | Yes      | Port to run the server on (default: 3001)                            |
| `MONGO_URI`   | Yes      | MongoDB connection string                                            |
| `JWT_SECRET`  | Yes      | Secret key for signing JWTs — use a long random string in production |
| `CORS_ORIGIN` | Yes      | URL of the consuming frontend e.g. `https://akiyafinder.com`         |

---

## Base URL

Development: `http://localhost:3001`

All routes are prefixed with `/api`.

---

## Authentication

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/signin` and expire after 7 days.

---

## Endpoints

### Auth

#### `POST /api/signup`

Register a new user.

**Body:**

```json
{ "name": "string", "email": "string", "password": "string" }
```

**Response `201`:**

```json
{ "_id": "string", "name": "string", "email": "string" }
```

---

#### `POST /api/signin`

Login and receive a JWT.

**Body:**

```json
{ "email": "string", "password": "string" }
```

**Response `200`:**

```json
{ "token": "string" }
```

---

#### `GET /api/users/me` 🔒

Get the currently authenticated user's profile.

**Response `200`:**

```json
{ "_id": "string", "name": "string", "email": "string" }
```

---

### Saved Properties

All property routes require authentication (`Authorization: Bearer <token>`).

#### `GET /api/properties/saved` 🔒

Get all properties saved by the current user.

**Response `200`:** Array of saved property objects.

---

#### `POST /api/properties/saved` 🔒

Save a property listing.

**Body:**

```json
{
  "listingId": "string",
  "title": "string",
  "prefecture": "string",
  "city": "string",
  "price": 0,
  "imageUrl": "string",
  "bedrooms": 3,
  "sqMeters": 90,
  "yearBuilt": 1978,
  "description": "string",
  "tags": ["string"]
}
```

**Response `201`:** The saved property object including `_id`, `owner`, `createdAt`, `updatedAt`.

---

#### `DELETE /api/properties/saved/:id` 🔒

Remove a saved property by its MongoDB `_id`.

**Response `200`:**

```json
{ "message": "Property removed" }
```

---

## Error Format

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning                                                |
| ------ | ------------------------------------------------------ |
| 400    | Bad request / validation error                         |
| 401    | Missing or invalid token                               |
| 403    | Authenticated but not authorised                       |
| 404    | Resource not found                                     |
| 409    | Conflict (duplicate email or duplicate saved property) |
| 500    | Internal server error                                  |
````

---
