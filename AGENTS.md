# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Veterans Connection is a full-stack app connecting US Military Veterans with resources (housing, medical, education, employment). It follows an 18-phase curriculum — only Phase 1 (project setup & CI/CD) is complete. Many service methods in the backend are stubbed with `throw new UnsupportedOperationException`.

## Build & Run Commands

### Prerequisites

- Java 21+, Bun (latest), Docker (for PostgreSQL)

### Database

```sh
# Create env file first (required by Docker Compose variable substitution)
cp .env.example .env

# Start PostgreSQL (localhost:5432, db: veteran_connection, user/pass: postgres/postgres)
docker-compose up -d
```

### Backend (Spring Boot + Maven)

```sh
# Build
backend/mvnw -f backend/pom.xml clean compile -B

# Run
backend/mvnw -f backend/pom.xml spring-boot:run

# Run all tests (JUnit 5 + JaCoCo coverage ≥70% enforced)
backend/mvnw -f backend/pom.xml test -B

# Run a single test class
backend/mvnw -f backend/pom.xml test -Dtest=UserTest -B

# Run a single test method
backend/mvnw -f backend/pom.xml test -Dtest=UserTest#shouldCreateUserWithValidData -B
```

Backend runs on `http://localhost:8080`.

### Frontend (Next.js 16 + Bun)

```sh
# Install dependencies
bun install --cwd frontend

# Dev server (http://localhost:3000)
bun run --cwd frontend dev

# Build
bun run --cwd frontend build

# Lint (Biome, auto-fixes)
bun run --cwd frontend lint

# Lint check only (no auto-fix, used in CI)
bun run --cwd frontend lint:check

# Format check
bun run --cwd frontend format:check

# Type check
bun run --cwd frontend type-check
```

## Architecture

### Backend (`backend/`)

Spring Boot 3.4.13 app, Java 21, Maven. Base package: `com.veteransconnect`.

Layered architecture:
- **model/** — JPA entities with Lombok (`@Data`, `@Builder`) and Jakarta Validation annotations. `User` is the core entity (UUID PK, email, firstName, lastName, branchOfService enum, zipCode).
- **model/enums/** — `BranchOfService` enum (ARMY, NAVY, AIR_FORCE, MARINES, COAST_GUARD, SPACE_FORCE) with display name and case-insensitive lookup via `fromDisplayName()`.
- **dto/** — Java records for API request/response. `UserRegistrationRequest` for input, `UserResponse` with a static `from(User)` factory for output.
- **repository/** — Spring Data JPA interfaces extending `JpaRepository`. Custom query methods follow Spring Data naming (e.g. `findByBranchOfService`, `findByZipCode`, `existsByEmail`).
- **service/** — Interface + Impl pattern. `UserService` defines the contract; `UserServiceImpl` is `@Transactional` and uses constructor injection via Lombok `@RequiredArgsConstructor`.
- **exception/** — Custom runtime exceptions: `UserNotFoundException`, `DuplicateEmailException`.

### Testing (Backend)

- **Unit tests** use JUnit 5 + AssertJ + Mockito. Follow Given/When/Then comment structure.
- **Repository tests** use `@DataJpaTest` with `TestEntityManager` and H2 in-memory DB (profile: `application-test.properties`). Security is disabled in test profile.
- **Service tests** use `@ExtendWith(MockitoExtension.class)` with `@Mock`/`@InjectMocks`.
- JaCoCo enforces minimum 70% line coverage at the BUNDLE level.

### Frontend (`frontend/`)

Next.js 16 (React 19) with App Router. Currently scaffolded — only `app/layout.tsx` and `app/page.tsx` exist.

- **Package manager**: Bun (lockfile: `bun.lock`)
- **Styling**: Tailwind CSS v4 via PostCSS
- **Linting/Formatting**: Biome 2.x (not ESLint/Prettier). Config in `frontend/biome.json`. Uses 2-space indent, organizes imports automatically. Next.js and React recommended rules enabled.
- **Path alias**: `@/*` maps to `frontend/*` (configured in `tsconfig.json`)
- **API URL**: Set via `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8080/api`)

### CI/CD (`.github/workflows/ci.yml`)

Runs on push/PR to `main` and `develop`. Backend job: Maven compile + test. Frontend job: `bun install --frozen-lockfile`, Biome lint check, format check, type check, `next build`. A quality gate job requires both to pass.

## Conventions

- Git workflow: feature branches from `main`, PRs required, conventional commit messages (e.g. `feat:`, `fix:`)
- Backend DTOs are Java records, not classes
- Entities use Lombok `@Builder` pattern — tests construct objects via builder
- Test classes use `@DisplayName` annotations on both class and method level
- The frontend directory is named `frontend/` in the repo (the README sometimes references `fontend/` which is a typo)
