# Tomato Todo

A lightweight offline-first desktop productivity app inspired by TomatoTodo, built with Tauri v2, React, TypeScript, Vite, TailwindCSS, Zustand, and shadcn-style local UI primitives.

## Features

- Pomodoro timer with work, short break, long break, auto-start, fullscreen focus mode, and session history.
- Task management with priority, tags, deadlines, estimated pomodoros, search, filters, completion history, and drag-and-drop sorting.
- Statistics dashboard with daily, weekly, monthly summaries, focus hours, streaks, charts, and heatmap.
- Habit tracker with daily check-ins and streak counting.
- Quick Markdown notes with autosave.
- Native-ready notifications, tray actions, global shortcut hooks, persisted window preferences, theme settings, backup, restore, import, and export.

## Development

```bash
npm install
npm run dev
```

## Desktop Build

Install the Rust toolchain first, then run:

```bash
npm run tauri build
```

The Tauri configuration targets a Windows NSIS installer and portable updater-ready builds.

## Scripts

- `npm run dev` starts Vite.
- `npm run build` type-checks and builds the frontend.
- `npm run tauri` runs the Tauri CLI.
- `npm run lint` runs ESLint.
- `npm run test` runs Vitest.

## License

MIT
