/* ============ HEALTH ============ */
/* Üç soru, üç tik: su, egzersiz, takviye. Altında günlük takip. */
const CHECKS = ["water", "ex", "supp"];
function hday(k) { return Object.assign({ checks: null, weight: null }, day(k).health || {}); }
function putHealth(k, fn) {
  const d = clone(day(k)); d.sessions = d.sessions || []; d.entries = d.entries || [];
  const h = hday(k); fn(h); d.health = h; putDay(k, d);
}
/* Eski kayıtlarda tik yok: bardak sayısından, egzersiz dakikasından ve
   işaretlenmiş takviyelerden çıkarılır, böylece geçmiş boş görünmez. */
function checksOf(h) {
  if (h && h.checks) return { water: !!h.checks.water, ex: !!h.checks.ex, supp: !!h.checks.supp };
  const eski = h || {};
  const goal = ((S.settings || {}).health || {}).waterGoal || 8;
  const mins = (eski.ex || []).reduce((s, x) => s + (+x.min || 0), 0);
  const supps = eski.supps ? Object.keys(eski.supps).length : 0;
  return { water: (eski.water || 0) >= goal, ex: mins > 0, supp: supps > 0 };
}
function dayChecks(k) { return checksOf(hday(k)); }
function checkCount(k) { const c = dayChecks(k); return c.water + c.ex + c.supp; }
function toggleCheck(k, key) {
  putHealth(k, h => { const c = checksOf(h); c[key] = !c[key]; h.checks = c; });
}
function weekKeys(k) { const d = parseKey(k); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return dkey(x); }); }
function lastWeight(beforeK) {
  const ks = Object.keys(S.days).filter(k => (!beforeK || k <= beforeK) && S.days[k].health && S.days[k].health.weight).sort();
  return ks.length ? { k: ks[ks.length - 1], w: S.days[ks[ks.length - 1]].health.weight } : null;
}
function numFmt(n, dp) { const s = (+n).toFixed(dp == null ? 1 : dp); return S.lang === "tr" ? s.replace(".", ",") : s; }

function checkRow(k, key, wday) {
  const on = dayChecks(k)[key];
  return '<div class="qrow"><button class="check big' + (on ? " on" : "") + '" data-hcheck="' + key + '"' + (wday ? ' data-wday="' + k + '"' : "") +
    ' role="checkbox" aria-checked="' + on + '" aria-label="' + esc(t("hq_" + key)) + '"></button>' +
    '<span class="q">' + esc(t("hq_" + key)) + "</span></div>";
}

function vHealth() {
  const k = S.health.day;
  let hd = head(t("nav_health"), fmtDate(k), "");
  hd += '<div class="daynav" style="margin-bottom:16px"><button class="btn sm" data-hstep="-1" aria-label="' + esc(t("prev")) + '">‹</button><input class="in" type="date" id="hDate" data-fresh="1" value="' + k + '" style="width:auto"><button class="btn sm" data-hstep="1" aria-label="' + esc(t("next")) + '">›</button><button class="btn sm" data-hday="' + todayKey() + '">' + esc(t("todayWord")) + "</button></div>";

  /* üç soru */
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hChecklist")) + '</h2><span class="muted num">' + checkCount(k) + "/3</span></div>" +
    '<div class="qlist">' + CHECKS.map(x => checkRow(k, x)).join("") + "</div></div>";

  /* bu hafta */
  const wk = weekKeys(k);
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hWeek")) + '</h2><span class="muted num">' + wk.filter(x => checkCount(x) === 3).length + ' / 7</span></div><div class="hstrip">' +
    wk.map((x, i) => { const c = dayChecks(x), n = c.water + c.ex + c.supp;
      return '<button class="hcell' + (x === k ? " sel" : "") + (x === todayKey() ? " now" : "") + '" data-hday="' + x + '"><span class="dw">' + esc(dowNames()[i]) +
        '</span><span class="dd2 num">' + parseKey(x).getDate() + '</span><span class="dots">' +
        CHECKS.map(key => '<i class="' + (c[key] ? "on" : "") + '" title="' + esc(t("hq_" + key)) + '"></i>').join("") +
        '</span><span class="he num">' + n + "/3</span></button>"; }).join("") + "</div></div>";

  /* günlük takip: son 5 hafta */
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hHistory")) + '</h2><span class="muted">' + esc(t("hHistoryHint")) + "</span></div>" + historyGrid(k) + "</div>";

  /* kilo */
  const h = hday(k), lw = lastWeight(k), hist = Object.keys(S.days).filter(x => S.days[x].health && S.days[x].health.weight && x <= k && x >= addDays(k, -89)).sort().map(x => [x, +S.days[x].health.weight]);
  hd += '<div class="panel"><div class="listhead"><h2>' + esc(t("hWeight")) + '</h2><span class="muted">' + (lw ? esc(t("hLast")) + ": " + esc(numFmt(lw.w)) + " kg · " + esc(fmtDate(lw.k, { day: "numeric", month: "short" })) : "") + "</span></div>" +
    '<form class="row" data-form="weight"><input class="in num" type="text" inputmode="decimal" autocomplete="off" id="wIn-' + k + '" value="' + (h.weight ? numFmt(h.weight) : "") + '" placeholder="kg" style="width:120px"><button class="btn sm primary" type="submit">' + esc(t("save")) + "</button>" + (h.weight ? '<button class="btn ghost sm" type="button" data-wdel="1">' + esc(t("delete")) + "</button>" : "") + "</form>" + weightChart(hist) + "</div>";
  return hd;
}

/* son beş haftanın tik haritası */
function historyGrid(k) {
  const end = weekKeys(k)[0];
  const rows = [];
  for (let w = 4; w >= 0; w--) {
    const mon = addDays(end, -7 * w);
    rows.push(weekKeys(mon));
  }
  const bugun = todayKey();
  return '<div class="hgridmap">' +
    '<div class="hgm-head"><span></span>' + dowNames().map(d => "<span>" + esc(d) + "</span>").join("") + "</div>" +
    rows.map(week => '<div class="hgm-row"><span class="wk">' + esc(fmtDate(week[0], { day: "numeric", month: "short" })) + "</span>" +
      week.map(x => { const n = x > bugun ? -1 : checkCount(x);
        return '<button class="hgm' + (n >= 0 ? " n" + n : " future") + (x === k ? " sel" : "") + '" data-hday="' + x + '" title="' + esc(fmtDate(x, { day: "numeric", month: "long" })) + (n >= 0 ? " · " + n + "/3" : "") + '"></button>'; }).join("") +
      "</div>").join("") + "</div>";
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

/* Bugün ekranındaki küçük kart: aynı üç soru, oradan da işaretlenir */
function healthTodayPanel() {
  const k = todayKey();
  return '<div class="panel"><div class="listhead"><h2>' + esc(t("nav_health")) + '</h2><span class="muted num">' + checkCount(k) + '/3</span><button class="btn ghost sm" data-go="health">' + esc(t("hOpen")) + "</button></div>" +
    '<div class="qlist">' + CHECKS.map(x => checkRow(k, x, true)).join("") + "</div></div>";
}
