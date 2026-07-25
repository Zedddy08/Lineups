// Lineups — vanilla JS hash-router SPA. No build step, no dependencies,
// so it deploys straight to GitHub Pages with zero tooling.
//
// Nav flow (per Zed's spec): Map -> Side -> Callout -> Lineup detail.
// The real screenshot/gif IS the guide (per Zed's correction) — no
// paraphrased step-text competing with it, just the visual + a short
// factual note (throw type / positions, not copied prose).

const APP = document.getElementById("app");
const TITLE = document.getElementById("pageTitle");
const BACK = document.getElementById("backBtn");

let DATA = null;

// Bounded fetch — a stale/misbehaving service worker or a dead network
// should surface as a real error the user can retry, not an infinite
// spinner. 10s is generous for a small JSON file; if it hasn't resolved
// by then something's actually wrong.
async function loadData() {
  if (DATA) return DATA;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("data/lineups.json", { cache: "no-cache", signal: controller.signal });
    if (!res.ok) throw new Error(`Data fetch failed: HTTP ${res.status}`);
    DATA = await res.json();
    return DATA;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Small inline icon set (self-made SVG, not sourced from anywhere —
// zero licensing question, crisp at any size, themeable via currentColor) --

const ICONS = {
  side: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/><path d="M12 3v18M3 7.5l9 4.5 9-4.5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  smoke: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="16" r="3.2"/><circle cx="13" cy="13" r="4"/><circle cx="17.5" cy="16.5" r="2.6"/></svg>`,
  flash: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>`,
  molotov: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c2 2.5 3 4.4 3 6.2A3 3 0 0 1 9 8.2C9 6.4 10 4.5 12 2z"/><path d="M8 13a4 4 0 108 0c0-1-1-2-1-2H9s-1 1-1 2z"/></svg>`,
  zoom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>`,
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

// segments: [{label, href}] — last one renders as plain (current) text
function breadcrumb(segments) {
  if (!segments.length) return "";
  const parts = segments.map((s, i) => {
    const isLast = i === segments.length - 1;
    return isLast
      ? `<span class="current">${s.label}</span>`
      : `<a href="${s.href}">${s.label}</a><span class="sep">/</span>`;
  });
  return `<nav class="breadcrumb">${parts.join("")}</nav>`;
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

function showError(err) {
  console.error("Lineups app error:", err);
  setHeader("Lineups", false);
  APP.innerHTML = `
    <div class="empty">
      Something didn't load right.<br />
      <span style="font-size:12px;">${(err && err.message) || "Unknown error"}</span><br /><br />
      <button class="retryBtn" onclick="location.reload()">Reload</button>
    </div>`;
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
  const crumbs = breadcrumb([
    { label: "Maps", href: "#/" },
    { label: map.name },
  ]);
  if (!sides.length) {
    renderApp(`${crumbs}<div class="empty">No sides added for ${map.name} yet.</div>`);
    return;
  }
  renderApp(`${crumbs}<div class="grid">
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
  const crumbs = breadcrumb([
    { label: "Maps", href: "#/" },
    { label: map.name, href: `#/map/${mapId}` },
    { label: side.name },
  ]);
  if (!callouts.length) {
    renderApp(`${crumbs}<div class="empty">No callouts added yet.</div>`);
    return;
  }
  renderApp(`${crumbs}<div class="grid">
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
  const crumbs = breadcrumb([
    { label: "Maps", href: "#/" },
    { label: map.name, href: `#/map/${mapId}` },
    { label: side.name, href: `#/map/${mapId}/${sideId}` },
    { label: callout.name },
  ]);
  if (!lineups.length) {
    renderApp(`${crumbs}<div class="empty">No lineups added for ${callout.name} yet.</div>`);
    return;
  }
  renderApp(`${crumbs}<div class="list">
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

function findLineupPath(data, lineupId) {
  for (const [mapId, map] of Object.entries(data)) {
    for (const [sideId, side] of Object.entries(map.sides || {})) {
      for (const [calloutId, callout] of Object.entries(side.callouts || {})) {
        for (const l of callout.lineups || []) {
          if (l.id === lineupId) {
            return { map, mapId, side, sideId, callout, calloutId, lineup: l };
          }
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

// The picture guide IS the guide now — a real screenshot or a looping clip
// (csnades.gg's "hover gif" effect, actually a muted looping mp4 — more
// efficient than a real .gif, same visual result), tap to zoom into the
// full still image. No paraphrased step text alongside it; that read as
// redundant/copied-feeling once the real visual is right there. Everything
// here is hotlinked (not downloaded into this repo) — see README.
function renderPictureGuide(l) {
  if (l.gif) {
    return `
      <div class="media-frame" onclick="openLightbox('${l.image}')">
        <video src="${l.gif}" autoplay muted loop playsinline preload="metadata"></video>
        <div class="zoom-hint">${icon("zoom")}Tap to zoom</div>
      </div>
      ${l.image_source ? `<div class="media-attribution">${l.image_source}</div>` : ""}
    `;
  }
  if (l.image) {
    return `
      <div class="picture-slot" style="display:none;">📸 Image unavailable right now — the source may have moved it.</div>
      <div class="media-frame" onclick="openLightbox('${l.image}')">
        <img src="${l.image}" alt="${l.title} lineup screenshot" loading="lazy"
          onerror="this.closest('.media-frame').style.display='none'; this.closest('.media-frame').previousElementSibling.style.display='flex';" />
        <div class="zoom-hint">${icon("zoom")}Tap to zoom</div>
      </div>
      ${l.image_source ? `<div class="media-attribution">${l.image_source}</div>` : ""}
    `;
  }
  return `<div class="picture-slot">📸 Screenshot slot — drop your own in-game capture here for this step</div>`;
}

function openLightbox(imgUrl) {
  const el = document.createElement("div");
  el.className = "lightbox";
  el.innerHTML = `
    <button class="lightbox-close" aria-label="Close">✕</button>
    <img src="${imgUrl}" alt="Lineup screenshot, zoomed" />
  `;
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.classList.contains("lightbox-close")) el.remove();
  });
  document.body.appendChild(el);
}
window.openLightbox = openLightbox;

async function renderLineupDetail(lineupId) {
  showLoading();
  const data = await loadData();
  const found = findLineupPath(data, lineupId);
  if (!found) return renderNotFound();
  const { map, mapId, side, sideId, callout, calloutId, lineup: l } = found;

  setHeader(l.title, true);
  const crumbs = breadcrumb([
    { label: "Maps", href: "#/" },
    { label: map.name, href: `#/map/${mapId}` },
    { label: side.name, href: `#/map/${mapId}/${sideId}` },
    { label: callout.name, href: `#/map/${mapId}/${sideId}/${calloutId}` },
    { label: l.title },
  ]);

  renderApp(`
    ${crumbs}

    ${
      l.video
        ? `<div class="video-wrap">
            <iframe src="${youtubeEmbedSrc(l.video)}" title="${l.title}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen loading="lazy"></iframe>
          </div>`
        : ""
    }

    ${l.note ? `<div class="note">${typeBadge(l.type)} ${l.note}</div>` : `<div class="note">${typeBadge(l.type)}</div>`}

    <div class="section-label">Picture Guide</div>
    ${renderPictureGuide(l)}
  `);
}

function renderNotFound() {
  setHeader("Not found", true);
  renderApp(`<div class="empty">Couldn't find that. <a href="#/">Go back to maps</a>.</div>`);
}

// ---- Router -----------------------------------------------------------

async function route() {
  try {
    const hash = location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean);

    if (parts.length === 0) return await renderMapList();
    if (parts[0] === "map" && parts.length === 2) return await renderSideList(parts[1]);
    if (parts[0] === "map" && parts.length === 3) return await renderCalloutList(parts[1], parts[2]);
    if (parts[0] === "map" && parts.length === 4) return await renderLineupList(parts[1], parts[2], parts[3]);
    if (parts[0] === "lineup" && parts.length === 2) return await renderLineupDetail(parts[1]);
    return renderNotFound();
  } catch (err) {
    // Whatever failed (data fetch timeout, stale service worker serving a
    // broken response, anything) — never leave the user staring at a
    // spinner that will never resolve. Always land somewhere actionable.
    showError(err);
  }
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

    // When a NEW service worker takes over (a fresh deploy landed since
    // this page was opened), reload automatically instead of leaving the
    // page silently running old JS against new data — this is the exact
    // "stuck spinner, worked fine when there were fewer lineups" bug
    // class. reloading is guarded so it only ever fires once per page.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  });
}
