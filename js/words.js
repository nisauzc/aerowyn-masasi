/* ============ KELİMELER (Kelime Kutusu) ============ */
function kkTheme() {
  const f = $("#kkFrame");
  if (f && f.contentWindow) f.contentWindow.postMessage({ type: "kk-theme", theme: S.theme === "system" ? null : S.theme }, location.origin);
}
function showWords(on) {
  let box = $("#kkBox");
  if (on && !box) { box = document.createElement("div"); box.id = "kkBox"; $("#main").appendChild(box); }
  $("#view").hidden = on;
  document.body.classList.toggle("words", on);
  if (!box) return;
  box.hidden = !on;
  if (!on) return;
  if (!$("#kkFrame")) {
    /* önce eşitleme bitsin; yoksa boş deste uzaktaki ilerlemenin üstüne yazabilir */
    if (!Sync.ready) { box.innerHTML = '<div class="empty" style="padding:24px">' + esc(t("syncBusy")) + "</div>"; setTimeout(render, 700); return; }
    box.innerHTML = '<iframe id="kkFrame" title="Kelime Kutusu" src="kelime/index.html?embed=1"></iframe>';
    $("#kkFrame").addEventListener("load", kkTheme);
  }
  kkTheme();
}
