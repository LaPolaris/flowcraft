# Contributing to FlowCraft

Thanks for your interest in contributing! Here's how to get started.

---

## Project structure

The codebase is split into focused ES Module files — read the [README](README.md) for the full module map before diving in.

---

## Setup

1. Fork and clone the repository.
2. Serve the folder with any static server (ES Modules require a server, not `file://`).
3. Open `index.html` in your browser.

No install step needed for development — there are no npm dependencies to manage.

To build a minified bundle:

```bash
npx esbuild js/main.js --bundle --minify --outfile=js/main.min.js
```

---

## Guidelines

- **One module, one responsibility** — keep changes scoped to the relevant file(s).
- **No circular imports** — check the dependency graph in the README before adding a new import.
- **No new external libraries** — discuss first if you think one is truly necessary.
- **Keep it vanilla** — FlowCraft is intentionally framework-free.

---

## Submitting changes

1. Create a branch: `git checkout -b feat/my-feature` or `fix/my-bug`.
2. Make your changes and test them in the browser.
3. Open a Pull Request with a clear description of what changed and why.

---

## Reporting bugs

Open an issue and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
