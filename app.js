// Lineups — vanilla JS hash-router SPA. No build step, no dependencies,
// so it deploys straight to GitHub Pages with zero tooling.
//
// Nav flow (per Zed's spec): Map -> Side -> Callout -> Lineup detail
// (video up top, scrollable picture-guide steps below).

const APP = document.getElementById("app");
const TITLE = document.getElementById("pageTitle");
const BACK = document.getElementById("backBtn");

let DATA = null;

async function loadData() {
  if (DATA) return DATA;
  const res = await fetch("data/lineups.json", { cache: "no-cache" });
  DATA = await res.json();
  return DATA;
}

function typeBadge(type) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return `<span class="badge ${type}">${label}</span>`;
}

function setHeader(title, showBack) {
  TITLE.textContent = title;
  BACK.hidden = !showBack;
}

function card(href, title, sub) {
  return `<a class="card" href="${href}">
      <div class="card-title">${title}</div>
      ${sub ? `<div class="card-sub">${sub}</div>` : ""}
    </a>`;
}

// ---- Route handlers -------------------------------------------------

async function renderMapList() {
  const data = await loadData();
  setHeader("Lineups", false);
  const maps = Object.entries(data);
  if (!maps.length) {
    APP.innerHTML = `<div class="empty">No maps yet.</div>`;
    return;
  }
  APP.innerHTML = `<div class="grid">
      ${maps.map(([id, m]) => card(`#/map/${id}`, m.name)).join("")}
    </div>`;
}

async function renderSideList(mapId) {
  const data = await loadData();
  const map = data[mapId];
  if (!map) return renderNotFound();
  setHeader(map.name, true);
  const sides = Object.entries(map.sides || {});
  if (!sides.length) {
    APP.innerHTML = `<div class="empty">No sides added for ${map.name} yet.</div>`;
    return;
  }
  APP.innerHTML = `<div class="grid">
      ${sides.map(([id, s]) => card(`#/map/${mapId}/${id}`, s.name)).join("")}
    </div>`;
}

async function renderCalloutList(mapId, sideId) {
  const data = await loadData();
  const map = data[mapId];
  const side = map && map.sides && map.sides[sideId];
  if (!side) return renderNotFound();
  setHeader(`${map.name} — ${side.name}`, true);
  const callouts = Object.entries(side.callouts || {});
  if (!callouts.length) {
    APP.innerHTML = `<div class="empty">No callouts added yet.</div>`;
    return;
  }
  APP.innerHTML = `<div class="grid">
      ${callouts
        .map(([id, c]) => {
          const count = (c.lineups || []).length;
          return card(
            `#/map/${mapId}/${sideId}/${id}`,
            c.name,
            `${count} lineup${count === 1 ? "" : "s"}`
          );
        })
        .join("")}
    </div>`;
}

async function renderLineupList(mapId, sideId, calloutId) {
  const data = await loadData();
  const map = data[mapId];
  const side = map && map.sides && map.sides[sideId];
  const callout = side && side.callouts && side.callouts[calloutId];
  if (!callout) return renderNotFound();

  const lineups = callout.lineups || [];
  // Single-lineup callouts skip straight to the detail page — no point
  // showing a list of one.
  if (lineups.length === 1) {
    location.replace(`#/lineup/${lineups[0].id}`);
    return;
  }

  setHeader(`${map.name} — ${callout.name}`, true);
  if (!lineups.length) {
    APP.innerHTML = `<div class="empty">No lineups added for ${callout.name} yet.</div>`;
    return;
  }
  APP.innerHTML = `<div class="list">
      ${lineups
        .map(
          (l) => `<a class="card" href="#/lineup/${l.id}">
            <div class="card-title">${l.title} ${typeBadge(l.type)}</div>
          </a>`
        )
        .join("")}
    </div>`;
}

function findLineup(data, lineupId) {
  for (const map of Object.values(data)) {
    for (const side of Object.values(map.sides || {})) {
      for (const callout of Object.values(side.callouts || {})) {
        for (const l of callout.lineups || []) {
          if (l.id === lineupId) return l;
        }
      }
    }
  }
  return null;
}

function youtubeEmbedSrc(url) {
  // Accepts a already-correct /embed/ URL, or normalizes a plain watch URL.
  if (url.includes("/embed/")) return url;
  const idMatch = url.match(/[?&]v=([^&]+)/);
  if (idMatch) return `https://www.youtube.com/embed/${idMatch[1]}`;
  return url;
}

// Picture-guide images are hotlinked (referenced from the source site's own
// URL, never downloaded/rehosted into this repo) — see README's "Content
// sourcing note". onerror swaps in the placeholder if the source ever
// moves/deletes the image, since a hotlink has no uptime guarantee.
function renderPictureGuide(l) {
  if (!l.image) {
    return `<div class="picture-slot">📸 Screenshot slot — drop your own in-game capture here for this step</div>`;
  }
  return `
    <div class="picture-slot" style="display:none;">📸 Image unavailable right now — the source site may have moved it.</div>
    <img class="lineup-image" src="${l.image}" alt="${l.title} lineup screenshot" loading="lazy"
      onerror="this.style.display='none'; this.previousElementSibling.style.display='flex';" />
    ${l.image_source ? `<div class="source-note">Screenshot via ${l.image_source} (hotlinked, not copied).</div>` : ""}
  `;
}

async function renderLineupDetail(lineupId) {
  const data = await loadData();
  const l = findLineup(data, lineupId);
  if (!l) return renderNotFound();

  setHeader(l.title, true);

  const stepsHtml = (l.steps || [])
    .map((s) => `<li>${s}</li>`)
    .join("");

  APP.innerHTML = `
    <div class="video-wrap">
      <iframe src="${youtubeEmbedSrc(l.video)}" title="${l.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>
    </div>

    ${l.note ? `<div class="note">${l.note}</div>` : ""}

    <div class="section-label">Picture Guide</div>
    <ol class="steps">${stepsHtml}</ol>
    ${renderPictureGuide(l)}

    ${l.source_note ? `<div class="source-note">${l.source_note}</div>` : ""}
  `;
}

function renderNotFound() {
  setHeader("Not found", true);
  APP.innerHTML = `<div class="empty">Couldn't find that. <a href="#/">Go back to maps</a>.</div>`;
}

// ---- Router -----------------------------------------------------------

function route() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts.length === 0) return renderMapList();
  if (parts[0] === "map" && parts.length === 2) return renderSideList(parts[1]);
  if (parts[0] === "map" && parts.length === 3) return renderCalloutList(parts[1], parts[2]);
  if (parts[0] === "map" && parts.length === 4) return renderLineupList(parts[1], parts[2], parts[3]);
  if (parts[0] === "lineup" && parts.length === 2) return renderLineupDetail(parts[1]);
  return renderNotFound();
}

BACK.addEventListener("click", () => history.back());
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

// ---- PWA service worker registration ----------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline caching is a nice-to-have, never block the app on it */
    });
  });
}
