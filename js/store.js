/* ============ yerel depo (IndexedDB) + GitHub eşitleme ============ */
const IDB = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const r = indexedDB.open("aerowyn-masa", 1);
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("kv"); d.createObjectStore("photos"); };
        r.onsuccess = () => { IDB.db = r.result; res(true); };
        r.onerror = () => res(false);
      } catch (e) { res(false); }
    });
  },
  get(store, key) {
    return new Promise(res => {
      if (!IDB.db) return res(undefined);
      try { const q = IDB.db.transaction(store).objectStore(store).get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }
      catch (e) { res(undefined); }
    });
  },
  put(store, key, val) {
    return new Promise(res => {
      if (!IDB.db) return res(false);
      try { const tx = IDB.db.transaction(store, "readwrite"); tx.objectStore(store).put(val, key); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }
      catch (e) { res(false); }
    });
  }
};

S.tomb = {};      /* silinenler: "tasks/id" -> zaman */
S.kk = null;      /* Kelime Kutusu durumu: {_t, data} */
S.pending = [];   /* henüz GitHub'a gitmemiş fotoğraflar */
const COLLS = ["tasks", "days", "academic"];
const KK_KEY = "kelime-kutusu-v1";

function stamp(o) { o._t = Date.now(); return o; }
let saveT = 0;
function saveLocal() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const snap = { settings: S.settings, tasks: S.tasks, days: S.days, academic: S.academic, tomb: S.tomb, kk: S.kk, pending: S.pending };
    IDB.put("kv", "state", snap).then(ok => { if (!ok) LS.set("aerowyn.masa.v2", snap); });
  }, 300);
}
function saveCache() { saveLocal(); }
function changed() { saveLocal(); Sync.schedule(); }

function putTask(tk) { S.tasks[tk.id] = stamp(tk); delete S.tomb["tasks/" + tk.id]; changed(); render(); }
function delTask(id) { delete S.tasks[id]; S.tomb["tasks/" + id] = Date.now(); changed(); render(); }
function putDay(k, d, quiet) { S.days[k] = stamp(d); delete S.tomb["days/" + k]; changed(); if (!quiet) render(); return Promise.resolve(); }
function putSettings(s) { S.settings = stamp(s); changed(); render(); }
function editSettings(fn) { const s = clone(Object.assign({}, cfg(), S.settings || {})); fn(s); putSettings(s); }
function putAc(w) { S.academic[w.id] = stamp(w); delete S.tomb["academic/" + w.id]; changed(); render(); }
function delAc(id) { delete S.academic[id]; S.tomb["academic/" + id] = Date.now(); changed(); render(); }

async function loadLocal() {
  await IDB.open();
  let snap = await IDB.get("kv", "state");
  if (!snap) snap = LS.get("aerowyn.masa.v2", null);
  if (snap) {
    S.settings = snap.settings || null; S.tasks = snap.tasks || {}; S.days = snap.days || {}; S.academic = snap.academic || {};
    S.tomb = snap.tomb || {}; S.kk = snap.kk || null; S.pending = snap.pending || [];
  }
  /* Kelime Kutusu aynı adreste (nisauzc.github.io) kullanıldıysa ilerlemesi buradadır */
  if (!S.kk) {
    try {
      const raw = localStorage.getItem(KK_KEY);
      if (raw) { const data = JSON.parse(raw); S.kk = { _t: data && data.prog && Object.keys(data.prog).length ? Date.now() : 1, data }; saveLocal(); }
    } catch (e) {}
  }
}

/* Kelime Kutusu iframe'i localStorage'a yazınca burada yakalanır */
window.addEventListener("storage", e => {
  if (e.key !== KK_KEY || !e.newValue) return;
  try { const data = JSON.parse(e.newValue); const weak = !S.kk && !(data.prog && Object.keys(data.prog).length); S.kk = { _t: weak ? 1 : Date.now(), data }; changed(); } catch (x) {}
});
function kkApplyLocal() {
  if (!S.kk || !S.kk.data) return;
  try { localStorage.setItem(KK_KEY, JSON.stringify(S.kk.data)); } catch (e) {}
  const f = document.getElementById("kkFrame");
  if (f && f.contentWindow) f.contentWindow.postMessage({ type: "kk-reload" }, location.origin);
}

/* ---------- metin <-> base64 ---------- */
function b64FromBytes(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function b64FromText(str) { return b64FromBytes(new TextEncoder().encode(str)); }
function textFromB64(b) { const bin = atob(b.replace(/\s/g, "")); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
function blobToB64(blob) { return blob.arrayBuffer().then(buf => b64FromBytes(new Uint8Array(buf))); }

/* ============ GitHub eşitleme ============ */
const Sync = {
  cfg: LS.get("masa.sync", null),   /* {owner, repo, token} */
  state: "off",                      /* off | busy | ok | offline | error | auth */
  last: LS.get("masa.syncLast", 0),
  busy: false, again: false, timer: 0, ready: false,
  file: "data.json",
  on() { return !!(this.cfg && this.cfg.token && this.cfg.owner && this.cfg.repo); },
  set(st) { this.state = st; note(syncLabel(), st === "error" || st === "auth"); if (S.view === "settings") render(); },
  api(path, opt) {
    opt = opt || {};
    const h = { Authorization: "Bearer " + this.cfg.token, Accept: opt.accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (opt.body) h["Content-Type"] = "application/json";
    return fetch("https://api.github.com/repos/" + encodeURIComponent(this.cfg.owner) + "/" + encodeURIComponent(this.cfg.repo) + path, { method: opt.method || "GET", headers: h, body: opt.body, cache: "no-store" });
  },
  schedule(ms) { if (!this.on()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.run(), ms == null ? 2500 : ms); },
  async pull() {
    const r = await this.api("/contents/" + this.file);
    if (r.status === 404) return { sha: null, data: null };
    if (r.status === 401 || r.status === 403) throw { auth: true };
    if (!r.ok) throw { status: r.status };
    const j = await r.json();
    let text = "";
    if (j.content && j.encoding === "base64") text = textFromB64(j.content);
    else { const raw = await this.api("/contents/" + this.file, { accept: "application/vnd.github.raw+json" }); if (!raw.ok) throw { status: raw.status }; text = await raw.text(); }
    return { sha: j.sha, data: text ? JSON.parse(text) : null };
  },
  async push(sha) {
    const out = { v: 2, savedAt: new Date().toISOString(), settings: S.settings, tasks: S.tasks, days: S.days, academic: S.academic, tomb: S.tomb, kk: S.kk };
    const body = { message: "eşitleme " + new Date().toISOString().slice(0, 16).replace("T", " "), content: b64FromText(JSON.stringify(out)) };
    if (sha) body.sha = sha;
    const r = await this.api("/contents/" + this.file, { method: "PUT", body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) return false;
    if (r.status === 401 || r.status === 403) throw { auth: true };
    if (!r.ok) throw { status: r.status };
    return true;
  },
  /* uzaktaki veriyi yerelle birleştir: her kayıtta daha yeni olan (_t) kazanır */
  merge(R) {
    let remoteWon = false, localNewer = false, kkChanged = false;
    const rt = R.tomb || {};
    COLLS.forEach(c => {
      const L = S[c], RR = R[c] || {};
      const keys = new Set(Object.keys(L).concat(Object.keys(RR)));
      Object.keys(rt).concat(Object.keys(S.tomb)).forEach(p => { if (p.startsWith(c + "/")) keys.add(p.slice(c.length + 1)); });
      keys.forEach(k => {
        const p = c + "/" + k, l = L[k], r = RR[k], tl = S.tomb[p] || 0, tr = rt[p] || 0, del = Math.max(tl, tr);
        const lt = l ? (l._t || 0) : -1, rtt = r ? (r._t || 0) : -1;
        const best = lt >= rtt ? l : r, bt = Math.max(lt, rtt);
        if (best && bt > del) {
          if (best !== l) { L[k] = r; remoteWon = true; }
          else if (lt > rtt) localNewer = true;
          delete S.tomb[p];
        } else {
          if (l) { delete L[k]; remoteWon = true; }
          if (del) S.tomb[p] = del;
          if (tl > tr || r) localNewer = true;
        }
      });
    });
    const ls = S.settings ? (S.settings._t || 0) : -1, rs = R.settings ? (R.settings._t || 0) : -1;
    if (rs > ls) { S.settings = R.settings; remoteWon = true; } else if (ls > rs) localNewer = true;
    const lk = S.kk ? (S.kk._t || 0) : -1, rk = R.kk ? (R.kk._t || 0) : -1;
    if (rk > lk) { S.kk = R.kk; remoteWon = true; kkChanged = true; } else if (lk > rk) localNewer = true;
    /* 120 günden eski silme kayıtlarını bırak */
    const cut = Date.now() - 120 * 864e5;
    Object.keys(S.tomb).forEach(p => { if (S.tomb[p] < cut) delete S.tomb[p]; });
    return { remoteWon, localNewer, kkChanged };
  },
  async run() {
    if (!this.on()) { this.set("off"); return; }
    if (this.busy) { this.again = true; return; }
    if (!navigator.onLine) { this.set("offline"); return; }
    this.busy = true; this.set("busy");
    try {
      for (let i = 0; i < 4; i++) {
        const { sha, data } = await this.pull();
        let res = { remoteWon: false, localNewer: true, kkChanged: false };
        if (data) res = this.merge(data);
        if (res.remoteWon) { saveLocal(); render(); }
        if (res.kkChanged) kkApplyLocal();
        if (!res.localNewer) break;
        if (await this.push(sha)) break;
      }
      await this.pushPhotos();
      this.last = Date.now(); LS.set("masa.syncLast", this.last);
      this.set("ok");
    } catch (e) {
      console.warn("sync", e);
      this.set(e && e.auth ? "auth" : navigator.onLine ? "error" : "offline");
    }
    this.busy = false; this.ready = true;
    if (this.again) { this.again = false; this.schedule(800); }
  },
  async pushPhotos() {
    while (S.pending.length) {
      const id = S.pending[0];
      const blob = await IDB.get("photos", id);
      if (blob) {
        const r = await this.api("/contents/photos/" + id, { method: "PUT", body: JSON.stringify({ message: "fotoğraf " + id, content: await blobToB64(blob) }) });
        if (!r.ok && r.status !== 422) throw { status: r.status };
      }
      S.pending.shift(); saveLocal();
    }
  },
  async test(c) {
    const r = await fetch("https://api.github.com/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo), { headers: { Authorization: "Bearer " + c.token, Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (r.status === 404) return "notfound";
    if (r.status === 401) return "badtoken";
    if (!r.ok) return "error";
    const j = await r.json();
    if (j.permissions && !j.permissions.push) return "readonly";
    return "ok";
  }
};
window.addEventListener("online", () => Sync.schedule(500));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") Sync.schedule(300); });
setInterval(() => { if (document.visibilityState === "visible") Sync.schedule(0); }, 90000);

function syncLabel() {
  if (!Sync.on()) return t("syncLocal");
  if (Sync.state === "busy") return t("syncBusy");
  if (Sync.state === "offline") return t("syncOffline");
  if (Sync.state === "auth") return t("syncAuth");
  if (Sync.state === "error") return t("syncError");
  return Sync.last ? t("syncOk").replace("{t}", hhmm(Sync.last)) : t("syncConnecting");
}

/* ============ fotoğraflar ============ */
async function uploadPhoto(file) {
  let blob = file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    blob = await new Promise(res => c.toBlob(res, "image/jpeg", 0.84)) || file;
    URL.revokeObjectURL(url);
  } catch (e) { blob = file; }
  const id = uid() + ".jpg";
  await IDB.put("photos", id, blob);
  S.pending.push(id); saveLocal(); Sync.schedule();
  return id;
}
const photoURLs = {};
async function photoURL(id) {
  if (photoURLs[id]) return photoURLs[id];
  let blob = await IDB.get("photos", id);
  if (!blob && Sync.on()) {
    try { const r = await Sync.api("/contents/photos/" + encodeURIComponent(id), { accept: "application/vnd.github.raw+json" }); if (r.ok) { blob = await r.blob(); IDB.put("photos", id, blob); } } catch (e) {}
  }
  if (!blob) return "";
  return (photoURLs[id] = URL.createObjectURL(blob));
}
function photoTag(id, cls) { return '<img loading="lazy" alt="" data-ph="' + esc(id) + '"' + (cls ? ' class="' + cls + '"' : "") + ">"; }
function hydratePhotos() {
  $$("img[data-ph]:not([src])").forEach(img => {
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    photoURL(img.dataset.ph).then(u => { if (u) { img.src = u; const a = img.closest("a[data-phlink]"); if (a) a.href = u; } else img.classList.add("missing"); });
  });
}

/* ============ dosya indirme ============ */
async function saveFile(filename, data) {
  try {
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) { toast(t("saveFailed")); return false; }
}

/* yedekten içe aktarma: kayıtları birleştirir, hiçbir şeyi silmez */
function importBackup(obj) {
  const now = Date.now();
  let n = 0;
  COLLS.forEach(c => { Object.entries(obj[c] || {}).forEach(([k, v]) => { if (!v) return; const cur = S[c][k]; if (!cur || (v._t || 0) >= (cur._t || 0)) { S[c][k] = Object.assign({}, v, { _t: v._t || now }); n++; } }); });
  if (obj.settings && (!S.settings || (obj.settings._t || now) >= (S.settings._t || 0))) S.settings = Object.assign({}, obj.settings, { _t: obj.settings._t || now });
  if (obj.kk && (!S.kk || (obj.kk._t || 0) > (S.kk._t || 0))) { S.kk = obj.kk; kkApplyLocal(); }
  changed(); render();
  return n;
}
