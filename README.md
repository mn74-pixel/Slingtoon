# SlingToon Web 0.12.0

An offline-capable HTML5 Canvas PWA prepared for GitHub Pages. No JUCE, Projucer or native build is required for browser testing.

Version 0.12 expands the campaign to eight missions across a bedroom, laundry, living room, kitchen, garden, park and lake. It adds water-bounce physics, three-stage hints, spendable rescue tokens and non-farmable smart-score rewards while keeping the crop-free mobile camera and local Face Studio intact.

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
