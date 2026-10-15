# Aerowyn Masası

Nisa'nın kişisel çalışma masası: Bugün listesi, Pano, Takvim, Odak (pomodoro), Akademik, Kelimeler (Kelime Kutusu), Sağlık, Günlük ve Yerler. Arayüz Türkçe, İngilizce ve Japonca.

Adres: https://nisauzc.github.io/aerowyn-masasi/

## Telefona kurmak

- **Android (Chrome):** adresi aç → sağ üstteki ⋮ → *Ana ekrana ekle* / *Uygulamayı yükle*.
- **iPhone (Safari):** adresi aç → Paylaş → *Ana Ekrana Ekle*.

## Veriler nerede

Bu depo sadece uygulamanın kodu; içinde kişisel veri yok. Veriler önce cihazın kendisinde (IndexedDB) tutulur.
Ayarlar → *Eşitleme (GitHub)* bölümünde bir anahtar (fine-grained token) girilirse, veriler gizli
`nisauzc/aerowyn-veri` deposundaki `data.json` dosyasıyla ve `photos/` klasörüyle eşitlenir.
Her kayıtta en son değiştirilen sürüm kazanır.

Anahtar sadece o cihazın tarayıcısında durur. Sadece `aerowyn-veri` deposuna, sadece *Contents: Read and write* izniyle verilmeli.

## Dosya düzeni

```
index.html, manifest.json, sw.js   uygulama kabuğu, telefona kurulum, çevrimdışı önbellek
css/style.css                      görünüm
js/core.js     ortak yardımcılar, durum, kategoriler
js/i18n.js     TR / EN / JA metinler
js/store.js    yerel depo + GitHub eşitleme + fotoğraflar
js/views.js    kabuk, Bugün, Pano, Takvim
js/pomo.js     Odak (pomodoro, rapor kartı)
js/journal.js  Günlük, Yerler, Ayarlar
js/academic.js Akademik çalışma alanları
js/health.js   Sağlık
js/words.js    Kelimeler sekmesi (kelime/ klasöründeki Kelime Kutusu'nu açar)
js/events.js   tıklama/form olayları ve açılış
kelime/        Kelime Kutusu (gömülü çalışır, ilerlemesi eşitlemeye dahil)
icons/         simgeler ve tilki
```

## Güncelleme

Dosyaları değiştirince `sw.js` içindeki `SURUM` değerini bir artır (ör. `aerowyn-v2`), sonra depoya gönder.
