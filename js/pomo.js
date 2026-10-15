/* ============ FOCUS / POMODORO ============ */
const PKEY = "aerowyn.masa.pomo";
const P = Object.assign({ phase: "focus", running: false, endAt: 0, remaining: 0, session: 1, taskId: "", ws: "", title: "", cat: "ielts", segStart: 0, showSet: false }, LS.get(PKEY, {}));
function pomoCfg() { return cfg().pomo; }
function phaseMs() { const c = pomoCfg(); return (P.phase === "focus" ? c.focus : c.brk) * 60000; }
if (!P.remaining) P.remaining = phaseMs();
function psave() { LS.set(PKEY, { phase: P.phase, running: P.running, endAt: P.endAt, remaining: P.remaining, session: P.session, taskId: P.taskId, ws: P.ws, title: P.title, cat: P.cat, segStart: P.segStart }); }
function prem() { return P.running ? Math.max(0, P.endAt - Date.now()) : P.remaining; }
function clock(ms) { const s = Math.max(0, Math.round(ms / 1000)); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }

let actx = null;
function audio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; } catch (e) { return null; } }
const SEQ = { start: { n: [659.25, 987.77], gap: .1, tail: .55, vol: .13 }, focusEnd: { n: [783.99, 587.33, 493.88], gap: .17, tail: .95, vol: .17 }, breakEnd: { n: [523.25, 659.25, 783.99], gap: .16, tail: .85, vol: .17 } };
function chime(kind) {
  if (!pomoCfg().sound) return;
  const a = audio(); if (!a) return; const s = SEQ[kind];
  try { s.n.forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = f; const t0 = a.currentTime + .02 + i * s.gap; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(s.vol, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + s.tail); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + s.tail + .05); }); } catch (e) {}
}
let wake = null;
function wakeOn() { try { if (!wake && navigator.wakeLock) navigator.wakeLock.request("screen").then(w => { wake = w; w.addEventListener("release", () => { wake = null; }); }).catch(() => {}); } catch (e) {} }
function wakeOff() { try { if (wake) { wake.release(); wake = null; } } catch (e) {} }

/* bir odak parçasını günlüğe yaz */
function logSeg(endTs) {
  if (P.phase !== "focus" || !P.segStart) return;
  const start = P.segStart, end = Math.min(endTs || Date.now(), Date.now());
  P.segStart = 0;
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return;
  const k = dkey(new Date(start));
  const d = clone(day(k)); d.sessions = d.sessions || []; d.entries = d.entries || [];
  const title = (P.title || "").trim() || (P.taskId && S.tasks[P.taskId] ? S.tasks[P.taskId].title : "");
  d.sessions.push({ id: uid(), start, end, sec, cat: P.cat || "", taskId: P.taskId || "", ws: P.ws || "", title });
  putDay(k, d);
  if (P.taskId && S.tasks[P.taskId]) { const x = clone(S.tasks[P.taskId]); x.spentSec = (x.spentSec || 0) + sec; S.tasks[x.id] = stamp(x); changed(); }
}
function pstart(silent) {
  if (P.running) return;
  if (P.remaining <= 0) P.remaining = phaseMs();
  P.endAt = Date.now() + P.remaining; P.running = true;
  if (P.phase === "focus") P.segStart = Date.now();
  audio(); if (!silent) chime("start");
  wakeOn(); psave(); pomoPaint();
}
function ppause() {
  if (!P.running) return;
  P.remaining = Math.max(0, P.endAt - Date.now()); P.running = false;
  logSeg(); wakeOff(); psave(); pomoPaint();
}
function pfinishPhase() {
  const wasFocus = P.phase === "focus";
  if (wasFocus) logSeg(P.endAt);
  P.running = false;
  if (wasFocus) { chime("focusEnd"); P.phase = "break"; P.session++; } else { chime("breakEnd"); P.phase = "focus"; }
  P.remaining = phaseMs(); psave();
  if (pomoCfg().auto) pstart(true); else { wakeOff(); pomoPaint(); }
}
function pskip() { if (P.running && P.phase === "focus") logSeg(); P.running = false; P.phase = P.phase === "focus" ? "break" : "focus"; if (P.phase === "focus") P.session++; P.remaining = phaseMs(); wakeOff(); psave(); pomoPaint(); }
function preset() { if (P.running && P.phase === "focus") logSeg(); P.running = false; P.remaining = phaseMs(); wakeOff(); psave(); pomoPaint(); }
function pfinish() { if (P.running) ppause(); P.phase = "focus"; P.remaining = phaseMs(); P.session = 1; psave(); render(); setTimeout(openReport, 60); }

let tickT = 0, lastTick = 0;
function tick() {
  if (P.running && Date.now() >= P.endAt) pfinishPhase();
  pomoPaint(true); lastTick = Date.now();
  clearTimeout(tickT); tickT = setTimeout(tick, 250);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { if (P.running) wakeOn(); if (Date.now() - lastTick > 1000) tick(); } });

function pomoPip() {
  const pip = $("#nav-focus .pip"); if (!pip) return;
  pip.textContent = P.running ? clock(prem()) : "";
}
function pomoPaint(fromTick) {
  pomoPip();
  document.body.classList.toggle("brk", P.phase === "break");
  if (S.view !== "focus") { if (fromTick) return; return; }
  const el = $("#fTime"); if (!el) return;
  const total = phaseMs(), rem = prem();
  el.textContent = clock(rem);
  const pct = Math.max(0, Math.min(100, total ? (1 - rem / total) * 100 : 0));
  $("#fFill").style.width = pct + "%";
  const tr = $("#fTrack"), fx = $("#fFox");
  fx.style.left = Math.max(0, tr.clientWidth - 88) * pct / 100 + "px";
  fx.className = "fox" + (P.running ? " running" : "");
  $("#fDot").className = "dot" + (P.running ? " live" : "");
  $("#fPhase").textContent = (P.phase === "focus" ? t("focus") : t("break")) + (P.phase === "focus" ? " · " + t("session") + " " + P.session : "");
  const b = $("#fStart"); b.textContent = P.running ? t("pause") : (rem < total ? t("resume") : t("start"));
  document.title = P.running ? clock(rem) + " · " + (P.phase === "focus" ? t("focus") : t("break")) : "Aerowyn Masası";
}
function vFocus() {
  const k = todayKey(), c = pomoCfg();
  const opts = tasksIn("today").concat(tasksIn("next"));
  let h = head(t("nav_focus"), t("focusEyebrow"), "");
  h += '<div class="focus"><div class="fphase"><span class="dot" id="fDot"></span><span id="fPhase"></span></div>';
  h += '<div class="ftime" id="fTime" data-ptoggle="1" role="timer">' + clock(prem()) + "</div>";
  h += '<div class="track" id="fTrack"><div class="line"></div><div class="fill" id="fFill"></div><div class="fox" id="fFox"></div></div>';
  const wsx = P.ws && S.academic[P.ws];
  if (wsx) h += '<div class="fwhat"><span class="chip" style="--c:' + esc(cat("akademik").color) + '"><span class="d"></span>' + esc(wsx.title) + '</span><button class="btn ghost sm" data-pclearws="1">' + esc(t("acDetach")) + "</button></div>";
  h += '<div class="fwhat"><select class="in" id="fTask" style="max-width:260px;font-family:var(--f-ui);font-size:13px;text-align:left;border:1px solid var(--rule);border-radius:8px"><option value="">' + esc(t("freeTask")) + "</option>" + opts.map(x => '<option value="' + x.id + '"' + (x.id === P.taskId ? " selected" : "") + ">" + esc(x.title) + "</option>").join("") + "</select>" +
    '<input class="in" id="fTitle" placeholder="' + esc(t("taskPh")) + '" value="' + esc(P.taskId ? "" : P.title) + '"' + (P.taskId ? " hidden" : "") + ">" + catSelect("fCat", P.cat, true).replace('class="in"', 'class="in" style="max-width:200px;font-size:13px"') + "</div>";
  h += '<div class="fbar"><button class="btn primary" id="fStart" data-ptoggle="1" style="min-width:120px">' + esc(t("start")) + '</button><button class="btn" data-pskip="1">' + esc(t("skip")) + '</button><button class="btn" data-preset="1">' + esc(t("reset")) + '</button><button class="btn" data-pfinish="1">' + esc(t("finish")) + '</button><button class="btn" data-zen="1">' + esc(document.body.classList.contains("zen") ? t("exitFull") : t("full")) + '</button><button class="btn ghost" data-pset="1">' + esc(t("settingsShort")) + "</button></div>";
  if (P.showSet) {
    h += '<div class="panel fset form"><div class="row"><label class="field" style="width:90px"><span>' + esc(t("focus")) + '</span><input class="in num" type="number" min="1" max="180" id="pFocus" value="' + c.focus + '"></label><label class="field" style="width:90px"><span>' + esc(t("break")) + '</span><input class="in num" type="number" min="1" max="60" id="pBreak" value="' + c.brk + '"></label><span class="muted" style="align-self:flex-end;padding-bottom:9px">' + esc(t("minutes")) + "</span></div>" +
      '<div class="row">' + [[25, 5], [50, 10], [90, 20]].map(p => '<button class="btn sm" data-ppre="' + p[0] + "," + p[1] + '">' + p[0] + " / " + p[1] + "</button>").join("") + "</div>" +
      '<div class="row"><button class="btn sm" data-pauto="1">' + esc(t("autoNext")) + ": " + esc(c.auto ? t("on") : t("off")) + '</button><button class="btn sm" data-psound="1">' + esc(t("sound")) + ": " + esc(c.sound ? t("on") : t("off")) + '</button><button class="btn sm" data-ptest="1">' + esc(t("testSound")) + "</button></div>" +
      '<div class="muted">' + esc(t("keys")) + "</div></div>";
  }
  const by = focusByCat([k]);
  const ks = Object.keys(by).filter(x => by[x] >= 60).sort((a, b) => by[b] - by[a]);
  h += '<div class="fsum">' + ks.map(x => '<span><b class="num">' + esc(fmtDur(by[x])) + "</b>" + esc(nm(cat(x).name)) + "</span>").join("") + (ks.length ? '<span style="color:var(--accent)"><b class="num" style="color:var(--accent)">' + esc(fmtDur(focusSec(k))) + "</b>" + esc(t("totalToday")) + "</span>" : '<span>' + esc(t("noFocusYet")) + "</span>") + "</div>";
  return h + "</div>";
}
function pSetTask(id) {
  if (P.running && P.phase === "focus") { logSeg(); P.segStart = Date.now(); }
  P.taskId = id; P.ws = ""; const x = S.tasks[id];
  if (x) { P.title = x.title; if (x.cat) P.cat = x.cat; } else P.title = "";
  psave();
}
document.addEventListener("keydown", e => {
  if (S.view !== "focus" || e.target.closest("input,textarea,select") || $("#modal")) return;
  if (e.code === "Space") { e.preventDefault(); P.running ? ppause() : pstart(); }
  else if (e.key === "s" || e.key === "S") pskip();
  else if (e.key === "r" || e.key === "R") preset();
  else if (e.key === "f" || e.key === "F") toggleZen();
});
function toggleZen() {
  const on = !document.body.classList.contains("zen");
  document.body.classList.toggle("zen", on);
  try { if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  render();
}
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("zen")) { document.body.classList.remove("zen"); render(); } });

/* ---------- report card ---------- */
let foxImg = null;
(function () { const i = new Image(); i.onload = () => { foxImg = i; }; i.src = FOX; })();
const RC = { paper: "#F3EADB", ink: "#453D33", soft: "#8B806F", faint: "#B6A996", rule: "#DED0B9", acc: "#5E7546" };
const DISP = 'Georgia, "Yu Mincho", "Hiragino Mincho ProN", serif', UIF = '"Segoe UI", "Yu Gothic UI", "Hiragino Sans", Helvetica, Arial, sans-serif';
let repSize = 0;
function drawCard(k) {
  const SZ = [{ w: 1080, h: 1350, label: "Threads" }, { w: 1280, h: 720, label: "YouTube" }][repSize];
  const cv = document.createElement("canvas"); cv.width = SZ.w; cv.height = SZ.h;
  const x = cv.getContext("2d"), W = SZ.w, H = SZ.h, wide = W > H;
  x.fillStyle = RC.paper; x.fillRect(0, 0, W, H);
  const sess = (day(k).sessions || []), sec = focusSec(k), by = focusByCat([k]);
  const ks = Object.keys(by).filter(q => by[q] >= 60).sort((a, b) => by[b] - by[a]);
  const first = sess.length ? Math.min(...sess.map(s => s.start)) : 0, last = sess.length ? Math.max(...sess.map(s => s.end)) : 0;
  const cx = W / 2;
  x.textAlign = "center"; x.fillStyle = RC.acc; x.font = "bold " + (wide ? 22 : 26) + "px " + UIF;
  x.fillText(t("cardTotal").split("").join(" "), cx, wide ? 90 : 170);
  x.fillStyle = RC.ink; x.font = "300 " + (wide ? 150 : 190) + "px " + DISP;
  x.fillText(fmtDur(sec), cx, wide ? 250 : 400);
  x.fillStyle = RC.soft; x.font = (wide ? 30 : 36) + "px " + DISP;
  x.fillText(fmtDate(k, { day: "numeric", month: "long", year: "numeric" }), cx, wide ? 305 : 470);
  const ry = wide ? 370 : 560, inset = wide ? 160 : 110;
  x.strokeStyle = RC.rule; x.lineWidth = 2; x.beginPath(); x.moveTo(inset, ry); x.lineTo(W - inset, ry); x.stroke();
  if (foxImg) { const fh = wide ? 60 : 80, fw = fh * 88 / 60; x.drawImage(foxImg, 0, 0, foxImg.width / 8, foxImg.height, W - inset - fw, ry - fh + 8, fw, fh); }
  x.font = "bold " + (wide ? 18 : 22) + "px " + UIF; x.fillStyle = RC.soft;
  const meta = [[t("cardFrom"), hhmm(first)], [t("cardTo"), hhmm(last)], [t("sessions").toUpperCase(), String(sess.length)]];
  meta.forEach((m, i) => { const mx = inset + (W - 2 * inset) * (i + .5) / 3; x.fillStyle = RC.soft; x.font = "bold " + (wide ? 16 : 20) + "px " + UIF; x.fillText(m[0], mx, ry + (wide ? 50 : 70)); x.fillStyle = RC.ink; x.font = (wide ? 34 : 44) + "px " + DISP; x.fillText(m[1], mx, ry + (wide ? 95 : 130)); });
  let y = ry + (wide ? 150 : 230);
  const rows = ks.slice(0, wide ? 3 : 6), bw = W - 2 * inset;
  rows.forEach(q => {
    const c = cat(q);
    x.textAlign = "left"; x.fillStyle = RC.ink; x.font = (wide ? 26 : 32) + "px " + DISP; x.fillText(nm(c.name), inset, y);
    x.textAlign = "right"; x.fillStyle = RC.soft; x.fillText(fmtDur(by[q]), W - inset, y);
    x.fillStyle = RC.rule; x.fillRect(inset, y + 14, bw, 6);
    x.fillStyle = c.color; x.fillRect(inset, y + 14, bw * by[q] / sec, 6);
    y += wide ? 62 : 84;
  });
  x.textAlign = "center"; x.fillStyle = RC.faint; x.font = "bold " + (wide ? 16 : 20) + "px " + UIF; x.fillText("A E R O W Y N", cx, H - (wide ? 36 : 60));
  return cv;
}
function openReport() {
  const k = todayKey();
  const old = $("#report"); if (old) old.remove();
  const r = document.createElement("div"); r.id = "report";
  const cv = drawCard(k);
  r.innerHTML = '<img alt="' + esc(t("reportAlt")) + '" src="' + cv.toDataURL("image/png") + '"><div class="row"><button class="btn primary" data-rsave="1">' + esc(t("download")) + '</button><button class="btn" data-rsize="1">' + esc(t("size")) + ": " + (repSize ? "YouTube" : "Threads") + '</button><button class="btn" data-rclose="1">' + esc(t("close")) + '</button></div><div class="muted" style="color:#ddd">' + esc(t("longPress")) + "</div>";
  r.addEventListener("click", async e => {
    if (e.target === r || e.target.closest("[data-rclose]")) r.remove();
    if (e.target.closest("[data-rsize]")) { repSize = 1 - repSize; openReport(); }
    if (e.target.closest("[data-rsave]")) { cv.toBlob(async b => { if (await saveFile("aerowyn-" + k + ".png", b)) toast(t("downloaded")); }, "image/png"); }
  });
  document.body.appendChild(r);
}
