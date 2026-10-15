/* ============ interaction ============ */
document.addEventListener("click", e => {
  const el = e.target;
  const c = s => el.closest(s);
  let b;
  if (c("#modal") || c("#report")) return;
  if ((b = c("[data-go]"))) { go(b.dataset.go); return; }
  if ((b = c("[data-edit]")) && b.dataset.edit.startsWith("ac:")) { S.ac.sel = b.dataset.edit.slice(3); LS.set("masa.acSel", S.ac.sel); go("academic"); return; }
  if ((b = c("[data-edit]"))) { const x = S.tasks[b.dataset.edit]; if (x) taskModal(clone(x), false); return; }
  if ((b = c("[data-newevent]"))) { taskModal(newTask({ kind: "event", date: b.dataset.newevent, cat: "" }), true); return; }
  if ((b = c("[data-newtask]"))) { taskModal(newTask({ col: b.dataset.newtask }), true); return; }
  if ((b = c("[data-cdel]"))) { if (b.dataset.armed) { delTask(b.dataset.cdel); toast(t("deleted")); } else { b.dataset.armed = "1"; b.textContent = t("sure"); b.classList.add("armed"); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "×"; b.classList.remove("armed"); } }, 4000); } return; }
  if ((b = c("[data-done]"))) { moveTask(b.dataset.done, "done"); toast(t("doneToast")); return; }
  if ((b = c("[data-undone]"))) { moveTask(b.dataset.undone, "today"); return; }
  if ((b = c("[data-move]"))) { moveTask(b.dataset.move, b.dataset.to); return; }
  if ((b = c("[data-play]"))) { pSetTask(b.dataset.play); go("focus"); if (!P.running) pstart(); return; }
  if ((b = c("[data-togglecat]"))) { const id = b.dataset.togglecat, hdn = S.board.hidden; S.board.hidden = hdn.includes(id) ? hdn.filter(x => x !== id) : hdn.concat(id); LS.set("masa.boardHidden", S.board.hidden); render(); return; }
  if (c("[data-showold]")) { S.board.showOld = true; render(); return; }
  /* calendar */
  if ((b = c("[data-calstep]"))) { const d = parseKey(S.cal.cursor), n = +b.dataset.calstep; if (S.cal.mode === "week") d.setDate(d.getDate() + 7 * n); else { d.setDate(1); d.setMonth(d.getMonth() + n); } S.cal.cursor = dkey(d); render(); return; }
  if (c("[data-caltoday]")) { S.cal.cursor = todayKey(); render(); return; }
  if ((b = c("[data-calmode]"))) { S.cal.mode = b.dataset.calmode; LS.set("masa.calMode", S.cal.mode); render(); return; }
  if ((b = c("[data-callayer]"))) { S.cal.layer = b.dataset.callayer; LS.set("masa.calLayer", S.cal.layer); render(); return; }
  if ((b = c("[data-jday]"))) { S.journal.day = b.dataset.jday; S.journal.mode = "day"; go("journal"); return; }
  /* focus */
  if (c("[data-ptoggle]")) { P.running ? ppause() : pstart(); return; }
  if (c("[data-pskip]")) { pskip(); return; }
  if (c("[data-preset]")) { preset(); return; }
  if (c("[data-pfinish]")) { pfinish(); return; }
  if (c("[data-zen]")) { toggleZen(); return; }
  if (c("[data-pset]")) { P.showSet = !P.showSet; render(); return; }
  if ((b = c("[data-ppre]"))) { const [f, br] = b.dataset.ppre.split(",").map(Number); editSettings(s => { s.pomo = Object.assign({}, cfg().pomo, { focus: f, brk: br }); }); if (!P.running) { P.remaining = (P.phase === "focus" ? f : br) * 60000; psave(); } return; }
  if (c("[data-pauto]")) { editSettings(s => { s.pomo = Object.assign({}, cfg().pomo, { auto: !cfg().pomo.auto }); }); return; }
  if (c("[data-psound]")) { editSettings(s => { s.pomo = Object.assign({}, cfg().pomo, { sound: !cfg().pomo.sound }); }); return; }
  if (c("[data-ptest]")) { audio(); const was = cfg().pomo.sound; if (was) chime("focusEnd"); else toast(t("soundOff")); return; }
  /* journal */
  if ((b = c("[data-jmode]"))) { S.journal.mode = b.dataset.jmode; render(); return; }
  if ((b = c("[data-jstep]"))) { S.journal.day = addDays(S.journal.day, +b.dataset.jstep); render(); return; }
  if ((b = c("[data-etype]"))) { S.journal.type = b.dataset.etype; render(); return; }
  if (c("[data-jstar]")) { S.journal.star = !S.journal.star; render(); return; }
  if ((b = c("[data-estar]"))) { editEntry(S.journal.mode === "series" ? findEntryDay(b.dataset.estar) : S.journal.day, b.dataset.estar, x => { x.star = !x.star; }); return; }
  if ((b = c("[data-edel]"))) { if (b.dataset.armed) editEntry(S.journal.mode === "series" ? findEntryDay(b.dataset.edel) : S.journal.day, b.dataset.edel, () => "delete"); else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if ((b = c("[data-delsess]"))) { if (b.dataset.armed) { const k = S.journal.day, d = clone(day(k)); d.sessions = (d.sessions || []).filter(x => x.id !== b.dataset.delsess); putDay(k, d); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if (c("[data-sexport]")) { const md = seriesMarkdown(); saveFile("aerowyn-seri-" + todayKey() + ".md", new Blob([md], { type: "text/markdown" })).then(ok => { if (ok) toast(t("downloaded")); }); return; }
  /* places */
  if ((b = c("[data-nameplace]"))) { S.naming = S.naming === b.dataset.nameplace ? "" : b.dataset.nameplace; render(); return; }
  if ((b = c("[data-delvisit]"))) { if (b.dataset.armed) { const [k, id] = b.dataset.delvisit.split("|"); const d = clone(day(k)); d.places.visits = d.places.visits.filter(v => v.id !== id); putDay(k, d); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if (c("[data-plimport]")) { runImport(); return; }
  if ((b = c("[data-kpdel]"))) { const i = +b.dataset.kpdel; editSettings(s => { s.places.splice(i, 1); }); return; }
  /* health */
  const HK = el2 => (el2 && el2.dataset.wday) || S.health.day;
  if ((b = c("[data-hstep]"))) { S.health.day = addDays(S.health.day, +b.dataset.hstep); render(); return; }
  if ((b = c("[data-hday]"))) { S.health.day = b.dataset.hday; render(); return; }
  if ((b = c("[data-glass]"))) { const n = +b.dataset.glass; putHealth(S.health.day, h => { h.water = h.water === n ? n - 1 : n; }); return; }
  if ((b = c("[data-water]"))) { const d = +b.dataset.water; putHealth(HK(b), h => { h.water = Math.max(0, (h.water || 0) + d); }); if (d > 0 && b.dataset.wday) toast(t("hWaterToast")); return; }
  if ((b = c("[data-supp]"))) { const id = b.dataset.supp; putHealth(HK(b), h => { h.supps = Object.assign({}, h.supps); if (h.supps[id]) delete h.supps[id]; else h.supps[id] = Date.now(); }); return; }
  if ((b = c("[data-suppdel]"))) { if (b.dataset.armed) { const i = +b.dataset.suppdel; editHealthCfg(hc => { hc.supps = hc.supps.filter((_, j) => j !== i); }); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if ((b = c("[data-extype]"))) { S.health.exType = b.dataset.extype; $$("[data-extype]").forEach(x => x.setAttribute("aria-pressed", x.dataset.extype === S.health.exType)); return; }
  if ((b = c("[data-exdel]"))) { const id = b.dataset.exdel; putHealth(S.health.day, h => { h.ex = (h.ex || []).filter(x => x.id !== id); }); return; }
  if (c("[data-wdel]")) { putHealth(S.health.day, h => { h.weight = null; }); return; }
  /* academic */
  const W = () => S.academic[S.ac.sel];
  const armed = b2 => { if (b2.dataset.armed) return true; b2.dataset.armed = "1"; b2.textContent = t("sure"); return false; };
  if (c("[data-acnew]")) { acModal(newWs(), true); return; }
  if ((b = c("[data-acsel]"))) { S.ac.sel = b.dataset.acsel; LS.set("masa.acSel", S.ac.sel); S.ac.drill = null; render(); return; }
  if (c("[data-acarch]")) { S.ac.showArch = !S.ac.showArch; render(); return; }
  if ((b = c("[data-acedit]"))) { const w = S.academic[b.dataset.acedit]; if (w) acModal(clone(w), false); return; }
  if ((b = c("[data-acfocus]"))) { const w = S.academic[b.dataset.acfocus]; if (w) acFocus(w); return; }
  if ((b = c("[data-tstat]"))) { const id = b.dataset.tstat; editAc(S.ac.sel, w => { const x = w.topics.find(y => y.id === id); x.status = TOPIC_ST[(TOPIC_ST.indexOf(x.status || "todo") + 1) % 3]; }); return; }
  if ((b = c("[data-tfocus]"))) { const w = W(), x = w && w.topics.find(y => y.id === b.dataset.tfocus); if (x) acFocus(w, x.title); return; }
  if ((b = c("[data-ttoday]"))) { const w = W(), x = w && w.topics.find(y => y.id === b.dataset.ttoday); if (!x) return; ensureAcCat(); putTask(newTask({ title: x.title, desc: w.title, cat: "akademik", col: "today", order: nextOrder("today") })); toast(t("added")); return; }
  if ((b = c("[data-tup]"))) { const i = +b.dataset.tup; editAc(S.ac.sel, w => { const a = w.topics; [a[i - 1], a[i]] = [a[i], a[i - 1]]; }); return; }
  if ((b = c("[data-tdel]"))) { if (armed(b)) editAc(S.ac.sel, w => { w.topics = w.topics.filter(y => y.id !== b.dataset.tdel); }); return; }
  if ((b = c("[data-qdel]"))) { if (armed(b)) editAc(S.ac.sel, w => { w.questions = w.questions.filter(y => y.id !== b.dataset.qdel); }); return; }
  if (c("[data-drill]")) { const w = W(), q = w && pickQuestion(w); if (q) { S.ac.drill = { ws: w.id, qid: q.id, t0: Date.now(), shown: false }; S.ac.lastQ = q.id; } render(); return; }
  if (c("[data-dshow]")) { if (S.ac.drill) S.ac.drill.shown = true; render(); return; }
  if ((b = c("[data-drate]"))) { const D = S.ac.drill; if (!D) return; const r = b.dataset.drate; editAc(D.ws, w => { const q = w.questions.find(y => y.id === D.qid); if (q) { q.rating = r; q.tries = (q.tries || 0) + 1; q.last = Date.now(); } }); const w = W(), q = w && pickQuestion(w); S.ac.drill = q ? { ws: w.id, qid: q.id, t0: Date.now(), shown: false } : null; if (q) S.ac.lastQ = q.id; render(); return; }
  if (c("[data-talkgo]")) { S.ac.talk = { ws: S.ac.sel, t0: Date.now() }; render(); return; }
  if (c("[data-talkcancel]")) { S.ac.talk = null; render(); return; }
  if (c("[data-talkstop]")) { const T0 = S.ac.talk; if (!T0) return; const sec = Math.round((Date.now() - T0.t0) / 1000); S.ac.talk = null; if (sec >= 30) { editAc(T0.ws, w => { w.runs = (w.runs || []).concat({ ts: Date.now(), sec }); }); toast(t("saved")); } else render(); return; }
  if ((b = c("[data-ldel]"))) { editAc(S.ac.sel, w => { w.links = w.links.filter(y => y.id !== b.dataset.ldel); }); return; }
  if (c("[data-pclearws]")) { P.ws = ""; psave(); render(); return; }
  if ((b = c("[data-modtoggle]"))) { const v = b.dataset.modtoggle; editSettings(s => { const h = s.hidden || []; s.hidden = h.includes(v) ? h.filter(x => x !== v) : h.concat(v); if (!VIEWS.some(x => x !== "settings" && !s.hidden.includes(x))) s.hidden = s.hidden.filter(x => x !== "today"); }); return; }
  /* eşitleme */
  if (c("[data-syncnow]")) { Sync.run(); return; }
  if ((b = c("[data-syncoff]"))) { if (b.dataset.armed) { Sync.cfg = null; try { localStorage.removeItem("masa.sync"); } catch (x) {} Sync.set("off"); render(); } else { b.dataset.armed = "1"; b.textContent = t("syncOffSure"); } return; }
  if ((b = c("[data-here]"))) {
    if (!navigator.geolocation) { toast(t("geoNo")); return; }
    b.textContent = t("geoWait");
    navigator.geolocation.getCurrentPosition(p => { const i = $("#pLoc"); if (i) i.value = p.coords.latitude.toFixed(6) + ", " + p.coords.longitude.toFixed(6); b.textContent = t("hereNow"); }, () => { toast(t("geoNo")); b.textContent = t("hereNow"); }, { enableHighAccuracy: true, timeout: 15000 });
    return;
  }
  /* settings */
  if ((b = c("[data-lang]"))) { S.lang = b.dataset.lang; LS.set("masa.lang", S.lang); render(); return; }
  if ((b = c("[data-settheme]"))) { S.theme = b.dataset.settheme; LS.set("masa.theme", S.theme); applyTheme(); kkTheme(); render(); return; }
  if ((b = c("[data-catdel]"))) { if (b.dataset.armed) { const i = +b.dataset.catdel; editSettings(s => { s.cats.splice(i, 1); }); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if ((b = c("[data-serdel]"))) { if (b.dataset.armed) { const i = +b.dataset.serdel; editSettings(s => { s.series.splice(i, 1); }); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if (c("[data-backup]")) { const data = JSON.stringify({ v: 2, exportedAt: new Date().toISOString(), settings: S.settings || cfg(), tasks: S.tasks, days: S.days, academic: S.academic, kk: S.kk }, null, 1); saveFile("aerowyn-masa-yedek-" + todayKey() + ".json", new Blob([data], { type: "application/json" })).then(ok => { if (ok) toast(t("downloaded")); }); return; }
});
function findEntryDay(id) { return Object.keys(S.days).find(k => (S.days[k].entries || []).some(e => e.id === id)) || S.journal.day; }

document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form;
  if (kind === "quick") {
    const title = $("#qTitle").value.trim(); if (!title) return;
    const catv = $("#qCat").value; LS.set("masa.qcat", catv);
    const x = newTask({ title, cat: catv, col: "today", order: nextOrder("today") });
    $("#qTitle").value = ""; putTask(x); toast(t("added"));
  }
  else if (kind === "actopic") { const v = $("#acTopicIn").value.trim(); if (!v) return; editAc(S.ac.sel, w => { w.topics = (w.topics || []).concat({ id: uid(), title: v, status: "todo", note: "" }); }); $("#acTopicIn").value = ""; }
  else if (kind === "acq") { const v = $("#acQIn").value.trim(); if (!v) return; editAc(S.ac.sel, w => { w.questions = (w.questions || []).concat({ id: uid(), q: v, a: "", rating: "", tries: 0, last: 0 }); }); $("#acQIn").value = ""; }
  else if (kind === "acanswer") { const id = f.dataset.qid, v = $("#ans-" + id).value; editAc(S.ac.sel, w => { const q = w.questions.find(y => y.id === id); if (q) q.a = v; }); toast(t("saved")); }
  else if (kind === "aclink") { let u = $("#acLinkU").value.trim(); const tt = $("#acLinkT").value.trim(); if (!u) return; if (!/^https?:\/\//.test(u)) u = "https://" + u; editAc(S.ac.sel, w => { w.links = (w.links || []).concat({ id: uid(), title: tt, url: u }); }); $("#acLinkU").value = ""; $("#acLinkT").value = ""; }
  else if (kind === "acnotes") { const w = S.academic[S.ac.sel]; if (!w) return; const v = $("#acNotes-" + w.id).value; editAc(w.id, x => { x.notes = v; }); toast(t("saved")); }
  else if (kind === "supp") { const v = $("#suppName").value.trim(); if (!v) return; const w = $("#suppWhen").value; editHealthCfg(hc => { hc.supps = (hc.supps || []).concat({ id: uid(), name: v, when: w }); }); $("#suppName").value = ""; }
  else if (kind === "ex") { const m = Math.round(+$("#exMin").value); if (!(m > 0)) { toast(t("hExNeedMin")); return; } const note = $("#exNote").value.trim(); putHealth(S.health.day, h => { h.ex = (h.ex || []).concat({ id: uid(), type: S.health.exType, min: m, note, ts: Date.now() }); }); $("#exMin").value = ""; $("#exNote").value = ""; toast(t("added")); }
  else if (kind === "weight") { const v = parseFloat(String($("#wIn-" + S.health.day).value).replace(",", ".")); if (!(v > 20 && v < 300)) { toast(t("hWeightBad")); return; } putHealth(S.health.day, h => { h.weight = Math.round(v * 10) / 10; }); toast(t("saved")); }
  else if (kind === "sync") {
    const c2 = { owner: $("#syncOwner").value.trim(), repo: $("#syncRepo").value.trim(), token: $("#syncToken").value.trim() };
    if (!c2.owner || !c2.repo || !c2.token) { toast(t("syncFill")); return; }
    toast(t("syncTesting"));
    Sync.test(c2).then(r => {
      if (r !== "ok") { toast(t("syncTest_" + r)); return; }
      Sync.cfg = c2; LS.set("masa.sync", c2); toast(t("syncConnected")); Sync.run();
    }).catch(() => toast(t("syncTest_error")));
  }
  else if (kind === "entry") saveEntry();
  else if (kind === "place") savePlace();
  else if (kind === "nameplace") { const v = $("#namePlaceIn").value.trim(); if (v) nameVisit(f.dataset.key, v); }
  else if (kind === "newcat") { const v = $("#newCat").value.trim(); if (!v) return; const pal = ["#3E6FA8", "#8A5BB5", "#C0833A", "#B4533E", "#2F8A7A", "#5E7546", "#A8577E", "#8A6D4B"]; editSettings(s => { s.cats.push({ id: "c" + uid(), name: { tr: v, en: v, ja: v }, color: pal[s.cats.length % pal.length] }); }); $("#newCat").value = ""; }
  else if (kind === "newser") { const v = $("#newSer").value.trim(); if (!v) return; editSettings(s => { s.series.push({ id: "s" + uid(), name: { tr: v, en: v, ja: v } }); }); $("#newSer").value = ""; }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "jDate" && el.value) { S.journal.day = el.value; render(); }
  else if (el.id === "importFile" && el.files && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(r.result);
        if (Array.isArray(o.decks)) { S.kk = { _t: Date.now(), data: o }; kkApplyLocal(); changed(); toast(t("restoredKK")); }
        else { const n = importBackup(o); toast(t("restored").replace("{n}", n)); }
      } catch (x) { toast(t("restoreBad")); }
    };
    r.readAsText(el.files[0]); el.value = "";
  }
  else if (el.id === "jSeriesPick") { S.journal.series = el.value; render(); }
  else if (el.id === "fTask") { pSetTask(el.value); render(); }
  else if (el.id === "fCat") { P.cat = el.value; psave(); }
  else if (el.id === "pFocus" || el.id === "pBreak") { const f = Math.max(1, Math.min(180, +$("#pFocus").value || 50)), br = Math.max(1, Math.min(60, +$("#pBreak").value || 10)); editSettings(s => { s.pomo = Object.assign({}, cfg().pomo, { focus: f, brk: br }); }); if (!P.running) { P.remaining = (P.phase === "focus" ? f : br) * 60000; psave(); } }
  else if (el.id === "plFrom" || el.id === "plTo") { S.places[el.id === "plFrom" ? "from" : "to"] = el.value; render(); }
  else if (el.dataset.catcolor != null) { const i = +el.dataset.catcolor; editSettings(s => { s.cats[i].color = el.value; }); }
  else if (el.dataset.catname != null) { const i = +el.dataset.catname, v = el.value.trim(); if (v) editSettings(s => { s.cats[i].name = Object.assign({}, typeof s.cats[i].name === "object" ? s.cats[i].name : {}, { [S.lang]: v }); }); }
  else if (el.dataset.sername != null) { const i = +el.dataset.sername, v = el.value.trim(); if (v) editSettings(s => { s.series[i].name = Object.assign({}, typeof s.series[i].name === "object" ? s.series[i].name : {}, { [S.lang]: v }); }); }
  else if (el.id === "hDate" && el.value) { S.health.day = el.value; render(); }
  else if (el.dataset.meal != null) { const m = el.dataset.meal, v = el.value.trim(); putHealth(S.health.day, h => { h.meals = Object.assign({}, h.meals, { [m]: v }); }); }
  else if (el.dataset.hcfg != null) { const key = el.dataset.hcfg, v = Math.max(0, Math.round(+el.value || 0)); if (v) editHealthCfg(hc => { hc[key] = v; }); }
  else if (el.dataset.talkmin != null) { const v = Math.max(1, Math.min(120, +el.value || 20)); editAc(el.dataset.talkmin, w => { w.talkMin = v; }); }
  else if (el.dataset.kpname != null) { const i = +el.dataset.kpname, v = el.value.trim(); if (v) editSettings(s => { s.places[i].name = v; }); }
});
document.addEventListener("input", e => { if (e.target.id === "fTitle") { P.title = e.target.value; psave(); } });
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList && e.target.classList.contains("day")) { S.journal.day = e.target.dataset.jday; S.journal.mode = "day"; go("journal"); }
});

/* ============ boot ============ */
applyTheme();
shell();
note(t("syncConnecting"));
loadLocal().then(() => {
  render(); tick();
  if (Sync.on()) Sync.run(); else Sync.ready = true;
});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
