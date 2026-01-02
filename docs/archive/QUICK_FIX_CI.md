# URGENT FIX: CI Failing - Maven Wrapper Missing

## 🚨 Quick Fix (5 minutes)

Your CI is failing because Maven wrapper files are missing from the repository.

### Step 1: Update .gitignore (30 seconds)

Edit your `.gitignore` file and **DELETE** these three lines:
```bash
backend/.mvn/
backend/mvnw
backend/mvnw.cmd
```

### Step 2: Add Maven Wrapper Files (2 minutes)

```bash
# Navigate to project root
cd veteran-connection

# Check if files exist
ls -la backend/mvnw

# If files exist, force add them:
git add -f backend/mvnw backend/mvnw.cmd backend/.mvn/
chmod +x backend/mvnw

# If files DON'T exist, generate them:
cd backend
mvn wrapper:wrapper
cd ..
```

### Step 3: Commit and Push (1 minute)

```bash
git add .gitignore
git add backend/mvnw backend/mvnw.cmd backend/.mvn/
git commit -m "fix: add Maven wrapper for CI/CD"
git push origin main
```

### Step 4: Verify CI Passes (1 minute)

1. Go to GitHub → Actions tab
2. Watch the latest workflow run
3. Should now pass ✅

## ✅ Verification Checklist

- [ ] `.gitignore` no longer contains `backend/mvnw`
- [ ] `git ls-files | grep mvnw` shows 4 files
- [ ] `./backend/mvnw clean test` runs successfully
- [ ] CI pipeline passes on GitHub Actions

## 📚 Full Details

See `docs/TROUBLESHOOTING_MAVEN_WRAPPER.md` for complete explanation and alternatives.

## 🎓 What You Learned

- Maven wrapper enables builds without Maven installed
- CI/CD requires all build tools in repository
- `.gitignore` templates can sometimes be wrong
- Always test CI changes before assuming they work

---

**This is a common mistake - you caught it early! Good debugging! 👍**
