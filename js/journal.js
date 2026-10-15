/* ============ JOURNAL ============ */
function seriesName(id) { const s = cfg().series.find(x => x.id === id); return s ? nm(s.name) : ""; }
function vJournal() {
  if (S.journal.mode === "series") return vSeries();
  const k = S.journal.day, dj = day(k);
  let h = head(t("nav_journal"), fmtDate(k), '<div class="seg"><button data-jmode="day" aria-pressed="true">' + esc(t("byDay")) + '</button><button data-jmode="series" aria-pressed="false">' + esc(t("bySeries")) + "</button></div>");
  h += '<div class="daynav" style="margin-bottom:16px"><button class="btn sm" data-jstep="-1" aria-label="' + esc(t("prev")) + '">‹</button><input class="in" type="date" id="jDate" data-fresh="1" value="' + k + '" style="width:auto"><button class="btn sm" data-jstep="1" aria-label="' + esc(t("next")) + '">›</button><button class="btn sm" data-jday="' + todayKey() + '">' + esc(t("todayWord")) + "</button></div>";
  h += '<div class="jgrid"><section style="display:flex;flex-direction:column;gap:16px">';
  /* summary */
  const sess = (dj.sessions || []).slice().sort((a, b) => a.start - b.start), sec = focusSec(k);
  const doneT = Object.values(S.tasks).filter(x => x.doneAt && dkey(new Date(x.doneAt)) === k);
  h += '<div class="panel"><div class="stats"><div class="stat"><span class="eyebrow">' + esc(t("focusWord")) + '</span><b class="num">' + esc(fmtDur(sec)) + '</b></div><div class="stat"><span class="eyebrow">' + esc(t("sessions")) + '</span><b class="num">' + sess.length + '</b></div><div class="stat"><span class="eyebrow">' + esc(t("doneWord")) + '</span><b class="num">' + doneT.length + "</b></div></div>";
  if (sess.length) {
    const d0 = parseKey(k).getTime(), a = Math.min(6, ...sess.map(s => new Date(s.start).getHours())), b = Math.max(24, ...sess.map(s => Math.ceil((s.end - d0) / 36e5)));
    const span = (b - a) * 36e5;
    h += '<div class="strip">' + sess.map(s => '<i title="' + esc((s.title || nm(cat(s.cat).name)) + " · " + hhmm(s.start) + "–" + hhmm(s.end)) + '" style="left:' + ((s.start - d0 - a * 36e5) / span * 100).toFixed(2) + "%;width:" + ((s.end - s.start) / span * 100).toFixed(2) + "%;background:" + esc(cat(s.cat).color) + '"></i>').join("") + '</div><div class="strip-ax num">' + [a, (a + b) / 2 | 0, b].map(x => "<span>" + pad(x % 24) + ":00</span>").join("") + "</div>";
    h += '<div style="margin-top:10px">' + catBar(focusByCat([k])) + "</div>";
    h += '<div class="tl" style="margin-top:8px">' + sess.map(s => '<div class="m"><span class="tm">' + hhmm(s.start) + "–" + hhmm(s.end) + "</span><span>" + esc(s.title || t("freeFocus")) + " · " + esc(fmtDur(s.sec)) + (s.cat ? " · " + esc(nm(cat(s.cat).name)) : "") + ' <button class="btn ghost sm" data-delsess="' + s.id + '" aria-label="' + esc(t("delete")) + '">×</button></span></div>').join("") + "</div>";
  } else h += '<div class="empty">' + esc(t("noSessions")) + "</div>";
  if (doneT.length) h += '<div class="muted" style="margin-top:10px">' + esc(t("doneThatDay")) + ": " + doneT.map(x => esc(x.title)).join(" · ") + "</div>";
  h += "</div>";
  /* entries */
  const ents = (dj.entries || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  h += '<div class="panel"><h2>' + esc(t("entries")) + "</h2>" + (ents.length ? ents.map(entryHTML).join("") : '<div class="empty">' + esc(t("noEntries")) + "</div>") + "</div>";
  /* new entry */
  const J = S.journal;
  h += '<div class="panel"><h2>' + esc(t("newEntry")) + '</h2><form class="form" data-form="entry"><div class="chips">' + ENTRY_TYPES.map(ty => '<button type="button" class="chip" style="--c:var(--accent)" aria-pressed="' + (J.type === ty) + '" data-etype="' + ty + '">' + esc(t("type_" + ty)) + "</button>").join("") + "</div>" +
    '<input class="in" id="jTitle" placeholder="' + esc(t("entryTitlePh")) + '">' +
    '<textarea class="in" id="jText" placeholder="' + esc(t("entryPh_" + J.type)) + '"></textarea>' +
    '<div class="formgrid"><label class="field"><span>' + esc(t("series")) + '</span><select class="in" id="jSeries"><option value="">' + esc(t("noSeries")) + "</option>" + cfg().series.map(s => '<option value="' + esc(s.id) + '">' + esc(nm(s.name)) + "</option>").join("") + '</select></label><label class="field"><span>' + esc(t("photos")) + '</span><input class="in" type="file" id="jPhotos" accept="image/*" multiple' + "></label></div>" +
    '<div class="row"><button type="button" class="btn sm" data-jstar="1" aria-pressed="' + J.star + '">' + (J.star ? "★ " : "☆ ") + esc(t("contentMaterial")) + '</button><span style="flex:1"></span><button class="btn primary" type="submit">' + esc(t("save")) + "</button></div>" +
    "</form></div>";
  h += '</section><aside style="display:flex;flex-direction:column;gap:16px">' + placesPanel(k) + "</aside></div>";
  return h;
}
function entryHTML(e) {
  return '<article class="entry"><div class="eh"><span class="typechip">' + esc(t("type_" + (e.type || "note"))) + "</span>" + (e.ts ? '<span class="num">' + hhmm(e.ts) + "</span>" : "") + (e.series ? '<span class="chip" style="--c:var(--accent)">' + esc(seriesName(e.series)) + "</span>" : "") +
    '<span style="flex:1"></span><button class="star' + (e.star ? " on" : "") + '" data-estar="' + e.id + '" aria-label="' + esc(t("contentMaterial")) + '" title="' + esc(t("contentMaterial")) + '">' + (e.star ? "★" : "☆") + '</button><button class="btn ghost sm" data-edel="' + e.id + '">' + esc(t("delete")) + "</button></div>" +
    (e.title ? "<h3>" + esc(e.title) + "</h3>" : "") + (e.text ? "<p>" + esc(e.text) + "</p>" : "") +
    (e.photos && e.photos.length ? '<div class="photos">' + e.photos.map(p => '<a data-phlink="1" target="_blank" rel="noopener">' + photoTag(p) + "</a>").join("") + "</div>" : "") + "</article>";
}
async function saveEntry() {
  const k = S.journal.day, J = S.journal;
  const title = $("#jTitle").value.trim(), text = $("#jText").value.trim();
  const files = $("#jPhotos") ? Array.from($("#jPhotos").files || []) : [];
  if (!title && !text && !files.length) { toast(t("entryEmpty")); return; }
  const photos = [];
  if (files.length) {
    toast(t("uploading"));
    for (const f of files) { try { photos.push(await uploadPhoto(f)); } catch (e) { toast(t("uploadFailed")); } }
  }
  const d = clone(day(k)); d.entries = d.entries || []; d.sessions = d.sessions || [];
  d.entries.push({ id: uid(), type: J.type, title, text, series: $("#jSeries").value, star: J.star, photos, ts: Date.now() });
  $("#jTitle").value = ""; $("#jText").value = ""; if ($("#jPhotos")) $("#jPhotos").value = "";
  J.star = false;
  putDay(k, d); toast(t("saved"));
}
function editEntry(k, id, fn) { const d = clone(day(k)); const e = (d.entries || []).find(x => x.id === id); if (!e) return; if (fn(e, d) === "delete") d.entries = d.entries.filter(x => x.id !== id); putDay(k, d); }

function vSeries() {
  const sid = S.journal.series || "";
  let h = head(t("nav_journal"), t("seriesEyebrow"), '<div class="seg"><button data-jmode="day" aria-pressed="false">' + esc(t("byDay")) + '</button><button data-jmode="series" aria-pressed="true">' + esc(t("bySeries")) + "</button></div>");
  const all = [];
  Object.keys(S.days).sort().forEach(k => (S.days[k].entries || []).forEach(e => { if (sid === "_star" ? e.star : sid ? e.series === sid : (e.star || e.series)) all.push([k, e]); }));
  h += '<div class="filters"><select class="in" id="jSeriesPick" style="width:auto"><option value="">' + esc(t("allMaterial")) + '</option><option value="_star"' + (sid === "_star" ? " selected" : "") + ">★ " + esc(t("starredOnly")) + "</option>" + cfg().series.map(s => '<option value="' + esc(s.id) + '"' + (s.id === sid ? " selected" : "") + ">" + esc(nm(s.name)) + "</option>").join("") + '</select><span class="muted num">' + esc(t("nEntries").replace("{n}", all.length)) + '</span><span style="flex:1"></span><button class="btn" data-sexport="1"' + (all.length ? "" : " disabled") + ">" + esc(t("exportMd")) + "</button></div>";
  h += '<div class="panel" style="max-width:820px">';
  if (!all.length) h += '<div class="empty">' + esc(t("noSeriesEntries")) + "</div>";
  let last = "";
  all.forEach(([k, e]) => {
    if (k !== last) { h += '<div class="eyebrow" style="margin-top:' + (last ? 18 : 0) + 'px">' + esc(fmtDate(k)) + ' · <button class="btn ghost sm" data-jday="' + k + '">' + esc(t("openDay")) + "</button></div>"; last = k; }
    h += entryHTML(e);
  });
  return h + "</div>";
}
function seriesMarkdown() {
  const sid = S.journal.series || "";
  const label = sid === "_star" ? t("starredOnly") : sid ? seriesName(sid) : t("allMaterial");
  let md = "# " + label + "\n\n";
  let last = "";
  Object.keys(S.days).sort().forEach(k => {
    const d = S.days[k];
    (d.entries || []).forEach(e => {
      if (!(sid === "_star" ? e.star : sid ? e.series === sid : (e.star || e.series))) return;
      if (k !== last) {
        md += "## " + fmtDate(k) + "\n\n";
        const s = focusSec(k); if (s) md += "_" + t("focusWord") + ": " + fmtDur(s) + "_\n\n";
        const v = d.places && d.places.visits ? d.places.visits.map(placeName).filter(Boolean) : [];
        if (v.length) md += "_" + t("placesWord") + ": " + v.join(", ") + "_\n\n";
        last = k;
      }
      md += "### " + (e.star ? "★ " : "") + (e.title || t("type_" + e.type)) + "\n" + "*" + t("type_" + e.type) + (e.ts ? " · " + hhmm(e.ts) : "") + (e.series ? " · " + seriesName(e.series) : "") + "*\n\n" + (e.text ? e.text + "\n\n" : "");
    });
  });
  return md;
}

/* ============ PLACES ============ */
const MODE_COL = { walk: "#4E7A3F", run: "#4E7A3F", bike: "#2F8A7A", car: "#8A6D4B", transit: "#3E6FA8", flight: "#8A5BB5", move: "#827765" };
function modeOf(s) {
  s = String(s || "").toLowerCase();
  if (/walk|foot/.test(s)) return "walk";
  if (/run/.test(s)) return "run";
  if (/cycl|bik/.test(s)) return "bike";
  if (/fly|plane/.test(s)) return "flight";
  if (/bus|subway|metro|train|tram|rail|ferry|cable|gondola|transit/.test(s)) return "transit";
  if (/vehicle|driv|car|taxi|motor/.test(s)) return "car";
  return "move";
}
function ll(v) {
  if (v == null) return null;
  if (typeof v === "object") {
    if ("latitudeE7" in v) return [v.latitudeE7 / 1e7, v.longitudeE7 / 1e7];
    if ("latE7" in v) return [v.latE7 / 1e7, v.lngE7 / 1e7];
    if (v.latLng) return ll(v.latLng);
    if (v.point) return ll(v.point);
    if (v.placeLocation) return ll(v.placeLocation);
    if ("lat" in v && ("lng" in v || "lon" in v)) return [+v.lat, +(v.lng != null ? v.lng : v.lon)];
    return null;
  }
  const m = String(v).match(/(-?\d{1,3}(?:\.\d+)?)°?\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  return m ? [+m[1], +m[2]] : null;
}
function ts(v) { if (v == null) return NaN; if (typeof v === "number") return v; if (/^\d{12,}$/.test(v)) return +v; return Date.parse(v); }
function distM(a, b) { const R = 6371000, r = Math.PI / 180, dl = (b[0] - a[0]) * r, dn = (b[1] - a[1]) * r; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
function thin(pts, n) { if (pts.length <= n) return pts; const out = []; for (let i = 0; i < n; i++) out.push(pts[Math.round(i * (pts.length - 1) / (n - 1))]); return out; }

function parseTimeline(json) {
  const visits = [], moves = [], paths = [];
  const addV = (st, en, p, placeId, name) => { if (p && !isNaN(st)) visits.push({ start: st, end: isNaN(en) ? st : en, lat: +p[0].toFixed(6), lng: +p[1].toFixed(6), placeId: placeId || "", gname: name || "" }); };
  const addM = (st, en, a, b, dist, type, pts) => { if (!isNaN(st)) moves.push({ start: st, end: isNaN(en) ? st : en, a, b, dist: +dist || 0, mode: modeOf(type), pts: pts || [] }); };
  if (json && Array.isArray(json.semanticSegments)) {
    json.semanticSegments.forEach(g => {
      const st = ts(g.startTime), en = ts(g.endTime);
      if (g.visit) { const c = g.visit.topCandidate || {}; addV(st, en, ll(c.placeLocation), c.placeId); }
      else if (g.activity) { const c = g.activity.topCandidate || {}; addM(st, en, ll(g.activity.start), ll(g.activity.end), g.activity.distanceMeters, c.type); }
      if (Array.isArray(g.timelinePath)) g.timelinePath.forEach(p => { const q = ll(p.point); if (q) paths.push([ts(p.time), q]); });
    });
  } else if (Array.isArray(json)) {
    json.forEach(g => {
      const st = ts(g.startTime), en = ts(g.endTime);
      if (g.visit) { const c = g.visit.topCandidate || {}; addV(st, en, ll(c.placeLocation), c.placeID || c.placeId); }
      else if (g.activity) { const c = g.activity.topCandidate || {}; addM(st, en, ll(g.activity.start), ll(g.activity.end), g.activity.distanceMeters, c.type); }
      else if (Array.isArray(g.timelinePath)) g.timelinePath.forEach(p => { const q = ll(p.point); if (q) paths.push([st + (+p.durationMinutesOffsetFromStartTime || 0) * 60000, q]); });
    });
  } else if (json && Array.isArray(json.timelineObjects)) {
    json.timelineObjects.forEach(o => {
      if (o.placeVisit) { const v = o.placeVisit, du = v.duration || {}; addV(ts(du.startTimestamp || du.startTimestampMs), ts(du.endTimestamp || du.endTimestampMs), ll(v.location), v.location && v.location.placeId, v.location && v.location.name); }
      if (o.activitySegment) {
        const a = o.activitySegment, du = a.duration || {};
        const raw = (a.simplifiedRawPath && a.simplifiedRawPath.points) || (a.waypointPath && a.waypointPath.waypoints) || [];
        addM(ts(du.startTimestamp || du.startTimestampMs), ts(du.endTimestamp || du.endTimestampMs), ll(a.startLocation), ll(a.endLocation), a.distance || (a.waypointPath && a.waypointPath.distanceMeters), a.activityType, raw.map(ll).filter(Boolean));
      }
    });
  } else return null;
  paths.sort((a, b) => a[0] - b[0]);
  moves.forEach(m => {
    let pts = m.pts.length ? m.pts : paths.filter(p => p[0] >= m.start && p[0] <= m.end).map(p => p[1]);
    pts = [m.a].concat(pts, [m.b]).filter(Boolean);
    m.path = thin(pts, 120).map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]);
    if (!m.dist && m.path.length > 1) { let s = 0; for (let i = 1; i < m.path.length; i++) s += distM(m.path[i - 1], m.path[i]); m.dist = s; }
    delete m.a; delete m.b; delete m.pts; m.dist = Math.round(m.dist);
  });
  /* güne böl: geceyi aşan duraklar her iki güne de kırpılarak yazılır */
  const out = {};
  const slot = k => out[k] || (out[k] = { visits: [], moves: [] });
  visits.forEach(v => {
    let k = dkey(new Date(v.start)); const endK = dkey(new Date(v.end)); let guard = 0;
    while (k <= endK && guard++ < 40) {
      const d0 = parseKey(k).getTime(), d1 = d0 + 864e5;
      slot(k).visits.push(Object.assign({}, v, { start: Math.max(v.start, d0), end: Math.min(v.end, d1 - 60000), id: uid() }));
      k = addDays(k, 1);
    }
  });
  moves.forEach(m => slot(dkey(new Date(m.start))).moves.push(Object.assign(m, { id: uid() })));
  Object.values(out).forEach(d => { d.visits.sort((a, b) => a.start - b.start); d.moves.sort((a, b) => a.start - b.start); });
  return { days: out, nVisits: visits.length, nMoves: moves.length };
}
function knownPlace(v) {
  if (!v || v.lat == null) return null;
  return cfg().places.find(p => (v.placeId && p.placeId === v.placeId) || (p.lat != null && distM([p.lat, p.lng], [v.lat, v.lng]) < 150)) || null;
}
function placeName(v) { const p = knownPlace(v); return (p && p.name) || v.name || v.gname || ""; }

function mapSVG(pl) {
  const pts = [];
  (pl.visits || []).forEach(v => { if (v.lat != null) pts.push([v.lat, v.lng]); });
  (pl.moves || []).forEach(m => (m.path || []).forEach(p => pts.push(p)));
  if (!pts.length) return "";
  let a = Math.min(...pts.map(p => p[0])), b = Math.max(...pts.map(p => p[0])), c = Math.min(...pts.map(p => p[1])), d = Math.max(...pts.map(p => p[1]));
  if (b - a < .004) { a -= .003; b += .003; } if (d - c < .004) { c -= .003; d += .003; }
  const W = 640, H = 380, P = 34, k = Math.cos((a + b) / 2 * Math.PI / 180);
  const dx = (d - c) * k, dy = b - a, sc = Math.min((W - 2 * P) / dx, (H - 2 * P) / dy);
  const ox = (W - dx * sc) / 2, oy = (H - dy * sc) / 2;
  const X = p => (ox + (p[1] - c) * k * sc).toFixed(1), Y = p => (oy + (b - p[0]) * sc).toFixed(1);
  let s = '<svg class="map" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("routeMap")) + '">';
  (pl.moves || []).forEach(m => { if ((m.path || []).length > 1) s += '<polyline class="route" stroke="' + (MODE_COL[m.mode] || MODE_COL.move) + '"' + (m.mode === "walk" ? ' stroke-dasharray="2 6"' : "") + ' points="' + m.path.map(p => X(p) + "," + Y(p)).join(" ") + '"/>'; });
  (pl.visits || []).forEach((v, i) => { if (v.lat == null) return; s += '<circle class="pin" cx="' + X([v.lat, v.lng]) + '" cy="' + Y([v.lat, v.lng]) + '" r="13" fill="var(--ink)"/><text x="' + X([v.lat, v.lng]) + '" y="' + (+Y([v.lat, v.lng]) + 5) + '" text-anchor="middle" style="fill:var(--bg);font-size:14px">' + (i + 1) + "</text>"; });
  const mpp = 111320 / sc; /* metre / piksel */
  const nice = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
  let dm = nice[0]; nice.forEach(n => { if (n / mpp <= 130) dm = n; });
  const px = dm / mpp;
  s += '<line class="scale" x1="16" y1="' + (H - 16) + '" x2="' + (16 + px).toFixed(1) + '" y2="' + (H - 16) + '"/><line class="scale" x1="16" y1="' + (H - 21) + '" x2="16" y2="' + (H - 11) + '"/><line class="scale" x1="' + (16 + px).toFixed(1) + '" y1="' + (H - 21) + '" x2="' + (16 + px).toFixed(1) + '" y2="' + (H - 11) + '"/><text class="scalet" x="' + (22 + px).toFixed(1) + '" y="' + (H - 12) + '">' + (dm >= 1000 ? dm / 1000 + " km" : dm + " m") + "</text>";
  return s + "</svg>";
}
function gmaps(v) { return v.url || "https://www.google.com/maps/search/?api=1&query=" + v.lat + "," + v.lng; }
function placesPanel(k) {
  const pl = day(k).places || { visits: [], moves: [] };
  const vs = pl.visits || [], ms = pl.moves || [];
  let h = '<div class="panel"><h2>' + esc(t("placesTitle")) + "</h2>";
  if (vs.length || ms.length) {
    h += mapSVG(pl);
    const items = vs.map((v, i) => ["v", v.start, v, i]).concat(ms.map(m => ["m", m.start, m])).sort((a, b) => a[1] - b[1]);
    h += '<div class="tl">' + items.map(it => {
      if (it[0] === "m") { const m = it[2]; return '<div class="m"><span class="tm">' + hhmm(m.start) + "</span><span>" + esc(t("mode_" + m.mode)) + " · " + esc(fmtDur((m.end - m.start) / 1000)) + (m.dist ? " · " + (m.dist >= 1000 ? (m.dist / 1000).toFixed(1).replace(".", S.lang === "en" || S.lang === "ja" ? "." : ",") + " km" : m.dist + " m") : "") + "</span></div>"; }
      const v = it[2], i = it[3], name = placeName(v), key = k + "|" + v.id;
      return '<div class="v"><span class="tm">' + hhmm(v.start) + "<br>" + hhmm(v.end) + '</span><div><div class="nm"><span class="no">' + (i + 1) + "</span>" + esc(name || t("unnamedPlace")) + "</div>" +
        '<div class="muted">' + esc(fmtDur((v.end - v.start) / 1000)) + (v.note ? " · " + esc(v.note) : "") + "</div>" +
        (v.photo ? '<div class="photos" style="margin-top:6px">' + photoTag(v.photo) + "</div>" : "") +
        '<div class="row" style="gap:10px;margin-top:3px">' + (v.lat != null || v.url ? '<a href="' + esc(gmaps(v)) + '" target="_blank" rel="noopener">' + esc(t("openMaps")) + "</a>" : "") +
        (v.lat != null ? '<button class="btn ghost sm" data-nameplace="' + esc(key) + '">' + esc(name ? t("rename") : t("nameIt")) + "</button>" : "") +
        (v.manual ? '<button class="btn ghost sm" data-delvisit="' + esc(key) + '">' + esc(t("delete")) + "</button>" : "") + "</div>" +
        (S.naming === key ? '<form class="namebox" data-form="nameplace" data-key="' + esc(key) + '"><input class="in" id="namePlaceIn" autofocus value="' + esc(name) + '" placeholder="' + esc(t("placeNamePh")) + '"><button class="btn primary sm" type="submit">' + esc(t("save")) + "</button></form>" : "") +
        "</div></div>";
    }).join("") + "</div>";
    const stops = vs.filter(v => v.lat != null).slice(0, 10);
    if (stops.length > 1) h += '<div style="margin-top:10px"><a href="https://www.google.com/maps/dir/' + stops.map(v => v.lat + "," + v.lng).join("/") + '" target="_blank" rel="noopener" style="color:var(--accent);font-size:13px">' + esc(t("routeInMaps")) + "</a></div>";
  } else h += '<div class="empty">' + esc(t("noPlaces")) + ' <button class="btn ghost sm" data-go="places">' + esc(t("importTimeline")) + "</button></div>";
  h += '<details id="pAddBox" style="margin-top:14px"><summary class="btn sm" style="list-style:none;display:inline-flex">+ ' + esc(t("addPlace")) + '</summary><form class="form" data-form="place" style="margin-top:12px">' +
    '<input class="in" id="pName" placeholder="' + esc(t("placeNamePh")) + '">' +
    '<div class="formgrid"><label class="field"><span>' + esc(t("arrived")) + '</span><input class="in" type="time" id="pFrom"></label><label class="field"><span>' + esc(t("left")) + '</span><input class="in" type="time" id="pTo"></label></div>' +
    '<label class="field"><span>' + esc(t("mapsLink")) + '</span><div class="row"><input class="in grow" id="pLoc" placeholder="https://maps.google.com/… · 41.0082, 28.9784"><button type="button" class="btn sm" data-here="1">' + esc(t("hereNow")) + "</button></div></label>" +
    '<input class="in" id="pNote" placeholder="' + esc(t("placeNotePh")) + '">' +
    '<label class="field"><span>' + esc(t("photo")) + '</span><input class="in" type="file" id="pPhoto" accept="image/*"' + "></label>" +
    '<div class="row"><span style="flex:1"></span><button class="btn primary" type="submit">' + esc(t("addPlace")) + "</button></div></form></details>";
  return h + "</div>";
}
async function savePlace() {
  const k = S.journal.day;
  const name = $("#pName").value.trim(); if (!name) { toast(t("placeNeedsName")); return; }
  const loc = $("#pLoc").value.trim();
  const p = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(loc) || /[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(loc) || /^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/.exec(loc);
  const at = (hm, def) => { if (!hm) return def; const [H, M] = hm.split(":").map(Number); const d = parseKey(k); d.setHours(H, M, 0, 0); return d.getTime(); };
  const start = at($("#pFrom").value, parseKey(k).getTime() + 12 * 36e5), end = at($("#pTo").value, start);
  let photo = "";
  const f = $("#pPhoto") && $("#pPhoto").files[0];
  if (f) { toast(t("uploading")); try { photo = await uploadPhoto(f); } catch (e) { toast(t("uploadFailed")); } }
  const d = clone(day(k)); d.places = d.places || { visits: [], moves: [] }; d.places.visits = d.places.visits || [];
  const v = { id: uid(), manual: true, name, start, end: Math.max(start, end), note: $("#pNote").value.trim(), photo };
  if (p) { v.lat = +p[1]; v.lng = +p[2]; } else if (/^https?:\/\//.test(loc)) v.url = loc;
  d.places.visits.push(v); d.places.visits.sort((a, b) => a.start - b.start);
  putDay(k, d); toast(t("added"));
}

function vPlaces() {
  const pp = S.places;
  let h = head(t("nav_places"), t("placesEyebrow"), "");
  h += '<div class="jgrid"><section style="display:flex;flex-direction:column;gap:16px"><div class="panel"><h2>' + esc(t("importTimeline")) + "</h2>";
  h += '<p class="muted" style="margin-top:0">' + esc(t("importWhy")) + "</p>";
  h += '<ol class="steps"><li>' + esc(t("step1")) + "</li><li>" + esc(t("step2a")) + "</li><li>" + esc(t("step2b")) + "</li><li>" + esc(t("step3")) + "</li></ol>";
  h += '<label class="drop" id="plDrop" style="margin-top:14px"><span>' + esc(pp.busy || t("dropHere")) + '</span><input type="file" id="plFile" accept=".json,application/json"></label>';
  if (pp.parsed) {
    const ks = Object.keys(pp.parsed.days).sort();
    const inR = ks.filter(k => k >= pp.from && k <= pp.to);
    h += '<div class="form" style="margin-top:14px"><div class="muted">' + esc(t("parsedLine").replace("{v}", pp.parsed.nVisits).replace("{m}", pp.parsed.nMoves).replace("{a}", ks[0] || "—").replace("{b}", ks[ks.length - 1] || "—")) + "</div>" +
      '<div class="formgrid"><label class="field"><span>' + esc(t("from")) + '</span><input class="in" type="date" id="plFrom" value="' + pp.from + '"></label><label class="field"><span>' + esc(t("to")) + '</span><input class="in" type="date" id="plTo" value="' + pp.to + '"></label></div>' +
      '<div class="row"><span class="muted">' + esc(t("willImport").replace("{n}", inR.length)) + '</span><span style="flex:1"></span><button class="btn primary" data-plimport="1"' + (inR.length ? "" : " disabled") + ">" + esc(t("importBtn")) + "</button></div></div>";
  }
  h += "</div>";
  const withPl = Object.keys(S.days).filter(k => S.days[k].places && ((S.days[k].places.visits || []).length || (S.days[k].places.moves || []).length)).sort().reverse();
  h += '<div class="panel"><h2>' + esc(t("daysWithPlaces")) + "</h2>" + (withPl.length ? '<div class="dlist">' + withPl.slice(0, 40).map(k => { const v = S.days[k].places.visits || []; const names = v.map(placeName).filter(Boolean); return '<button data-jday="' + k + '"><span>' + esc(fmtDate(k, { day: "numeric", month: "short", weekday: "short" })) + '</span><span class="muted">' + esc(names.slice(0, 3).join(" · ") || t("nPlaces").replace("{n}", v.length)) + "</span></button>"; }).join("") + "</div>" : '<div class="empty">' + esc(t("noPlaceDays")) + "</div>") + "</div>";
  h += '</section><aside><div class="panel"><h2>' + esc(t("knownPlaces")) + '</h2><p class="muted" style="margin-top:0">' + esc(t("knownHint")) + "</p>";
  const kp = cfg().places;
  h += kp.length ? kp.map((p, i) => '<div class="catrow"><input class="in" id="kp-' + i + '" data-kpname="' + i + '" value="' + esc(p.name) + '"><a class="btn ghost sm" href="' + esc(gmaps(p)) + '" target="_blank" rel="noopener">↗</a><button class="btn ghost sm danger" data-kpdel="' + i + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") : '<div class="empty">' + esc(t("noKnown")) + "</div>";
  return h + "</div></aside></div>";
}
function wirePlaces() {
  const f = $("#plFile"), dz = $("#plDrop"); if (!f) return;
  const handle = file => {
    if (!file) return;
    S.places.busy = t("reading"); render();
    const r = new FileReader();
    r.onload = () => {
      let parsed = null;
      try { parsed = parseTimeline(JSON.parse(r.result)); } catch (e) { parsed = null; }
      S.places.busy = "";
      if (!parsed || !(parsed.nVisits + parsed.nMoves)) { toast(t("badTimeline")); render(); return; }
      S.places.parsed = parsed;
      const ks = Object.keys(parsed.days).sort(); const last = ks[ks.length - 1];
      S.places.to = last; S.places.from = ks.find(k => k >= addDays(last, -30)) || ks[0];
      render();
    };
    r.onerror = () => { S.places.busy = ""; toast(t("badTimeline")); render(); };
    r.readAsText(file);
  };
  f.addEventListener("change", () => handle(f.files[0]));
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("over"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("over"));
  dz.addEventListener("drop", e => { e.preventDefault(); dz.classList.remove("over"); handle(e.dataTransfer.files[0]); });
}
async function runImport() {
  const pp = S.places, ks = Object.keys(pp.parsed.days).filter(k => k >= pp.from && k <= pp.to).sort();
  let n = 0;
  for (const k of ks) {
    const d = clone(day(k)); d.sessions = d.sessions || []; d.entries = d.entries || [];
    const manual = d.places && d.places.visits ? d.places.visits.filter(v => v.manual) : [];
    const src = pp.parsed.days[k];
    d.places = { visits: src.visits.concat(manual).sort((a, b) => a.start - b.start), moves: src.moves, source: "timeline", importedAt: Date.now() };
    await putDay(k, d, true);
    n++; if (n % 5 === 0) toast(t("importing").replace("{n}", n).replace("{m}", ks.length));
  }
  pp.parsed = null; render(); toast(t("imported").replace("{n}", n));
}
function nameVisit(key, name) {
  const [k, id] = key.split("|"); const v = ((day(k).places || {}).visits || []).find(x => x.id === id); if (!v) return;
  editSettings(s => {
    s.places = s.places || [];
    const ex = s.places.find(p => (v.placeId && p.placeId === v.placeId) || (p.lat != null && distM([p.lat, p.lng], [v.lat, v.lng]) < 150));
    if (ex) ex.name = name; else s.places.push({ id: uid(), name, lat: v.lat, lng: v.lng, placeId: v.placeId || "" });
  });
  S.naming = ""; toast(t("saved"));
}

/* ============ SETTINGS ============ */
function vSettings() {
  const c = cfg();
  let h = head(t("nav_settings"), t("settingsEyebrow"), "");
  h += '<div class="settings"><div class="panel form"><h2>' + esc(t("appearance")) + "</h2>" +
    '<div class="field"><span>' + esc(t("language")) + '</span><div class="seg">' + [["tr", "Türkçe"], ["en", "English"], ["ja", "日本語"]].map(l => '<button data-lang="' + l[0] + '" aria-pressed="' + (S.lang === l[0]) + '">' + l[1] + "</button>").join("") + "</div></div>" +
    '<div class="field"><span>' + esc(t("theme")) + '</span><div class="seg">' + ["system", "light", "dark"].map(x => '<button data-settheme="' + x + '" aria-pressed="' + (S.theme === x) + '">' + esc(t("theme_" + x)) + "</button>").join("") + "</div></div>" +
    '<div class="field"><span>' + esc(t("storage")) + '</span><div class="muted">' + esc(Sync.on() ? t("storageLive") : t("storageLocal")) + "</div></div>" +
    '<div class="row"><button class="btn" data-backup="1">' + esc(t("backup")) + '</button><label class="btn">' + esc(t("restore")) + '<input type="file" id="importFile" accept=".json,application/json" hidden></label></div></div>';
  h += syncPanel();
  h += '<div class="panel form"><h2>' + esc(t("tabs")) + '</h2><p class="muted" style="margin:0">' + esc(t("tabsHint")) + "</p>" +
    VIEWS.filter(v => v !== "settings").map(v => { const on = !c.hidden.includes(v); return '<div class="modrow"><span>' + esc(t("nav_" + v)) + '</span><button class="switch" role="switch" aria-checked="' + on + '" data-modtoggle="' + v + '" aria-label="' + esc(t("nav_" + v)) + '"><i></i></button></div>'; }).join("") + "</div>";
  h += '<div class="panel form"><h2>' + esc(t("categories")) + '</h2><p class="muted" style="margin:0">' + esc(t("catHint")) + "</p>" +
    c.cats.map((x, i) => '<div class="catrow"><input type="color" id="cc-' + i + '" data-catcolor="' + i + '" value="' + esc(x.color) + '" aria-label="' + esc(t("color")) + '"><input class="in" id="cn-' + i + '" data-catname="' + i + '" value="' + esc(nm(x.name)) + '"><button class="btn ghost sm danger" data-catdel="' + i + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") +
    '<form class="row" data-form="newcat"><input class="in grow" id="newCat" placeholder="' + esc(t("newCatPh")) + '"><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></form></div>";
  h += '<div class="panel form"><h2>' + esc(t("seriesTitle")) + '</h2><p class="muted" style="margin:0">' + esc(t("seriesHint")) + "</p>" +
    c.series.map((x, i) => '<div class="catrow"><input class="in" id="sn-' + i + '" data-sername="' + i + '" value="' + esc(nm(x.name)) + '"><button class="btn ghost sm danger" data-serdel="' + i + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") +
    '<form class="row" data-form="newser"><input class="in grow" id="newSer" placeholder="' + esc(t("newSerPh")) + '"><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></form></div></div>";
  return h;
}

function syncPanel() {
  let h = '<div class="panel form"><h2>' + esc(t("syncTitle")) + '</h2><div class="muted">' + esc(syncLabel()) + "</div>";
  if (Sync.on()) {
    h += '<div class="muted num">' + esc(Sync.cfg.owner + "/" + Sync.cfg.repo) + '</div><div class="row"><button class="btn primary" data-syncnow="1">' + esc(t("syncNow")) + '</button><button class="btn ghost danger" data-syncoff="1">' + esc(t("syncOff")) + "</button></div>";
    if (Sync.state === "auth") h += '<p class="muted" style="margin:0">' + esc(t("syncAuthHelp")) + "</p>";
    return h + "</div>";
  }
  h += '<p class="muted" style="margin:0">' + esc(t("syncWhy")) + '</p><ol class="steps"><li>' + esc(t("sync1")) + "</li><li>" + esc(t("sync2")) + "</li><li>" + esc(t("sync3")) + "</li><li>" + esc(t("sync4")) + "</li></ol>" +
    '<form class="form" data-form="sync"><div class="formgrid"><label class="field"><span>' + esc(t("syncOwner")) + '</span><input class="in" id="syncOwner" value="nisauzc" autocomplete="off" spellcheck="false"></label><label class="field"><span>' + esc(t("syncRepo")) + '</span><input class="in" id="syncRepo" value="aerowyn-veri" autocomplete="off" spellcheck="false"></label></div>' +
    '<label class="field"><span>' + esc(t("syncToken")) + '</span><input class="in" id="syncToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label><div class="row"><span style="flex:1"></span><button class="btn primary" type="submit">' + esc(t("syncConnect")) + "</button></div></form>";
  return h + "</div>";
}
