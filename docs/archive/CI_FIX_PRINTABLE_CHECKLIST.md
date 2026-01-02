# ✅ CI FIX CHECKLIST (Printable)

Print this or keep it open while fixing your CI issues.

---

## 🎯 THE FIX (Check off as you complete)

### [ ] 1. Update .gitignore
Open `.gitignore` and **DELETE** these lines:
```
backend/.mvn/
backend/mvnw
backend/mvnw.cmd
```

### [ ] 2. Fix package.json
Open `fontend/package.json`

Add these to the `scripts` section:
```json
"lint:check": "biome check",
"format:check": "biome format",
"type-check": "tsc --noEmit"
```

Change this line:
```json
"lint": "biome check --write",
"format": "biome format --write"
```

### [ ] 3. Add Files to Git
```bash
cd veteran-connection
git add -A
git add -f backend/mvnw backend/mvnw.cmd backend/.mvn/
chmod +x backend/mvnw
```

### [ ] 4. Test Locally (Optional but Recommended)
```bash
# Backend
cd backend && ./mvnw clean test

# Frontend  
cd fontend && bun run lint:check && bun run format:check && bun run type-check
```

### [ ] 5. Commit & Push
```bash
git commit -m "fix: complete Phase 1 setup - add files and fix CI scripts"
git push origin main
```

### [ ] 6. Verify on GitHub
- [ ] Go to https://github.com/YOUR_USERNAME/veteran-connection
- [ ] Click "Actions" tab
- [ ] Latest run shows green checkmark ✅
- [ ] All 3 jobs passed:
  - [ ] Backend CI
  - [ ] Frontend CI  
  - [ ] Quality Gate

---

## 🔍 QUICK DIAGNOSTICS

Run these if something doesn't work:

### Check Maven Wrapper Exists
```bash
ls -la backend/mvnw
```
Should show file, not "No such file"

### Check Frontend Exists
```bash
ls -la fontend/
```
Should show directory with files

### Check Git Status
```bash
git status
```
Should show files to commit

### Check What's Being Committed
```bash
git diff --cached --stat
```
Should show multiple files

---

## 📋 FILES THAT MUST BE IN GITHUB

Check these exist on GitHub after pushing:

- [ ] `backend/mvnw`
- [ ] `backend/mvnw.cmd`
- [ ] `backend/.mvn/wrapper/maven-wrapper.jar`
- [ ] `backend/.mvn/wrapper/maven-wrapper.properties`
- [ ] `fontend/package.json`
- [ ] `fontend/app/page.tsx`
- [ ] `.github/workflows/ci.yml`

---

## ⚠️ COMMON MISTAKES

❌ **Forgetting to force-add Maven wrapper**
   Use: `git add -f backend/mvnw ...`

❌ **Not making mvnw executable**
   Use: `chmod +x backend/mvnw`

❌ **Using `format --check` instead of `format:check`**
   Scripts need colon: `format:check`

❌ **Committing but not pushing**
   Always: `git push origin main`

---

## ✅ SUCCESS LOOKS LIKE

```
GitHub → Actions Tab

✅ CI Pipeline (5 minutes)
   ✅ Backend (Java 21) - ~3 min
   ✅ Frontend (Bun) - ~2 min  
   ✅ Quality Gate - ~10 sec
```

---

## 🆘 IF STILL FAILING

1. Read error message in Actions tab
2. Check: `docs/CI_ISSUES_MASTER_GUIDE.md`
3. Or: `docs/CI_SIMPLE_FIX.md`

---

## 🎉 AFTER CI PASSES

```bash
# Tag your completion
git tag -a v0.1.0-phase1 -m "Phase 1 Complete"
git push origin v0.1.0-phase1

# Complete Phase 1
# See: docs/PHASE_1_CHECKLIST.md
```

---

**You've got this! 💪**

---

Print Date: _________
Status: ⬜ In Progress  ⬜ Complete
