#!/bin/bash

# Read stdin to temp file
TEMP_FILE="/tmp/hook-input-$$.json"
cat > "$TEMP_FILE"

# Extract the file path from JSON
FILE_PATH=$(python3 -c "import json; print(json.load(open('$TEMP_FILE')).get('tool_input', {}).get('file_path', ''))" 2>/dev/null)

# Clean up
rm -f "$TEMP_FILE"

# Check if file is TypeScript or TSX
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
    # Check if prettier is installed
    if [ ! -d "node_modules/prettier" ]; then
        exit 0
    fi
    
    # Run prettier
    npx prettier --write "$FILE_PATH" >/dev/null 2>&1
fi

exit 0
