# SlingToon Web 0.9.1

An offline-capable HTML5 Canvas PWA prepared for GitHub Pages. No JUCE, Projucer or native build is required for browser testing.

Version 0.9 replaces the photo filter and circular skull crop with local head segmentation plus a landmark-driven vector portrait. Hair, face skin and background are separated on-device; the photograph never leaves the device.

![SlingToon Morning Mayhem](docs/game-canvas-preview.png)

## Run

```bash
npm run serve
```

Open `http://localhost:4173`.

## Validate

```bash
npm run check
```

## Deploy

Push the repository contents with `index.html` at repository root, then select `Settings → Pages → Deploy from a branch → main → /(root)`. The included workflows remain available for Git-based development.

See `README_PL.md` for full instructions and `docs/MIGRATION_PLAN_PL.md` for the native migration gates.
