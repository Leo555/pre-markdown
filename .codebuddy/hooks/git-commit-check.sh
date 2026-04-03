#!/bin/bash

# Read stdin to temp file
TEMP_FILE="/tmp/hook-input-$$.json"
cat > "$TEMP_FILE"

# Extract the bash command from JSON
COMMAND=$(python3 -c "import json; print(json.load(open('$TEMP_FILE')).get('tool_input', {}).get('command', ''))" 2>/dev/null)

# Clean up
rm -f "$TEMP_FILE"

# Check if it's a git commit command
if echo "$COMMAND" | grep -q "git commit"; then
    echo "" >&2
    echo "========================================" >&2
    echo "[Git Hook] 🔍 Git commit detected!" >&2
    echo "========================================" >&2
    echo "" >&2
    
    # Check for tsconfig.json
    if [ ! -f "tsconfig.json" ]; then
        echo "[Git Hook] No tsconfig.json found, skipping" >&2
        exit 0
    fi
    
    # Check if TypeScript is installed
    if [ ! -d "node_modules/typescript" ]; then
        echo "[Git Hook] TypeScript not installed, skipping" >&2
        exit 0
    fi
    
    # Check if there are any TypeScript files (excluding node_modules)
    if ! find . -path ./node_modules -prune -o \( -name "*.ts" -o -name "*.tsx" \) -print | grep -q .; then
        echo "[Git Hook] No TypeScript files found, skipping" >&2
        echo "" >&2
        exit 0
    fi
    
    # Run TypeScript type check
    echo "[Git Hook] Running TypeScript type check..." >&2
    echo "" >&2
    
    npx tsc --noEmit >&2 2>&1
    TSC_EXIT=$?
    
    echo "" >&2
    
    if [ $TSC_EXIT -ne 0 ]; then
        echo "========================================" >&2
        echo "[Git Hook] ❌ TYPE CHECK FAILED!" >&2
        echo "========================================" >&2
        echo "Please fix the type errors before committing." >&2
        echo "" >&2
        exit 2
    else
        echo "========================================" >&2
        echo "[Git Hook] ✅ Type check PASSED!" >&2
        echo "========================================" >&2
        echo "" >&2
    fi
fi

exit 0
