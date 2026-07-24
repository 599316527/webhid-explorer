# WebHID Explorer

A modern tool for exploring and debugging HID devices via the [WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API).

## Features

- **Left-right layout** — HID descriptor tree on the left, live reports on the right
- **Visual descriptor** — Tree-structured display with color-coded report types, flag tags, and usage names
- **Bidirectional navigation** — Click report IDs in collections to jump to declarations, and vice versa
- **Outline dropdown** — Quick navigation to any collection or report in the descriptor
- **Input report history** — Last 100 input reports with millisecond timestamps and clear button
- **Output & Feature reports** — Send hex data or receive feature reports
- **Light / Dark mode** — Toggle between themes, auto-detects system preference
- **Compact layout** — Minimal margins, monospace font, designed for efficient debugging

## Tech Stack

- [Vite](https://vitejs.dev/) — Fast build tooling
- [TypeScript](https://www.typescriptlang.org/) — Type-safe development
- Vanilla DOM — No framework dependencies

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Browser Requirements

- Chrome 89+ or Edge 89+ (WebHID API support required)
- HTTPS context (or localhost for development)

## Credits

This project is inspired by and based on [WebHID Explorer](https://nondebug.github.io/webhid-explorer/) by [nondebug](https://github.com/nondebug). The original project provides a single-file HID device exploration tool; this version rebuilds it with a modern frontend toolchain and enhanced UI/UX.

## License

MIT
