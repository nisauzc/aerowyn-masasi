"use strict";
const FOX = "icons/fox.png";
/* ============ helpers ============ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const dkey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parseKey = k => { const [a, b, c] = k.split("-").map(Number); return new Date(a, b - 1, c); };
const todayKey = () => dkey(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
const hhmm = ts => { if (!ts) return "--:--"; const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const LS = {
  get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

/* ============ defaults ============ */
const DEFAULT_CATS = [
  { id: "ielts", name: { tr: "IELTS", en: "IELTS", ja: "IELTS" }, color: "#3E6FA8" },
  { id: "kanji", name: { tr: "Kanji", en: "Kanji", ja: "漢字" }, color: "#8A5BB5" },
  { id: "konusma", name: { tr: "Japonca konuşma", en: "Japanese speaking", ja: "会話" }, color: "#C0833A" },
  { id: "basvuru", name: { tr: "Doktora başvurusu", en: "PhD applications", ja: "博士課程出願" }, color: "#B4533E" },
  { id: "ylsy", name: { tr: "YLSY / Londra", en: "YLSY / London", ja: "YLSY・ロンドン" }, color: "#2F8A7A" },
  { id: "arastirma", name: { tr: "Araştırma", en: "Research", ja: "研究" }, color: "#5E7546" },
  { id: "okuma", name: { tr: "Okuma", en: "Reading", ja: "読書" }, color: "#A8577E" },
  { id: "kanal", name: { tr: "Aerowyn kanal", en: "Aerowyn channel", ja: "チャンネル" }, color: "#8A6D4B" },
  { id: "kisisel", name: { tr: "Kişisel", en: "Personal", ja: "個人" }, color: "#7C8491" },
  { id: "akademik", name: { tr: "Akademik çalışma", en: "Academic work", ja: "学術" }, color: "#4A5A8C" }
];
const DEFAULT_SERIES = [
  { id: "ylsy", name: { tr: "YLSY süreci", en: "The YLSY process", ja: "YLSYの道のり" } },
  { id: "japonca", name: { tr: "Japonca yolculuğu", en: "Learning Japanese", ja: "日本語の旅" } },
  { id: "doktora", name: { tr: "Doktora başvuruları", en: "PhD applications", ja: "博士課程出願" } },
  { id: "londra", name: { tr: "Londra günleri", en: "Days in London", ja: "ロンドンの日々" } },
  { id: "ielts", name: { tr: "IELTS yolu", en: "Road to IELTS", ja: "IELTSへの道" } }
];
const DEFAULT_SETTINGS = { cats: DEFAULT_CATS, series: DEFAULT_SERIES, places: [], pomo: { focus: 50, brk: 10, auto: true, sound: true } };
const ENTRY_TYPES = ["study", "reading", "research", "place", "note", "untold"];

/* ============ state ============ */
const S = {
  lang: LS.get("masa.lang", "tr"),
  theme: LS.get("masa.theme", "system"),
  view: LS.get("masa.view", "today"),
  settings: null, tasks: {}, days: {}, academic: {},
  health: { day: todayKey(), exType: "gym" },
  ac: { sel: LS.get("masa.acSel", ""), showArch: false, drill: null, talk: null, lastQ: "" },
  cal: { cursor: todayKey(), mode: LS.get("masa.calMode", "month"), layer: LS.get("masa.calLayer", "plan") },
  board: { hidden: LS.get("masa.boardHidden", []), showOld: false },
  journal: { day: todayKey(), mode: "day", series: "", type: "note", star: false, seriesPick: "" },
  places: { parsed: null, from: addDays(todayKey(), -30), to: todayKey(), busy: "" }
};
function cfg() {
  const s = S.settings || {};
  return {
    cats: s.cats && s.cats.length ? s.cats : DEFAULT_CATS,
    series: s.series && s.series.length ? s.series : DEFAULT_SERIES,
    places: s.places || [],
    pomo: Object.assign({}, DEFAULT_SETTINGS.pomo, s.pomo || {}),
    hidden: s.hidden || []
  };
}
function nm(o) { if (!o) return ""; if (typeof o === "string") return o; return o[S.lang] || o.tr || o.en || ""; }
function cat(id) { return cfg().cats.find(c => c.id === id) || { id: "", name: { tr: "Genel", en: "General", ja: "一般" }, color: "#8B8272" }; }
function catChip(id) { const c = cat(id); return '<span class="chip" style="--c:' + esc(c.color) + '"><span class="d"></span>' + esc(nm(c.name)) + "</span>"; }
function day(k) { return S.days[k] || { sessions: [], entries: [], places: null }; }

/* ============ durum notu ============ */
function note(msg, bad) { const el = $("#syncNote"); if (el) { el.textContent = msg; el.classList.toggle("bad", !!bad); } }

/* ============ recurrence / calendar items ============ */
function occursOn(tk, k) {
  if (!tk.date) return false;
  if (tk.date === k) return true;
  if (tk.kind !== "event" || !tk.recur || tk.recur === "none" || k < tk.date) return false;
  if (tk.until && k > tk.until) return false;
  const a = parseKey(tk.date), b = parseKey(k);
  if (tk.recur === "daily") return true;
  if (tk.recur === "weekly") return Math.round((b - a) / 864e5) % 7 === 0;
  if (tk.recur === "monthly") return a.getDate() === b.getDate();
  return false;
}
function itemsOn(k) {
  const ac = hiddenView("academic") ? [] : Object.values(S.academic).filter(w => !w.archived && w.date === k).map(w => ({ id: "ac:" + w.id, kind: "event", title: w.title, cat: "akademik", date: w.date, time: w.time || "" }));
  return Object.values(S.tasks).filter(x => occursOn(x, k)).concat(ac).sort((a, b) => (a.time || "99").localeCompare(b.time || "99") || (a.title || "").localeCompare(b.title || ""));
}
function hiddenView(v) { return cfg().hidden.includes(v); }
function focusSec(k) { return (day(k).sessions || []).reduce((s, x) => s + (x.sec || 0), 0); }
function focusByCat(keys) {
  const m = {};
  keys.forEach(k => (day(k).sessions || []).forEach(x => { m[x.cat || ""] = (m[x.cat || ""] || 0) + (x.sec || 0); }));
  return m;
}
function fmtDur(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (S.lang === "ja") return h ? h + "時間" + (m ? m + "分" : "") : m + "分";
  const H = S.lang === "en" ? "h" : "sa", M = S.lang === "en" ? "m" : "dk";
  return h ? h + " " + H + (m ? " " + m + " " + M : "") : m + " " + M;
}
function streak() {
  let k = todayKey(), n = 0;
  if (focusSec(k) < 1800) k = addDays(k, -1);
  while (focusSec(k) >= 1800 && n < 3650) { n++; k = addDays(k, -1); }
  return n;
}
function fmtDate(k, opts) {
  const loc = S.lang === "ja" ? "ja-JP" : S.lang === "en" ? "en-GB" : "tr-TR";
  return parseKey(k).toLocaleDateString(loc, opts || { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}
function monthTitle(d) {
  const loc = S.lang === "ja" ? "ja-JP" : S.lang === "en" ? "en-GB" : "tr-TR";
  return d.toLocaleDateString(loc, { month: "long", year: "numeric" });
}
function dowNames() {
  const loc = S.lang === "ja" ? "ja-JP" : S.lang === "en" ? "en-GB" : "tr-TR";
  const base = new Date(2024, 0, 1); /* pazartesi */
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(1 + i); return d.toLocaleDateString(loc, { weekday: "short" }); });
}

/* ============ toast / modal ============ */
let toastT = 0;
function toast(msg) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600);
}
function openModal(html, onMount) {
  closeModal();
  const m = document.createElement("div");
  m.id = "modal";
  m.innerHTML = '<div class="box" role="dialog" aria-modal="true">' + html + "</div>";
  m.addEventListener("mousedown", e => { if (e.target === m) closeModal(); });
  document.body.appendChild(m);
  if (onMount) onMount(m);
  const f = m.querySelector("[autofocus]") || m.querySelector("input,textarea,button");
  if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { const m = $("#modal"); if (m) m.remove(); }
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); const r = $("#report"); if (r) r.remove(); } });

