# TODOTXT

A clean, minimalist, dark-mode `todo.txt` task manager designed for maximum information density and offline-first reliability. Available as a zero-dependency standalone single-file HTML application (`TODOTXT.html`) as well as a Vite + React web preview.

## Features

- **100% Offline Single-File App (`TODOTXT.html`)**
  - All HTML, CSS, and JavaScript live inside a single `TODOTXT.html` file with zero external dependencies or network requests.
  - Can be opened directly from your filesystem (`file://`) on desktop or mobile, or downloaded from **Backup & Restore → Download Offline TODOTXT.html**.

- **Compact Dark-Mode Design (`10px` Task Rows)**
  - Ultra-compact dark interface with `10px` task typography and tight row spacing to maximize how many tasks fit on screen at once.
  - Fully responsive layout across mobile and desktop viewports.

- **Clean Content-Only Display & `todo.txt` Compatibility**
  - Follows the standard `todo.txt` specification (`x YYYY-MM-DD`, `(A)`–`(Z)` priorities, creation dates, `+projects`, `@contexts`, and `key:value` metadata such as `due:YYYY-MM-DD`).
  - Automatically hides `todo.txt` metadata tokens in the list view so only the readable task content is shown.
  - Click any task row to edit the complete raw `todo.txt` line inline (`Enter` to save, `Esc` to cancel).

- **Single-Tap Actions**
  - **Single-tap remove (`×`)** deletes a task immediately, paired with a 4-second **Undo** toast notification.
  - **Single-tap check** toggles completion status (`x YYYY-MM-DD ...`).

- **Persistent `localStorage` Cache**
  - Automatically saves tasks, custom filter buttons, active filter selection, and sort order in `localStorage` so everything stays intact across browser sessions.

- **Instant Search & Sorting**
  - Real-time search across both visible task content and hidden `todo.txt` metadata (`+project`, `@context`, priorities, dates, and `key:value` tags).
  - Sort tasks by **Priority**, **Order**, **A–Z**, or **Due Date**.

- **Customizable Filter Buttons**
  - Create, edit, reorder, show/hide, delete, and color-code filter buttons via **Customize Filters**.
  - Supports flexible query expressions:
    - `+project`, `@context`
    - Priorities: `(A)`, `(A-B)`, `priority:A`
    - Status: `is:open`, `is:done`
    - Due dates: `due:today`, `due:overdue`, `has:due`
    - Boolean logic: space-separated `AND`, `OR`, and `-` negation (e.g., `-@waiting`)

- **Local Backup & Restore**
  - **Export `todo.txt`**: Download standard plain-text lines compatible with any `todo.txt` client.
  - **Export Full JSON**: Back up tasks, custom filter buttons, and sort settings in a single `.json` file.
  - **Copy `todo.txt`**: Copy all raw lines directly to the clipboard.
  - **Restore / Import**: Import from `.txt` or `.json` files or paste raw lines directly, choosing between **Merge unique** and **Replace all** modes, plus **Purge Completed**.

## Keyboard Shortcuts

- `/` — Focus search bar
- `n` — Focus new task input
- `Enter` — Save new task or commit inline edit
- `Esc` — Cancel inline edit or close open modals

## Usage

### Standalone Offline File
1. Open `TODOTXT.html` directly in any modern web browser.
2. Add tasks using `todo.txt` syntax, for example:
   ```text
   (A) 2026-11-22 Finalize quarterly review +Work @office due:2026-11-25
   ```

### Development Web Preview
```bash
npm install
npm run dev
```
Build for production with:
```bash
npm run build
```
