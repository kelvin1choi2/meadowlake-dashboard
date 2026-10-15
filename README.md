# Meadowlake

A wall-tablet dashboard for the house: eight colored tiles (Inside, Outside, Media, Data,
Appliances, Safety, Chores, Scenes) that each open into a full view of that category.

It runs on **sample data** today. The plan is to point it at Home Assistant on the Mac Mini,
which already has integrations for Ecobee, Hue, the TVs, Roon, Plex, Synology, Rachio, Blink
and the rest.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, reloads as you edit
npm test           # unit tests
npm run build      # production build in dist/
```

On the tablet, open the site and use **Add to Home Screen** for a full-screen app.

## How it's organized

```
src/
├─ app/            page shell: clock, status rail, bottom sheet, toast
├─ categories/     one file per tile; each exports a Tile and (optionally) a Sheet
├─ widgets/        shared pieces: Ring, Sparkline, Toggle, Card, Chip …
├─ data/           HouseState type, sample data, useHouse() hook
├─ ha/             Home Assistant connection and entity map (not wired in yet)
└─ styles/         tokens.css (the pastel palette) and app.css
```

To add a tile, create `src/categories/<name>.tsx`, add it to `src/categories/index.ts`,
and give it a color token in `src/styles/tokens.css`.

## Connecting Home Assistant (next step)

1. Install Home Assistant on the Mac Mini and add the integrations.
2. In Home Assistant, create a long-lived access token (Profile → Security).
3. Copy `.env.example` to `.env.local` and fill in the URL and token. `.env.local` is never committed.
4. Fill in the real entity IDs in `src/ha/entities.ts` and map them onto `HouseState` in `src/data/useHouse.ts`.

## Demo site

Every push to `main` publishes the sample-data build to GitHub Pages
(Settings → Pages → Source: GitHub Actions, once).
