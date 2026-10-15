/* ============ HEALTH ============ */
const EX_TYPES = ["gym", "tennis", "bike", "walk", "run", "swim", "yoga", "other"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
function hcfg() { const s = S.settings || {}; return Object.assign({ waterGoal: 8, glassMl: 250, weeklyEx: 150, supps: [] }, s.health || {}); }
function hday(k) { return Object.assign({ water: 0, supps: {}, ex: [], weight: null, meals: {} }, day(k).health || {}); }
function putHealth(k, fn) {
  const d = clone(day(k)); d.sessions = d.sessions || []; d.entries = d.entries || [];
  const h = hday(k); fn(h); d.health = h; putDay(k, d);
}
function editHealthCfg(fn) { editSettings(s => { s.health = Object.assign({}, hcfg(), s.health || {}); fn(s.health); }); }
function weekKeys(k) { const d = parseKey(k); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return dkey(x); }); }
function exMin(k) { return (hday(k).ex || []).reduce((s, x) => s + (+x.min || 0), 0); }
function lastWeight(beforeK) {
  const ks = Object.keys(S.days).filter(k => (!beforeK || k <= beforeK) && S.days[k].health && S.days[k].health.weight).sort();
  return ks.length ? { k: ks[ks.length - 1], w: S.days[ks[ks.length - 1]].health.weight } : null;
}
function numFmt(n, dp) { const s = (+n).toFixed(dp == null ? 1 : dp); return S.lang === "tr" ? s.replace(".", ",") : s; }

function vHealth() {
  const k = S.health.day, h = hday(k), c = hcfg();
  let hd = head(t("nav_health"), fmtDate(k), "");
  hd += '<div class="daynav" style="margin-bottom:16px"><button class="btn sm" data-hstep="-1" aria-label="' + esc(t("prev")) + '">‹</button><input class="in" type="date" id="hDate" data-fresh="1" value="' + k + '" style="width:auto"><button class="btn sm" data-hstep="1" aria-label="' + esc(t("next")) + '">›</button><button class="btn sm" data-hday="' + todayKey() + '">' + esc(t("todayWord")) + "</button></div>";
  /* week strip */
  const wk = weekKeys(k), goalW = c.waterGoal, ns = c.supps.length;
  hd += '<div class="panel hweek"><div class="listhead"><h2>' + esc(t("hWeek")) + '</h2><span class="muted num">' + esc(t("hWeekEx").replace("{a}", wk.reduce((s, x) => s + exMin(x), 0)).replace("{b}", c.weeklyEx)) + '</span></div><div class="hstrip">' +
    wk.map((x, i) => { const hx = hday(x), sd = c.supps.filter(s => hx.supps[s.id]).length, em = exMin(x); return '<button class="hcell' + (x === k ? " sel" : "") + (x === todayKey() ? " now" : "") + '" data-hday="' + x + '"><span class="dw">' + esc(dowNames()[i]) + '</span><span class="dd2 num">' + parseKey(x).getDate() + '</span><span class="hbar" title="' + esc(t("hWater")) + '"><i style="width:' + Math.min(100, hx.water / goalW * 100) + '%"></i></span>' + (ns ? '<span class="hs' + (sd === ns ? " full" : "") + '">' + sd + "/" + ns + "</span>" : "") + '<span class="he num">' + (em ? em + " " + esc(t("minShort")) : "–") + "</span></button>"; }).join("") + "</div></div>";
  hd += '<div class="hgrid">';
  /* water */
  const ml = h.water * c.glassMl;
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hWater")) + '</h2><span class="muted num">' + esc(numFmt(ml / 1000, 2).replace(/0$/, "")) + " L · " + h.water + "/" + goalW + '</span></div><div class="glasses">' +
    Array.from({ length: Math.max(goalW, h.water) }, (_, i) => '<button class="glass' + (i < h.water ? " on" : "") + '" data-glass="' + (i + 1) + '" aria-label="' + esc(t("hGlassN").replace("{n}", i + 1)) + '"><svg viewBox="0 0 24 30" aria-hidden="true"><path class="gl" d="M4 3h16l-2 24H6z"/><path class="wt" d="M5.2 11h13.6l-1.4 15.2H6.6z"/></svg></button>').join("") +
    '</div><div class="row" style="margin-top:10px"><button class="btn sm" data-water="-1">−</button><button class="btn sm primary" data-water="1">+ ' + esc(t("hGlass")) + '</button><span class="muted">' + esc(t("hGlassSize").replace("{n}", c.glassMl)) + "</span></div></div>";
  /* supplements */
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hSupps")) + '</h2><span class="muted num">' + c.supps.filter(s => h.supps[s.id]).length + "/" + ns + "</span></div>";
  hd += ns ? '<div class="checks">' + c.supps.map((s, i) => '<div class="chk"><button class="check' + (h.supps[s.id] ? " on" : "") + '" data-supp="' + s.id + '" aria-label="' + esc(s.name) + '"></button><span class="grow">' + esc(s.name) + (s.when ? ' <span class="muted">· ' + esc(t("when_" + s.when)) + "</span>" : "") + '</span><button class="btn ghost sm" data-suppdel="' + i + '" aria-label="' + esc(t("delete")) + '" title="' + esc(t("hRemoveSupp")) + '">×</button></div>').join("") + "</div>" : '<div class="empty">' + esc(t("hNoSupps")) + "</div>";
  hd += '<form class="row" data-form="supp" style="margin-top:10px"><input class="in grow" id="suppName" placeholder="' + esc(t("hSuppPh")) + '"><select class="in" id="suppWhen" style="width:auto">' + ["", "morning", "noon", "evening"].map(w => '<option value="' + w + '">' + esc(w ? t("when_" + w) : t("hAnyTime")) + "</option>").join("") + '</select><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></form></div>";
  /* exercise */
  const ex = h.ex || [];
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hExercise")) + '</h2><span class="muted num">' + exMin(k) + " " + esc(t("minShort")) + "</span></div>";
  hd += ex.length ? ex.map(x => '<div class="exrow"><span class="chip" style="--c:var(--accent)">' + esc(t("ex_" + x.type)) + '</span><b class="num">' + (+x.min || 0) + " " + esc(t("minShort")) + "</b>" + (x.note ? '<span class="muted grow">' + esc(x.note) + "</span>" : '<span class="grow"></span>') + '<button class="btn ghost sm" data-exdel="' + x.id + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") : '<div class="empty">' + esc(t("hNoEx")) + "</div>";
  hd += '<form class="form" data-form="ex" style="margin-top:10px"><div class="chips">' + EX_TYPES.map(x => '<button type="button" class="chip" style="--c:var(--accent)" aria-pressed="' + (S.health.exType === x) + '" data-extype="' + x + '">' + esc(t("ex_" + x)) + "</button>").join("") + '</div><div class="row"><input class="in num" type="number" min="1" max="600" id="exMin" placeholder="' + esc(t("minutes")) + '" style="width:110px"><input class="in grow" id="exNote" placeholder="' + esc(t("hExNotePh")) + '"><button class="btn sm primary" type="submit">+ ' + esc(t("add")) + "</button></div></form></div>";
  /* weight */
  const lw = lastWeight(k), hist = Object.keys(S.days).filter(x => S.days[x].health && S.days[x].health.weight && x <= k && x >= addDays(k, -89)).sort().map(x => [x, +S.days[x].health.weight]);
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hWeight")) + '</h2><span class="muted">' + (lw ? esc(t("hLast")) + ": " + esc(numFmt(lw.w)) + " kg · " + esc(fmtDate(lw.k, { day: "numeric", month: "short" })) : "") + "</span></div>" +
    '<form class="row" data-form="weight"><input class="in num" type="text" inputmode="decimal" autocomplete="off" id="wIn-' + k + '" value="' + (h.weight ? numFmt(h.weight) : "") + '" placeholder="kg" style="width:120px"><button class="btn sm primary" type="submit">' + esc(t("save")) + "</button>" + (h.weight ? '<button class="btn ghost sm" type="button" data-wdel="1">' + esc(t("delete")) + "</button>" : "") + "</form>" + weightChart(hist) + "</div>";
  /* settings */
  hd += '<div class="panel"><h2>' + esc(t("hGoals")) + '</h2><div class="formgrid"><label class="field"><span>' + esc(t("hWaterGoal")) + '</span><input class="in num" type="number" min="1" max="30" id="hgWater" data-hcfg="waterGoal" value="' + c.waterGoal + '"></label><label class="field"><span>' + esc(t("hGlassMl")) + '</span><input class="in num" type="number" min="50" max="1000" step="50" id="hgMl" data-hcfg="glassMl" value="' + c.glassMl + '"></label><label class="field"><span>' + esc(t("hWeeklyEx")) + '</span><input class="in num" type="number" min="0" max="3000" step="10" id="hgEx" data-hcfg="weeklyEx" value="' + c.weeklyEx + '"></label></div></div>';
  return hd + "</div>";
}
function weightChart(pts) {
  if (pts.length < 2) return '<div class="muted" style="margin-top:10px">' + esc(t("hWeightHint")) + "</div>";
  const W = 560, H = 170, L = 38, R = 12, T = 12, B = 24;
  const x0 = parseKey(pts[0][0]).getTime(), x1 = parseKey(pts[pts.length - 1][0]).getTime() || x0 + 1;
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
  if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
  lo = Math.floor(lo); hi = Math.ceil(hi);
  const X = k => L + (parseKey(k).getTime() - x0) / Math.max(1, x1 - x0) * (W - L - R), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const step = Math.max(1, Math.ceil((hi - lo) / 4));
  let g = "";
  for (let v = lo; v <= hi; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + "</text>";
  const line = pts.map(p => X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" ");
  const last = pts[pts.length - 1];
  const f = pts[0][0], lk = last[0];
  return '<svg class="wchart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(t("hWeightChart")) + '">' + g +
    '<polygon class="area" points="' + L + "," + (H - B) + " " + line + " " + X(lk).toFixed(1) + "," + (H - B) + '"/><polyline class="ln" points="' + line + '"/>' +
    pts.map(p => '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="' + (p === last ? 4.5 : 2.2) + '" class="' + (p === last ? "end" : "pt") + '"/>').join("") +
    '<text x="' + L + '" y="' + (H - 6) + '">' + esc(fmtDate(f, { day: "numeric", month: "short" })) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(fmtDate(lk, { day: "numeric", month: "short" })) + "</text></svg>" +
    '<div class="muted num">' + esc(t("hChange").replace("{d}", (last[1] - pts[0][1] > 0 ? "+" : "") + numFmt(last[1] - pts[0][1])).replace("{n}", Math.round((parseKey(lk) - parseKey(f)) / 864e5))) + "</div>";
}
function healthTodayPanel() {
  const k = todayKey(), h = hday(k), c = hcfg(), ns = c.supps.length, sd = c.supps.filter(s => h.supps[s.id]).length;
  return '<div class="panel"><div class="listhead"><h2>' + esc(t("nav_health")) + '</h2><button class="btn ghost sm" data-go="health">' + esc(t("hOpen")) + '</button></div><div class="stats"><div class="stat"><span class="eyebrow">' + esc(t("hWater")) + '</span><b class="num">' + h.water + "/" + c.waterGoal + '</b></div>' + (ns ? '<div class="stat"><span class="eyebrow">' + esc(t("hSupps")) + '</span><b class="num">' + sd + "/" + ns + "</b></div>" : "") + '<div class="stat"><span class="eyebrow">' + esc(t("hExercise")) + '</span><b class="num">' + exMin(k) + '<small style="font-size:15px;color:var(--soft)"> ' + esc(t("minShort")) + '</small></b></div></div><div class="row" style="margin-top:12px"><button class="btn sm primary" data-water="1" data-wday="' + k + '">+ ' + esc(t("hGlass")) + "</button>" +
    c.supps.filter(s => !h.supps[s.id]).slice(0, 3).map(s => '<button class="btn sm" data-supp="' + s.id + '" data-wday="' + k + '">✓ ' + esc(s.name) + "</button>").join("") + "</div></div>";
}
