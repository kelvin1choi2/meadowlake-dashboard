# Meadowlake dashboard

Wall-tablet home dashboard. Vite + React 19 + TypeScript, no UI framework, plain CSS.

## Commands
- `npm run dev` — dev server
- `npm run typecheck` — `tsc -b`
- `npm test` — vitest
- `npm run build` — typecheck + production build
Run typecheck and tests before calling a change done.

## Conventions
- Tablet first (≈1180×820 landscape), but must not scroll sideways at 400px.
- All colors come from tokens in `src/styles/tokens.css`. No literal colors in components.
  Category hue tokens share the category's id (`--inside`, `--media`, …).
- Status color (`--good`, `--warn`, `--bad`) is separate from category color.
- Each tile is one file in `src/categories/` exporting a `Category`. Widgets in `src/widgets/`
  stay generic; pure math lives in `widgets/geometry.ts` with tests beside it.
- UI reads only `HouseState` via `useHouse()`. Nothing outside `src/ha/` and `useHouse` should
  know about Home Assistant.
- Security: the public Pages build must never be able to reach the house. Never read the Home
  Assistant URL or token from env vars or commit them; they're entered on the device and kept in
  localStorage (`src/ha/connection.ts`). `scripts/check-no-secrets.mjs` enforces this in every build.
  Sample data stays made-up.

## The house (for realistic sample data and integrations)
Ecobee + 5 room sensors, Philips Hue, Alexa ×3, Apple HomeKit, LG and Sony OLED TVs, 2 Apple TVs,
Plex, Roon (Linn Klimax DSM, Ayre QX-5, HomePods), Blink cameras, LG ThinQ range, Samsung washer,
Rheem water heater, Rachio, SmartLife robovac, eHome Life (garage via HomeKit, switches,
2 leak detectors), Synology DS1513+, Mac Mini (24×7 host), Windows 11 PC with scheduled scripts.
