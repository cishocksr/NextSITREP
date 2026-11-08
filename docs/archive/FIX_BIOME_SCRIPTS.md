# Frontend package.json Scripts Fix

## Problem

The CI workflow was calling `bun run format --check`, but the package.json `format` script uses `--write`, causing a conflict.

## Solution

Your `fontend/package.json` scripts section should be:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check --write",
    "lint:check": "biome check",
    "format": "biome format --write",
    "format:check": "biome format",
    "type-check": "tsc --noEmit"
  }
}
```

## Explanation

### Development (modifies files)
- `bun run lint` - Runs Biome linting **and auto-fixes** issues
- `bun run format` - Formats files **and saves changes**

### CI/CD (read-only checks)
- `bun run lint:check` - Checks linting **without modifying** files
- `bun run format:check` - Checks formatting **without modifying** files
- `bun run type-check` - Checks TypeScript types

## Quick Fix

1. Open `fontend/package.json`
2. Replace the `scripts` section with the one above
3. Save the file
4. Test locally:
   ```bash
   cd fontend
   bun run lint:check    # Should work
   bun run format:check  # Should work
   bun run type-check    # Should work
   ```
5. Commit and push:
   ```bash
   git add fontend/package.json .github/workflows/ci.yml
   git commit -m "fix: correct Biome script flags for CI"
   git push
   ```

## Biome Command Reference

### Linting
```bash
biome check              # Check only (read-only)
biome check --write      # Check and auto-fix (modifies files)
```

### Formatting
```bash
biome format             # Check only (read-only)
biome format --write     # Format files (modifies files)
```

### Common Mistake
```bash
# ❌ WRONG - conflicts!
biome format --write --check

# ✅ CORRECT - pick one:
biome format              # For CI (check only)
biome format --write      # For development (modify files)
```

## After the Fix

Your CI workflow will:
1. ✅ Run `bun run lint:check` → `biome check` (read-only)
2. ✅ Run `bun run format:check` → `biome format` (read-only)
3. ✅ Run `bun run type-check` → `tsc --noEmit` (read-only)

All checks will be non-destructive, which is what you want in CI!
