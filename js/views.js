/* ============ shell ============ */
const ICONS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  journal: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  words: '<rect x="4" y="7" width="14" height="13" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v10"/><path d="M8 12h6M8 15.5h4"/>',
  academic: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
  health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
  places: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'
};
const VIEWS = ["today", "board", "calendar", "focus", "academic", "words", "health", "journal", "places", "settings"];
function shell() {
  document.getElementById("app").innerHTML =
    '<div id="shell"><nav id="rail" aria-label="menu">' +
    '<div id="brand">Aerowyn <small>masa</small></div>' +
    VIEWS.map(v => '<button class="nav" data-go="' + v + '" id="nav-' + v + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[v] + '</svg><span class="lbl"></span><span class="pip num"></span></button>').join("") +
    '<div id="railFoot"><div id="syncNote"></div></div></nav>' +
    '<main id="main"><div id="view"></div></main></div>';
}
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === "light" || S.theme === "dark") r.setAttribute("data-theme", S.theme); else r.removeAttribute("data-theme");
}
function go(v, extra) {
  if (!VIEWS.includes(v) || hiddenView(v)) v = VIEWS.find(x => !hiddenView(x));
  S.view = v; LS.set("masa.view", v);
  if (extra) Object.assign(S, extra);
  render(); window.scrollTo(0, 0);
}

/* keep typed input across re-renders */
function snapshotInputs() {
  const out = {}, a = document.activeElement;
  $$("#view [id]").forEach(el => {
    if (el.matches("input:not([type=file]):not([type=checkbox]):not([type=radio]),textarea,select")) out[el.id] = el.value;
  });
  $$("#view details[id]").forEach(el => { out["__open_" + el.id] = el.open; });
  return { vals: out, focus: a && a.id && $("#view").contains(a) ? { id: a.id, s: a.selectionStart, e: a.selectionEnd } : null };
}
function restoreInputs(st) {
  Object.keys(st.vals).forEach(id => { if (id.startsWith("__open_")) { const d = document.getElementById(id.slice(7)); if (d) d.open = st.vals[id]; return; } const el = document.getElementById(id); if (el && !el.hasAttribute("data-fresh") && el.value !== st.vals[id]) el.value = st.vals[id]; });
  if (st.focus) { const el = document.getElementById(st.focus.id); if (el) { el.focus(); try { if (st.focus.s != null) el.setSelectionRange(st.focus.s, st.focus.e); } catch (e) {} } }
}
let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderNow(); });
}
function renderNow() {
  document.documentElement.lang = S.lang;
  if (hiddenView(S.view)) S.view = VIEWS.find(x => !hiddenView(x));
  VIEWS.forEach(v => { const b = $("#nav-" + v); if (!b) return; b.hidden = hiddenView(v); $(".lbl", b).textContent = t("nav_" + v); if (S.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  note(syncLabel(), S.sync === "error");
  showWords(S.view === "words");
  if (S.view === "words") { pomoPip(); return; }
  const st = snapshotInputs();
  const fn = { today: vToday, board: vBoard, calendar: vCalendar, focus: vFocus, academic: vAcademic, health: vHealth, journal: vJournal, places: vPlaces, settings: vSettings }[S.view] || vToday;
  $("#view").innerHTML = fn();
  restoreInputs(st);
  if (S.view === "focus") pomoPaint();
  if (S.view === "board") wireBoard();
  if (S.view === "places") wirePlaces();
  hydratePhotos();
  pomoPip();
}
function head(title, eyebrow, right) {
  return '<header class="viewhead"><div><div class="eyebrow">' + esc(eyebrow || "") + '</div><h1>' + esc(title) + '</h1></div><div class="row">' + (right || "") + "</div></header>";
}

/* ============ task helpers ============ */
const COLS = ["later", "next", "today", "done"];
function tasksIn(col) {
  return Object.values(S.tasks).filter(x => x.kind !== "event" && (x.col || "later") === col)
    .sort((a, b) => col === "done" ? (b.doneAt || 0) - (a.doneAt || 0) : (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0));
}
function nextOrder(col) { const l = tasksIn(col); return l.length ? Math.max.apply(null, l.map(x => x.order || 0)) + 1 : 1; }
function moveTask(id, col) {
  const x = clone(S.tasks[id]); if (!x) return;
  x.col = col; x.order = nextOrder(col);
  if (col === "done") x.doneAt = Date.now(); else delete x.doneAt;
  putTask(x);
}
function newTask(fields) {
  return Object.assign({ id: uid(), kind: "task", title: "", desc: "", cat: "", col: "later", date: "", time: "", recur: "none", spentSec: 0, createdAt: Date.now(), order: 0 }, fields);
}
function dueLabel(x) {
  if (!x.date) return "";
  const k = todayKey();
  const late = x.kind !== "event" && x.col !== "done" && x.date < k;
  const txt = x.date === k ? t("todayWord") : x.date === addDays(k, 1) ? t("tomorrow") : fmtDate(x.date, { day: "numeric", month: "short" });
  return '<span class="' + (late ? "late" : "") + '">' + esc(txt) + (x.time ? " · " + esc(x.time) : "") + "</span>";
}
function cardHTML(x, opts) {
  opts = opts || {};
  const c = cat(x.cat);
  const done = x.col === "done";
  let acts = "";
  if (opts.moves) {
    const i = COLS.indexOf(x.col || "later");
    if (i > 0) acts += '<button class="btn ghost sm" data-move="' + x.id + '" data-to="' + COLS[i - 1] + '" aria-label="' + esc(t("moveLeft")) + '">‹</button>';
    if (i < 3) acts += '<button class="btn ghost sm" data-move="' + x.id + '" data-to="' + COLS[i + 1] + '" aria-label="' + esc(t("moveRight")) + '">›</button>';
  }
  if (opts.play && !done) acts += '<button class="btn ghost sm" data-play="' + x.id + '">▶ ' + esc(t("focusOn")) + "</button>";
  if (opts.promote) acts += '<button class="btn ghost sm" data-move="' + x.id + '" data-to="today">↑ ' + esc(t("toToday")) + "</button>";
  if (opts.demote) acts += '<button class="btn ghost sm" data-move="' + x.id + '" data-to="next">↓ ' + esc(t("toNext")) + "</button>";
  acts += '<button class="btn ghost sm cdel" data-cdel="' + x.id + '" aria-label="' + esc(t("delete")) + '" title="' + esc(t("delete")) + '">×</button>';
  return '<div class="card' + (done ? " done" : "") + '" style="--c:' + esc(c.color) + '" data-id="' + x.id + '"' + (opts.drag ? ' draggable="true"' : "") + ">" +
    '<button class="t" style="all:unset;cursor:pointer;font-weight:600;overflow-wrap:anywhere" data-edit="' + x.id + '">' + esc(x.title || t("untitled")) + "</button>" +
    (x.desc && opts.desc !== false ? '<div class="muted" style="white-space:pre-wrap">' + esc(x.desc.length > 140 ? x.desc.slice(0, 140) + "…" : x.desc) + "</div>" : "") +
    '<div class="meta">' + (x.cat ? catChip(x.cat) : "") + dueLabel(x) + (x.spentSec >= 60 ? '<span class="num">⏱ ' + esc(fmtDur(x.spentSec)) + "</span>" : "") + "</div>" +
    (acts ? '<div class="acts">' + acts + "</div>" : "") + "</div>";
}
function catSelect(id, val, withNone) {
  return '<select class="in" id="' + id + '">' + (withNone ? '<option value="">' + esc(t("noCat")) + "</option>" : "") +
    cfg().cats.map(c => '<option value="' + esc(c.id) + '"' + (c.id === val ? " selected" : "") + ">" + esc(nm(c.name)) + "</option>").join("") + "</select>";
}

/* ============ TODAY ============ */
function vToday() {
  const k = todayKey();
  const today = tasksIn("today"), next = tasksIn("next");
  const doneToday = tasksIn("done").filter(x => x.doneAt && dkey(new Date(x.doneAt)) === k);
  const dated = itemsOn(k);
  const sec = focusSec(k), sess = (day(k).sessions || []).length;
  const by = focusByCat([k]);
  const up = [];
  for (let i = 1; i <= 21; i++) { const d = addDays(k, i); itemsOn(d).forEach(x => { if (x.col !== "done") up.push([d, x]); }); }
  const late = Object.values(S.tasks).filter(x => x.kind !== "event" && x.col !== "done" && x.date && x.date < k);
  const dj = day(k);
  let h = head(t("nav_today"), fmtDate(k), '<span class="muted">' + esc(syncLabel()) + "</span>");
  h += '<div class="today"><section>';
  h += '<form class="quick" data-form="quick"><input class="in grow" id="qTitle" placeholder="' + esc(t("quickPh")) + '" autocomplete="off">' + catSelect("qCat", LS.get("masa.qcat", "ielts"), true) + '<button class="btn primary" type="submit">' + esc(t("add")) + "</button></form>";
  h += '<div class="listhead"><h2>' + esc(t("doToday")) + '</h2><span class="muted num">' + today.length + "</span></div>";
  h += '<div class="tlist">' + (today.length ? today.map(x => '<div class="tline"><button class="check" data-done="' + x.id + '" aria-label="' + esc(t("markDone")) + '"></button>' + cardHTML(x, { play: 1, demote: 1 }) + "</div>").join("") : '<div class="empty">' + esc(t("emptyToday")) + "</div>") + "</div>";
  h += '<div class="listhead" style="margin-top:26px"><h2>' + esc(t("doNext")) + '</h2><span class="muted num">' + next.length + "</span></div>";
  h += '<div class="tlist">' + (next.length ? next.map(x => '<div class="tline"><button class="check" data-done="' + x.id + '" aria-label="' + esc(t("markDone")) + '"></button>' + cardHTML(x, { promote: 1, desc: false }) + "</div>").join("") : '<div class="empty">' + esc(t("emptyNext")) + "</div>") + "</div>";
  if (doneToday.length) h += '<div class="listhead" style="margin-top:26px"><h2 style="font-size:17px">' + esc(t("doneToday")) + '</h2><span class="muted num">' + doneToday.length + '</span></div><div class="tlist">' + doneToday.map(x => '<div class="tline"><button class="check on" data-undone="' + x.id + '" aria-label="' + esc(t("markUndone")) + '"></button>' + cardHTML(x, { desc: false }) + "</div>").join("") + "</div>";
  h += "</section><aside style=\"display:flex;flex-direction:column;gap:16px\">";
  h += '<div class="panel"><div class="stats"><div class="stat"><span class="eyebrow">' + esc(t("focusToday")) + '</span><b class="num">' + esc(fmtDur(sec)) + '</b></div><div class="stat"><span class="eyebrow">' + esc(t("sessions")) + '</span><b class="num">' + sess + '</b></div><div class="stat"><span class="eyebrow">' + esc(t("streak")) + '</span><b class="num">' + streak() + "</b></div></div>" + catBar(by) +
    '<div class="row" style="margin-top:12px"><button class="btn primary" data-go="focus">' + esc(t("startFocus")) + '</button><span class="muted">' + esc(t("streakHint")) + "</span></div></div>";
  h += '<div class="panel"><h2>' + esc(t("onCalendar")) + "</h2>" + (dated.length ? dated.map(x => '<div class="evline"><span class="tm">' + esc(x.time || "—") + '</span><button style="all:unset;cursor:pointer;flex:1" data-edit="' + x.id + '">' + esc(x.title) + "</button>" + (x.cat ? catChip(x.cat) : "") + "</div>").join("") : '<div class="empty">' + esc(t("noEvents")) + "</div>") +
    '<div class="row" style="margin-top:10px"><button class="btn sm" data-newevent="' + k + '">+ ' + esc(t("addEvent")) + "</button></div></div>";
  if (late.length || up.length) {
    h += '<div class="panel"><h2>' + esc(t("upcoming")) + "</h2>";
    late.forEach(x => { h += '<div class="deadline"><span class="dd late">' + esc(t("overdue")) + '</span><button style="all:unset;cursor:pointer;flex:1" data-edit="' + x.id + '">' + esc(x.title) + "</button>" + (x.cat ? catChip(x.cat) : "") + "</div>"; });
    up.slice(0, 10).forEach(([d, x]) => { const n = Math.round((parseKey(d) - parseKey(k)) / 864e5); h += '<div class="deadline"><span class="dd num">' + esc(n === 1 ? t("tomorrow") : t("inDays").replace("{n}", n)) + '</span><button style="all:unset;cursor:pointer;flex:1" data-edit="' + x.id + '">' + esc(x.title) + "</button>" + (x.cat ? catChip(x.cat) : "") + "</div>"; });
    h += "</div>";
  }
  if (!hiddenView("health")) h += healthTodayPanel();
  h += '<div class="panel"><h2>' + esc(t("todayRecord")) + '</h2><div class="muted">' + esc(t("recordLine").replace("{e}", (dj.entries || []).length).replace("{p}", dj.places && dj.places.visits ? dj.places.visits.length : 0)) + '</div><div class="row" style="margin-top:10px"><button class="btn" data-jday="' + k + '">' + esc(t("writeJournal")) + "</button></div></div>";
  h += "</aside></div>";
  return h;
}
function catBar(by) {
  const keys = Object.keys(by).filter(k => by[k] >= 60).sort((a, b) => by[b] - by[a]);
  const sum = keys.reduce((s, k) => s + by[k], 0);
  if (!sum) return '<div class="catbar"></div><div class="legend"><span>' + esc(t("noFocusYet")) + "</span></div>";
  return '<div class="catbar">' + keys.map(k => '<i style="width:' + (by[k] / sum * 100).toFixed(2) + "%;background:" + esc(cat(k).color) + '" title="' + esc(nm(cat(k).name)) + '"></i>').join("") + '</div><div class="legend">' +
    keys.map(k => '<span><i class="d" style="background:' + esc(cat(k).color) + '"></i>' + esc(nm(cat(k).name)) + ' <b class="num" style="color:var(--ink);font-weight:600">' + esc(fmtDur(by[k])) + "</b></span>").join("") + "</div>";
}

/* ============ BOARD ============ */
function vBoard() {
  const hidden = S.board.hidden || [];
  let h = head(t("nav_board"), t("boardEyebrow"), '<button class="btn primary" data-newtask="later">+ ' + esc(t("newCard")) + "</button>");
  h += '<div class="filters"><span class="eyebrow">' + esc(t("filter")) + '</span><div class="chips">' + cfg().cats.map(c => '<button class="chip" style="--c:' + esc(c.color) + '" aria-pressed="' + (!hidden.includes(c.id)) + '" data-togglecat="' + esc(c.id) + '"><span class="d"></span>' + esc(nm(c.name)) + "</button>").join("") + "</div></div>";
  h += '<div class="board">';
  const cutoff = Date.now() - 14 * 864e5;
  COLS.forEach(col => {
    let list = tasksIn(col).filter(x => !hidden.includes(x.cat || ""));
    let extra = 0;
    if (col === "done" && !S.board.showOld) { const all = list.length; list = list.filter(x => (x.doneAt || 0) > cutoff); extra = all - list.length; }
    h += '<section class="col" data-col="' + col + '"><div class="colhead"><h3>' + esc(t("col_" + col)) + '</h3><span class="n">' + list.length + '</span></div><div class="colhint">' + esc(t("colhint_" + col)) + "</div>";
    h += list.map(x => cardHTML(x, { drag: 1, moves: 1, play: col === "today" })).join("");
    if (extra) h += '<button class="addcard" data-showold="1">' + esc(t("showOld").replace("{n}", extra)) + "</button>";
    if (col !== "done") h += '<button class="addcard" data-newtask="' + col + '">+ ' + esc(t("addCard")) + "</button>";
    h += "</section>";
  });
  return h + "</div>";
}
let dragId = null;
function wireBoard() {
  $$(".card[draggable]").forEach(c => {
    c.addEventListener("dragstart", e => { dragId = c.dataset.id; c.classList.add("dragging"); try { e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "move"; } catch (x) {} });
    c.addEventListener("dragend", () => { c.classList.remove("dragging"); dragId = null; });
  });
  $$(".col").forEach(col => {
    col.addEventListener("dragover", e => { if (dragId) { e.preventDefault(); col.classList.add("over"); } });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", e => {
      e.preventDefault(); col.classList.remove("over");
      const id = dragId || (e.dataTransfer && e.dataTransfer.getData("text/plain"));
      if (!id || !S.tasks[id]) return;
      /* sütun içinde bırakılan yere göre sırala */
      const cards = $$(".card", col).filter(c => c.dataset.id !== id);
      let before = null;
      for (const c of cards) { const r = c.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = c; break; } }
      const x = clone(S.tasks[id]); const to = col.dataset.col;
      const list = tasksIn(to).filter(y => y.id !== id);
      if (before) { const b = S.tasks[before.dataset.id]; const i = list.findIndex(y => y.id === b.id); const prev = list[i - 1]; x.order = prev ? ((prev.order || 0) + (b.order || 0)) / 2 : (b.order || 0) - 1; }
      else x.order = list.length ? (list[list.length - 1].order || 0) + 1 : 1;
      if (x.col !== to) { x.col = to; if (to === "done") x.doneAt = Date.now(); else delete x.doneAt; }
      putTask(x);
    });
  });
}

/* ============ TASK / EVENT MODAL ============ */
function taskModal(x, isNew) {
  const ev = x.kind === "event";
  const title = isNew ? (ev ? t("newEvent") : t("newCard")) : (ev ? t("editEvent") : t("editCard"));
  let h = '<div class="mh"><span class="eyebrow">' + esc(title) + "</span><h2>" + esc(x.date ? fmtDate(x.date, { day: "numeric", month: "long", year: "numeric" }) : t("noDate")) + '</h2></div><form class="form" data-form="task">';
  h += '<div class="seg" role="group" style="align-self:center"><button type="button" data-kind="task" aria-pressed="' + !ev + '">' + esc(t("kindTask")) + '</button><button type="button" data-kind="event" aria-pressed="' + ev + '">' + esc(t("kindEvent")) + "</button></div>";
  h += '<input class="in" id="mTitle" autofocus required value="' + esc(x.title) + '" placeholder="' + esc(t("titlePh")) + '">';
  h += '<label class="field"><span>' + esc(t("desc")) + '</span><textarea class="in" id="mDesc" placeholder="' + esc(t("descPh")) + '">' + esc(x.desc) + "</textarea></label>";
  h += '<div class="field"><span>' + esc(t("category")) + '</span><div class="chips" id="mCats">' + cfg().cats.map(c => '<button type="button" class="chip" style="--c:' + esc(c.color) + '" data-pickcat="' + esc(c.id) + '" aria-pressed="' + (x.cat === c.id) + '"><span class="d"></span>' + esc(nm(c.name)) + "</button>").join("") + "</div></div>";
  h += '<div class="formgrid"><label class="field"><span>' + esc(t("date")) + '</span><input class="in" type="date" id="mDate" value="' + esc(x.date) + '"></label><label class="field"><span>' + esc(t("time")) + '</span><input class="in" type="time" id="mTime" value="' + esc(x.time) + '"></label></div>';
  h += '<div class="formgrid" id="mTaskOnly"' + (ev ? " hidden" : "") + '><label class="field"><span>' + esc(t("column")) + '</span><select class="in" id="mCol">' + COLS.map(c => '<option value="' + c + '"' + ((x.col || "later") === c ? " selected" : "") + ">" + esc(t("col_" + c)) + "</option>").join("") + "</select></label></div>";
  h += '<div class="formgrid" id="mEventOnly"' + (ev ? "" : " hidden") + '><label class="field"><span>' + esc(t("repeat")) + '</span><select class="in" id="mRecur">' + ["none", "daily", "weekly", "monthly"].map(r => '<option value="' + r + '"' + ((x.recur || "none") === r ? " selected" : "") + ">" + esc(t("rec_" + r)) + "</option>").join("") + '</select></label><label class="field"><span>' + esc(t("until")) + '</span><input class="in" type="date" id="mUntil" value="' + esc(x.until || "") + '"></label></div>';
  h += '<div class="mf"><div>' + (isNew ? "" : '<button type="button" class="btn danger" data-deltask="' + x.id + '">' + esc(t("delete")) + "</button>") + '</div><div class="row"><button type="button" class="btn" data-close="1">' + esc(t("cancel")) + '</button><button class="btn primary" type="submit">' + esc(isNew ? (ev ? t("addEvent") : t("addCard")) : t("save")) + "</button></div></div></form>";
  openModal(h, m => {
    const st = { kind: x.kind || "task", cat: x.cat || "" };
    m.addEventListener("click", e => {
      const k = e.target.closest("[data-kind]");
      if (k) { st.kind = k.dataset.kind; $$("[data-kind]", m).forEach(b => b.setAttribute("aria-pressed", b.dataset.kind === st.kind)); $("#mTaskOnly", m).hidden = st.kind === "event"; $("#mEventOnly", m).hidden = st.kind !== "event"; }
      const c = e.target.closest("[data-pickcat]");
      if (c) { st.cat = st.cat === c.dataset.pickcat ? "" : c.dataset.pickcat; $$("[data-pickcat]", m).forEach(b => b.setAttribute("aria-pressed", b.dataset.pickcat === st.cat)); }
      if (e.target.closest("[data-close]")) closeModal();
      const d = e.target.closest("[data-deltask]");
      if (d) { if (d.dataset.armed) { closeModal(); delTask(x.id); toast(t("deleted")); } else { d.dataset.armed = "1"; d.textContent = t("sure"); } }
    });
    $("form", m).addEventListener("submit", e => {
      e.preventDefault();
      const y = clone(x);
      y.kind = st.kind; y.cat = st.cat;
      y.title = $("#mTitle", m).value.trim(); if (!y.title) return;
      y.desc = $("#mDesc", m).value.trim();
      y.date = $("#mDate", m).value; y.time = $("#mTime", m).value;
      if (y.kind === "event") { y.recur = $("#mRecur", m).value; y.until = $("#mUntil", m).value; if (!y.date) y.date = todayKey(); delete y.col; }
      else { const col = $("#mCol", m).value; if (col !== y.col) { y.col = col; y.order = nextOrder(col); if (col === "done") y.doneAt = Date.now(); else delete y.doneAt; } y.recur = "none"; }
      closeModal(); putTask(y); toast(isNew ? t("added") : t("saved"));
    });
  });
}

/* ============ CALENDAR ============ */
function vCalendar() {
  const cur = parseKey(S.cal.cursor), k0 = todayKey();
  const week = S.cal.mode === "week", rec = S.cal.layer === "record";
  let start, days;
  if (week) { start = new Date(cur); start.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); days = 7; }
  else { const f = new Date(cur.getFullYear(), cur.getMonth(), 1); start = new Date(f); start.setDate(1 - ((f.getDay() + 6) % 7)); const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0); const end = new Date(last); end.setDate(last.getDate() + (6 - (last.getDay() + 6) % 7)); days = Math.round((end - start) / 864e5) + 1; }
  let title;
  if (week) { const e = new Date(start); e.setDate(start.getDate() + 6); title = fmtDate(dkey(start), { day: "numeric", month: "short" }) + " – " + fmtDate(dkey(e), { day: "numeric", month: "short", year: "numeric" }); }
  else title = monthTitle(cur);
  let h = head(t("nav_calendar"), rec ? t("layerRecordHint") : t("layerPlanHint"), '<button class="btn primary" data-newevent="' + (S.cal.cursor) + '">+ ' + esc(t("addEvent")) + "</button>");
  h += '<div class="calbar"><button class="btn sm" data-calstep="-1" aria-label="' + esc(t("prev")) + '">‹</button><button class="btn sm" data-caltoday="1">' + esc(t("todayWord")) + '</button><button class="btn sm" data-calstep="1" aria-label="' + esc(t("next")) + '">›</button><h2>' + esc(title) + '</h2><span style="flex:1"></span>' +
    '<div class="seg"><button data-calmode="month" aria-pressed="' + !week + '">' + esc(t("month")) + '</button><button data-calmode="week" aria-pressed="' + week + '">' + esc(t("week")) + "</button></div>" +
    '<div class="seg"><button data-callayer="plan" aria-pressed="' + !rec + '">' + esc(t("plan")) + '</button><button data-callayer="record" aria-pressed="' + rec + '">' + esc(t("record")) + "</button></div></div>";
  const maxSec = rec ? Math.max(3600 * 6, ...Array.from({ length: days }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return focusSec(dkey(d)); })) : 1;
  h += '<div class="calwrap"><div class="' + (week ? "week" : "cal") + '">' + dowNames().map(d => '<div class="dow">' + esc(d) + "</div>").join("");
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = dkey(d);
    const out = !week && d.getMonth() !== cur.getMonth();
    let inner = '<div class="dn"><b>' + (week ? esc(dowNames()[i]) + " " : "") + d.getDate() + '</b><button class="add" data-newevent="' + k + '" aria-label="' + esc(t("addEvent")) + '">+</button></div>';
    let style = "";
    if (rec) {
      const s = focusSec(k), dj = day(k);
      const a = s ? Math.min(0.55, 0.08 + 0.47 * s / maxSec) : 0;
      if (a) style = ' style="background:color-mix(in srgb,var(--accent) ' + Math.round(a * 100) + '%,var(--surface))"';
      const by = focusByCat([k]); const ks = Object.keys(by).filter(x => by[x] >= 60).sort((x, y) => by[y] - by[x]); const sum = ks.reduce((q, x) => q + by[x], 0);
      const stars = (dj.entries || []).filter(e => e.star).length, ents = (dj.entries || []).length, pl = dj.places && dj.places.visits ? dj.places.visits.length : 0;
      inner += '<div class="rec">' + (s ? '<span class="ft num">' + esc(fmtDur(s)) + "</span>" : "") +
        (sum ? '<div class="catbar" style="margin:2px 0;height:5px">' + ks.map(x => '<i style="width:' + (by[x] / sum * 100).toFixed(1) + "%;background:" + esc(cat(x).color) + '"></i>').join("") + "</div>" : "") +
        '<div class="ic">' + (ents ? "<span>" + esc(t("nEntries").replace("{n}", ents)) + (stars ? " ★" + stars : "") + "</span>" : "") + (pl ? "<span>" + esc(t("nPlaces").replace("{n}", pl)) + "</span>" : "") + "</div>";
      if (week) inner += (dj.sessions || []).map(x => '<div class="ev" style="--c:' + esc(cat(x.cat).color) + '"><span>' + esc(x.title || nm(cat(x.cat).name)) + '</span><span class="tm">' + esc(hhmm(x.start)) + "</span></div>").join("");
      inner += "</div>";
    } else {
      const items = itemsOn(k), lim = week ? 99 : 3;
      inner += items.slice(0, lim).map(x => '<button class="ev' + (x.col === "done" ? " done" : "") + '" style="--c:' + esc(cat(x.cat).color) + '" data-edit="' + x.id + '"><span>' + esc(x.title) + "</span>" + (x.time ? '<span class="tm">' + esc(x.time) + "</span>" : "") + "</button>").join("");
      if (items.length > lim) inner += '<span class="more">' + esc(t("more").replace("{n}", items.length - lim)) + "</span>";
    }
    h += '<div class="day' + (out ? " out" : "") + (k === k0 ? " is-today" : "") + '" data-jday="' + k + '" tabindex="0"' + style + ">" + inner + "</div>";
  }
  h += "</div></div><p class=\"muted\" style=\"margin-top:10px\">" + esc(t("calHint")) + "</p>";
  return h;
}
