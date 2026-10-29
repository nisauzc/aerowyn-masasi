/* ============ SETTINGS ============ */
function vSettings() {
  const c = cfg();
  let h = head(t("nav_settings"), t("settingsEyebrow"), "");
  h += '<div class="settings"><div class="panel form"><h2>' + esc(t("appearance")) + "</h2>" +
    '<div class="field"><span>' + esc(t("language")) + '</span><div class="seg">' + [["tr", "Türkçe"], ["en", "English"], ["ja", "日本語"]].map(l => '<button data-lang="' + l[0] + '" aria-pressed="' + (S.lang === l[0]) + '">' + l[1] + "</button>").join("") + "</div></div>" +
    '<div class="field"><span>' + esc(t("theme")) + '</span><div class="seg">' + ["system", "light", "dark"].map(x => '<button data-settheme="' + x + '" aria-pressed="' + (S.theme === x) + '">' + esc(t("theme_" + x)) + "</button>").join("") + "</div></div>" +
    '<div class="field"><span>' + esc(t("storage")) + '</span><div class="muted">' + esc(Sync.on() ? t("storageLive") : t("storageLocal")) + "</div></div>" +
    '<div class="row"><button class="btn" data-backup="1">' + esc(t("backup")) + '</button><label class="btn">' + esc(t("restore")) + '<input type="file" id="importFile" accept=".json,application/json" hidden></label></div></div>';
  h += syncPanel();
  h += '<div class="panel form"><h2>' + esc(t("tabs")) + '</h2><p class="muted" style="margin:0">' + esc(t("tabsHint")) + "</p>" +
    VIEWS.filter(v => v !== "settings").map(v => { const on = !c.hidden.includes(v); return '<div class="modrow"><span>' + esc(t("nav_" + v)) + '</span><button class="switch" role="switch" aria-checked="' + on + '" data-modtoggle="' + v + '" aria-label="' + esc(t("nav_" + v)) + '"><i></i></button></div>'; }).join("") + "</div>";
  h += '<div class="panel form"><h2>' + esc(t("categories")) + '</h2><p class="muted" style="margin:0">' + esc(t("catHint")) + "</p>" +
    c.cats.map((x, i) => '<div class="catrow"><input type="color" id="cc-' + i + '" data-catcolor="' + i + '" value="' + esc(x.color) + '" aria-label="' + esc(t("color")) + '"><input class="in" id="cn-' + i + '" data-catname="' + i + '" value="' + esc(nm(x.name)) + '"><button class="btn ghost sm danger" data-catdel="' + i + '" aria-label="' + esc(t("delete")) + '">×</button></div>').join("") +
    '<form class="row" data-form="newcat"><input class="in grow" id="newCat" placeholder="' + esc(t("newCatPh")) + '"><button class="btn sm" type="submit">+ ' + esc(t("add")) + "</button></form></div></div>";
  return h;
}

function syncPanel() {
  let h = '<div class="panel form"><h2>' + esc(t("syncTitle")) + '</h2><div class="muted">' + esc(syncLabel()) + "</div>";
  if (Sync.on()) {
    h += '<div class="muted num">' + esc(Sync.cfg.owner + "/" + Sync.cfg.repo) + '</div><div class="row"><button class="btn primary" data-syncnow="1">' + esc(t("syncNow")) + '</button><button class="btn ghost danger" data-syncoff="1">' + esc(t("syncOff")) + "</button></div>";
    if (Sync.state === "auth") h += '<p class="muted" style="margin:0">' + esc(t("syncAuthHelp")) + "</p>";
    return h + "</div>";
  }
  h += '<p class="muted" style="margin:0">' + esc(t("syncWhy")) + '</p><ol class="steps"><li>' + esc(t("sync1")) + "</li><li>" + esc(t("sync2")) + "</li><li>" + esc(t("sync3")) + "</li><li>" + esc(t("sync4")) + "</li></ol>" +
    '<form class="form" data-form="sync"><div class="formgrid"><label class="field"><span>' + esc(t("syncOwner")) + '</span><input class="in" id="syncOwner" value="nisauzc" autocomplete="off" spellcheck="false"></label><label class="field"><span>' + esc(t("syncRepo")) + '</span><input class="in" id="syncRepo" value="aerowyn-veri" autocomplete="off" spellcheck="false"></label></div>' +
    '<label class="field"><span>' + esc(t("syncToken")) + '</span><input class="in" id="syncToken" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label><div class="row"><span style="flex:1"></span><button class="btn primary" type="submit">' + esc(t("syncConnect")) + "</button></div></form>";
  return h + "</div>";
}
