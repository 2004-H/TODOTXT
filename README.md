# TODOTXT

A clean, minimalist, dark-mode `todo.txt` task manager designed for maximum information density and offline-first reliability. Available in two zero-dependency standalone single-file HTML editions—**Cache Version** (`TODOTXT.html`) and **Local File Version** (`TODOTXT-localfile.html`)—as well as a Vite + React web preview.

## Editions

- **Cache Version (`TODOTXT.html`)**
  - Stores and persists all tasks, settings, and custom filter views locally in browser `localStorage`.
  - Ideal when you want instant zero-setup offline persistence inside your browser cache.

- **Local File Version (`TODOTXT-localfile.html`)**
  - Connects directly to a local `.txt` file on your computer (such as `todo.txt`) instead of caching tasks in `localStorage`.
  - **Real-Time Two-Way Sync**: Writes every task change directly to disk via the File System Access API and automatically detects external edits to your `todo.txt` file on focus or background polling, with one-click **Reconnect** across sessions and a manual **Load / Save `todo.txt`** fallback for browsers without File System Access API support.

## Features

- **100% Offline Single-File Apps (`TODOTXT.html` & `TODOTXT-localfile.html`)**
  - All HTML, CSS, and JavaScript live inside standalone single HTML files with zero external dependencies or network requests.
  - Open either file directly in your browser or download them from **Backup & Restore** in the web app.

- **Compact Dark-Mode Design (`10px` Task Rows) & Bottom Add Bar**
  - Ultra-compact dark interface with `10px` task typography and tight row spacing to maximize how many tasks fit on screen at once.
  - Dedicated **Add Task** bar docked at the bottom of the screen for quick entry while keeping search and filter controls at the top.
  - Fully responsive layout across mobile and desktop viewports.

- **Clean Content-Only Display & `todo.txt` Compatibility**
  - Follows the standard `todo.txt` specification (`x YYYY-MM-DD`, `(A)`–`(Z)` priorities, creation dates, `+projects`, `@contexts`, and `key:value` metadata such as `due:YYYY-MM-DD`).
  - Automatically hides `todo.txt` prefix/key-value metadata in the list view while extracting `+project` and `@context` tags as compact, clickable pill-labels—click any tag pill to instantly filter the list for that tag (and click again or use `Esc` to clear).
  - Priority `(A)` tasks render in **bold** by default (configurable in **Settings**).
  - Click any task row to edit the complete raw `todo.txt` line inline (`Enter` to save, `Esc` to cancel), with quick-select priority buttons `(A)` through `(F)` and `None`.

- **Single-Tap Actions & Priority Colors (`A`–`F`)**
  - **Single-tap remove (`×`)** deletes a task immediately, paired with a 4-second **Undo** toast notification.
  - **Single-tap check** toggles completion status (`x YYYY-MM-DD ...`).
  - **Priority Checkbox & Font Colors**: Customize both checkbox colors and task font colors for priorities `(A)` through `(F)` in **Settings**.

- **Task Analytics Dashboard**
  - Accessible directly from the **Analytics** button in the main header.
  - Visualizes **Task Completion Trends Over Time** (added vs. completed tasks by date) and **Project Distribution** (`+project` open vs. completed breakdown), powered by `recharts` in the web app and zero-dependency SVG charts in the offline `TODOTXT.html` file.

- **Dark-Mode Themes, Classic Pagination & `localStorage` Cache**
  - **Theme Presets**: Switch between **Midnight**, **Slate**, **Zinc**, **Neutral**, **Stone**, and **Forest** dark-mode themes in **Settings**.
  - **Classic Pagination**: Search-style pagination (`< Prev`, numbered pages, `Next >`) with a customizable **Tasks per page** setting (default `10`).
  - Automatically persists tasks, filter buttons, sort order, pagination size, theme, and color preferences in `localStorage`.

- **Instant Search, Sorting & P1/P2/P3 Filter Buttons**
  - Default filter buttons include **All**, **Open**, **P1** (`A–B`), **P2** (`C–D`), **P3** (`E–F`), and **Done**, all customizable via **Customize Filters**.
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

- **Local Backup & Restore (Tasks, Settings & Custom Views)**
  - **Export Full Backup (`.json`)**: Back up all tasks alongside your **Settings** (theme, priority colors, pagination size, sort order) and **Custom Filter Views** in a single `.json` file.
  - **Export Settings & Views (`.json`)**: Export only your settings and custom filter views for easy reuse across workspaces.
  - **Export `todo.txt` / Copy**: Download standard plain-text lines or copy raw lines directly to the clipboard.
  - **Restore / Import**: Import from `.txt` or `.json` files (or paste JSON/raw lines directly) with **Merge unique** or **Replace all** modes and a toggle to restore settings & custom filter views from `.json` backups, plus **Purge Completed**.

## Keyboard Shortcuts

- `/` — Focus search bar
- `n` — Focus bottom new task input
- `Enter` — Save new task or commit inline edit
- `Esc` — Cancel inline edit or close open modals

## Usage

### Standalone Offline Files
- **Cache Version**: Open `TODOTXT.html` directly in any modern web browser; tasks persist automatically in browser `localStorage`.
- **Local File Version**: Open `TODOTXT-localfile.html` in Chromium-based browsers (Chrome, Edge, Brave), click **Open `todo.txt`** or **New `todo.txt`**, and grant read/write access so every edit stays synced with your local `.txt` file.
- Add tasks using `todo.txt` syntax, for example:
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
