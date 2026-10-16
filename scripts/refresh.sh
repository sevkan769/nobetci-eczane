#!/usr/bin/env bash
# Günlük veri tazeleme: tara -> doğrula -> derle
# TARAMANIN BAŞARISIZ OLMASI HALİNDE DERLEME YAPILMAZ (boş/bozuk veri yayınlanmasın).
set -uo pipefail

KOK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOK"

LOG="$KOK/refresh.log"
YEDEK="$KOK/.data.bak"   # public/ DIŞINDA: yoksa dist'e sızar ve yayınlanır
say() { echo "[$(date '+%Y-%m-%d %H:%M')] $*" | tee -a "$LOG"; }

say "=== Yenileme başladı ==="

# 1) Eski veriyi yedekle (başarısızlıkta geri dönüş için)
if [ -d frontend/public/data ]; then
  rm -rf "$YEDEK"
  cp -r frontend/public/data "$YEDEK"
  say "Mevcut veri yedeklendi"
fi

# 2) Tüm illeri tara
python3 -u scripts/crawl.py >> "$LOG" 2>&1
CRAWL_RC=$?
say "Tarama bitti (rc=$CRAWL_RC)"

# 3) Doğrulama — bu kısım kritik, yayınlamadan önce verinin sağlam olduğundan emin ol
python3 - <<'PY'
import json, os, sys
sys.path.insert(0, 'scripts')
import crawl

d = 'frontend/public/data'
try:
    iller = json.load(open(f'{d}/iller.json', encoding='utf-8'))
except Exception as e:
    print(f"VERIFY FAIL: iller.json okunamadı: {e}"); sys.exit(1)

errors = []
if len(iller) < 81:
    errors.append(f"il eksik: {len(iller)}/81")

toplam_eczane = toplam_ilce = 0
eksik_dosya = []
for p in crawl.PROVINCES:
    fn = f"{d}/{crawl.slugify(p)}.json"
    if not os.path.exists(fn):
        eksik_dosya.append(p); continue
    try:
        j = json.load(open(fn, encoding='utf-8'))
    except Exception as e:
        errors.append(f"{p}: JSON bozuk ({e})"); continue
    for dist in j.get('ilceler', []):
        toplam_ilce += 1
        if dist.get('hata'):
            errors.append(f"{p}/{dist['ad']}: çekilemedi")
        toplam_eczane += len(dist.get('eczane', []))

if eksik_dosya:
    errors.append(f"dosya eksik: {', '.join(eksik_dosya)}")

# Makul aralık kontrolü — geçen sefer: 81 il, 808 ilçe, 1275 eczane
# Günlük değişim ±%40'ı aşmamalı, aksi halde muhtemelen hatalı tarama
if not (700 <= toplam_eczane <= 2000):
    errors.append(f"eczane sayısı anormal: {toplam_eczane}")
if not (850 <= toplam_ilce <= 1000):
    errors.append(f"ilçe sayısı anormal: {toplam_ilce}")

if errors:
    print("VERIFY FAIL:")
    for e in errors[:15]:
        print("  -", e)
    sys.exit(1)

print(f"VERIFY OK: {len(iller)} il, {toplam_ilce} ilçe, {toplam_eczane} eczane")
PY
VERIFY_RC=$?

if [ $VERIFY_RC -ne 0 ]; then
  say "!!! DOĞRULAMA BAŞARISIZ — derleme yapılmadı, eski veri korunuyor"
  if [ -d "$YEDEK" ]; then
    rm -rf frontend/public/data
    mv "$YEDEK" frontend/public/data
    say "Eski veri geri yüklendi"
  fi
  exit 1
fi

# 4) Derle
cd frontend && npx vite build >> "$LOG" 2>&1
BUILD_RC=$?
if [ $BUILD_RC -ne 0 ]; then
  say "!!! DERLEME BAŞARISIZ (rc=$BUILD_RC)"
  exit 1
fi

rm -rf "$YEDEK"
say "=== Derleme tamam, yayına hazır: frontend/dist ($(du -sh frontend/dist | cut -f1)) ==="
exit 0
