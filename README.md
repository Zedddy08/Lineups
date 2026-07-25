# Lineups

CS2 smoke/flash/molotov lineups for the group — Map → Side → Callout → Lineup,
the real screenshot/gif *is* the guide (tap to zoom for a bigger view), no
redundant written steps competing with it. Built as a PWA (installable via
"Add to Home Screen" on iOS/Android) so it works like a real app with zero App
Store cost or friction.

Live at: https://zedddy08.github.io/Lineups/

## Stack

Deliberately dependency-free — vanilla HTML/CSS/JS, hash-based routing, no
build step. This means it deploys to GitHub Pages as-is, nothing to compile.

- `index.html` / `style.css` / `app.js` — the app shell + router
- `data/lineups.json` — all lineup content (edit this to add lineups, no code changes needed)
- `manifest.json` + `icons/` — PWA / home-screen icon config
- `images/maps/` — map radar art used on the map-select screen (downloaded locally, see sourcing note)
- `sw.js` — offline caching (service worker)
- `scripts/fetch_dust2.py` — rerunnable scraper that bulk-populates Dust2 from csnades.gg
- `.github/workflows/deploy.yml` — auto-deploys to GitHub Pages on every push to `main`

## Adding a new lineup

Edit `data/lineups.json`. Structure:

```
{map}.sides.{t|ct}.callouts.{callout}.lineups[] = {
  "id": "unique-slug",
  "title": "Display name",
  "type": "smoke" | "flash" | "molotov",
  "video": "https://www.youtube.com/embed/VIDEO_ID",   // optional
  "image": "https://.../lineup.webp",                   // static screenshot, hotlinked
  "gif": "https://.../lq.mp4",                           // looping preview clip, hotlinked (optional)
  "image_source": "site name shown as small attribution",
  "note": "One short factual line — throw type, why it matters. Not a paraphrased step list."
}
```

`video` is optional (most bulk-imported lineups don't have one — the image/gif
carries the guide). `gif` is preferred over `image` when both exist — the app
shows it as an autoplaying muted loop, tap to zoom into the still `image`.

Add a new map/side/callout by adding new keys following the same shape — the
app renders whatever's in the JSON, no hardcoded map list.

## Bulk-importing a map from csnades.gg

`python scripts/fetch_dust2.py` regenerates the `dust2` entry in
`data/lineups.json` from csnades.gg's smokes/flashbangs/molotovs pages for
Dust2 (both T and CT side). Re-run any time to pick up site updates. The site
is JS-rendered (React/Next.js) — the script works by pulling the embedded page
JSON out of the raw HTML via regex rather than scraping rendered DOM, since
there's no server-rendered content to fetch normally. Adapting it for another
map is a matter of changing the `PAGES` dict's URLs and the `dust2-` id
prefixes in the regex/output.

Every URL the script emits is verified to actually resolve (HTTP 200) as part
of a full run — see the script's own validation pass — before it's safe to
assume the data is good.

## Content sourcing note

Lineup *positions* (stand here, aim there, throw type) are facts, not anyone's
copyrighted content. Videos are official YouTube embeds (creator gets the
view, nothing copied). Screenshot/gif images are **hotlinked** directly from
their source (csnades.gg) — never downloaded/rehosted into this repo — same
principle as the video embeds: reference, don't copy. An `onerror` fallback
shows a placeholder if a hotlink ever breaks.

Map radar art (`images/maps/`) is the one thing actually downloaded and
committed locally, rather than hotlinked — these are Valve's own game assets
(extracted from the CS2 depot via a public open-source tool), used purely as
UI chrome/branding for the map-select screen, not "content." Local storage
made more sense than a fragile hotlink for something that core to the UI.

## Local dev

No build step — just serve the folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Push to `main` — the GitHub Actions workflow handles the rest. Requires the
repo to be public (free GitHub Pages doesn't support private repos) and
**Settings → Pages → Source: GitHub Actions** set once.
