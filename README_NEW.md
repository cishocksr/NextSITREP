# Veteran Connection

[![CI Pipeline](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/ci.yml)
[![Dependency Check](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/dependency-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack web application connecting US Military Veterans with essential resources including housing, medical care, education, and employment assistance.

> **Note**: This is an active learning project following an 18-phase curriculum. See [TODO.md](./TODO.md) for the complete roadmap.

## 🎯 Project Goals

- **Primary**: Build a comprehensive resource directory for US Military Veterans
- **Learning**: Master full-stack development through hands-on practice
- **Portfolio**: Demonstrate professional development practices and modern tech stack

## 🛠️ Tech Stack

### Backend
- **Java 21 LTS** with **Spring Boot 3.4.13**
- **PostgreSQL 15** for database
- **Spring Security** for authentication
- **Spring Data JPA** for ORM
- **Maven** for dependency management
- **Lombok** for code generation

### Frontend
- **Next.js 16** (React 19) with **TypeScript**
- **Tailwind CSS v4** for styling
- **shadcn/ui** for component library
- **Bun** as JavaScript runtime and package manager
- **Biome** for linting and formatting

### DevOps & Tools
- **Docker Compose** for local PostgreSQL
- **GitHub Actions** for CI/CD
- **JWT** for authentication tokens

## 📁 Project Structure

```
veteran-connection/
├── backend/              # Spring Boot API
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/    # Java source code
│   │   │   └── resources/
│   │   └── test/         # Unit and integration tests
│   ├── pom.xml          # Maven dependencies
│   └── mvnw             # Maven wrapper
├── fontend/             # Next.js application
│   ├── app/             # Next.js app directory
│   ├── public/          # Static assets
│   ├── biome.json       # Biome configuration
│   └── package.json     # Node dependencies
├── .github/
│   ├── workflows/       # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/  # Issue templates
├── docker-compose.yml   # PostgreSQL container
└── TODO.md             # 18-phase curriculum
```

## 🚀 Getting Started

### Prerequisites

- **Java 21+** (JDK)
- **Bun** (latest)
- **PostgreSQL 15** (or use Docker)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/veteran-connection.git
cd veteran-connection
```

### 2. Start PostgreSQL (Docker)

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432` with:
- Database: `veteran_connection`
- Username: `postgres`
- Password: `postgres`

### 3. Setup Backend

```bash
cd backend

# Create .env file from example
cp .env.example .env

# Build and run
./mvnw spring-boot:run
```

Backend runs on `http://localhost:8080`

### 4. Setup Frontend

```bash
cd fontend

# Create .env.local file from example
cp .env.example .env.local

# Install dependencies
bun install

# Run development server
bun dev
```

Frontend runs on `http://localhost:3000`

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
./mvnw test
```

### Frontend Linting
```bash
cd fontend
bun run lint
bun run type-check
```

## 🏗️ Development Workflow

This project follows a **professional Git workflow** even though it's a solo project:

1. **Feature branches**: Create branches from `main` for each feature/phase
2. **Pull requests**: Use PR template for all changes
3. **CI/CD**: All PRs must pass automated checks
4. **Code review**: Self-review using the PR template checklist

### Creating a Feature Branch

```bash
git checkout -b feature/phase-2-tdd-setup
# Make changes
git add .
git commit -m "feat: setup TDD infrastructure"
git push origin feature/phase-2-tdd-setup
# Create PR on GitHub
```

## 📚 Curriculum Progress

This project follows an 18-phase structured curriculum. Current progress:

- [x] **Phase 1**: Project Setup & CI/CD Foundation
- [ ] **Phase 2**: Test-Driven Development Setup
- [ ] **Phase 3**: Spring Boot Fundamentals
- [ ] **Phase 4**: Database Design with JPA
- [ ] **Phase 5**: Spring Security & JWT
- [ ] **Phase 6**: React Components with shadcn/ui
- [ ] ... (See [TODO.md](./TODO.md) for complete curriculum)

## 🤝 Contributing

While this is primarily a learning project, contributions and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please use the provided issue templates for bugs, features, or learning tasks.

## 📖 Learning Blog

Follow the development journey and technical learnings:
- [Blog Link Coming Soon]

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎓 Educational Context

This project serves as a comprehensive learning experience covering:
- Full-stack web development
- Test-Driven Development (TDD)
- RESTful API design
- Database design and ORM
- Authentication and authorization
- Modern frontend development
- CI/CD pipelines
- Professional development workflows

## 🔗 Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic Claude Docs](https://docs.claude.com)
- [TODO.md](./TODO.md) - Complete curriculum roadmap

---

**Built with** ☕ **and** 🧠 **as a learning journey**
