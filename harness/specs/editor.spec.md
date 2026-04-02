# Editor Spec

## Overview
The editor layer orchestrates parser, layout, and renderer, providing a complete Markdown editing experience.

## Core Components

### Input Handler
- Keyboard events → text mutations
- IME composition handling (CJK languages)
- Rich text paste → Markdown conversion
- Drag & drop (images, files)

### Selection Manager
- Cursor position tracking
- Text selection (mouse & keyboard)
- Multi-cursor support
- Selection ↔ AST position mapping

### Command System
- Undo/Redo (operation-based, not snapshot-based)
- Keyboard shortcuts
- Toolbar actions
- Programmatic API

### UI Components
- Toolbar (configurable)
- Floating toolbar (new line)
- Bubble menu (text selection)
- Scroll sync (editor ↔ preview)
- Theme system (light/dark)

## Modes
1. **Split**: Side-by-side editor + preview
2. **Edit**: Editor only
3. **Preview**: Preview only

## Events
- `content:change` — content modified
- `selection:change` — cursor/selection moved
- `scroll:change` — scroll position changed
- `editor:focus` / `editor:blur` — focus changes

## Performance Targets
- Input latency: < 16ms
- Cursor movement: < 5ms
- Toolbar response: < 50ms
