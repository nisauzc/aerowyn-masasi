/* Depo: desteler, ilerleme ve ayarlar tarayıcıda saklanır */
(function (w) {
  "use strict";
  var KEY = "kelime-kutusu-v1";

  var def = {
    v: 1,
    decks: [],
    prog: {},
    settings: {
      newPerDay: 10, sessionSize: 30, typing: true, sound: true, theme: null, selected: [],
      reviseSize: 30, reviseKnown: false, reviseWrongBack: true, sentenceAfterGroup: true,
      askKana: false
    },
    daily: { date: "", newDone: 0 },
    streak: { count: 0, last: "" },
    history: {},
    seededStarter: false
  };

  var state = JSON.parse(JSON.stringify(def));

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var got = JSON.parse(raw);
        state = Object.assign(JSON.parse(JSON.stringify(def)), got);
        state.settings = Object.assign({}, def.settings, got.settings || {});
      }
    } catch (e) { /* depolama kapalı olabilir */ }
    migrate();
    rollDay();
    return state;
  }

  /* Eski kayıtlar: desteler grupsuz kurulmuştu, adından anlaşılanı yerine koy */
  function migrate() {
    var degisti = false;
    state.decks.forEach(function (dk) {
      if (typeof dk.collection === "string") return;
      dk.collection = /^howl/i.test(dk.name) ? "Howl's Moving Castle"
        : /japonca/i.test(dk.name) ? "Japonca" : "";
      degisti = true;
    });
    if (degisti) save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  function rollDay() {
    var t = today();
    if (state.daily.date !== t) { state.daily = { date: t, newDone: 0 }; save(); }
  }

  function markStudied() {
    var t = today();
    if (state.streak.last === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    state.streak.count = state.streak.last === ys ? state.streak.count + 1 : 1;
    state.streak.last = t;
    save();
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function makeCard(deckId, i, c) {
    return {
      id: deckId + ":" + i,
      term: c.term, meaning: c.meaning,
      reading: c.reading || "", group: c.group || "",
      ex: c.ex || "", exTr: c.exTr || ""
    };
  }

  function addDeck(name, type, cards, collection) {
    var id = uid();
    var deck = {
      id: id, name: name, type: type, collection: collection || "",
      created: Date.now(), seq: cards.length,
      cards: cards.map(function (c, i) { return makeCard(id, i, c); })
    };
    state.decks.push(deck);
    if (state.settings.selected.length === 0) state.settings.selected = [id];
    else state.settings.selected.push(id);
    save();
    return deck;
  }

  function deck(id) { return state.decks.find(function (d) { return d.id === id; }); }

  /* Üst katman: bir kitabın desteleri (Howl B1, Howl B2 gibi) tek grupta durur */
  function collections() {
    var order = [], map = Object.create(null);
    state.decks.forEach(function (dk) {
      var g = dk.collection || "";
      if (!map[g]) { map[g] = { name: g, decks: [] }; order.push(map[g]); }
      map[g].decks.push(dk);
    });
    /* grupsuz desteler en sona */
    return order.filter(function (g) { return g.name; })
      .concat(order.filter(function (g) { return !g.name; }));
  }

  function collectionNames() {
    return collections().map(function (g) { return g.name; }).filter(Boolean);
  }

  function setCollection(id, name) {
    var dk = deck(id);
    if (!dk) return;
    dk.collection = String(name || "").trim();
    save();
  }

  function nextSeq(dk) {
    if (typeof dk.seq === "number") return dk.seq;
    var max = 0;
    dk.cards.forEach(function (c) {
      var n = parseInt(String(c.id).split(":")[1], 10);
      if (!isNaN(n) && n + 1 > max) max = n + 1;
    });
    return max;
  }

  /* Var olan desteyi tazeler: aynı kelimenin eksik alanlarını doldurur,
     yeni kelimeleri sona ekler. İlerleme olduğu gibi kalır. */
  function mergeIntoDeck(id, cards) {
    var dk = deck(id);
    if (!dk) return null;
    var byTerm = Object.create(null);
    dk.cards.forEach(function (c) { byTerm[String(c.term).toLowerCase()] = c; });

    var seq = nextSeq(dk);
    var added = 0, filled = 0, touched = 0;
    cards.forEach(function (c) {
      var old = byTerm[String(c.term).toLowerCase()];
      if (!old) {
        var fresh = makeCard(dk.id, seq++, c);
        dk.cards.push(fresh);
        byTerm[String(fresh.term).toLowerCase()] = fresh;
        added++;
        return;
      }
      var before = old.reading + "|" + old.group + "|" + old.ex + "|" + old.exTr;
      if (!old.reading && c.reading) old.reading = c.reading;
      if (!old.group && c.group) old.group = c.group;
      if (c.ex) old.ex = c.ex;
      if (c.exTr) old.exTr = c.exTr;
      if (before !== old.reading + "|" + old.group + "|" + old.ex + "|" + old.exTr) {
        filled++;
        if (c.ex || c.exTr) touched++;
      }
    });
    dk.seq = seq;
    save();
    return { added: added, filled: filled, sentences: touched };
  }

  /* Destedeki bölümler (CSV'nin grup sütunu), sırayı bozmadan */
  function groups(id) {
    var dk = deck(id);
    if (!dk) return [];
    var order = [], map = Object.create(null);
    dk.cards.forEach(function (c) {
      var g = c.group || "";
      if (!map[g]) { map[g] = { name: g, cards: [] }; order.push(map[g]); }
      map[g].cards.push(c);
    });
    return order.map(function (g) {
      var c = countCards(g.cards);
      return {
        name: g.name, cards: g.cards, total: c.total,
        nw: c.nw, learned: c.learned, marked: c.marked, learning: c.learning, due: c.due,
        studied: c.total - c.nw,
        withEx: g.cards.filter(function (x) { return x.ex && x.exTr; }).length
      };
    });
  }

  function cardsOf(id, group) {
    var dk = deck(id);
    if (!dk) return [];
    if (group == null) return dk.cards.slice();
    return dk.cards.filter(function (c) { return (c.group || "") === group; });
  }

  function countCards(cards) {
    var now = Date.now();
    var out = { nw: 0, due: 0, learning: 0, learned: 0, marked: 0, total: 0 };
    cards.forEach(function (c) {
      out.total++;
      var p = state.prog[c.id];
      if (!p) { out.nw++; return; }
      if (w.SRS.isMarked(p)) { out.marked++; return; }
      if (w.SRS.isLearned(p)) out.learned++;
      else out.learning++;
      if (w.SRS.isDue(p, now)) out.due++;
    });
    return out;
  }

  function removeDeck(id) {
    state.decks = state.decks.filter(function (d) { return d.id !== id; });
    Object.keys(state.prog).forEach(function (k) { if (k.indexOf(id + ":") === 0) delete state.prog[k]; });
    state.settings.selected = state.settings.selected.filter(function (x) { return x !== id; });
    save();
  }

  function resetDeck(id) {
    Object.keys(state.prog).forEach(function (k) { if (k.indexOf(id + ":") === 0) delete state.prog[k]; });
    save();
  }

  /* Yalnızca verilen kartların ilerlemesini siler (bir bölümü baştan almak için) */
  function resetCards(cards) {
    var n = 0;
    cards.forEach(function (c) { if (state.prog[c.id]) { delete state.prog[c.id]; n++; } });
    save();
    return n;
  }

  /* Tekrarda yanlış bilinen kelime bugünkü tekrara düşsün */
  function dueToday(cardId) {
    var p = state.prog[cardId];
    if (!p) return;
    if (p.known) { state.prog[cardId] = w.SRS.unmark(p); save(); return; }
    p.due = Math.min(p.due || 0, Date.now());
    save();
  }

  function prog(cardId) { return state.prog[cardId]; }
  function setProg(cardId, p) { state.prog[cardId] = p; save(); }

  /* ---- günlük geçmiş ---- */
  function day(key) {
    if (!state.history[key]) state.history[key] = { learned: 0, answered: 0 };
    return state.history[key];
  }
  function logAnswer() { day(today()).answered++; save(); }
  function logLearned() { day(today()).learned++; save(); }

  function dateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Son n günün kaydı, en eskiden bugüne */
  function historyRange(days) {
    var out = [], now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      var k = dateKey(d);
      var rec = state.history[k] || { learned: 0, answered: 0 };
      out.push({ date: d, key: k, learned: rec.learned || 0, answered: rec.answered || 0 });
    }
    return out;
  }

  /* ---- biliyorum işareti ---- */
  function markKnown(cardId) {
    state.prog[cardId] = w.SRS.markKnown(state.prog[cardId]);
    save();
  }
  function unmarkKnown(cardId) {
    var p = state.prog[cardId];
    if (!p) return;
    if (p.known) delete state.prog[cardId];
    else state.prog[cardId] = w.SRS.unmark(p);
    save();
  }
  function markGroupKnown(deckId, group) {
    var dk = deck(deckId);
    if (!dk) return 0;
    var n = 0;
    dk.cards.forEach(function (c) {
      if (group && c.group !== group) return;
      if (w.SRS.isMarked(state.prog[c.id])) return;
      state.prog[c.id] = w.SRS.markKnown(state.prog[c.id]);
      n++;
    });
    save();
    return n;
  }

  function selectedDecks() {
    var sel = state.settings.selected.filter(function (id) { return deck(id); });
    if (!sel.length && state.decks.length) sel = [state.decks[0].id];
    return sel.map(deck);
  }

  /* Bir grubun bütün destelerini birden seç ya da bırak */
  function selectCollection(name, on) {
    var ids = state.decks.filter(function (d) { return (d.collection || "") === (name || ""); })
      .map(function (d) { return d.id; });
    var sel = state.settings.selected.filter(function (x) { return ids.indexOf(x) < 0; });
    if (on) sel = sel.concat(ids);
    if (!sel.length) sel = ids.slice(0, 1);
    state.settings.selected = sel;
    save();
  }

  function toggleSelected(id) {
    var s = state.settings.selected;
    var i = s.indexOf(id);
    if (i >= 0) { if (s.length > 1) s.splice(i, 1); }
    else s.push(id);
    save();
  }

  function counts(decks) {
    var now = Date.now();
    var out = { nw: 0, due: 0, learning: 0, learned: 0, marked: 0, total: 0 };
    (decks || state.decks).forEach(function (d) {
      d.cards.forEach(function (c) {
        out.total++;
        var p = state.prog[c.id];
        if (!p) { out.nw++; return; }
        if (w.SRS.isMarked(p)) { out.marked++; return; }
        if (w.SRS.isLearned(p)) out.learned++;
        else out.learning++;
        if (w.SRS.isDue(p, now)) out.due++;
      });
    });
    return out;
  }

  function forecast(days) {
    var out = [], base = w.SRS.startOfDay(Date.now());
    for (var i = 0; i < days; i++) out.push(0);
    Object.keys(state.prog).forEach(function (k) {
      var p = state.prog[k];
      if (!p || p.known || p.stage < w.SRS.STAGE.REVIEW) return;
      var diff = Math.round((w.SRS.startOfDay(p.due) - base) / w.SRS.DAY);
      if (diff < 0) diff = 0;
      if (diff < days) out[diff]++;
    });
    return out;
  }

  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text) {
    var got = JSON.parse(text);
    if (!got || !Array.isArray(got.decks)) throw new Error("Bu dosya bir Kelime Kutusu yedeği değil.");
    state = Object.assign(JSON.parse(JSON.stringify(def)), got);
    state.settings = Object.assign({}, def.settings, got.settings || {});
    save();
  }

  function wipe() {
    state = JSON.parse(JSON.stringify(def));
    try { localStorage.removeItem(KEY); } catch (e) {}
    save();
  }

  w.Store = {
    get state() { return state; },
    load: load, save: save, today: today, rollDay: rollDay, markStudied: markStudied,
    addDeck: addDeck, deck: deck, removeDeck: removeDeck, resetDeck: resetDeck,
    mergeIntoDeck: mergeIntoDeck, groups: groups, cardsOf: cardsOf, countCards: countCards,
    collections: collections, collectionNames: collectionNames, setCollection: setCollection,
    selectCollection: selectCollection,
    resetCards: resetCards, dueToday: dueToday,
    prog: prog, setProg: setProg, selectedDecks: selectedDecks, toggleSelected: toggleSelected,
    counts: counts, forecast: forecast,
    logAnswer: logAnswer, logLearned: logLearned, historyRange: historyRange,
    markKnown: markKnown, unmarkKnown: unmarkKnown, markGroupKnown: markGroupKnown,
    exportJSON: exportJSON, importJSON: importJSON, wipe: wipe
  };
})(window);
