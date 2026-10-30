/* Oturum kurgusu: hangi kart, hangi soru tipi */
(function (w) {
  "use strict";
  var S = w.SRS;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Bir kartın oturumda kaç soru tutacağı: yeni kelime bütün aşamalardan geçer */
  function cost(p, settings) {
    var last = settings.typing ? S.STAGE.REVIEW : S.STAGE.TYPE;
    if (!p) return last;
    if (p.stage < S.STAGE.REVIEW) return Math.max(1, last - p.stage);
    return 1;
  }

  /* opts: { deckId, group } ile oturumu tek desteye ya da tek bölüme daraltır */
  function pick(decks, opts) {
    opts = opts || {};
    var out = [];
    decks.forEach(function (d) {
      if (opts.deckId && d.id !== opts.deckId) return;
      d.cards.forEach(function (c) {
        if (opts.group != null && (c.group || "") !== opts.group) return;
        out.push({ card: c, deck: d });
      });
    });
    return out;
  }

  /* Seçili destelerden oturum kuyruğu kurar (soru sayısı bütçeli) */
  function buildQueue(decks, prog, settings, daily, now, opts) {
    now = now || Date.now();
    var due = [], learning = [], fresh = [];

    pick(decks, opts).forEach(function (item) {
      var p = prog[item.card.id];
      if (p && p.known) return;                   // "biliyorum" denmiş kelime
      if (!p) { fresh.push(item); return; }
      if (p.stage < S.STAGE.REVIEW) { learning.push(item); return; }
      if (p.due <= now) due.push(item);
    });

    var newLeft = Math.max(0, (settings.newPerDay || 10) + (daily.extra || 0) - (daily.newDone || 0));
    shuffle(fresh); shuffle(due); shuffle(learning);
    /* bir bölüm çalışılırken günlük sınır yolu kapatmasın */
    if (!(opts && opts.ignoreDailyCap)) fresh = fresh.slice(0, newLeft);

    var budget = (opts && opts.budget) || settings.sessionSize || 30;
    var queue = [], spent = 0;
    [learning, due, fresh].forEach(function (group) {
      group.forEach(function (item) {
        var c = cost(prog[item.card.id], settings);
        if (spent + c > budget && queue.length) return;
        queue.push(item); spent += c;
      });
    });
    return queue;
  }

  /* TEKRAR: yeni kelime açmadan, o güne kadar çalışılmış kelimeleri baştan sorar.
     opts: { deckId, group, size, includeKnown } */
  function buildRevise(decks, prog, opts) {
    opts = opts || {};
    var pool = pick(decks, opts).filter(function (item) {
      var p = prog[item.card.id];
      if (!p) return false;                       // hiç çalışılmamış kelime tekrara girmez
      if (p.known) return !!opts.includeKnown;    // "biliyorum" dediklerin ancak istenirse
      return (p.seen || 0) > 0;
    });
    shuffle(pool);
    var size = opts.size || 0;
    return size > 0 ? pool.slice(0, size) : pool;
  }

  /* CÜMLELER: cümlesi olan kartlar. opts: { deckId, group, size } */
  function buildSentences(decks, opts) {
    opts = opts || {};
    var pool = pick(decks, opts).filter(function (item) {
      return item.card.ex && item.card.exTr;
    });
    shuffle(pool);
    var size = opts.size || 0;
    return size > 0 ? pool.slice(0, size) : pool;
  }

  function sentenceCount(decks, opts) { return buildSentences(decks, opts).length; }

  /* Yanıltıcı seçenekler: önce aynı gruptan, yetmezse desteden */
  function distractors(item, field, n) {
    var cards = item.deck.cards.filter(function (c) { return c.id !== item.card.id && c[field]; });
    var same = cards.filter(function (c) { return c.group && c.group === item.card.group; });
    var pool = shuffle(same.slice()).concat(shuffle(cards.slice()));
    var out = [], seen = {};
    seen[String(item.card[field]).toLowerCase()] = 1;
    for (var i = 0; i < pool.length && out.length < n; i++) {
      var v = pool[i][field], k = String(v).toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1; out.push(v);
    }
    return out;
  }

  function isJa(deck) { return deck.type === "ja-tr" || deck.type === "ja-en"; }

  /* Bir kart için soruyu üretir */
  function makeQuestion(item, prog, settings) {
    var p = prog[item.card.id];
    var stage = p ? p.stage : S.STAGE.MEET;
    var ja = isJa(item.deck);

    if (stage === S.STAGE.MEET) return { kind: "meet", item: item, ja: ja };

    if (stage === S.STAGE.CHOICE || stage === S.STAGE.REVERSE) {
      var q = choiceQuestion(item, stage === S.STAGE.REVERSE, ja, settings && settings.askKana);
      return q || { kind: "type", item: item, ja: ja, target: targetFor(item, ja), thin: true };
    }

    if (stage === S.STAGE.TYPE) {
      if (!settings.typing) return { kind: "choice-skip", item: item, ja: ja };
      return { kind: "type", item: item, ja: ja, target: targetFor(item, ja) };
    }

    return { kind: "review", item: item, ja: ja };
  }

  /* TEKRAR sorusu: aşamadan bağımsız, dönüşümlü çoktan seçmeli ve yazma */
  function makeReviseQuestion(item, settings, step) {
    var ja = isJa(item.deck);
    var order = settings.typing ? [0, 1, 2] : [0, 1];
    var pickKind = order[(step || 0) % order.length];
    if (pickKind === 2) {
      return { kind: "type", item: item, ja: ja, target: targetFor(item, ja), free: true };
    }
    var q = choiceQuestion(item, pickKind === 1, ja, settings && settings.askKana);
    if (!q) return { kind: "type", item: item, ja: ja, target: targetFor(item, ja), free: true };
    q.free = true;
    return q;
  }

  function choiceQuestion(item, reverse, ja, askKana) {
    var askField = reverse ? "meaning" : "term";
    var ansField = reverse ? "term" : "meaning";
    /* Japonca destelerde ters soru, ayar kapaliyken yazilisi degil okunusu sorar.
       Kana yine gosterilir (showKana), sadece cevap olarak istenmez. */
    var readingMode = ja && reverse && !askKana && !!item.card.reading;
    if (readingMode) ansField = "reading";
    var wrong = distractors(item, ansField, 3);
    if (wrong.length < 2) return null;
    return {
      kind: "choice", item: item, ja: ja, reverse: reverse,
      ask: item.card[askField],
      askReading: reverse ? "" : item.card.reading,
      answer: item.card[ansField],
      options: shuffle([item.card[ansField]].concat(wrong)),
      optionsAreJa: ja && ansField === "term",
      showKana: readingMode ? item.card.term : ""
    };
  }

  /* CÜMLE sorusu: cümleyi gösterir, Türkçe karşılığını sorar.
     Yanıltıcılar önce aynı bölümdeki başka cümlelerden gelir. */
  function makeSentenceQuestion(item, poolItems) {
    var others = (poolItems || []).filter(function (x) {
      return x.card.id !== item.card.id && x.card.exTr;
    });
    var same = others.filter(function (x) { return (x.card.group || "") === (item.card.group || ""); });
    var pool = shuffle(same.slice()).concat(shuffle(others.slice()));
    var out = [], seen = {};
    seen[String(item.card.exTr).toLowerCase()] = 1;
    for (var i = 0; i < pool.length && out.length < 3; i++) {
      var v = pool[i].card.exTr, k = String(v).toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1; out.push(v);
    }
    if (!out.length) return null;                 // tek cümleyle soru olmaz
    return {
      kind: "sentence", item: item, ja: isJa(item.deck), free: true,
      ask: item.card.ex,
      answer: item.card.exTr,
      options: shuffle([item.card.exTr].concat(out))
    };
  }

  /* Cümlede geçen kelimeyi kalınlaştırmak için: kök hali kabaca yakalanır.
     Önce kelimenin kendisiyle başlayan sözcük aranır ("lit" yerine "water"ın
     içindeki "ate" gibi yanlış eşleşmeler olmasın), bulunmazsa içinde geçen. */
  function highlight(sentence, term) {
    var s = String(sentence || "");
    var t = String(term || "").trim();
    if (!t) return { before: s, hit: "", after: "" };
    var tries = [t, t.replace(/(ing|ed|ies|es|s|e)$/i, ""), t.replace(/y$/i, "")];
    /* carried, shelves gibi düzensiz hâller için kelimenin başı */
    tries.push(t.slice(0, Math.max(4, Math.ceil(t.length * 0.7))));
    var m = null;
    for (var i = 0; i < tries.length && !m; i++) {
      var k = tries[i];
      if (!k || k.length < 3) continue;
      var esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      m = s.match(new RegExp("\\b" + esc + "[A-Za-zÀ-ÿ']*", "i"));
    }
    if (!m) m = s.match(new RegExp("[A-Za-zÀ-ÿ']*" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[A-Za-zÀ-ÿ']*", "i"));
    if (!m) return { before: s, hit: "", after: "" };
    var at = m.index;
    return { before: s.slice(0, at), hit: m[0], after: s.slice(at + m[0].length) };
  }

  /* Yazma adımında ne yazılacak: Japonca destelerde okunuş, diğerlerinde kelimenin kendisi */
  function targetFor(item, ja) {
    if (ja && item.card.reading) return { text: item.card.reading, label: "okunuşunu yaz" };
    if (ja) return { text: item.card.meaning, label: "anlamını yaz" };
    return { text: item.card.term, label: "İngilizcesini yaz" };
  }

  /* Yazım karşılaştırması: büyük/küçük, noktalama ve parantez içini yok sayar */
  function normalize(s) {
    return String(s || "")
      /* Turkce kucultme "I" harfini "\u0131" yapar, bu da romaji cevaplari yanlis sayardi.
         Noktali/noktasiz i ayrimini karsilastirmada yok sayiyoruz. */
      .replace(/[I\u0130]/g, "i")
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\(.*?\)/g, " ")
      .replace(/\/[^/]*\//g, " ")
      .replace(/[.,;:!?'"“”‘’\-–—_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matches(given, target) {
    var g = normalize(given);
    if (!g) return false;
    var parts = String(target || "").split(/[,;/]| veya /i).map(normalize).filter(Boolean);
    return parts.indexOf(g) >= 0 || normalize(target) === g;
  }

  w.Study = {
    buildQueue: buildQueue, buildRevise: buildRevise, buildSentences: buildSentences,
    sentenceCount: sentenceCount, cost: cost,
    makeQuestion: makeQuestion, makeReviseQuestion: makeReviseQuestion,
    makeSentenceQuestion: makeSentenceQuestion, highlight: highlight,
    matches: matches, normalize: normalize, shuffle: shuffle, isJa: isJa
  };
})(window);
