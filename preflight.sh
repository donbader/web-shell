#!/bin/bash

# Pre-flight checks before starting Docker services

echo "🔍 Running pre-flight checks..."

FAILED=0

# Check backend TypeScript
echo ""
echo "📝 Checking backend TypeScript..."
cd backend
if npm run type-check 2>&1 | grep -q "error TS"; then
    echo "❌ Backend TypeScript errors found"
    npm run type-check
    FAILED=1
else
    echo "✅ Backend TypeScript OK"
fi
cd ..

# Check frontend TypeScript
echo ""
echo "📝 Checking frontend TypeScript..."
cd frontend
if npm run type-check 2>&1 | grep -q "error TS"; then
    echo "❌ Frontend TypeScript errors found"
    npm run type-check
    FAILED=1
else
    echo "✅ Frontend TypeScript OK"
fi
cd ..

echo ""
if [ $FAILED -eq 1 ]; then
    echo "❌ Pre-flight checks failed. Please fix errors above."
    exit 1
else
    echo "✅ All pre-flight checks passed!"
fi
