# PF2e Kineticist Helper

A Foundry VTT v14 module for Pathfinder 2e kineticist quality-of-life automation.

This module replaces the older `pf2e-kineticist-auras` module and keeps compatibility
with aura tag effects created by that module so existing actors can be cleaned up as
the helper takes over.

## Current Features

- Detects PF2e kinetic aura effects on character actors.
- Creates cosmetic elemental tag effects while the actor is in active combat.
- Supports Air, Earth, Fire, Metal, Water, and Wood gates.
- Removes generated tag effects when the real PF2e kinetic aura is gone or combat ends.
- Deduplicates generated aura tags and cleans up legacy `pf2e-kineticist-auras` tags.
- Exposes a small API at `game.modules.get('pf2e-kineticist-helper').api`.

The generated effects are named `Kineticist Element: Fire`, `Kineticist Element: Air`,
and so on. They are intentionally mechanical no-ops so Automated Animations or similar
modules can key persistent VFX off the effect names.

## Settings

Enable debug logging from Configure Settings to log aura detection and cleanup activity
to the browser console.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

The source entrypoint is `src/index.ts`, which builds to
`dist/pf2e-kineticist-helper.js`.
