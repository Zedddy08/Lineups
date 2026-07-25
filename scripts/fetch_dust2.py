# fetch_dust2.py  (C) — created by Claude
#
# One-off/rerunnable scraper: pulls ALL Dust2 lineups (smokes, flashbangs,
# molotovs) from csnades.gg's embedded page JSON and writes them into
# data/lineups.json in our app's schema.
#
# csnades.gg is a JS-rendered site (Astro/React), so a plain fetch doesn't
# expose the content in server-rendered HTML the way the old CSGO-era sites
# did — but the full dataset for the page IS embedded as a big JSON blob
# inside a <script> tag (double-escaped, since it's a JSON string embedded
# in the page's own JSON payload). This script downloads the raw HTML,
# un-escapes that blob, and regex-extracts each nade entry's fields
# directly — no headless browser needed.
#
# Everything referenced (images, video loops) is HOTLINKED to csnades.gg's
# own asset CDN, never downloaded into this repo — same policy as the
# original 5-lineup seed. See README's "Content sourcing note".
#
# Usage: python scripts/fetch_dust2.py
# Safe to re-run — fully regenerates the dust2 entry in data/lineups.json,
# doesn't touch other maps (e.g. inferno) already in the file.

import json
import re
import sys
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}

PAGES = {
    "smoke": "https://csnades.gg/dust2/smokes",
    "flash": "https://csnades.gg/dust2/flashbangs",
    "molotov": "https://csnades.gg/dust2/molotovs",
}

# One big regex per nade entry. Field order in the source JSON is stable
# (id, slug, assets{...}, team, type, technique, movement, precision,
# throwFrom, titleFrom, throwTo, titleTo, bounces, beginner, small) —
# verified by hand against the raw payload before writing this.
ENTRY_RE = re.compile(
    r'"id":"nade_[a-f0-9]+","slug":"([a-z0-9\-]+)",'
    r'"assets":\{"id":"([A-Za-z0-9\-]+)",'
    r'"videoHq":\{"webm":"([^"]+)","mp4":"([^"]+)"\},'
    r'"videoLq":\{"webm":"([^"]+)","mp4":"([^"]+)"\},'
    r'"videoThumbnail":\{[^}]+\},'
    r'"thumbnail":"([^"]+)","thumbnailSmall":"[^"]+","lineup":"([^"]+)"\},'
    r'"team":"(t|ct)","type":"(smoke|flashbang|molotov)","technique":"([^"]*)",'
    r'"movement":"([^"]*)","precision":"([^"]*)",'
    r'"throwFrom":\{[^}]+\},"titleFrom":"([^"]+)",'
    r'"throwTo":\{[^}]+\},"titleTo":"([^"]+)"'
)


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def technique_label(technique, movement):
    parts = []
    if movement and movement != "stationary":
        parts.append(movement.replace("_", " "))
    if technique:
        parts.append(technique.replace("_", " ") + " throw")
    return " ".join(parts).strip().capitalize() or "Standard throw"


def main():
    all_entries = []
    for expected_type, url in PAGES.items():
        print(f"Fetching {url} ...")
        html = fetch(url)
        unescaped = html.replace('\\"', '"')
        matches = ENTRY_RE.findall(unescaped)
        print(f"  {len(matches)} entries found")
        for m in matches:
            (
                slug, imgid, video_hq_webm, video_hq_mp4, video_lq_webm, video_lq_mp4,
                thumbnail, lineup_img, team, raw_type, technique, movement, precision,
                title_from, title_to,
            ) = m
            # Normalize csnades.gg's "flashbang" to our schema's "flash"
            # (matches the existing badge/icon type keys already used by
            # the 5 hand-picked lineups).
            type_ = "flash" if raw_type == "flashbang" else raw_type
            all_entries.append({
                "id": f"dust2-{team}-{slug}",
                "title": f"{title_to} Smoke" if type_ == "smoke" else f"{title_to} {type_.capitalize()}",
                "type": type_,
                "team": team,
                "from": title_from,
                "to": title_to,
                "note": technique_label(technique, movement),
                "image": lineup_img,
                "gif": video_lq_mp4,   # looping preview clip — the "hover gif" effect, LQ for mobile bandwidth
                "gif_hq": video_hq_mp4,
                "image_source": "csnades.gg",
            })

    # De-dupe by id (same slug can theoretically repeat across a re-fetch)
    seen = set()
    deduped = []
    for e in all_entries:
        if e["id"] in seen:
            continue
        seen.add(e["id"])
        deduped.append(e)

    print(f"\nTotal unique lineups: {len(deduped)}")
    by_type = {}
    for e in deduped:
        by_type[e["type"]] = by_type.get(e["type"], 0) + 1
    print("By type:", by_type)

    # ---- Build the map->side->callout->lineups structure ----
    # Callout = the landing spot ("to"), grouped per side. Videos stay as
    # YouTube-embed placeholders are NOT added here — this script is
    # screenshot/gif-only; the 5 original hand-picked lineups keep their
    # curated YouTube videos separately (see merge step below, run by hand
    # if wanted). For now this generates the FULL bulk set with image+gif,
    # no video field (video is optional in the schema).
    sides = {"t": {"name": "T Side", "callouts": {}}, "ct": {"name": "CT Side", "callouts": {}}}
    for e in deduped:
        side = sides[e["team"]]
        callout_key = slugify(e["to"])
        callout = side["callouts"].setdefault(callout_key, {"name": e["to"], "lineups": []})
        callout["lineups"].append({
            "id": e["id"],
            "title": f"{e['from']} → {e['to']}",
            "type": e["type"],
            "image": e["image"],
            "gif": e["gif"],
            "image_source": e["image_source"],
            "note": f"{e['note']} from {e['from']}.",
        })

    with open("data/lineups.json", encoding="utf-8") as f:
        data = json.load(f)

    data["dust2"]["sides"] = sides

    with open("data/lineups.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Wrote data/lineups.json")


if __name__ == "__main__":
    main()
