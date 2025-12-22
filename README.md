# Veteran Connection

A web application connecting US Military Veterans with essential resources including housing, medical care, education, and employment assistance.

## Tech Stack

- **Backend**: Java Spring Boot, PostgreSQL
- **Frontend**: React, Bun, shadcn/ui
- **Authentication**: JWT

## Project Structure

```
veteran-connection/
├── backend/          # Spring Boot API
├── frontend/         # React application
├── docs/             # Documentation
└── TODO.md           # Development curriculum
```

## Getting Started

### Prerequisites

- Java JDK 17+
- Node.js and Bun
- PostgreSQL (or use Docker Compose)

### Backend Setup

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend Setup

```bash
cd frontend
bun install
bun run dev
```

### Database Setup (with Docker)

```bash
docker-compose up -d
```

## Development

See [TODO.md](./TODO.md) for the complete development roadmap.

## License

MIT
