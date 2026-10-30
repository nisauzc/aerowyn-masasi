/* Arayüz: görünümler, deste ekleme, çalışma oturumu */
(function (w, d) {
  "use strict";
  var S = w.SRS, St = w.Study, Store = w.Store, CSV = w.CSV;
  var $ = function (s) { return d.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  var UI = {};
  var view = "study";
  var sess = null;
  var draft = { type: "en-tr", cards: [] };
  var openDeckId = null;
  var shownWords = [];
  var trackRange = "week";

  /* İlerlemeyi yaz; kelime ilk kez tekrar havuzuna girdiyse günlüğe işle */
  function commit(cardId, next) {
    var before = Store.prog(cardId);
    if (!(before && before.grad) && S.isLearned(next)) {
      next.grad = true;
      Store.logLearned();
    }
    Store.setProg(cardId, next);
  }

  /* ---------------- bildirim ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  UI.toast = toast;

  /* ---------------- tema ---------------- */
  function applyTheme() {
    var set = w.__embedTheme !== undefined ? w.__embedTheme : Store.state.settings.theme;
    var dark = set === "dark" || (set == null &&
      w.matchMedia && w.matchMedia("(prefers-color-scheme: dark)").matches);
    d.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    $("#themeIcon").innerHTML = dark ? "&#9788;" : "&#9789;";
  }
  UI.applyTheme = applyTheme;

  /* ---------------- görünüm değiştirme ---------------- */
  function show(name) {
    view = name;
    ["study", "decks", "stats", "settings"].forEach(function (v) {
      $("#view-" + v).hidden = v !== name;
    });
    d.querySelectorAll(".tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === name);
    });
    render();
    w.scrollTo(0, 0);
  }
  UI.show = show;

  /* ---------------- çizim ---------------- */
  function render() {
    if (view === "study") renderStudy();
    if (view === "decks") renderDecks();
    if (view === "stats") renderStats();
    if (view === "settings") renderSettings();
  }
  UI.render = render;

  function typeLabel(t) {
    return t === "ja-tr" ? "Japonca → Türkçe" : t === "ja-en" ? "Japonca → İngilizce" : "İngilizce → Türkçe";
  }

  /* Çalış ekranındaki mod: yeni öğren / tekrar / cümleler */
  var mode = "learn";
  var scope = "";                                  /* "" = tüm bölümler, yoksa deckId + SEP + grup */
  var SEP = "\u0000";

  function scopeOpts() {
    if (!scope) return {};
    var parts = scope.split(SEP);
    return { deckId: parts[0], group: parts[1] || "" };
  }

  function setMode(m) {
    mode = m;
    d.querySelectorAll("#modePicker button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.mode === m ? "true" : "false");
    });
    render();
  }
  UI.setMode = setMode;
  UI.setScope = function (v) { scope = v; render(); };
  UI.setReviseSize = function (v) {
    Store.state.settings.reviseSize = +v || 0;
    Store.save(); render();
  };

  /* Seçili destelerin bölümlerini açılır listeye yazar */
  function fillGroupSelect(decks) {
    var sel = $("#groupSel");
    if (!sel) return;
    var many = decks.length > 1;
    var html = '<option value="">Hepsi</option>';
    var found = false, scopeVar = false;
    decks.forEach(function (dk) {
      Store.groups(dk.id).forEach(function (g) {
        if (!g.name) return;
        found = true;
        var val = dk.id + SEP + g.name;
        if (val === scope) scopeVar = true;
        html += '<option value="' + esc(val) + '"' + (val === scope ? " selected" : "") + ">" +
          esc((many ? dk.name + " · " : "") + g.name) + " (" + g.total + ")</option>";
      });
    });
    sel.innerHTML = html;
    /* seçili bölüm artık listede yoksa (deste bırakıldı ya da silindi) seçim sıfırlanır,
       yoksa ekranda "Hepsi" yazarken arkada eski bölüm çalışılır */
    if (!found || !scopeVar) scope = "";
    sel.value = scope;
    $("#groupWrap").hidden = !found;
  }

  function renderStudy() {
    var st = Store.state;
    var decks = Store.selectedDecks();
    var c = Store.counts(decks);
    var all = Store.counts(st.decks);

    $("#streakNum").textContent = st.streak.count;
    $("#cntNew").textContent = Math.max(0, Math.min(c.nw, (st.settings.newPerDay || 10) + (st.daily.extra || 0) - st.daily.newDone));
    $("#cntDue").textContent = c.due;
    $("#cntLearned").textContent = all.learned + all.marked;

    var picker = $("#deckPicker");
    if (!st.decks.length) {
      picker.innerHTML = '<div class="empty"><b>Henüz deste yok</b>CSV yükleyerek ilk desteni ekle.</div>';
      if ($("#moreBtn")) $("#moreBtn").hidden = true;
      $("#hello").textContent = "Hoş geldin";
      $("#todaySub").textContent = "Önce bir deste ekle, sonra başlayalım.";
      $("#startBtn").disabled = true;
      $("#startHint").textContent = "";
      $("#scopeRow").hidden = true;
      return;
    }

    picker.innerHTML = Store.collections().map(function (g) {
      var hepsi = g.decks.every(function (dk) { return st.settings.selected.indexOf(dk.id) >= 0; });
      var baslik = g.name
        ? '<button type="button" class="coll-head' + (hepsi ? " on" : "") + '" data-coll="' + esc(g.name) + '">' +
          '<span class="nm">' + esc(g.name) + "</span>" +
          '<span class="badge">' + g.decks.length + " deste</span></button>"
        : '<p class="coll-head plain">Tek başına desteler</p>';
      return '<div class="coll">' + baslik + g.decks.map(function (dk) {
        var on = st.settings.selected.indexOf(dk.id) >= 0;
        var dc = Store.counts([dk]);
        return '<button type="button" class="pick' + (on ? " on" : "") + '" data-deck="' + esc(dk.id) + '">' +
          '<span class="box">' + (on ? "&#10003;" : "") + "</span>" +
          '<span class="nm">' + esc(dk.name) + "</span>" +
          '<span class="badge">' + dc.due + " tekrar · " + dc.nw + " yeni</span></button>";
      }).join("") + "</div>";
    }).join("");

    $("#scopeRow").hidden = mode === "learn";
    fillGroupSelect(decks);
    if ($("#reviseSize")) {
      $("#reviseSize").value = String(st.settings.reviseSize || 0);
      $("#sizeWrap").hidden = mode !== "revise";
    }

    if ($("#moreBtn")) $("#moreBtn").hidden = mode !== "learn";
    if (mode === "revise") return paintRevise(decks);
    if (mode === "sentence") return paintSentence(decks);

    var todo = c.due + Math.min(c.nw, Math.max(0, (st.settings.newPerDay || 10) + (st.daily.extra || 0) - st.daily.newDone));
    $("#hello").textContent = todo ? "Bugün " + todo + " kelime seni bekliyor" : "Bugünlük bitti";
    $("#todaySub").textContent = todo
      ? "Hazırsan başlayalım."
      : "Aşağıdan 10 kelime daha açabilir ya da yarın devam edebilirsin.";
    $("#startBtn").textContent = "Çalışmaya başla";
    $("#startBtn").disabled = todo === 0;
    $("#startHint").textContent = todo === 0 && c.nw > 0
      ? "Bu destede öğrenilmemiş " + c.nw + " kelime var, günlük sınır dolduğu için bekliyor."
      : "";
    var newLeft = Math.max(0, (st.settings.newPerDay || 10) + (st.daily.extra || 0) - st.daily.newDone);
    var more = $("#moreBtn");
    if (more) {
      more.hidden = c.nw <= newLeft;
      more.textContent = "+" + Math.min(10, c.nw - newLeft) + " yeni kelime daha";
    }
  }

  function paintRevise(decks) {
    var st = Store.state;
    var o = scopeOpts();
    o.includeKnown = !!st.settings.reviseKnown;
    var pool = St.buildRevise(decks, st.prog, o);
    var size = st.settings.reviseSize || 0;
    var n = size > 0 ? Math.min(size, pool.length) : pool.length;

    $("#hello").textContent = pool.length
      ? "Şimdiye kadar " + pool.length + " kelime çalıştın"
      : "Burada tekrar edecek kelime yok";
    $("#todaySub").textContent = pool.length
      ? "Yeni kelime açılmaz, bildiklerin baştan sorulur."
      : "Önce biraz yeni kelime çalış, tekrar burada birikir.";
    $("#startBtn").textContent = n ? n + " kelimeyi tekrar et" : "Tekrar et";
    $("#startBtn").disabled = !pool.length;
    $("#startHint").textContent = pool.length && !st.settings.reviseKnown
      ? "\"Biliyorum\" dediğin kelimeler Ayarlar'dan açılırsa tekrara katılır."
      : "";
  }

  function paintSentence(decks) {
    var pool = St.buildSentences(decks, scopeOpts());
    $("#hello").textContent = pool.length
      ? pool.length + " cümle hazır"
      : "Bu seçimde cümle yok";
    $("#todaySub").textContent = pool.length
      ? "Cümleyi oku, Türkçe karşılığını seç."
      : "Cümleler kelime listesinin 5. ve 6. sütunundan gelir.";
    $("#startBtn").textContent = "Cümlelerle çalış";
    $("#startBtn").disabled = pool.length < 2;
    $("#startHint").textContent = pool.length === 1
      ? "Soru kurmak için en az iki cümle gerekiyor."
      : "";
  }

  function renderDecks() {
    var st = Store.state;
    var list = $("#deckList");
    if (!st.decks.length) {
      list.innerHTML = '<div class="empty"><b>Deste yok</b>Yukarıdaki düğmeden CSV yükle.</div>';
      return;
    }
    list.innerHTML = Store.collections().map(function (g) {
      var tumKelime = 0, tumBilinen = 0;
      g.decks.forEach(function (dk) {
        var c = Store.counts([dk]);
        tumKelime += c.total; tumBilinen += c.learned + c.marked;
      });
      var ustPct = tumKelime ? Math.round((tumBilinen / tumKelime) * 100) : 0;
      var baslik = g.name
        ? '<div class="coll-title"><b>' + esc(g.name) + "</b>" +
          "<small>" + g.decks.length + " deste · " + tumKelime + " kelime · %" + ustPct + "</small></div>"
        : '<div class="coll-title"><b>Tek başına desteler</b></div>';

      return '<section class="coll-block">' + baslik + g.decks.map(function (dk) {
        var c = Store.counts([dk]);
        var pct = c.total ? Math.round(((c.learned + c.marked) / c.total) * 100) : 0;
        var ja = St.isJa(dk);
        return '<div class="card deck-card" data-open="' + esc(dk.id) + '">' +
          '<span class="face' + (ja ? " ja" : "") + '">' + (ja ? "JA" : "EN") + "</span>" +
          '<span class="meta"><b>' + esc(dk.name) + "</b>" +
          "<small>" + c.total + " kelime · " + typeLabel(dk.type) + "</small>" +
          '<span class="mini-bar"><i style="width:' + pct + '%"></i></span></span>' +
          '<span class="badge">' + pct + "%</span></div>";
      }).join("") + "</section>";
    }).join("");
  }

  function renderStats() {
    var st = Store.state;
    var c = Store.counts(st.decks);
    var bil = c.learned + c.marked;
    var pct = c.total ? Math.round((bil / c.total) * 100) : 0;
    $("#ringPct").textContent = pct + "%";
    $("#ringFg").style.strokeDashoffset = String(327 - (327 * pct) / 100);
    $("#statLegend").innerHTML =
      '<span><i style="background:var(--mint)"></i>' + c.learned + " öğrenildi</span>" +
      '<span><i style="background:var(--marked)"></i>' + c.marked + " zaten biliniyordu</span>" +
      '<span><i style="background:var(--accent-2)"></i>' + c.learning + " çalışılıyor</span>" +
      '<span><i style="background:var(--line)"></i>' + c.nw + " yeni</span>";

    renderTrack();

    var f = Store.forecast(7);
    var max = Math.max.apply(null, f.concat([1]));
    var names = ["Bugün", "Yarın"];
    $("#forecast").innerHTML = f.map(function (n, i) {
      var dt = new Date(Date.now() + i * S.DAY);
      var lbl = i < 2 ? names[i] : ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][dt.getDay()];
      return '<div class="fc"><b>' + (n || "") + '</b><i style="height:' +
        Math.round((n / max) * 100) + '%"></i><small>' + lbl + "</small></div>";
    }).join("");

    $("#statDecks").innerHTML = st.decks.length ? st.decks.map(function (dk) {
      var dc = Store.counts([dk]);
      var p = dc.total ? Math.round(((dc.learned + dc.marked) / dc.total) * 100) : 0;
      return '<div class="sd"><span class="nm">' + esc(dk.name) + "</span>" +
        '<span class="mini-bar" style="flex:0 0 90px"><i style="width:' + p + '%"></i></span>' +
        "<b>" + p + "%</b></div>";
    }).join("") : '<p class="hint">Deste yok.</p>';
  }


  /* ---- haftalık / aylık takip çizelgesi ---- */
  var GUN = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  var AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  function setRange(r) { trackRange = r; renderTrack(); }
  UI.setRange = setRange;

  function renderTrack() {
    var week = trackRange === "week";
    var rows = Store.historyRange(week ? 7 : 30);
    var max = rows.reduce(function (m, r) { return Math.max(m, r.learned); }, 0);
    var scale = Math.max(max, 1);

    var sumL = 0, sumA = 0, gun = 0;
    rows.forEach(function (r) {
      sumL += r.learned; sumA += r.answered;
      if (r.answered > 0) gun++;
    });
    $("#tkLearned").textContent = sumL;
    $("#tkAnswered").textContent = sumA;
    $("#tkDays").textContent = gun;

    d.querySelectorAll("[data-range]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.range === trackRange));
    });

    $("#trackBars").className = "track-bars" + (week ? "" : " dense");
    $("#trackBars").innerHTML = rows.map(function (r, i) {
      var h = Math.round((r.learned / scale) * 100);
      var son = i === rows.length - 1;
      // ay görünümünde bugünden geriye yedişer gün etiketle, böylece çakışma olmaz
      var etiket = week
        ? GUN[r.date.getDay()]
        : ((rows.length - 1 - i) % 7 === 0 ? String(r.date.getDate()) : "");
      return '<button type="button" class="tb' + (son ? " today" : "") +
        (r.learned ? "" : " zero") + '" data-i="' + i + '" ' +
        'aria-label="' + esc(gunAdi(r.date)) + ": " + r.learned + ' kelime">' +
        '<span class="plot"><span class="col" style="height:' +
        (r.learned ? Math.max(h, 4) : 0) + '%">' +
        (week && r.learned ? "<em>" + r.learned + "</em>" : "") +
        '<i></i></span></span>' +
        "<small>" + esc(etiket) + "</small></button>";
    }).join("");

    var enIyi = rows.reduce(function (a, b) { return b.learned > a.learned ? b : a; }, rows[0]);
    $("#trackTip").textContent = sumL
      ? (week ? "Bu hafta" : "Son 30 gün") + " toplam " + sumL + " kelime. En iyi gün: " +
        gunAdi(enIyi.date) + ", " + enIyi.learned + " kelime."
      : "Henüz kayıt yok. Bir oturum bitirince buraya düşmeye başlar.";
    trackSel = -1;
  }

  var trackSel = -1;
  function gunAdi(dt) {
    return dt.getDate() + " " + AY[dt.getMonth()] + " " + GUN[dt.getDay()];
  }

  /* bir sütuna dokununca o günün sayısı */
  function pickBar(i) {
    var rows = Store.historyRange(trackRange === "week" ? 7 : 30);
    var r = rows[i];
    if (!r) return;
    d.querySelectorAll(".tb").forEach(function (b, n) { b.classList.toggle("on", n === i); });
    $("#trackTip").textContent = gunAdi(r.date) + ": " + r.learned + " kelime öğrenildi, " +
      r.answered + " soru cevaplandı.";
  }
  UI.pickBar = pickBar;

  function renderSettings() {
    var s = Store.state.settings;
    $("#setNew").value = s.newPerDay;
    $("#setSession").value = s.sessionSize;
    $("#setTyping").checked = !!s.typing;
    $("#setSound").checked = !!s.sound;
    $("#setReviseKnown").checked = !!s.reviseKnown;
    $("#setWrongBack").checked = !!s.reviseWrongBack;
    $("#setSentenceAfter").checked = !!s.sentenceAfterGroup;
    if ($("#setAskKana")) $("#setAskKana").checked = !!s.askKana;
  }

  /* ---------------- deste ekleme ---------------- */
  function openSheet() {
    draft = { type: "en-tr", cards: [], target: "" };
    fillDeckTarget();
    fillCollList();
    $("#deckColl").value = "";
    $("#deckName").value = "";
    $("#pasteArea").value = "";
    $("#pasteArea").hidden = true;
    $("#previewBox").hidden = true;
    $("#sheetErr").hidden = true;
    $("#saveDeckBtn").disabled = true;
    $("#csvFile").value = "";
    d.querySelectorAll("#typeChips .chip").forEach(function (b) {
      b.classList.toggle("active", b.dataset.type === "en-tr");
    });
    updateCsvHelp();
    $("#sheet").hidden = false;
  }
  UI.openSheet = openSheet;

  /* Açık destenin üstüne kelime/cümle eklemek için */
  UI.openSheetFor = function (deckId) {
    openSheet();
    draft.target = deckId || "";
    if ($("#deckTarget")) $("#deckTarget").value = draft.target;
    syncTarget();
  };

  function updateCsvHelp() {
    var map = {
      "en-tr": "kelime , anlam , telaffuz , bölüm , cümle , cümlenin Türkçesi",
      "ja-tr": "japonca , türkçe anlam , okunuş , bölüm , cümle , cümlenin Türkçesi",
      "ja-en": "japonca , english meaning , okunuş , bölüm , cümle , cümlenin Türkçesi"
    };
    $("#csvCols").textContent = map[draft.type];
    $("#pasteArea").placeholder = draft.type === "en-tr"
      ? "shelf, raf, /ŞELF/, Ev ve ocak, She put the book back on the shelf., Kitabı rafa geri koydu."
      : "水, su, mizu, temel ifadeler, 水をください。, Su rica ediyorum.";
  }

  /* "Yeni deste" ya da var olan bir desteyi tazeleme */
  function fillDeckTarget() {
    var sel = $("#deckTarget");
    if (!sel) return;
    sel.innerHTML = '<option value="">Yeni deste</option>' +
      Store.state.decks.map(function (dk) {
        return '<option value="' + esc(dk.id) + '">' + esc(dk.name) + " (tazele)</option>";
      }).join("");
    sel.value = draft.target || "";
    $("#deckTargetWrap").hidden = !Store.state.decks.length;
    syncTarget();
  }
  UI.fillDeckTarget = fillDeckTarget;

  function syncTarget() {
    var tgt = draft.target;
    $("#nameWrap").hidden = !!tgt;
    $("#typeWrap").hidden = !!tgt;
    $("#collWrap").hidden = !!tgt;
    $("#saveDeckBtn").textContent = tgt ? "Desteyi tazele" : "Desteyi kaydet";
  }

  /* Var olan grup adları öneri olarak çıksın */
  function fillCollList() {
    var dl = $("#collList");
    if (!dl) return;
    dl.innerHTML = Store.collectionNames().map(function (n) {
      return '<option value="' + esc(n) + '"></option>';
    }).join("");
  }

  UI.setTarget = function (v) {
    draft.target = v || "";
    syncTarget();
  };
  UI.updateCsvHelp = updateCsvHelp;

  function setType(t) {
    draft.type = t;
    updateCsvHelp();
  }
  UI.setType = setType;

  function takeText(text, suggestName) {
    var res;
    try { res = CSV.toCards(text); }
    catch (e) { return fail("Dosya okunamadı."); }
    if (!res.cards.length) return fail("Hiç kelime bulunamadı. En az iki sütun gerekiyor: kelime ve anlam.");
    draft.cards = res.cards;
    $("#sheetErr").hidden = true;
    $("#saveDeckBtn").disabled = false;
    if (suggestName && !$("#deckName").value.trim()) $("#deckName").value = suggestName;

    var cumleli = res.cards.filter(function (c) { return c.ex && c.exTr; }).length;
    var bolum = {};
    res.cards.forEach(function (c) { if (c.group) bolum[c.group] = 1; });
    var bolumSay = Object.keys(bolum).length;

    $("#previewCount").textContent = res.cards.length + " kelime okundu" +
      (bolumSay ? " · " + bolumSay + " bölüm" : "") +
      (cumleli ? " · " + cumleli + " cümle" : "") +
      (res.skipped ? " · " + res.skipped + " satır atlandı" : "");
    $("#previewTable").innerHTML = res.cards.slice(0, 5).map(function (c) {
      return "<tr><td>" + esc(c.term) + "</td><td>" + esc(c.meaning) + "</td><td>" + esc(c.reading) +
        "</td><td>" + esc(c.group) + "</td><td>" + esc(c.ex) + "</td></tr>";
    }).join("");
    $("#previewBox").hidden = false;

    function fail(msg) {
      $("#sheetErr").textContent = msg; $("#sheetErr").hidden = false;
      $("#saveDeckBtn").disabled = true; $("#previewBox").hidden = true;
    }
  }
  UI.takeText = takeText;

  function saveDeck() {
    if (!draft.cards.length) return;

    if (draft.target) {
      var r = Store.mergeIntoDeck(draft.target, draft.cards);
      $("#sheet").hidden = true;
      if (!r) { toast("Deste bulunamadı"); return; }
      toast(r.added + " yeni kelime · " + r.sentences + " cümle eklendi");
      show("decks");
      return;
    }

    var name = $("#deckName").value.trim() || "Yeni deste";
    var coll = $("#deckColl").value.trim();
    Store.addDeck(name, draft.type, draft.cards, coll);
    $("#sheet").hidden = true;
    toast(draft.cards.length + " kelime eklendi" + (coll ? " · " + coll : ""));
    show("decks");
  }
  UI.saveDeck = saveDeck;

  /* ---------------- deste detayı ---------------- */
  function openDeck(id) {
    var dk = Store.deck(id);
    if (!dk) return;
    openDeckId = id;
    $("#dsTitle").textContent = dk.name;
    $("#dsColl").textContent = dk.collection ? dk.collection : "grupsuz";
    $("#dsSearch").value = "";
    drawGroups();
    drawWords("");
    $("#deckSheet").hidden = false;
  }
  UI.openDeck = openDeck;
  UI.currentDeck = function () { return openDeckId; };

  /* Deste içindeki bölümler: her biri ayrı çalışılabilir, tekrar edilebilir */
  function drawGroups() {
    var box = $("#dsGroups");
    if (!box) return;
    var gs = Store.groups(openDeckId).filter(function (g) { return g.name; });
    $("#dsGroupsHead").hidden = !gs.length;
    if (!gs.length) { box.innerHTML = ""; return; }

    box.innerHTML = gs.map(function (g) {
      var bilinen = g.learned + g.marked;
      var pct = g.total ? Math.round((bilinen / g.total) * 100) : 0;
      return '<div class="gr">' +
        '<div class="gr-top"><b>' + esc(g.name) + "</b>" +
        "<small>" + bilinen + "/" + g.total + "</small></div>" +
        '<span class="mini-bar"><i style="width:' + pct + '%"></i></span>' +
        '<div class="gr-btns">' +
        '<button type="button" class="pill-btn sm" data-g-act="learn" data-g="' + esc(g.name) + '"' +
        (g.nw ? "" : " disabled") + ">Çalış" + (g.nw ? " (" + g.nw + ")" : "") + "</button>" +
        '<button type="button" class="pill-btn sm" data-g-act="revise" data-g="' + esc(g.name) + '"' +
        (g.studied ? "" : " disabled") + ">Tekrar" + (g.studied ? " (" + g.studied + ")" : "") + "</button>" +
        '<button type="button" class="pill-btn sm" data-g-act="sentence" data-g="' + esc(g.name) + '"' +
        (g.withEx > 1 ? "" : " disabled") + ">Cümleler" + (g.withEx > 1 ? " (" + g.withEx + ")" : "") + "</button>" +
        "</div></div>";
    }).join("");
  }
  UI.drawGroups = drawGroups;

  UI.groupAction = function (act, group) {
    startSession({ mode: act, deckId: openDeckId, group: group });
  };

  function drawWords(q) {
    var dk = Store.deck(openDeckId);
    if (!dk) return;
    q = St.normalize(q);
    var ja = St.isJa(dk);
    var rows = dk.cards.filter(function (c) {
      if (!q) return true;
      return St.normalize(c.term).indexOf(q) >= 0 ||
        St.normalize(c.meaning).indexOf(q) >= 0 ||
        St.normalize(c.reading).indexOf(q) >= 0 ||
        St.normalize(c.group).indexOf(q) >= 0;
    });
    shownWords = rows;
    var isaretli = rows.filter(function (c) { return S.isMarked(Store.prog(c.id)); }).length;
    $("#dsHint").textContent = rows.length === dk.cards.length
      ? "Bildiğin kelimeye dokun, bir daha karşına çıkmasın."
      : rows.length + " kelime görünüyor, " + isaretli + " tanesi işaretli.";
    $("#dsKnowAll").hidden = rows.length === 0;
    $("#dsKnowAll").textContent = rows.length === dk.cards.length
      ? "Tümünü bildim say" : "Görünenleri bildim say";

    $("#dsWords").innerHTML = rows.slice(0, 400).map(function (c) {
      var p = Store.prog(c.id);
      var cls = S.isMarked(p) ? "marked" : S.isLearned(p) ? "known" : (p ? "learning" : "");
      return '<button type="button" class="dw ' + cls + '" data-card="' + esc(c.id) + '" ' +
        'aria-pressed="' + (S.isMarked(p) ? "true" : "false") + '">' +
        '<span class="s"></span>' +
        '<span class="t' + (ja ? " jp" : "") + '">' + esc(c.term) + "</span>" +
        '<span class="m">' + esc(c.meaning) + (c.reading ? " · " + esc(c.reading) : "") + "</span>" +
        '<span class="tick">' + (S.isMarked(p) ? "&#10003;" : "") + "</span></button>";
    }).join("") || '<p class="hint">Eşleşen kelime yok.</p>';
    if (rows.length > 400) {
      $("#dsWords").insertAdjacentHTML("beforeend",
        '<p class="hint">İlk 400 kelime gösteriliyor, aramayı daraltabilirsin.</p>');
    }
  }
  UI.drawWords = drawWords;

  /* bir kelimeyi bildim / bilmiyorum arasında çevirir */
  function toggleKnown(cardId) {
    var p = Store.prog(cardId);
    if (S.isMarked(p)) Store.unmarkKnown(cardId);
    else Store.markKnown(cardId);
    drawWords($("#dsSearch").value);
    render();
  }
  UI.toggleKnown = toggleKnown;

  /* listede görünen bütün kelimeleri bildim say */
  function knowAllShown() {
    var n = 0;
    shownWords.forEach(function (c) {
      if (S.isMarked(Store.prog(c.id))) return;
      Store.markKnown(c.id);
      n++;
    });
    drawWords($("#dsSearch").value);
    render();
    toast(n ? n + " kelime bildim olarak işaretlendi" : "Hepsi zaten işaretliydi");
  }
  UI.knowAllShown = knowAllShown;

  /* ---------------- çalışma oturumu ---------------- */
  /* opts: { mode, deckId, group } — boş bırakılırsa ekrandaki mod ve bölüm seçimi geçerli */
  function startSession(opts) {
    opts = opts || {};
    var m = opts.mode || mode;
    var st = Store.state;
    var o = opts.deckId ? { deckId: opts.deckId, group: opts.group } : scopeOpts();
    var decks = o.deckId ? [Store.deck(o.deckId)].filter(Boolean) : Store.selectedDecks();
    if (!decks.length) { toast("Önce bir deste seç"); return; }

    var base = { idx: 0, right: 0, wrong: 0, newSeen: 0, backToStudy: 0, steps: {}, again: {}, groups: {}, mode: m, opts: { mode: m, deckId: o.deckId, group: o.group } };
    var q;

    if (m === "revise") {
      q = St.buildRevise(decks, st.prog, {
        deckId: o.deckId, group: o.group,
        size: st.settings.reviseSize || 0,
        includeKnown: !!st.settings.reviseKnown
      });
      if (!q.length) { toast("Tekrar edilecek kelime yok"); return; }
      sess = Object.assign(base, { queue: q, total: q.length });
    } else if (m === "sentence") {
      var pool = St.buildSentences(decks, { deckId: o.deckId, group: o.group });
      if (pool.length < 2) { toast("Bu seçimde yeterli cümle yok"); return; }
      sess = Object.assign(base, { queue: pool.slice(), pool: pool, total: pool.length });
    } else {
      q = St.buildQueue(decks, st.prog, st.settings, st.daily, Date.now(), {
        deckId: o.deckId, group: o.group,
        ignoreDailyCap: o.group != null
      });
      if (!q.length) { toast("Şimdilik çalışacak kelime yok"); return; }
      var planned = q.reduce(function (n, it) {
        return n + St.cost(Store.prog(it.card.id), st.settings);
      }, 0);
      sess = Object.assign(base, { queue: q, total: planned });
    }

    $("#deckSheet").hidden = true;
    $("#session").hidden = false;
    d.body.style.overflow = "hidden";
    nextCard();
  }
  UI.startSession = startSession;

  /* Oturumda hangi bölümlere dokunuldu: bölüm bitince cümle turu önerebilmek için */
  function noteGroup(item) {
    if (!item.card.group) return;
    sess.groups[item.deck.id + SEP + item.card.group] = {
      deckId: item.deck.id, deckName: item.deck.name, group: item.card.group
    };
  }

  /* Oturumda bitmiş, cümlesi olan bir bölüm var mı */
  function finishedGroup() {
    if (!Store.state.settings.sentenceAfterGroup) return null;
    var keys = Object.keys(sess.groups), out = null;
    keys.forEach(function (k) {
      if (out) return;
      var info = sess.groups[k];
      var g = Store.groups(info.deckId).filter(function (x) { return x.name === info.group; })[0];
      if (g && g.nw === 0 && g.withEx >= 2) out = { info: info, n: g.withEx };
    });
    return out;
  }

  function endSession() {
    $("#session").hidden = true;
    d.body.style.overflow = "";
    sess = null;
    render();
  }
  UI.endSession = endSession;

  function bar() {
    $("#sessionBar").style.width = ((sess.idx / sess.total) * 100) + "%";
    $("#sessionCount").textContent = Math.min(sess.idx + 1, sess.total) + "/" + sess.total;
  }

  function nextCard() {
    if (!sess) return;
    if (sess.idx >= sess.queue.length) return finish();
    bar();
    var item = sess.queue[sess.idx];
    var q;

    if (sess.mode === "revise") {
      var n = sess.steps[item.card.id] || 0;
      sess.steps[item.card.id] = n + 1;
      q = St.makeReviseQuestion(item, Store.state.settings, n);
      return drawQuestion(q);
    }

    if (sess.mode === "sentence") {
      q = St.makeSentenceQuestion(item, sess.pool);
      if (!q) { sess.idx++; return nextCard(); }
      return drawQuestion(q);
    }

    q = St.makeQuestion(item, Store.state.prog, Store.state.settings);
    if (q.kind === "choice-skip") {           // yazma kapalıysa bu adımı atla
      var p = Store.prog(item.card.id) || S.fresh();
      Store.setProg(item.card.id, S.advance(p, true));
      sess.idx++; return nextCard();
    }
    noteGroup(item);
    drawQuestion(q);
  }

  function markNew(item) {
    if (!Store.prog(item.card.id)) {
      Store.state.daily.newDone++;
      sess.newSeen++;
      Store.save();
    }
  }

  function beep(ok) {
    if (!Store.state.settings.sound) return;
    try {
      var ac = beep.ctx || (beep.ctx = new (w.AudioContext || w.webkitAudioContext)());
      var o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = ok ? 660 : 200;
      g.gain.setValueAtTime(0.07, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
      o.start(); o.stop(ac.currentTime + 0.18);
    } catch (e) {}
  }

  function drawQuestion(q) {
    var st = $("#stage");
    var c = q.item.card;
    var jp = q.ja ? " jp" : "";
    var tag = sess.mode === "revise" ? "TEKRAR · " : "";

    /* cümle sorusu: cümleyi oku, Türkçe karşılığını seç */
    if (q.kind === "sentence") {
      var h = St.highlight(c.ex, c.term);
      st.innerHTML =
        '<p class="q-kind">TÜRKÇE KARŞILIĞI HANGİSİ?</p>' +
        '<div class="prompt sent-prompt"><div class="sent">' +
        esc(h.before) + (h.hit ? "<b>" + esc(h.hit) + "</b>" : "") + esc(h.after) +
        "</div>" + (c.group ? '<div class="grp">' + esc(c.group) + "</div>" : "") + "</div>" +
        '<div class="opts">' + q.options.map(function (o, i) {
          return '<button class="opt sent-opt" type="button" data-i="' + i + '">' + esc(o) + "</button>";
        }).join("") + "</div>" +
        '<div id="fb"></div>';
      st.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          var ok = q.options[+b.dataset.i] === q.answer;
          st.querySelectorAll(".opt").forEach(function (x) {
            x.disabled = true;
            if (q.options[+x.dataset.i] === q.answer) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          afterAnswer(q, ok);
        };
      });
      return;
    }

    if (q.kind === "meet") {
      st.innerHTML =
        '<p class="q-kind">YENİ KELİME</p>' +
        '<div class="prompt"><span class="new-flag">tanışma</span>' +
        '<div class="term' + jp + '">' + esc(c.term) + "</div>" +
        (c.reading ? '<div class="read">' + esc(c.reading) + "</div>" : "") +
        '<div class="mean">' + esc(c.meaning) + "</div>" +
        (c.ex && !c.exTr ? '<div class="hint">' + esc(c.ex) + "</div>" : "") +
        (c.group ? '<div class="grp">' + esc(c.group) + "</div>" : "") +
        "</div>" +
        '<div class="next-btn">' +
        '<button class="big-btn" id="goNext" type="button">Anladım, çalışalım</button>' +
        '<button class="ghost-btn" id="knowBtn" type="button">Bunu zaten biliyorum</button>' +
        "</div>";
      $("#goNext").onclick = function () {
        markNew(q.item);
        Store.logAnswer();
        commit(c.id, S.advance(Store.prog(c.id) || S.fresh(), true));
        keepLearning(q.item);
        sess.idx++; nextCard();
      };
      // "zaten biliyorum" günlük yeni kelime hakkından düşmez
      $("#knowBtn").onclick = function () { knowNow(q.item); };
      return;
    }

    if (q.kind === "choice") {
      st.innerHTML =
        '<p class="q-kind">' + tag + (q.reverse ? "HANGİSİ?" : "ANLAMI NE?") + "</p>" +
        '<div class="prompt"><div class="term' + (q.reverse ? "" : jp) + '">' + esc(q.ask) + "</div>" +
        (q.askReading ? '<div class="read">' + esc(q.askReading) + "</div>" : "") + "</div>" +
        (q.showKana ? '<div class="read jp" id="kanaPeek" hidden>' + esc(q.showKana) + "</div>" : "") +
        '<div class="opts">' + q.options.map(function (o, i) {
          return '<button class="opt' + (q.optionsAreJa ? " jp" : "") + '" type="button" data-i="' + i + '">' + esc(o) + "</button>";
        }).join("") + "</div>" +
        '<div id="fb"></div>';
      st.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          var ok = q.options[+b.dataset.i] === q.answer;
          st.querySelectorAll(".opt").forEach(function (x) {
            x.disabled = true;
            if (q.options[+x.dataset.i] === q.answer) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          if (q.showKana && $("#kanaPeek")) $("#kanaPeek").hidden = false;
          afterAnswer(q, ok);
        };
      });
      return;
    }

    if (q.kind === "type") {
      var ask = q.ja ? c.term : c.meaning;
      st.innerHTML =
        '<p class="q-kind">' + tag + q.target.label.toLocaleUpperCase("tr") + "</p>" +
        '<div class="prompt"><div class="term' + (q.ja ? jp : "") + '">' + esc(ask) + "</div>" +
        (q.ja && c.meaning !== q.target.text ? '<div class="mean">' + esc(c.meaning) + "</div>" : "") + "</div>" +
        '<div class="typing"><input type="text" id="typeIn" autocomplete="off" autocapitalize="off" ' +
        'autocorrect="off" spellcheck="false" placeholder="buraya yaz">' +
        '<button class="big-btn" id="checkBtn" type="button">Kontrol et</button></div>' +
        '<div id="fb"></div>';
      var inp = $("#typeIn");
      inp.focus();
      function check() {
        var ok = St.matches(inp.value, q.target.text);
        inp.classList.add(ok ? "right" : "wrong");
        inp.disabled = true; $("#checkBtn").hidden = true;
        afterAnswer(q, ok, q.target.text);
      }
      $("#checkBtn").onclick = check;
      inp.onkeydown = function (e) { if (e.key === "Enter") check(); };
      return;
    }

    /* tekrar kartı */
    st.innerHTML =
      '<p class="q-kind">TEKRAR</p>' +
      '<div class="prompt"><div class="term' + jp + '">' + esc(c.term) + "</div>" +
      '<div class="mean" id="rev" hidden>' + esc(c.meaning) +
      (c.reading ? ' <span class="read">' + esc(c.reading) + "</span>" : "") + "</div></div>" +
      '<div class="next-btn" id="revealWrap"><button class="big-btn" id="revealBtn" type="button">Cevabı göster</button></div>';
    $("#revealBtn").onclick = function () {
      $("#rev").hidden = false;
      var p = Store.prog(c.id);
      $("#revealWrap").outerHTML =
        '<div class="grade">' +
        '<button class="g1" data-g="1">Tekrar<small>' + S.nextLabel(p, 1) + "</small></button>" +
        '<button class="g2" data-g="2">Zor<small>' + S.nextLabel(p, 2) + "</small></button>" +
        '<button class="g3" data-g="3">İyi<small>' + S.nextLabel(p, 3) + "</small></button>" +
        '<button class="g4" data-g="4">Kolay<small>' + S.nextLabel(p, 4) + "</small></button></div>";
      st.querySelectorAll(".grade button").forEach(function (b) {
        b.onclick = function () {
          var g = +b.dataset.g;
          Store.logAnswer();
          commit(c.id, S.grade(Store.prog(c.id) || S.fresh(), g));
          if (g === 1) { sess.wrong++; requeue(q.item); } else sess.right++;
          beep(g !== 1);
          sess.idx++; nextCard();
        };
      });
      st.insertAdjacentHTML("beforeend",
        '<button class="ghost-btn wide" id="knowBtn2" type="button">Bunu biliyorum, bir daha sorma</button>');
      $("#knowBtn2").onclick = function () { knowNow(q.item); };
    };
  }

  function afterAnswer(q, ok, showAnswer) {
    beep(ok);
    if (ok) sess.right++; else sess.wrong++;
    Store.logAnswer();

    if (q.free) {
      /* tekrar ve cümle turu aralıklı tekrar takvimini ileri taşımaz */
      if (!ok) {
        var id = q.item.card.id;
        var ilk = !sess.again[id];
        if (ilk && sess.mode === "revise" && Store.state.settings.reviseWrongBack) {
          Store.dueToday(id);
          sess.backToStudy++;
        }
        /* yanlış bilinen kelime bir kez geri gelir, oturum sonsuza uzamasın */
        sess.again[id] = (sess.again[id] || 0) + 1;
        if (ilk) requeue(q.item, 4);
      }
    } else {
      markNew(q.item);
      commit(q.item.card.id, S.advance(Store.prog(q.item.card.id) || S.fresh(), ok));
      keepLearning(q.item);
    }

    var fb = $("#fb");
    fb.className = "feedback " + (ok ? "ok" : "no");
    var ipucu = q.item.card.ex && !q.item.card.exTr ? q.item.card.ex : "";
    fb.innerHTML = (ok ? "Doğru" : "Olmadı") +
      (!ok && showAnswer ? '<span class="answer">' + esc(showAnswer) + "</span>" : "") +
      (!ok && ipucu ? '<span class="answer">' + esc(ipucu) + "</span>" : "") +
      (q.kind === "sentence"
        ? '<span class="answer">' + esc(q.item.card.term) + " · " + esc(q.item.card.meaning) + "</span>"
        : "");
    var btn = d.createElement("div");
    btn.className = "next-btn";
    btn.innerHTML = '<button class="big-btn" type="button">Devam</button>';
    btn.querySelector("button").onclick = function () { sess.idx++; nextCard(); };
    btn.querySelector("button").focus();
    $("#stage").appendChild(btn);
  }

  /* oturum sırasında "bunu biliyorum": kelimeyi işaretle ve kuyruktan çıkar */
  function knowNow(item) {
    Store.markKnown(item.card.id);
    dropFromQueue(item.card.id);
    toast("Bildin olarak işaretlendi");
    sess.idx++;
    nextCard();
  }

  function dropFromQueue(cardId) {
    for (var i = sess.queue.length - 1; i > sess.idx; i--) {
      if (sess.queue[i].card.id === cardId) sess.queue.splice(i, 1);
    }
  }

  /* kartı birkaç soru sonra yeniden kuyruğa sok */
  function requeue(item, gap) {
    gap = gap || 4;
    var at = Math.min(sess.idx + 1 + gap, sess.queue.length);
    sess.queue.splice(at, 0, item);
    if (sess.queue.length > sess.total) sess.total = sess.queue.length;
  }

  /* tanıtım aşamaları bitmediyse kart aynı oturumda devam eder */
  function keepLearning(item) {
    var p = Store.prog(item.card.id);
    if (!p || p.stage >= S.STAGE.REVIEW) return;
    if (!Store.state.settings.typing && p.stage >= S.STAGE.TYPE) return;
    requeue(item, 3);
  }

  function finish() {
    Store.markStudied();
    var toplam = sess.right + sess.wrong;
    var oran = toplam ? Math.round((sess.right / toplam) * 100) : 0;
    var baslik = sess.mode === "revise" ? "Tekrar bitti"
      : sess.mode === "sentence" ? "Cümle turu bitti" : "Oturum bitti";
    var offer = sess.mode === "learn" ? finishedGroup() : null;
    var again = sess.opts;

    $("#stage").innerHTML =
      '<div class="done"><div class="em">&#9733;</div>' +
      '<div class="big">' + baslik + "</div>" +
      "<p>" + sess.right + " doğru · " + sess.wrong + " kaçtı · %" + oran + "</p>" +
      (sess.newSeen ? '<p class="hint">' + sess.newSeen + " yeni kelimeyle tanıştın.</p>" : "") +
      (sess.backToStudy ? '<p class="hint">' + sess.backToStudy + " kelime bugünkü tekrara geri alındı.</p>" : "") +
      (offer ? '<p class="hint">' + esc(offer.info.group) + " bölümünü bitirdin. Cümlelerle pekiştirelim mi?</p>" : "") +
      '<p class="hint">Seri: ' + Store.state.streak.count + " gün</p>" +
      (offer ? '<button class="big-btn" id="sentBtn" type="button">Bölüm cümleleri (' + offer.n + ")</button>" : "") +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="pill-btn" id="againBtn" type="button">Devam et</button>' +
      '<button class="big-btn" id="doneBtn" type="button" style="width:auto;padding:.7rem 1.4rem">Bitir</button>' +
      "</div></div>";
    $("#sessionBar").style.width = "100%";
    $("#doneBtn").onclick = endSession;
    $("#againBtn").onclick = function () { endSession(); startSession(again); };
    if (offer) {
      $("#sentBtn").onclick = function () {
        endSession();
        startSession({ mode: "sentence", deckId: offer.info.deckId, group: offer.info.group });
      };
    }
  }

  w.UI = UI;
})(window, document);
