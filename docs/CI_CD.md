# CI/CD Pipeline Documentation

## Overview

This project uses **GitHub Actions** for Continuous Integration and Continuous Deployment (CI/CD). The pipeline is designed to catch issues early, maintain code quality, and provide fast feedback during development.

## Pipeline Structure

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push to `main`/`develop` branches and on all pull requests.

#### Backend Job
- **Purpose**: Validate Java code, run tests, generate reports
- **Triggers**: Changes to backend code
- **Steps**:
  1. Checkout code
  2. Set up Java 21 with Temurin distribution
  3. Cache Maven dependencies
  4. Build project with Maven
  5. Run unit and integration tests
  6. Generate Surefire test reports
  7. Upload test results as artifacts

**Key Features**:
- Maven dependency caching for faster builds
- Test result artifacts retained for 30 days
- Parallel execution with frontend job

#### Frontend Job
- **Purpose**: Validate TypeScript/React code, ensure code quality
- **Triggers**: Changes to frontend code
- **Steps**:
  1. Checkout code
  2. Set up Bun (latest version)
  3. Cache Bun dependencies
  4. Install dependencies with frozen lockfile
  5. Run Biome linting
  6. Run Biome format check
  7. Type check with TypeScript
  8. Build Next.js application
  9. Upload build artifacts

**Key Features**:
- Bun dependency caching
- Separate linting and formatting checks
- TypeScript type checking
- Build artifact retention (7 days)

#### Quality Gate Job
- **Purpose**: Aggregate results and enforce quality standards
- **Triggers**: After backend and frontend jobs complete
- **Logic**:
  - Waits for both backend and frontend jobs
  - Fails if either job fails
  - Provides clear pass/fail feedback

### 2. Dependency Check Pipeline (`.github/workflows/dependency-check.yml`)

Runs weekly on Mondays and can be triggered manually.

#### Backend Dependencies
- Lists dependency tree
- Checks for available updates
- Helps maintain security and compatibility

#### Frontend Dependencies
- Checks for outdated packages
- Runs npm audit for security vulnerabilities
- Provides visibility into dependency health

## Workflow Triggers

### Automatic Triggers
```yaml
# Main CI Pipeline
- Push to main or develop branches
- Pull requests to main or develop branches

# Dependency Check
- Every Monday at 9 AM UTC
- Changes to dependency files (pom.xml, package.json, bun.lock)
```

### Manual Triggers
Both workflows can be triggered manually via GitHub Actions UI:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"

## Artifacts

### Test Results Artifact
- **Name**: `backend-test-results`
- **Location**: `backend/target/surefire-reports/`
- **Retention**: 30 days
- **Purpose**: Review test results, debugging failures

### Build Artifact
- **Name**: `frontend-build`
- **Location**: `fontend/.next/`
- **Retention**: 7 days
- **Purpose**: Verify build output, deployment validation

## Caching Strategy

### Maven Cache
```yaml
path: ~/.m2/repository
key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}
```
- Caches Maven dependencies
- Reduces build time from ~5 minutes to ~30 seconds
- Invalidates on pom.xml changes

### Bun Cache
```yaml
path: 
  - ~/.bun/install/cache
  - fontend/node_modules
key: ${{ runner.os }}-bun-${{ hashFiles('fontend/bun.lock') }}
```
- Caches Bun installation and node_modules
- Reduces install time from ~2 minutes to ~10 seconds
- Invalidates on bun.lock changes

## Status Badges

Add these badges to your README to show CI/CD status:

```markdown
[![CI Pipeline](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/ci.yml)
[![Dependency Check](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/YOUR_USERNAME/veteran-connection/actions/workflows/dependency-check.yml)
```

## Local Development vs CI

### Running Checks Locally

**Backend**:
```bash
cd backend
./mvnw clean test
./mvnw dependency:tree
```

**Frontend**:
```bash
cd fontend
bun run lint:check
bun run format:check
bun run type-check
bun run build
```

### Why CI Matters

Even if tests pass locally:
- Different environments can cause issues
- Team members might have different setups
- CI ensures consistency across all contributions
- Automated checks prevent human error

## Future Enhancements (Later Phases)

### Phase 7-10: Integration Tests
- Add integration test jobs
- Test database migrations
- API contract testing

### Phase 12-15: Deployment
- Add deployment workflows
- Environment-specific builds
- Automated releases

### Phase 16-18: Advanced CI/CD
- Code coverage reports
- Security scanning (OWASP Dependency-Check)
- Performance benchmarking
- Automated dependency updates (Dependabot)

## Troubleshooting

### Common Issues

**1. Maven Build Fails**
```bash
# Clear local Maven cache
rm -rf ~/.m2/repository

# Re-run build
./mvnw clean install
```

**2. Bun Install Fails**
```bash
# Clear Bun cache
rm -rf ~/.bun/install/cache

# Re-install
bun install --force
```

**3. CI Job Times Out**
- Check for infinite loops in tests
- Review slow database queries
- Consider increasing timeout in workflow

**4. Cache Not Working**
- Verify cache key hasn't changed
- Check if cache size exceeds 5GB limit
- Review cache hit/miss in action logs

## Best Practices

1. **Keep CI Fast**: Target < 5 minutes total runtime
2. **Fail Fast**: Run quick checks (linting) before slow ones (tests)
3. **Parallel Execution**: Run independent jobs concurrently
4. **Meaningful Names**: Use clear job and step names
5. **Artifact Management**: Keep artifacts small, clean up old ones
6. **Security**: Never commit secrets, use GitHub Secrets for sensitive data

## Monitoring

### View Workflow Runs
1. Go to repository → Actions tab
2. Select workflow from sidebar
3. Click on specific run to see details

### Understanding Results
- ✅ Green check: All jobs passed
- ❌ Red X: At least one job failed
- 🟡 Yellow dot: Workflow is running
- ⚫ Gray circle: Workflow was cancelled

## Learning Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Maven CI Best Practices](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Last Updated**: Phase 1
**Next Review**: Phase 2 (Add TDD pipeline)
