# SlingToon Web 0.11.0

An offline-capable HTML5 Canvas PWA prepared for GitHub Pages. No JUCE, Projucer or native build is required for browser testing.

Version 0.11 turns Morning Mayhem into a five-mission breakfast chapter with persistent progression, distinct comic targets, a deliberate difficulty curve, adaptive retry hints and goal-specific sound punchlines. The crop-free mobile camera and fully local Face Studio remain intact.

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
