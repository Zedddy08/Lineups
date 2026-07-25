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

// ---- Small inline icon set (self-made SVG, not sourced from anywhere —
// zero licensing question, crisp at any size, themeable via currentColor) --

const ICONS = {
  side: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/><path d="M12 3v18M3 7.5l9 4.5 9-4.5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  smoke: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="16" r="3.2"/><circle cx="13" cy="13" r="4"/><circle cx="17.5" cy="16.5" r="2.6"/></svg>`,
  flash: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>`,
  molotov: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c2 2.5 3 4.4 3 6.2A3 3 0 0 1 9 8.2C9 6.4 10 4.5 12 2z"/><path d="M8 13a4 4 0 108 0c0-1-1-2-1-2H9s-1 1-1 2z"/></svg>`,
};
function icon(name) { return ICONS[name] || ""; }

function typeBadge(type) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return `<span class="badge ${type}">${icon(type)}${label}</span>`;
}

function setHeader(title, showBack) {
  TITLE.textContent = title;
  BACK.hidden = !showBack;
}

function card(href, title, sub, iconName) {
  return `<a class="card" href="${href}">
      ${iconName ? `<div class="icon-chip">${icon(iconName)}</div>` : ""}
      <div class="card-body">
        <div class="card-title">${title}</div>
        ${sub ? `<div class="card-sub">${sub}</div>` : ""}
      </div>
    </a>`;
}

function renderApp(html) {
  APP.classList.remove("page-enter");
  APP.innerHTML = html;
  // restart the animation on every route render, incl. same-class re-triggers
  void APP.offsetWidth;
  APP.classList.add("page-enter");
  window.scrollTo(0, 0);
}

function showLoading() {
  APP.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}

// ---- Route handlers -------------------------------------------------

async function renderMapList() {
  showLoading();
  const data = await loadData();
  setHeader("Lineups", false);
  const maps = Object.entries(data);
  if (!maps.length) {
    renderApp(`<div class="empty">No maps yet.</div>`);
    return;
  }
  renderApp(`<div class="map-grid">
      ${maps
        .map(
          ([id, m]) => `<a class="map-card" href="#/map/${id}">
            ${m.thumbnail ? `<img src="${m.thumbnail}" alt="${m.name}" loading="lazy" />` : ""}
            <div class="scrim"></div>
            <div class="label">
              <div class="map-name">${m.name}</div>
              <div class="chevron">›</div>
            </div>
          </a>`
        )
        .join("")}
    </div>`);
}

async function renderSideList(mapId) {
  showLoading();
  const data = await loadData();
  const map = data[mapId];
  if (!map) return renderNotFound();
  setHeader(map.name, true);
  const sides = Object.entries(map.sides || {});
  if (!sides.length) {
    renderApp(`<div class="empty">No sides added for ${map.name} yet.</div>`);
    return;
  }
  renderApp(`<div class="grid">
      ${sides.map(([id, s]) => card(`#/map/${mapId}/${id}`, s.name, null, "side")).join("")}
    </div>`);
}

async function renderCalloutList(mapId, sideId) {
  showLoading();
  const data = await loadData();
  const map = data[mapId];
  const side = map && map.sides && map.sides[sideId];
  if (!side) return renderNotFound();
  setHeader(`${map.name} — ${side.name}`, true);
  const callouts = Object.entries(side.callouts || {});
  if (!callouts.length) {
    renderApp(`<div class="empty">No callouts added yet.</div>`);
    return;
  }
  renderApp(`<div class="grid">
      ${callouts
        .map(([id, c]) => {
          const count = (c.lineups || []).length;
          return card(
            `#/map/${mapId}/${sideId}/${id}`,
            c.name,
            `${count} lineup${count === 1 ? "" : "s"}`,
            "pin"
          );
        })
        .join("")}
    </div>`);
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
    renderApp(`<div class="empty">No lineups added for ${callout.name} yet.</div>`);
    return;
  }
  renderApp(`<div class="list">
      ${lineups
        .map(
          (l) => `<a class="card" href="#/lineup/${l.id}">
            <div class="icon-chip">${icon(l.type)}</div>
            <div class="card-body">
              <div class="card-title">${l.title}</div>
              <div>${typeBadge(l.type)}</div>
            </div>
          </a>`
        )
        .join("")}
    </div>`);
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
  showLoading();
  const data = await loadData();
  const l = findLineup(data, lineupId);
  if (!l) return renderNotFound();

  setHeader(l.title, true);

  const stepsHtml = (l.steps || [])
    .map((s) => `<li>${s}</li>`)
    .join("");

  renderApp(`
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
  `);
}

function renderNotFound() {
  setHeader("Not found", true);
  renderApp(`<div class="empty">Couldn't find that. <a href="#/">Go back to maps</a>.</div>`);
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
