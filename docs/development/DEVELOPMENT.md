# Development Guide

## Quick Start

```bash
# Start development environment (with type checking)
./start.sh

# Stop development environment
./stop.sh
# or press Ctrl+C
```

## Catching Errors Early

The `./start.sh` script now runs **pre-flight checks** before starting Docker containers. This catches common issues before runtime:

### What Pre-flight Checks Do

1. **TypeScript Type Checking** (Backend)
   - Validates all TypeScript types
   - Catches import/export errors
   - Detects type mismatches

2. **TypeScript Type Checking** (Frontend)
   - Validates React component types
   - Catches runtime import errors (like the `EnvironmentConfig` issue)
   - Detects prop type mismatches

### Manual Type Checking

```bash
# Check backend types only
cd backend && npm run type-check

# Check frontend types only
cd frontend && npm run type-check

# Run all pre-flight checks
./preflight.sh
```

## Common TypeScript Issues

### Issue: "does not provide an export named X"

**Problem**: Trying to import a TypeScript type as a runtime value

**Example Error**:
```
The requested module '/src/components/EnvironmentSelector.tsx'
does not provide an export named 'EnvironmentConfig'
```

**Solution**: Use `import type` for TypeScript interfaces/types

```typescript
// ❌ Wrong - imports type as runtime value
import { EnvironmentSelector, EnvironmentConfig } from './EnvironmentSelector';

// ✅ Right - separates runtime and type imports
import { EnvironmentSelector } from './EnvironmentSelector';
import type { EnvironmentConfig } from './EnvironmentSelector';
```

### Issue: Type mismatches

**Problem**: Passing wrong types to props or functions

**Example**:
```typescript
// Component expects string, but receives number
<Terminal cols={80} rows="24" />  // ❌ rows should be number
```

**Solution**: Pre-flight checks will catch this:
```
error TS2322: Type 'string' is not assignable to type 'number'
```

## Development Workflow

### Recommended Flow

1. **Make code changes**
2. **Run type check** (optional, but recommended)
   ```bash
   ./preflight.sh
   ```
3. **Start/restart app**
   ```bash
   ./start.sh  # Automatically runs preflight checks
   ```
4. **Test in browser**
5. **Check console** for runtime errors

### Fast Iteration

For quick changes without full restart:

```bash
# Keep ./start.sh running in terminal 1

# In terminal 2, make changes
# Hot reload will update frontend automatically
# Backend will restart on file changes (tsx watch)
```

## Type Checking Best Practices

### 1. Use `import type` for Types Only

```typescript
// Runtime imports
import { Component } from './Component';

// Type-only imports
import type { Props, State } from './Component';
```

### 2. Export Types Explicitly

```typescript
// ✅ Good - clear what's runtime vs type
export interface Config { ... }
export function useConfig(): Config { ... }

// ❌ Avoid - mixing runtime and types
export const Config = { ... };  // runtime
export type Config = { ... };   // type - naming conflict!
```

### 3. Enable Strict TypeScript

Both `backend/tsconfig.json` and `frontend/tsconfig.json` should have:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

## Debugging

### TypeScript Errors

```bash
# See full type errors
cd frontend && npm run type-check
cd backend && npm run type-check
```

### Runtime Errors

```bash
# View live logs
docker compose -f docker-compose.dev.yml logs -f

# View specific service
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

### Container Issues

```bash
# Rebuild from scratch
docker compose -f docker-compose.dev.yml build --no-cache
./start.sh

# Access container shell
docker compose -f docker-compose.dev.yml exec backend sh
docker compose -f docker-compose.dev.yml exec frontend sh
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `./start.sh` | Start dev environment with type checks |
| `./stop.sh` | Stop all containers |
| `./preflight.sh` | Run type checks only |

## CI/CD Integration

For automated testing, use preflight checks in CI:

```yaml
# Example GitHub Actions
- name: Type Check
  run: |
    chmod +x preflight.sh
    ./preflight.sh
```

## Tips

- ✅ **Always run `./start.sh`** - It catches errors before Docker build
- ✅ **Watch terminal output** - Type errors show before build starts
- ✅ **Fix types first** - Don't skip type errors, they cause runtime issues
- ✅ **Use `import type`** - Separate types from runtime imports
- ❌ **Don't ignore warnings** - TypeScript warnings often become runtime errors
