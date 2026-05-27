# Bus Ticketing System Backend

TypeScript/Express backend for the bus ticketing system. Provides REST APIs for users, trips, bookings, payments, routing, notifications, and admin operations.

## Tech Stack

- Node.js + TypeScript
- Express
- MongoDB (Mongoose)
- JWT auth
- Socket.IO
- Nodemailer + SMTP
- Cloudinary (optional)

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- MongoDB instance (local or hosted)

### Install

```bash
npm install
```

### Configure Environment

Create a `.env` file in the project root. Minimum required for local dev:

```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

Optional but recommended:

```
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
JWT_EXPIRES_IN=7d
VERIFICATION_TOKEN_EXPIRES_IN=1h

# SMTP (required in production)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Bus Ticketing <no-reply@example.com>"

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run in Development

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` - Start the API with nodemon
- `npm run build` - Compile TypeScript to `dist/` and verify build output
- `npm start` - Run compiled server from `dist/`
- `npm run lint` - Run ESLint
- `npm run seed:routes` - Seed initial routes
- `npm run seed:more-routes` - Seed additional routes

## Project Structure

```
src/
  config/        # env, db, mailer, cloudinary
  controllers/   # request handlers
  middleware/    # auth, validation, error handling
  models/        # mongoose schemas
  routes/        # API route definitions
  services/      # business logic
  seeds/         # data seed scripts
  utils/         # helpers
  validations/   # request validation schemas
```

## Notes

- `MONGO_URI` (or `MONGODB_URI`) and `JWT_SECRET` are required at startup.
- In production, `CLIENT_URL` and `APP_URL` must be non-localhost and SMTP settings are required.
