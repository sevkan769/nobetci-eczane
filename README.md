# Nöbetçi Eczane Bul

Türkiye'nin 81 ilinde nöbetçi eczane arama sitesi. Hızlı, sade, reklamsız, mobil öncelikli.

## Veri

- **Kaynak:** sigortalifedergi.com
- **Toplama:** build sırasında statik olarak, `scripts/crawl.py` ile
- **Kapsam:** 81 il · 808 ilçe · 1275 nöbetçi eczane
- **Toplam boyut:** ~365 KB (82 JSON dosyası, il başına ayrı — il seçilince sadece o il yüklenir)

## Mimari

Saf statik site. Sunucu, API veya veritabanı yok — veri build sırasında JSON'a gömülüyor.
Bu yüzden CDN'den servis edilir, maliyet sıfır, saldırı yüzeyi yok.

```
eczane-takip/
├── scripts/
│   ├── crawl.py      # veri toplayıcı (+ --repair ile hatalı ilçeleri yeniler)
│   ├── test.js       # Playwright tarayıcı testi
│   └── shot2.js      # görsel doğrulama
├── frontend/
│   ├── public/data/  # üretilmiş veri (JSON)
│   ├── src/App.jsx   # tek bileşen uygulama
│   └── dist/         # deploy edilecek çıktı
└── screenshots/      # test görüntüleri
```

## Geliştirme

```bash
cd frontend
npm install
npm run dev          # geliştirme sunucusu
npm run build        # dist/ üretir
```

## Veriyi Yenileme

Veri her gün değişir. Güncellemek için:

```bash
python3 scripts/crawl.py              # tüm 81 il
python3 scripts/crawl.py İstanbul     # tek il
python3 scripts/crawl.py --repair     # sadece hatalı ilçeleri yeniden çeker
cd frontend && npm run build
```

> **Not:** Kaynak site hız sınırı uyguluyor. Script istekler arası 0.45 sn bekliyor ve
> 403/429 alınca otomatik bekliyor. Daha agresif ayarlar 403'e yol açıyor.

## Bilinen Kısıtlar

- **Statik veri = günlük tazeleme gerekir.** Tarayıcıda canlı sorgu yok; veri build anındaki hâli.
  Bu yüzden sitede "telefonla teyit et" uyarısı duruyor.
- 3 eczane numarası kaynakta eksik (Gümüşhane/Şiran, Malatya/Arguvan, Osmaniye/Kadirli).
  Telefonu olmayan eczane için "ara" butonu gizlenir, harita butonu kalır.
- 188 ilçede o gün nöbetçi eczane yok — arayüz bunu açıkça söylüyor.
