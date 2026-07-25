# Lineups

CS2 smoke/flash/molotov lineups for the group — Map → Side → Callout → Lineup,
video up top, scrollable picture-guide steps below. Built as a PWA (installable
via "Add to Home Screen" on iOS/Android) so it works like a real app with zero
App Store cost or friction.

## Stack

Deliberately dependency-free — vanilla HTML/CSS/JS, hash-based routing, no
build step. This means it deploys to GitHub Pages as-is, nothing to compile.

- `index.html` / `style.css` / `app.js` — the app shell + router
- `data/lineups.json` — all lineup content (edit this to add lineups, no code changes needed)
- `manifest.json` + `icons/` — PWA / home-screen icon config
- `sw.js` — offline caching (service worker)
- `.github/workflows/deploy.yml` — auto-deploys to GitHub Pages on every push to `main`

## Adding a new lineup

Edit `data/lineups.json`. Structure:

```
{map}.sides.{t|ct}.callouts.{callout}.lineups[] = {
  "id": "unique-slug",
  "title": "Display name",
  "type": "smoke" | "flash" | "molotov",
  "video": "https://www.youtube.com/embed/VIDEO_ID",
  "steps": ["Step 1...", "Step 2...", "..."],
  "note": "One-line why this matters",
  "source_note": "Attribution / verification caveat"
}
```

Add a new map/side/callout by adding new keys following the same shape — the
app renders whatever's in the JSON, no hardcoded map list.

## Content sourcing note

Lineup *positions* (stand here, aim there, throw type) are facts, not anyone's
copyrighted content — pulled from cross-referencing multiple public community
guides. Videos are official YouTube embeds (creator gets the view, nothing's
copied). Picture-guide screenshots are intentionally left as placeholder slots
for now rather than rehosting someone else's screenshot images — drop in your
own in-game captures over time.

## Local dev

No build step — just serve the folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Push to `main` — the GitHub Actions workflow handles the rest. One-time setup
needed in the repo itself: **Settings → Pages → Source: GitHub Actions**.
