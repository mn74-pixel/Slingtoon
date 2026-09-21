# SlingToon Web 0.38.0 — 88 missions of controlled chaos

An offline-capable HTML5 Canvas PWA prepared for GitHub Pages. No JUCE, Projucer or native build is required for browser testing.

Version 0.18 adds a confirmed campaign restart and fills the widescreen margin with the scene itself. Version 0.17 kept the previous attempt on screen as a ghost trail and tells the player which way a miss was wrong. Version 0.16 gave the hero a second in-flight move and turns character choice into a real physics toolkit. Version 0.15 tightened the difficulty curve and added a photo cut-out head. Version 0.14 expanded the campaign from 8 to 80 authored missions across ten chapters. The trip runs from domestic chaos through the beach, underwater worlds, harbour, fairground, spaceport and orbital environments, then returns to the original alarm clock. Every mission has a solver-verified forgiving completion route and a separate reachable star route. Physics, prediction and replay share the deterministic 120 Hz solver.

The game still has no server/runtime dependencies. Portraits remain local, and the crop-free mobile camera is preserved. The chapter map shows eight missions at a time and resumes the current unlocked mission.


## Run

```bash
npm run serve
```

Open `http://localhost:4173`.

Touch: pull the hero and release. Keyboard: Space starts aiming, arrows adjust the pull, Space launches. From mission five, tap the FIK button, the playfield or Space once in flight for an upward/forward impulse. R retries. Click the level counter for the mission map.

## Validate

```bash
npm run check
```

## Deploy

Push the repository contents with `index.html` at repository root, then select `Settings → Pages → Deploy from a branch → main → /(root)`. The included workflows remain available for Git-based development.

See `README_PL.md` for full instructions and `docs/MIGRATION_PLAN_PL.md` for the native migration gates.
