# VeteransConnect

[![CI Pipeline](https://github.com/cishocksr/veterans-connect/actions/workflows/ci.yml/badge.svg)](https://github.com/cishocksr/veterans-connect/actions/workflows/ci.yml)
[![Dependency Check](https://github.com/cishocksr/veterans-connect/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/cishocksr/veterans-connect/actions/workflows/dependency-check.yml)

VeteransConnect is a full-stack web application for helping U.S. military veterans find, save, and organize nearby resources for healthcare, benefits, education, housing, employment, and related support.

This repository is an active learning and portfolio project. It is built as a realistic production-style application, but it should not be treated as an official VA service or as professional legal, medical, financial, or benefits advice.

## Current Features

- Account registration and login with Spring Security, BCrypt password hashing, JWT-backed HttpOnly session cookies, CSRF protection, and basic auth rate limiting.
- Veteran profile fields for branch of service and zip code.
- Resource search endpoints backed by the VA Facilities API sandbox and OpenStreetMap Nominatim geocoding.
- Saved resources with personal notes.
- Authenticated dashboard pages for home, resource search, and saved resources.
- Frontend unit tests with Vitest and React Testing Library.
- Backend unit, controller, repository, and client tests with JUnit 5, Mockito, AssertJ, H2, and JaCoCo coverage checks.
- GitHub Actions CI for backend compile/tests and frontend lint, format, type check, and build.

## Tech Stack

### Backend

- Java 21
- Spring Boot 3.4.13
- Spring Web, Spring Security, Spring Data JPA, validation, and actuator
- PostgreSQL 15 for local development
- Flyway database migrations
- Maven
- Lombok
- JJWT

### Frontend

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun
- Biome
- Vitest and React Testing Library

### Local Infrastructure

- Docker Compose for PostgreSQL
- Optional pgAdmin profile
- Optional full-stack Docker profile for backend and frontend containers

## Project Structure

```text
veterans-connect/
├── backend/              # Spring Boot API
│   ├── src/main/java/    # Application source
│   ├── src/main/resources/
│   │   └── db/migration/ # Flyway migrations
│   ├── src/test/         # Backend tests
│   ├── pom.xml
│   └── mvnw
├── frontend/             # Next.js application
│   ├── app/              # App Router pages and layouts
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── test/
│   ├── package.json
│   └── biome.json
├── .github/workflows/    # CI workflow
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Java 21 or newer
- Bun
- Docker, for local PostgreSQL
- Git
- A VA Facilities API sandbox key for live resource search

## Environment Setup

Create the root Docker Compose environment file:

```bash
cp .env.example .env
```

Docker Compose reads this file automatically. If you run the backend directly with Maven, provide the same values through your shell or IDE environment. At minimum, set:

```text
POSTGRES_DB=veteran_connection
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<local-password>
JWT_SECRET=<base64-encoded-32-byte-secret>
VA_API_KEY=<your-va-facilities-sandbox-key>
CORS_ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Generate a development JWT secret with:

```bash
openssl rand -base64 32
```

For the frontend, create a local env file when running Next.js directly:

```bash
cp frontend/.env.local.example frontend/.env.local
```

## Running Locally

Start PostgreSQL:

```bash
docker-compose up -d postgres
```

Run the backend after setting the needed backend environment variables:

```bash
backend/mvnw -f backend/pom.xml spring-boot:run
```

The backend runs at `http://localhost:8080`.

Install frontend dependencies and start Next.js:

```bash
bun install --cwd frontend
bun run --cwd frontend dev
```

The frontend runs at `http://localhost:3000`.

## Optional Docker Profiles

Start PostgreSQL with pgAdmin:

```bash
docker-compose --profile tools up -d
```

Start the full stack in Docker:

```bash
docker-compose --profile full-stack up --build
```

## Quality Checks

Run backend tests:

```bash
backend/mvnw -f backend/pom.xml test -B
```

Run frontend checks:

```bash
bun run --cwd frontend lint:check
bun run --cwd frontend format:check
bun run --cwd frontend type-check
bun run --cwd frontend test:run
bun run --cwd frontend build
```

## API Notes

The backend exposes versioned API routes under `/api/v1`.

Auth routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/csrf`

Resource routes:

- `GET /api/v1/resources/search`
- `GET /api/v1/resources/saved`
- `POST /api/v1/resources/saved`
- `PATCH /api/v1/resources/saved/{id}/notes`
- `DELETE /api/v1/resources/saved/{id}`

## Public Readiness Notes

- Do not commit `.env`, `.env.local`, API keys, JWT secrets, database credentials, or production domain settings.
- The default values in tracked example files are placeholders for local development.
- The project currently has no tracked license file; add one before advertising a specific open-source license.
