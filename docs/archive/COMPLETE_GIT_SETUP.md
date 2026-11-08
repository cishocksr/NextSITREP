# Complete Git Setup Checklist

## 🚨 Problem: Files Missing from GitHub Repository

Your CI is failing because files exist locally but haven't been committed to GitHub.

## 📋 Complete Fix (10 minutes)

### Step 1: Verify Your Current Repository State

```bash
cd veteran-connection

# Check what's in Git
git status

# Check what's on GitHub vs local
git diff origin/main
```

### Step 2: Verify All Directories Exist Locally

```bash
# Check directory structure
ls -la

# You should see:
# - backend/
# - fontend/
# - docs/
# - .github/
# - docker-compose.yml
# - README.md
# etc.
```

### Step 3: Check Each Directory's Contents

#### Backend Check
```bash
ls -la backend/

# Must include:
# - mvnw (executable)
# - mvnw.cmd
# - .mvn/
# - pom.xml
# - src/
# - .env.example
```

#### Frontend Check
```bash
ls -la fontend/

# Must include:
# - package.json
# - tsconfig.json
# - next.config.ts
# - biome.json
# - app/
# - public/
# - .env.example
```

#### Documentation Check
```bash
ls -la docs/

# Must include:
# - CI_CD.md
# - DEVELOPER_WORKFLOW.md
# - PHASE_1_SUMMARY.md
# - PHASE_1_CHECKLIST.md
# - TROUBLESHOOTING_MAVEN_WRAPPER.md
# - QUICK_FIX_CI.md
```

#### GitHub Actions Check
```bash
ls -la .github/workflows/

# Must include:
# - ci.yml
# - dependency-check.yml
```

### Step 4: Update .gitignore

Edit `.gitignore` and ensure it looks like this:

```bash
# Backend (DO NOT ignore mvnw!)
backend/target/
backend/.idea/
backend/*.iml

# Frontend
fontend/node_modules/
fontend/.next/
fontend/dist/
fontend/.env.local
fontend/.env.production

# Environment files
.env
*.env
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Logs
*.log
logs/

# Database
*.db

# DOCS
TODO.md

frontend_react
```

### Step 5: Force Add Everything

```bash
# Add all files, including previously ignored ones
git add -A

# Force add Maven wrapper specifically
git add -f backend/mvnw backend/mvnw.cmd backend/.mvn/

# Make mvnw executable
chmod +x backend/mvnw

# Check what will be committed
git status
```

### Step 6: Review What's Being Added

```bash
# See the full diff
git diff --cached

# Count files being added
git diff --cached --stat
```

**Expected output should include**:
- `fontend/` directory with all files
- `backend/mvnw` and related files
- `.github/workflows/` files
- `docs/` files
- Updated `.gitignore`

### Step 7: Commit Everything

```bash
git commit -m "feat: complete Phase 1 setup with frontend, backend, CI/CD, and docs"
```

### Step 8: Push to GitHub

```bash
# Push to main branch
git push origin main

# If you get rejected, you may need to pull first:
# git pull origin main --rebase
# git push origin main
```

### Step 9: Verify on GitHub

1. Go to https://github.com/YOUR_USERNAME/veteran-connection
2. Check that you see:
   - `backend/` directory with mvnw files
   - `fontend/` directory with all Next.js files
   - `.github/` directory with workflows
   - `docs/` directory with documentation
   - `docker-compose.yml`
   - `README.md`

### Step 10: Watch CI Run

1. Go to Actions tab
2. Latest workflow should be running
3. Both backend and frontend jobs should pass ✅

---

## 🔍 Troubleshooting

### Problem: "Nothing to commit"

If `git status` shows "nothing to commit", your files might already be committed locally but not pushed:

```bash
# Check commit history
git log --oneline -5

# Check if ahead of remote
git status

# If it says "Your branch is ahead", just push:
git push origin main
```

### Problem: Large File Warnings

If you get warnings about large files:

```bash
# Check what's large
du -sh fontend/node_modules
du -sh backend/target

# These should be ignored by .gitignore
# If they're not, update .gitignore and remove from Git:
git rm -r --cached fontend/node_modules
git rm -r --cached backend/target
git commit -m "fix: remove build artifacts from repository"
```

### Problem: "Updates were rejected"

If push is rejected:

```bash
# Pull with rebase
git pull origin main --rebase

# Resolve any conflicts if they occur
# Then push again
git push origin main
```

### Problem: Permission Denied on mvnw

```bash
# Make executable
chmod +x backend/mvnw

# Add the change
git add backend/mvnw

# Commit
git commit -m "fix: make mvnw executable"
git push
```

---

## ✅ Verification Checklist

After pushing, verify each item:

### Local Checks
- [ ] `git status` shows "working tree clean"
- [ ] `git log` shows your commits
- [ ] `./backend/mvnw clean test` runs successfully
- [ ] `cd fontend && bun install && bun dev` runs successfully

### GitHub Checks
- [ ] Can see `backend/` directory on GitHub
- [ ] Can see `fontend/` directory on GitHub
- [ ] Can see `.github/workflows/` on GitHub
- [ ] Can see `docs/` directory on GitHub
- [ ] README.md displays correctly

### CI/CD Checks
- [ ] Go to Actions tab
- [ ] Latest workflow run is green ✅
- [ ] Both backend and frontend jobs passed
- [ ] Quality gate job passed

---

## 📊 Expected File Count

After everything is committed, you should have approximately:

```
Total: ~50-60 files

Backend: ~15 files
- Source files: 3
- Maven wrapper: 4
- Config files: 3
- Others: 5

Frontend: ~20 files
- Source files: 5
- Config files: 5
- Public assets: 5
- Node types: 5

Documentation: ~10 files
GitHub Actions: ~6 files
Root files: ~5 files
```

---

## 🎓 What Went Wrong

**Most likely scenario**: You were working locally and testing everything, but forgot to commit and push the files to GitHub. This is very common!

**Key lesson**: Always verify files are on GitHub, not just on your local machine.

**Best practice**: Commit and push frequently (at least once per hour during active development).

---

## 🚀 After Everything is Pushed

Once all files are on GitHub and CI passes:

1. ✅ Phase 1 is complete
2. 🎉 Celebrate - you have a professional setup!
3. 📝 Document what you learned
4. 🚀 Ready for Phase 2 (TDD)

---

## 💡 Prevention for Future

### Commit Frequently
```bash
# After completing any logical unit of work:
git add .
git commit -m "feat: [what you did]"
git push
```

### Use Branches
```bash
# For each new feature:
git checkout -b feature/phase-X-something
# Work, commit, push
git push origin feature/phase-X-something
# Create PR on GitHub
```

### Verify Before Moving On
```bash
# Always check GitHub matches your local:
git status
git log origin/main..HEAD  # Shows unpushed commits
```

---

**Run through this checklist, and your CI should pass!** 🎉
