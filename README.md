# Meadowlake

A wall-tablet dashboard for the house: eight colored tiles (Inside, Outside, Media, Data,
Appliances, Safety, Chores, Scenes) that each open into a full view of that category.

It runs on **sample data** until you connect it to Home Assistant on the Mac Mini from the
Settings button. Anything not linked to a Home Assistant entity yet stays on sample data, and
the header says how much is live.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, reloads as you edit
npm test           # unit tests
npm run build      # production build in dist/
```

On the tablet, open the site and use **Add to Home Screen** for a full-screen app.

At home it's hosted on the Synology with Web Station; see [docs/nas.md](docs/nas.md).

## How it's organized

```
src/
├─ app/            page shell: clock, status rail, bottom sheet, toast
├─ categories/     one file per tile; each exports a Tile and (optionally) a Sheet
├─ widgets/        shared pieces: Ring, Sparkline, Toggle, Card, Chip …
├─ data/           HouseState type, sample data, useHouse() hook
├─ ha/             Home Assistant connection, entity map, mapping and Settings screen
└─ styles/         tokens.css (the pastel palette) and app.css
```

To add a tile, create `src/categories/<name>.tsx`, add it to `src/categories/index.ts`,
and give it a color token in `src/styles/tokens.css`.

## Connecting Home Assistant

1. In Home Assistant, create a long-lived access token (your name at the bottom left →
   Security → Long-lived access tokens).
2. On the tablet, open the dashboard from the NAS, tap **Settings**, and enter Home Assistant's
   address and the token. Both are stored only in that browser.
3. Settings then lists every entity in your Home Assistant. Put the right IDs in
   `src/ha/entities.ts`; `src/ha/map.ts` turns them into `HouseState`.

While connected, controls act on the house: room lights, TVs and Apple TVs, water heater
vacation mode, Blink arming, and the thermostat once it's linked (`src/ha/actions.ts`). The
garage door is deliberately not controllable from the dashboard.

## Safety

The public demo can't see or control the house:

- The demo build contains only sample data. It has no Home Assistant address or token, and it's
  built with `VITE_DEMO=1`, which removes the Settings button and never connects.
- The token is entered on the tablet and never goes into the code, the repo or a build.
  `npm run build` fails if a token-like string or a `VITE_HA*` variable shows up.
- Home Assistant stays on the home network. Don't port-forward it or expose it to the internet;
  use Home Assistant Cloud (Nabu Casa) or Tailscale if you want remote access.

## Demo site

Every push to `main` publishes the sample-data build to GitHub Pages
(Settings → Pages → Source: GitHub Actions, once). See Safety above.
