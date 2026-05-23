# Wanderlust Server

A Node.js and Express API for the Wanderlust travel booking platform. The server manages travel destinations, user bookings, MongoDB persistence, CORS, and JWT-based authorization through a client-provided JWKS endpoint.

## Features

- Express 5 REST API
- MongoDB database integration
- Destination CRUD endpoints
- Booking creation, listing, and deletion
- User JWT verification with remote JWKS
- Admin-only destination management
- CORS configured for local development and deployed client URL
- Vercel-ready serverless deployment configuration
- Optional destination seed script

## Tech Stack

- Node.js 20+
- Express
- MongoDB Node.js Driver
- jose-cjs
- dotenv
- cors
- Vercel

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB connection string
- A client application that exposes a JWKS endpoint at:

```text
{CLIENT_URL}/api/auth/jwks
```

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then update the values:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=wanderlast
CLIENT_URL=http://localhost:3000
PORT=5000
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. `MONGO_DB_URI` is also supported as a fallback. |
| `MONGODB_DB` | No | Database name. Defaults to `wanderlast`. |
| `CLIENT_URL` | Yes | Frontend application URL used for CORS and JWKS discovery. |
| `BETTER_AUTH_URL` | No | Alternative client URL fallback. |
| `NEXT_PUBLIC_APP_URL` | No | Alternative client URL fallback. |
| `PORT` | No | Local server port. Defaults to `5000`. |

## Running Locally

Start the development server with file watching:

```bash
npm run dev
```

Start the production-style local server:

```bash
npm start
```

The API will be available at:

```text
http://localhost:5000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the server with Node.js watch mode. |
| `npm start` | Starts the Express server. |
| `npm run build` | Checks `index.js` syntax. |
| `npm run vercel-build` | Runs the Vercel build check. |
| `node scripts/seed-best-cities.js` | Seeds curated travel destinations into MongoDB. |

## API Reference

### Health

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Confirms the server is running. |
| `GET` | `/health` | Public | Returns API health status. |

### Destinations

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/destinations` | Public | Get all destinations. |
| `GET` | `/destinations/:id` | Public | Get one destination by MongoDB ObjectId. |
| `POST` | `/destinations` | Admin | Create a destination. |
| `PATCH` | `/destinations/:id` | Admin | Update a destination. |
| `DELETE` | `/destinations/:id` | Admin | Delete a destination. |

### Bookings

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/bookings` | User | Create a booking for the authenticated user. |
| `GET` | `/bookings/:userId` | User | Get bookings for the authenticated user. |
| `DELETE` | `/bookings/:id` | User | Delete one of the authenticated user's bookings. |

## Authentication

Protected routes require a Bearer token:

```http
Authorization: Bearer <jwt>
```

The server verifies tokens using the remote JWKS endpoint from the configured client URL:

```text
{CLIENT_URL}/api/auth/jwks
```

User routes require the token subject to match the requested or submitted `userId`. The server accepts the user ID from `sub`, `id`, or `userId` in the JWT payload.

Admin routes require:

```json
{
  "role": "admin"
}
```

## Database Collections

The API uses the configured MongoDB database with these collections:

| Collection | Purpose |
| --- | --- |
| `destinations` | Travel destination packages and metadata. |
| `bookings` | User booking records. |

## Seeding Destinations

To seed curated destination data:

```bash
node scripts/seed-best-cities.js
```

The seed script upserts destination records by `slug` and stores metadata such as pricing, location, category, highlights, rating, availability, and source information.

## Deployment

This project includes `vercel.json` for Vercel serverless deployment.

Before deploying, configure these environment variables in Vercel:

- `MONGODB_URI`
- `MONGODB_DB`
- `CLIENT_URL`

Vercel routes all requests to `index.js`, and the server skips `app.listen()` when running in the Vercel environment.

## Project Structure

```text
.
|-- index.js
|-- package.json
|-- scripts/
|   `-- seed-best-cities.js
|-- vercel.json
|-- .env.example
`-- README.md
```

## License

ISC
