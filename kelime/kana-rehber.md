# Kana için 3 haftalık plan

## Desteler

Kelime Kutusu'nda **Ayarlar → Deste ekle**, tip olarak **Japonca → Türkçe** seç, sonra CSV'yi yükle.

| Dosya | Deste adı | Kart |
|---|---|---|
| `kana-1-hiragana.csv` | Hiragana | 104 |
| `kana-2-katakana.csv` | Katakana | 104 |
| `kana-3-okuma.csv` | Kana Okuma | 69 |

Sütunlar: japonca, anlam, okunuş, grup. Gruplar gün gün ayrılmış, yani her gün sadece o günün grubunu çalışırsın.

## Plan

**1. hafta, hiragana**

| Gün | Grup | Kart |
|---|---|---|
| 1 | a-ka satırı (あ-こ) | 10 |
| 2 | sa-ta satırı (さ-と) | 10 |
| 3 | na-ha satırı (な-ほ) | 10 |
| 4 | ma-ya satırı (ま-よ) | 8 |
| 5 | ra-wa-n (ら-ん) | 8 |
| 6 | dakuten ve handakuten (が ざ だ ば ぱ) | 25 |
| 7 | yōon (きゃ, しゅ, ちょ...) | 33 |

**2. hafta, katakana.** Aynı sıra, 8-14. günler. Daha hızlı gider, yöntem oturmuş olur.

**3. hafta, okuma.** Kana Okuma destesi, günde bir grup:

| Gün | Grup |
|---|---|
| 15-16 | Market ve alışveriş |
| 17 | Yurt ve ev |
| 18 | Üniversite |
| 19 | Yol ve şehir |
| 20 | Günlük ifadeler |
| 21 | Karışık tekrar |

Günlük iş: yeni grubu öğren, önceki günlerin gruplarını tekrarla. 15-20 dakika yeter. Yeni karakterleri ilk gördüğün gün Tofugu'nun o satırdaki hafıza hikayelerini oku, sonra deste ile pekiştir.

## Destede olmayan ama bilmen gereken üç şey

**Küçük っ / ッ (sokuon).** Kendi sesi yok, arkasından gelen sessizi ikizler. きっぷ = kippu, ざっし = zasshi. Normal つ'den küçüktür, dikkat et.

**Uzatma çizgisi ー.** Sadece katakanada. Önceki sesli harfi uzatır: スーパー = suupaa, コーヒー = koohii. Hiragana'da aynı işi ikinci bir sesli harf yapar (おかあさん).

**は parçacığı.** Cümlede konu belirteci olarak kullanıldığında "ha" değil "wa" okunur. Bu yüzden こんにちは = konnichiwa, こんばんは = konbanwa. Destede okunuşları buna göre yazıldı.

## Katakanada karıştırılan çiftler

Bunlar neredeyse herkesin takıldığı yer, 2. haftada özellikle dikkat et:

- **シ (shi) / ツ (tsu)** ve **ソ (so) / ン (n)**. Ayrım yazım yönünde: シ ve ン soldan sağa yukarı doğru, ツ ve ソ yukarıdan aşağı yazılır. シ ve ツ üç çizgi, ソ ve ン iki çizgi.
- **ク (ku) / ワ (wa) / タ (ta)**
- **ノ (no) / メ (me) / ヌ (nu)**
- **ア (a) / マ (ma)** ve **オ (o) / ホ (ho)**

## Okunuş notları (Türkçe konuşan için)

Hepburn romajisi İngilizce mantığıyla yazılır, Türkçe gibi okunmaz. Destede parantez içinde verildi:

shi = şi · chi = çi · ji = ci · sha/shu/sho = şa/şu/şo · cha/chu/cho = ça/çu/ço · ja/ju/jo = ca/cu/co · tsu = ts sesi, tek hecede · fu = dudaklar yuvarlak, hafif f · を = "wo" yazılır ama "o" okunur · ん = genizden n

ぢ ve づ modern Japoncada neredeyse kullanılmaz, sırf tablo eksik kalmasın diye konuldu, "nadir" diye işaretli. じ ve ず'yü öğrenmen yeterli.

## Doğrulama

Tablo Unicode karakter adlarından üretildi, sonra pykakasi ve jaconv kütüphaneleriyle ayrı ayrı karşılaştırıldı; 104 karakterin üçünde de okunuş birebir uyuştu. Hiragana-katakana eşleşmesi kod noktası farkıyla teyit edildi. Kelime destesindeki 69 kelimenin tamamı JMdict sözlüğünde okunuşuyla birlikte doğrulandı; eş sesli olanlar (でんき, さかな, しお, せんせい, しけん, えき, でんしゃ, こうえん) hedeflenen anlamın sözlükte bulunduğu ayrıca kontrol edildi.
