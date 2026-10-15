/* ============ ACADEMIC ============ */
const AC_KINDS = ["defense", "course", "exam", "other"];
const TOPIC_ST = ["todo", "doing", "ready"];
function acList(arch) { return Object.values(S.academic).filter(w => !!w.archived === !!arch).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.createdAt || 0) - (b.createdAt || 0)); }
function acSel() {
  const act = acList(false);
  let w = S.academic[S.ac.sel];
  if (!w) { w = act[0] || acList(true)[0] || null; if (w) S.ac.sel = w.id; }
  return w;
}
function editAc(id, fn) { const w = clone(S.academic[id]); if (!w) return; fn(w); putAc(w); }
function acFocusSec(id, onlyKey) {
  let s = 0;
  Object.keys(S.days).forEach(k => { if (onlyKey && k !== onlyKey) return; (S.days[k].sessions || []).forEach(x => { if (x.ws === id) s += x.sec || 0; }); });
  return s;
}
function ensureAcCat() {
  if (cfg().cats.some(c => c.id === "akademik")) return;
  editSettings(s => { s.cats.push(clone(DEFAULT_CATS.find(c => c.id === "akademik"))); });
}
function daysLeft(k) { return Math.round((parseKey(k) - parseKey(todayKey())) / 864e5); }
function countdown(w) {
  if (!w.date) return "";
  const n = daysLeft(w.date);
  if (n === 0) return t("acToday");
  if (n < 0) return t("acPast").replace("{n}", -n);
  return t("acLeft").replace("{n}", n);
}

function vAcademic() {
  const w = acSel(), act = acList(false), arch = acList(true);
  let h = head(t("nav_academic"), t("acEyebrow"), '<button class="btn primary" data-acnew="1">+ ' + esc(t("acNew")) + "</button>");
  if (!w) return h + '<div class="panel" style="max-width:640px"><h2>' + esc(t("acEmptyTitle")) + '</h2><p class="muted">' + esc(t("acEmptyText")) + '</p><button class="btn primary" data-acnew="1">+ ' + esc(t("acNew")) + "</button></div>";
  h += '<div class="filters"><div class="chips">' + act.map(x => '<button class="chip" style="--c:var(--accent)" aria-pressed="' + (x.id === w.id) + '" data-acsel="' + x.id + '">' + esc(x.title) + "</button>").join("") + "</div>" +
    (arch.length ? '<button class="btn ghost sm" data-acarch="1">' + esc(S.ac.showArch ? t("acHideArch") : t("acShowArch").replace("{n}", arch.length)) + "</button>" : "") + "</div>";
  if (S.ac.showArch && arch.length) h += '<div class="filters"><span class="eyebrow">' + esc(t("acArchived")) + '</span><div class="chips">' + arch.map(x => '<button class="chip" aria-pressed="' + (x.id === w.id) + '" data-acsel="' + x.id + '">' + esc(x.title) + "</button>").join("") + "</div></div>";

  const topics = w.topics || [], qs = w.questions || [], runs = w.runs || [];
  const ready = topics.filter(x => x.status === "ready").length, doing = topics.filter(x => x.status === "doing").length;
  const rated = qs.filter(q => q.rating).length, good = qs.filter(q => q.rating === "good").length;
  /* header card */
  h += '<div class="panel achead"><div class="acmain"><span class="eyebrow">' + esc(t("ackind_" + (w.kind || "other"))) + (w.archived ? " · " + esc(t("acArchived")) : "") + "</span><h2>" + esc(w.title) + "</h2>" +
    '<div class="muted">' + (w.date ? esc(fmtDate(w.date)) + (w.time ? " · " + esc(w.time) : "") : esc(t("noDate"))) + (w.place ? " · " + esc(w.place) : "") + "</div>" +
    '<div class="row" style="margin-top:12px"><button class="btn primary" data-acfocus="' + w.id + '">▶ ' + esc(t("focusOn")) + '</button><button class="btn" data-acedit="' + w.id + '">' + esc(t("acEdit")) + "</button></div></div>" +
    (w.date ? '<div class="account"><b class="num">' + esc(String(Math.abs(daysLeft(w.date)))) + '</b><span>' + esc(countdown(w)) + "</span></div>" : "") + "</div>";
  h += '<div class="acstats"><div class="stat"><span class="eyebrow">' + esc(t("acTopics")) + '</span><b class="num">' + ready + "/" + topics.length + '</b><div class="prog"><i style="width:' + (topics.length ? ready / topics.length * 100 : 0) + '%"></i><i class="mid" style="width:' + (topics.length ? doing / topics.length * 100 : 0) + '%"></i></div></div>' +
    '<div class="stat"><span class="eyebrow">' + esc(t("acQuestions")) + '</span><b class="num">' + good + "/" + qs.length + '</b><span class="muted">' + esc(t("acGoodLine").replace("{n}", rated)) + "</span></div>" +
    '<div class="stat"><span class="eyebrow">' + esc(t("acTime")) + '</span><b class="num">' + esc(fmtDur(acFocusSec(w.id))) + '</b><span class="muted">' + esc(t("todayWord")) + ": " + esc(fmtDur(acFocusSec(w.id, todayKey()))) + "</span></div></div>";

  h += '<div class="jgrid"><section style="display:flex;flex-direction:column;gap:16px">';
  /* topics */
  h += '<div class="panel"><div class="listhead"><h2>' + esc(t("acTopics")) + '</h2><span class="muted">' + esc(t("acTopicHint")) + "</span></div>";
  h += topics.length ? '<div class="topics">' + topics.map((x, i) => '<div class="topic st-' + (x.status || "todo") + '"><button class="stpill" data-tstat="' + x.id + '" title="' + esc(t("acCycle")) + '">' + esc(t("st_" + (x.status || "todo"))) + '</button><div class="tt"><span>' + esc(x.title) + "</span>" + (x.note ? '<span class="muted">' + esc(x.note) + "</span>" : "") + '</div><div class="acts"><button class="btn ghost sm" data-tfocus="' + x.id + '" aria-label="' + esc(t("focusOn")) + '">▶</button><button class="btn ghost sm" data-ttoday="' + x.id + '">' + esc(t("toToday")) + '</button><button class="btn ghost sm" data-tup="' + i + '" aria-label="' + esc(t("moveUp")) + '"' + (i ? "" : " disabled") + '>↑</button><button class="btn ghost sm danger" data-tdel="' + x.id + '" aria-label="' + esc(t("delete")) + '">×</button></div></div>').join("") + "</div>" : '<div class="empty">' + esc(t("acNoTopics")) + "</div>";
  h += '<form class="row" data-form="actopic" style="margin-top:12px"><input class="in grow" id="acTopicIn" placeholder="' + esc(t("acTopicPh")) + '"><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></form></div>";
  /* questions */
  h += '<div class="panel"><div class="listhead"><h2>' + esc(t("acQuestions")) + '</h2><span class="muted">' + esc(w.kind === "defense" ? t("acQHintDef") : t("acQHint")) + "</span></div>";
  h += qs.length ? qs.map(q => '<details class="qa" id="qa-' + q.id + '"><summary><span class="rate r-' + (q.rating || "none") + '">' + esc(t("rate_" + (q.rating || "none"))) + '</span><span class="qq">' + esc(q.q) + '</span><span class="muted num">' + (q.tries ? "×" + q.tries : "") + "</span></summary>" +
    '<form class="form" data-form="acanswer" data-qid="' + q.id + '"><textarea class="in" id="ans-' + q.id + '" placeholder="' + esc(t("acAnswerPh")) + '">' + esc(q.a || "") + '</textarea><div class="row"><button class="btn ghost sm danger" type="button" data-qdel="' + q.id + '">' + esc(t("delete")) + '</button><span style="flex:1"></span><button class="btn sm" type="submit">' + esc(t("save")) + "</button></div></form></details>").join("") : '<div class="empty">' + esc(t("acNoQ")) + "</div>";
  h += '<form class="form" data-form="acq" style="margin-top:12px"><input class="in" id="acQIn" placeholder="' + esc(t("acQPh")) + '"><div class="row"><span style="flex:1"></span><button class="btn sm" type="submit">+ ' + esc(t("acAddQ")) + "</button></div></form></div>";
  h += '</section><aside style="display:flex;flex-direction:column;gap:16px">';
  /* drill */
  h += drillPanel(w);
  /* talk rehearsal */
  if (w.kind === "defense" || runs.length) h += talkPanel(w);
  /* links + notes */
  const links = w.links || [];
  h += '<div class="panel"><h2>' + esc(t("acLinks")) + "</h2>" + (links.length ? '<div class="dlist">' + links.map(l => '<div class="lnk"><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.title || l.url) + '</a><button class="btn ghost sm danger" data-ldel="' + l.id + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") + "</div>" : '<div class="empty">' + esc(t("acNoLinks")) + "</div>") +
    '<form class="form" data-form="aclink" style="margin-top:10px"><input class="in" id="acLinkT" placeholder="' + esc(t("acLinkTPh")) + '"><div class="row"><input class="in grow" id="acLinkU" placeholder="https://…"><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></div></form></div>";
  h += '<div class="panel"><h2>' + esc(t("acNotes")) + '</h2><form class="form" data-form="acnotes"><textarea class="in" id="acNotes-' + w.id + '" style="min-height:160px" placeholder="' + esc(t("acNotesPh")) + '">' + esc(w.notes || "") + '</textarea><div class="row"><span style="flex:1"></span><button class="btn sm" type="submit">' + esc(t("save")) + "</button></div></form></div>";
  h += "</aside></div>";
  return h;
}

/* ---------- soru provası ---------- */
function pickQuestion(w) {
  const qs = (w.questions || []).filter(q => q.id !== S.ac.lastQ);
  const pool = qs.length ? qs : (w.questions || []);
  if (!pool.length) return null;
  const weight = q => ({ none: 4, weak: 5, ok: 2, good: 1 }[q.rating || "none"]) + (Date.now() - (q.last || 0) > 864e5 ? 1 : 0);
  let tot = pool.reduce((s, q) => s + weight(q), 0), r = Math.random() * tot;
  for (const q of pool) { r -= weight(q); if (r <= 0) return q; }
  return pool[0];
}
function drillPanel(w) {
  const D = S.ac.drill;
  let h = '<div class="panel drill"><h2>' + esc(t("acDrill")) + "</h2>";
  if (!(w.questions || []).length) return h + '<div class="empty">' + esc(t("acDrillEmpty")) + "</div></div>";
  const q = D && D.ws === w.id ? (w.questions || []).find(x => x.id === D.qid) : null;
  if (!q) return h + '<p class="muted" style="margin-top:0">' + esc(t("acDrillHint")) + '</p><button class="btn primary" data-drill="1">' + esc(t("acDrillStart")) + "</button></div>";
  h += '<div class="dq">' + esc(q.q) + '</div><div class="dtimer num" id="drillClock">0:00</div>';
  if (D.shown) h += '<div class="dans">' + (q.a ? esc(q.a) : '<span class="muted">' + esc(t("acNoAnswer")) + "</span>") + '</div><div class="row" style="justify-content:center">' + ["weak", "ok", "good"].map(r => '<button class="btn rate-b r-' + r + '" data-drate="' + r + '">' + esc(t("rate_" + r)) + "</button>").join("") + "</div>";
  else h += '<div class="row" style="justify-content:center"><button class="btn primary" data-dshow="1">' + esc(t("acShow")) + '</button><button class="btn ghost" data-drill="1">' + esc(t("acSkipQ")) + "</button></div>";
  return h + '<div class="muted" style="text-align:center;margin-top:8px">' + esc(t("acDrillAloud")) + "</div></div>";
}
function drillTick() {
  const el = $("#drillClock"), D = S.ac.drill;
  if (el && D && D.t0) { const s = Math.floor((Date.now() - D.t0) / 1000); el.textContent = Math.floor(s / 60) + ":" + pad(s % 60); el.classList.toggle("over", s > 120); }
}

/* ---------- sunum provası ---------- */
function talkPanel(w) {
  const T0 = S.ac.talk, runs = (w.runs || []).slice(-6).reverse(), target = w.talkMin || 20;
  const live = T0 && T0.ws === w.id;
  let h = '<div class="panel"><h2>' + esc(t("acTalk")) + '</h2><div class="row"><label class="field" style="width:120px"><span>' + esc(t("acTarget")) + '</span><input class="in num" type="number" min="1" max="120" id="acTalkMin-' + w.id + '" data-talkmin="' + w.id + '" value="' + target + '"></label><span class="muted" style="align-self:flex-end;padding-bottom:9px">' + esc(t("minutes")) + "</span></div>";
  h += '<div class="dtimer num" id="talkClock" style="margin:12px 0 6px">' + (live ? "" : "0:00") + '</div><div class="prog" style="margin-bottom:12px"><i id="talkBar" style="width:0"></i></div>';
  h += '<div class="row">' + (live ? '<button class="btn primary" data-talkstop="1">' + esc(t("acTalkStop")) + '</button><button class="btn ghost" data-talkcancel="1">' + esc(t("cancel")) + "</button>" : '<button class="btn primary" data-talkgo="1">' + esc(t("acTalkGo")) + "</button>") + "</div>";
  if (runs.length) h += '<div class="tl" style="margin-top:12px">' + runs.map(r => { const m = r.sec / 60, diff = m - target; return '<div class="m"><span class="tm">' + esc(fmtDate(dkey(new Date(r.ts)), { day: "numeric", month: "short" })) + " " + hhmm(r.ts) + '</span><span><b class="num" style="color:var(--ink)">' + Math.floor(r.sec / 60) + ":" + pad(r.sec % 60) + '</b> <span class="' + (Math.abs(diff) <= 1 ? "okc" : "late") + '">' + (diff > 0 ? "+" : "") + diff.toFixed(1).replace(".", S.lang === "tr" ? "," : ".") + " " + esc(t("minShort")) + "</span></span></div>"; }).join("") + "</div>";
  return h + "</div>";
}
function talkTick() {
  const T0 = S.ac.talk, el = $("#talkClock"); if (!el || !T0) return;
  const w = S.academic[T0.ws]; if (!w) return;
  const s = Math.floor((Date.now() - T0.t0) / 1000), target = (w.talkMin || 20) * 60;
  el.textContent = Math.floor(s / 60) + ":" + pad(s % 60);
  el.classList.toggle("over", s > target);
  const bar = $("#talkBar"); if (bar) bar.style.width = Math.min(100, s / target * 100) + "%";
}
setInterval(() => { if (S.view === "academic") { drillTick(); talkTick(); } }, 500);

/* ---------- workspace modal ---------- */
function acModal(w, isNew) {
  let h = '<div class="mh"><span class="eyebrow">' + esc(isNew ? t("acNew") : t("acEdit")) + "</span><h2>" + esc(isNew ? t("acNewTitle") : w.title) + '</h2></div><form class="form" data-form="acws">' +
    '<input class="in" id="awTitle" autofocus required value="' + esc(w.title || "") + '" placeholder="' + esc(t("acTitlePh")) + '">' +
    '<div class="field"><span>' + esc(t("acKind")) + '</span><div class="seg" style="flex-wrap:wrap">' + AC_KINDS.map(k => '<button type="button" data-awkind="' + k + '" aria-pressed="' + ((w.kind || "defense") === k) + '">' + esc(t("ackind_" + k)) + "</button>").join("") + "</div></div>" +
    '<div class="formgrid"><label class="field"><span>' + esc(t("acDate")) + '</span><input class="in" type="date" id="awDate" value="' + esc(w.date || "") + '"></label><label class="field"><span>' + esc(t("time")) + '</span><input class="in" type="time" id="awTime" value="' + esc(w.time || "") + '"></label></div>' +
    '<input class="in" id="awPlace" value="' + esc(w.place || "") + '" placeholder="' + esc(t("acPlacePh")) + '">' +
    '<div class="mf"><div>' + (isNew ? "" : '<button type="button" class="btn" data-awarch="1">' + esc(w.archived ? t("acUnarchive") : t("acArchive")) + '</button> <button type="button" class="btn danger" data-awdel="1">' + esc(t("delete")) + "</button>") + '</div><div class="row"><button type="button" class="btn" data-close="1">' + esc(t("cancel")) + '</button><button class="btn primary" type="submit">' + esc(isNew ? t("add") : t("save")) + "</button></div></div></form>";
  openModal(h, m => {
    let kind = w.kind || "defense";
    m.addEventListener("click", e => {
      const k = e.target.closest("[data-awkind]"); if (k) { kind = k.dataset.awkind; $$("[data-awkind]", m).forEach(b => b.setAttribute("aria-pressed", b.dataset.awkind === kind)); }
      if (e.target.closest("[data-close]")) closeModal();
      if (e.target.closest("[data-awarch]")) { closeModal(); editAc(w.id, x => { x.archived = !x.archived; }); toast(t("saved")); }
      const d = e.target.closest("[data-awdel]");
      if (d) { if (d.dataset.armed) { closeModal(); delAc(w.id); S.ac.sel = ""; toast(t("deleted")); } else { d.dataset.armed = "1"; d.textContent = t("acDelSure"); } }
    });
    $("form", m).addEventListener("submit", e => {
      e.preventDefault();
      const x = clone(w);
      x.title = $("#awTitle", m).value.trim(); if (!x.title) return;
      x.kind = kind; x.date = $("#awDate", m).value; x.time = $("#awTime", m).value; x.place = $("#awPlace", m).value.trim();
      closeModal(); ensureAcCat(); S.ac.sel = x.id; LS.set("masa.acSel", x.id); putAc(x); toast(isNew ? t("added") : t("saved"));
    });
  });
}
function newWs() { return { id: uid(), title: "", kind: "defense", date: "", time: "", place: "", topics: [], questions: [], links: [], runs: [], notes: "", talkMin: 20, archived: false, createdAt: Date.now() }; }
function acFocus(w, title) {
  if (P.running && P.phase === "focus") { logSeg(); P.segStart = Date.now(); }
  P.ws = w.id; P.taskId = ""; P.title = title || w.title; P.cat = "akademik"; psave();
  go("focus"); if (!P.running) pstart();
}
