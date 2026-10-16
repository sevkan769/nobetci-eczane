#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nöbetçi Eczane veri toplayıcı.
Kaynak: sigortalifedergi.com -> çıktı: frontend/public/data/*.json
Statik site için build-time crawl; sunucu gerektirmez.
"""
import json, os, re, sys, time, threading, unicodedata
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = "https://www.sigortalifedergi.com"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "data")
CONCURRENCY = 2
MIN_GAP = 0.45   # istekler arası en az saniye (site hız sınırı uyguluyor)
RETRIES = 4

PROVINCES = [
    "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin",
    "Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale",
    "Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum",
    "Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkâri","Hatay","Isparta","Mersin",
    "İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli",
    "Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir",
    "Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
    "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt",
    "Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük",
    "Kilis","Osmaniye","Düzce",
]


def slugify(s):
    """Güngören -> gungoren, İstanbul -> istanbul, Şanlıurfa -> sanliurfa"""
    tr = {
        "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g", "ı": "i", "I": "i", "İ": "i",
        "ö": "o", "Ö": "o", "ş": "s", "Ş": "s", "ü": "u", "Ü": "u",
        "â": "a", "Â": "a", "î": "i", "Î": "i", "û": "u", "Û": "u",
    }
    out = []
    for ch in s.strip():
        ch = tr.get(ch, ch)
        if ch.isascii() and ch.isalnum():
            out.append(ch.lower())
    return "".join(out)


_gate = threading.Lock()
_last = [0.0]


def _throttle():
    """global istek hız sınırı"""
    with _gate:
        dt = time.time() - _last[0]
        if dt < MIN_GAP:
            time.sleep(MIN_GAP - dt)
        _last[0] = time.time()


def fetch(url, tries=RETRIES):
    for attempt in range(tries):
        _throttle()
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "tr-TR,tr;q=0.9",
                "Connection": "close",
            })
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 503) and attempt < tries - 1:
                wait = float(e.headers.get("Retry-After") or 0) or 6 * (attempt + 1)
                time.sleep(wait + 1)
                continue
            if attempt == tries - 1:
                print(f"  ! HATA {url}: HTTP {e.code}", file=sys.stderr)
                return None
        except Exception as e:
            if attempt == tries - 1:
                print(f"  ! HATA {url}: {e}", file=sys.stderr)
                return None
            time.sleep(2 * (attempt + 1))
    return None


def norm_ws(s):
    return re.sub(r"\s+", " ", s or "").strip()


def parse_districts(html):
    """pharmacies-districts bloğundan ilçe slug+ad çıkar"""
    m = re.search(r'pharmacies-districts(.*?)</div>\s*</div>', html, re.S)
    if not m:
        return []
    out, seen = [], set()
    for sm in re.finditer(r'href="https://www\.sigortalifedergi\.com/([a-z0-9\-]+)-nobetci-eczaneler"[^>]*>([^<]+)</a>', m.group(1)):
        href, ad = sm.group(1), norm_ws(sm.group(2))
        # ilk slug segment'i il, kalanı ilçe
        parts = href.split("-")
        if len(parts) < 2 or ad in seen:
            continue
        seen.add(ad)
        out.append({"slug": "-".join(parts[1:]), "ad": ad})
    return out


DATE_RE = re.compile(r'(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)')

def parse_date(html):
    m = re.search(r'>\s*\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s*nöbetçi eczane', html)
    if not m:
        return None
    d = norm_ws(m.group(0)).split(" nöbetçi")[0]
    return d.lstrip("> ").strip()


def parse_pharmacies(html, il_ad, ilce_ad):
    """pharmacies-list içindeki li kartlarını parse et"""
    i = html.find("pharmacies-list")
    if i < 0:
        return []
    seg = html[i:i + 60000]
    end = seg.find("pharmacies-districts")
    if end > 0:
        seg = seg[:end]

    cards = re.split(r'<li class="bg-light border p-3 mb-3 rounded">', seg)[1:]
    out = []
    for c in cards:
        nm = re.search(r'<h4 class="h5[^"]*">(.*?)</h4>', c, re.S)
        name = norm_ws(re.sub(r"<[^>]+>", "", nm.group(1))) if nm else ""
        am = re.search(r'<address[^>]*>(.*?)</address>', c, re.S)
        adr = norm_ws(re.sub(r"<[^>]+>", "", am.group(1))) if am else ""
        tel_m = re.search(r'href="tel:([^"]+)"', c)
        tel = norm_ws(tel_m.group(1)) if tel_m else ""
        tel_d = re.sub(r"[^\d]", "", tel)
        if tel_d.startswith("90") and len(tel_d) == 12:
            tel_d = "0" + tel_d[2:]
        tel_d = tel_d[:11] if len(tel_d) > 11 else tel_d
        maps_m = re.search(r'google\.com/maps/place/([-\d\.]+),([-\d\.]+)', c)
        lat = float(maps_m.group(1)) if maps_m else None
        lon = float(maps_m.group(2)) if maps_m else None
        if not name:
            continue
        out.append({
            "ad": name,
            "tel": tel_d,
            "telGosterim": tel,
            "adres": adr,
            "lat": lat, "lon": lon,
            "il": il_ad, "ilce": ilce_ad,
        })
    return out


def crawl_province(il_ad):
    il_slug = slugify(il_ad)
    url = f"{BASE}/{il_slug}-nobetci-eczaneler"
    html = fetch(url)
    if not html:
        return None
    ilceler = parse_districts(html)
    if not ilceler:
        print(f"  ! {il_ad}: ilçe listesi bulunamadı", file=sys.stderr)
        return None
    tarih = parse_date(html)

    def one(d):
        purl = f"{BASE}/{il_slug}-{d['slug']}-nobetci-eczaneler"
        ph = fetch(purl)
        if not ph:
            d["eczane"] = []
            d["hata"] = True
            return d
        d["eczane"] = parse_pharmacies(ph, il_ad, d["ad"])
        d["tarih"] = parse_date(ph)
        return d

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        ilceler = list(ex.map(one, ilceler))

    return {"il": il_ad, "ilSlug": il_slug, "tarih": tarih, "ilceler": ilceler}


def repair():
    """Var olan dosyalardaki hatalı (403 alan) ilçeleri tekrar çek"""
    files = [f for f in os.listdir(OUT) if f.endswith('.json') and f != 'iller.json']
    jobs = []
    for fn in files:
        path = os.path.join(OUT, fn)
        d = json.load(open(path, encoding='utf-8'))
        for dist in d.get('ilceler', []):
            if dist.get('hata'):
                jobs.append((path, d, dist))
    print(f"Onarılacak ilçe: {len(jobs)}")

    def one(job):
        path, d, dist = job
        purl = f"{BASE}/{d['ilSlug']}-{dist['slug']}-nobetci-eczaneler"
        ph = fetch(purl)
        ok = False
        if ph:
            ec = parse_pharmacies(ph, d['il'], dist['ad'])
            dist['eczane'] = ec
            dist['tarih'] = parse_date(ph)
            dist.pop('hata', None)
            ok = True
        print(f"  {'ok ' if ok else 'HATA'} {d['il']}/{dist['ad']} ({len(dist['eczane'])})")
        return ok

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        list(ex.map(one, jobs))

    byfile = {}
    for path, d, _ in jobs:
        byfile[path] = d
    for path, d in byfile.items():
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print("Onarım bitti.")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--repair':
        os.makedirs(OUT, exist_ok=True)
        return repair()

    targets = sys.argv[1:] or PROVINCES
    os.makedirs(OUT, exist_ok=True)
    allp = []
    for idx, il in enumerate(targets, 1):
        t0 = time.time()
        res = crawl_province(il)
        if not res:
            print(f"[{idx}/{len(targets)}] {il}: BAŞARISIZ")
            continue
        with open(os.path.join(OUT, f"{res['ilSlug']}.json"), "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, separators=(",", ":"))
        n_ecz = sum(len(d["eczane"]) for d in res["ilceler"])
        n_ilce = len(res["ilceler"])
        n_hata = sum(1 for d in res["ilceler"] if d.get("hata"))
        allp.append({"ad": res["il"], "slug": res["ilSlug"]})
        print(f"[{idx}/{len(targets)}] {il}: {n_ilce} ilçe, {n_ecz} eczane, {n_hata} hata, {time.time()-t0:.1f}s")

    # iller.json: mevcutları birleştir (alt küme tarandığında veri kaybolmasın)
    mevcut = {}
    p = os.path.join(OUT, "iller.json")
    if os.path.exists(p):
        try:
            mevcut = {x["slug"]: x for x in json.load(open(p, encoding="utf-8"))}
        except Exception:
            mevcut = {}
    for x in allp:
        mevcut[x["slug"]] = x
    sirali = [{"ad": il, "slug": slugify(il)} for il in PROVINCES if slugify(il) in mevcut]
    json.dump(sirali, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    # sayıları + derleme zaman damgası
    sayim = []
    for x in sirali:
        fp = os.path.join(OUT, f"{x['slug']}.json")
        j = json.load(open(fp, encoding="utf-8"))
        sayim.append({
            "ad": x["ad"], "slug": x["slug"],
            "ilce": sum(1 for y in j["ilceler"] if y["eczane"]),
            "eczane": sum(len(y["eczane"]) for y in j["ilceler"]),
        })
    import datetime
    meta = {
        "derlendi": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "il": len(sayim),
        "ilce": sum(x["ilce"] for x in sayim),
        "eczane": sum(x["eczane"] for x in sayim),
    }
    json.dump(meta, open(os.path.join(OUT, "meta.json"), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print(f"\nTamam: {len(sirali)}/{len(PROVINCES)} il, "
          f"{meta['ilce']} ilçe, {meta['eczane']} eczane -> {OUT}")


if __name__ == "__main__":
    main()
