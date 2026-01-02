# Developer Workflow Guide

## Quick Reference for Feature Development

### 1. Starting a New Feature

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch (use descriptive names)
git checkout -b feature/phase-X-feature-name

# Examples:
# git checkout -b feature/phase-2-tdd-setup
# git checkout -b feature/phase-3-user-model
# git checkout -b bugfix/login-validation
```

### 2. Development Cycle

#### Backend Development
```bash
cd backend

# Run tests continuously during development
./mvnw test --watch  # (if available)
# OR manually:
./mvnw test

# Run specific test class
./mvnw test -Dtest=UserServiceTest

# Run application
./mvnw spring-boot:run
```

#### Frontend Development
```bash
cd fontend

# Run dev server (with hot reload)
bun dev

# Run linting in watch mode
bun run lint --watch

# Type check
bun run type-check

# Build to test for errors
bun run build
```

### 3. Before Committing

**Run all checks locally**:

```bash
# Backend checks
cd backend
./mvnw clean test
./mvnw dependency:tree

# Frontend checks
cd fontend
bun run lint:check
bun run format:check
bun run type-check
bun run build
```

### 4. Committing Changes

Use **conventional commits** for clear history:

```bash
# Feature
git commit -m "feat: add user authentication endpoint"

# Bug fix
git commit -m "fix: resolve null pointer in user service"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor: extract validation logic to separate class"

# Test
git commit -m "test: add integration tests for auth flow"

# Style/Format
git commit -m "style: format code with Biome"

# Chore (build, dependencies, etc.)
git commit -m "chore: update Spring Boot to 3.4.13"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools
- `perf`: Performance improvement
- `ci`: Changes to CI configuration files

### 5. Creating a Pull Request

```bash
# Push your branch
git push origin feature/phase-X-feature-name

# Go to GitHub and create PR
# The PR template will auto-populate
```

**PR Checklist**:
- [ ] Title follows format: `[PHASE X] Brief description`
- [ ] Description filled out completely
- [ ] Type of change selected
- [ ] All checkboxes reviewed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CI checks passing

### 6. PR Review Process (Self-Review)

1. **Wait for CI** to complete (usually 3-5 minutes)
2. **Review your own code**:
   - Read through the diff
   - Look for:
     - Leftover debug code
     - Commented-out code
     - TODOs that should be issues
     - Hardcoded values
     - Missing error handling
3. **Check CI results**
   - All jobs must be green ✅
   - Review test results
   - Check build artifacts
4. **Merge when ready**
   - Use "Squash and merge" for clean history
   - Delete branch after merge

### 7. After Merge

```bash
# Switch back to main
git checkout main

# Pull the latest
git pull origin main

# Delete local feature branch
git branch -d feature/phase-X-feature-name

# Start next feature
git checkout -b feature/phase-X-next-feature
```

## Common Scenarios

### Scenario 1: Working on Multiple Features

```bash
# Save current work
git add .
git commit -m "wip: save progress on feature X"

# Switch to different feature
git checkout feature/phase-X-other-feature

# Come back later
git checkout feature/phase-X-feature-name
```

### Scenario 2: Need to Update from Main

```bash
# Save your work
git add .
git commit -m "wip: checkpoint"

# Get latest from main
git checkout main
git pull origin main

# Rebase your branch
git checkout feature/phase-X-feature-name
git rebase main

# If conflicts, resolve them, then:
git add .
git rebase --continue
```

### Scenario 3: CI Failed

**Backend Test Failure**:
```bash
# View logs in GitHub Actions
# Reproduce locally:
cd backend
./mvnw clean test

# Fix the issue
# Re-commit
git add .
git commit -m "fix: resolve test failure in UserService"
git push origin feature/phase-X-feature-name
```

**Frontend Lint Failure**:
```bash
# Auto-fix most issues
cd fontend
bun run lint

# Fix remaining issues manually
# Re-commit
git add .
git commit -m "style: fix linting errors"
git push origin feature/phase-X-feature-name
```

### Scenario 4: Need to Split Large PR

```bash
# Create new branch from current point
git checkout -b feature/phase-X-feature-name-part1

# Reset original branch to earlier commit
git checkout feature/phase-X-feature-name
git reset --hard <commit-hash>

# Push both
git push origin feature/phase-X-feature-name-part1
git push origin feature/phase-X-feature-name --force
```

## Best Practices

### Commit Frequency
- **Commit often**: Every logical unit of work
- **Push regularly**: At least daily
- **Small commits**: Easier to review and revert

### Branch Management
- **Keep branches short-lived**: Merge within 1-3 days
- **Delete merged branches**: Keep repository clean
- **Descriptive names**: `feature/phase-3-user-authentication` not `feature/fix`

### Code Review (Self)
- **Check diff before pushing**: Review your own changes
- **Test thoroughly**: Don't rely only on CI
- **Document decisions**: Add comments for complex logic

### Testing
- **Write tests first** (TDD - Phase 2 onwards)
- **Run tests before pushing**: Catch issues early
- **Fix broken tests immediately**: Don't leave them failing

## Keyboard Shortcuts (Git)

```bash
# Create aliases for common commands
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'

# Usage:
git co main        # checkout main
git br -a          # list all branches
git ci -m "msg"    # commit with message
git st             # status
```

## Phase-Specific Workflows

### Phase 1-2: Setup & TDD
- Focus on infrastructure
- Small, incremental commits
- Document everything

### Phase 3-5: Core Backend
- Write tests first
- Follow TDD Red-Green-Refactor
- API documentation with each endpoint

### Phase 6-8: Frontend Development
- Component-driven development
- Test component behavior
- Mobile-first styling

### Phase 9-12: Integration
- End-to-end testing
- Performance profiling
- Security scanning

### Phase 13-15: Advanced Features
- Feature flags for new features
- A/B testing setup
- Analytics integration

### Phase 16-18: Polish & Deploy
- Code cleanup
- Documentation review
- Deployment automation

## Troubleshooting

### "Permission denied" on mvnw
```bash
chmod +x backend/mvnw
```

### "Bun command not found"
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (if not automatic)
export PATH="$HOME/.bun/bin:$PATH"
```

### "Port already in use"
```bash
# Backend (8080)
lsof -i :8080
kill -9 <PID>

# Frontend (3000)
lsof -i :3000
kill -9 <PID>
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart database
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs postgres
```

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Test-Driven Development](https://www.agilealliance.org/glossary/tdd/)

---

**Remember**: This is a learning project. The workflow is designed to build professional habits, not slow you down. As you become comfortable, you'll naturally speed up!
