# Archive: CI/CD Troubleshooting Guides

## Purpose

This folder contains troubleshooting documentation created during Phase 1 CI/CD setup. These guides were written to resolve three issues that prevented the initial CI pipeline from passing:

1. **Maven wrapper files missing** from GitHub repository
2. **Frontend directory missing** from GitHub repository  
3. **Biome format command** flag conflict in CI workflow

## What's Archived Here

### Primary Troubleshooting Guides

- **`CI_ISSUES_MASTER_GUIDE.md`** - Master overview of all three issues
- **`CI_SIMPLE_FIX.md`** - Simple 5-step fix guide (most useful)
- **`CI_FIX_PRINTABLE_CHECKLIST.md`** - Quick printable checklist

### Supporting Documentation

- **`COMPLETE_GIT_SETUP.md`** - Complete Git setup verification guide
- **`FIX_BIOME_SCRIPTS.md`** - Biome flag conflict explanation
- **`QUICK_FIX_CI.md`** - Early troubleshooting attempt

## Why Archived?

These guides were **essential during debugging** but are **no longer needed** for day-to-day development. They're preserved here for:

- 📝 **Blog post reference** - Document the debugging journey
- 🎓 **Learning record** - Show problem-solving process
- 📚 **Historical context** - Reference if similar issues arise
- 💼 **Portfolio value** - Demonstrate troubleshooting skills

## Issues Resolved

### Issue #1: Maven Wrapper Missing
```
Error: ./mvnw: No such file or directory
Exit code: 127
```
**Solution**: Removed Maven wrapper from `.gitignore` and force-added files

### Issue #2: Frontend Directory Missing
```
Error: No such file or directory: './fontend'
```
**Solution**: Committed and pushed all frontend files to GitHub

### Issue #3: Biome Flag Conflict
```
Error: `--check` is not expected in this context
```
**Solution**: Updated CI workflow to use `format:check` instead of `format --check`

## Resolution Date

**January 2, 2025** - All CI issues resolved, pipeline passing ✅

## Key Learnings

- `.gitignore` best practices - what should/shouldn't be excluded
- Maven wrapper importance for CI/CD portability
- Git local vs remote repository differences
- Tool flag usage - development vs CI environments
- Systematic debugging approach

## Related Active Documentation

For ongoing CI/CD reference, see:
- `../CI_CD.md` - Complete CI/CD pipeline documentation
- `../DEVELOPER_WORKFLOW.md` - Daily development workflow
- `../TROUBLESHOOTING_MAVEN_WRAPPER.md` - Maven wrapper reference

---

**Note**: If you encounter similar CI issues in the future, these guides may still be helpful. However, for current development, refer to the active documentation in the parent `docs/` directory.

**Status**: ✅ Issues Resolved | 🗂️ Archived for Reference | 📅 Phase 1 Complete
