/* ============ interaction ============ */
document.addEventListener("click", e => {
  const el = e.target;
  const c = s => el.closest(s);
  let b;
  if (c("#modal") || c("#report")) return;
  if ((b = c("[data-go]"))) { go(b.dataset.go); return; }
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
  if ((b = c("[data-boardcol]"))) { S.board.col = b.dataset.boardcol; LS.set("masa.boardCol", S.board.col); render(); return; }
  /* calendar */
  if ((b = c("[data-calstep]"))) { const d = parseKey(S.cal.cursor), n = +b.dataset.calstep; if (S.cal.mode === "week") d.setDate(d.getDate() + 7 * n); else { d.setDate(1); d.setMonth(d.getMonth() + n); } S.cal.cursor = dkey(d); render(); return; }
  if (c("[data-caltoday]")) { S.cal.cursor = todayKey(); render(); return; }
  if ((b = c("[data-calmode]"))) { S.cal.mode = b.dataset.calmode; LS.set("masa.calMode", S.cal.mode); render(); return; }
  if ((b = c("[data-callayer]"))) { S.cal.layer = b.dataset.callayer; LS.set("masa.calLayer", S.cal.layer); render(); return; }
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
  /* places */
  /* health */
  const HK = el2 => (el2 && el2.dataset.wday) || S.health.day;
  if ((b = c("[data-hstep]"))) { S.health.day = addDays(S.health.day, +b.dataset.hstep); render(); return; }
  if ((b = c("[data-hday]"))) { S.health.day = b.dataset.hday; render(); return; }
  if ((b = c("[data-hcheck]"))) { toggleCheck(HK(b), b.dataset.hcheck); return; }
  if (c("[data-wdel]")) { putHealth(S.health.day, h => { h.weight = null; }); return; }
  if ((b = c("[data-modtoggle]"))) { const v = b.dataset.modtoggle; editSettings(s2 => { const h = s2.hidden || []; s2.hidden = h.includes(v) ? h.filter(x => x !== v) : h.concat(v); if (!VIEWS.some(x => x !== "settings" && !s2.hidden.includes(x))) s2.hidden = s2.hidden.filter(x => x !== "today"); }); return; }
  if (c("[data-pclearws]")) { P.ws = ""; psave(); render(); return; }
  /* eşitleme */
  if (c("[data-syncnow]")) { Sync.run(); return; }
  if ((b = c("[data-syncoff]"))) { if (b.dataset.armed) { Sync.cfg = null; try { localStorage.removeItem("masa.sync"); } catch (x) {} Sync.set("off"); render(); } else { b.dataset.armed = "1"; b.textContent = t("syncOffSure"); } return; }
  /* settings */
  if ((b = c("[data-lang]"))) { S.lang = b.dataset.lang; LS.set("masa.lang", S.lang); render(); return; }
  if ((b = c("[data-settheme]"))) { S.theme = b.dataset.settheme; LS.set("masa.theme", S.theme); applyTheme(); kkTheme(); render(); return; }
  if ((b = c("[data-catdel]"))) { if (b.dataset.armed) { const i = +b.dataset.catdel; editSettings(s => { s.cats.splice(i, 1); }); } else { b.dataset.armed = "1"; b.textContent = t("sure"); } return; }
  if (c("[data-backup]")) { const data = JSON.stringify({ v: 2, exportedAt: new Date().toISOString(), settings: S.settings || cfg(), tasks: S.tasks, days: S.days, academic: S.academic, kk: S.kk }, null, 1); saveFile("aerowyn-masa-yedek-" + todayKey() + ".json", new Blob([data], { type: "application/json" })).then(ok => { if (ok) toast(t("downloaded")); }); return; }
});

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
  else if (kind === "newcat") { const v = $("#newCat").value.trim(); if (!v) return; const pal = ["#3E6FA8", "#8A5BB5", "#C0833A", "#B4533E", "#2F8A7A", "#5E7546", "#A8577E", "#8A6D4B"]; editSettings(s => { s.cats.push({ id: "c" + uid(), name: { tr: v, en: v, ja: v }, color: pal[s.cats.length % pal.length] }); }); $("#newCat").value = ""; }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "importFile" && el.files && el.files[0]) {
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
  else if (el.id === "fTask") { pSetTask(el.value); render(); }
  else if (el.id === "fCat") { P.cat = el.value; psave(); }
  else if (el.id === "pFocus" || el.id === "pBreak") { const f = Math.max(1, Math.min(180, +$("#pFocus").value || 50)), br = Math.max(1, Math.min(60, +$("#pBreak").value || 10)); editSettings(s => { s.pomo = Object.assign({}, cfg().pomo, { focus: f, brk: br }); }); if (!P.running) { P.remaining = (P.phase === "focus" ? f : br) * 60000; psave(); } }
  else if (el.dataset.catcolor != null) { const i = +el.dataset.catcolor; editSettings(s => { s.cats[i].color = el.value; }); }
  else if (el.dataset.catname != null) { const i = +el.dataset.catname, v = el.value.trim(); if (v) editSettings(s => { s.cats[i].name = Object.assign({}, typeof s.cats[i].name === "object" ? s.cats[i].name : {}, { [S.lang]: v }); }); }
  else if (el.id === "hDate" && el.value) { S.health.day = el.value; render(); }
});
document.addEventListener("input", e => { if (e.target.id === "fTitle") { P.title = e.target.value; psave(); } });

/* ============ boot ============ */
applyTheme();
shell();
note(t("syncConnecting"));
loadLocal().then(() => {
  render(); tick();
  if (Sync.on()) Sync.run(); else Sync.ready = true;
});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
