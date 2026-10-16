# Vercel'e taşıma — 5 adım, ~5 dakika

**Neden:** Şu anki yayın adresi her seferinde değişiyor. Gece otomatik güncelleme
başlayınca link her gün ölür. Vercel'de adres bir kere sabitlenir, bir daha değişmez.

**Maliyet: 0.** Vercel'in ücretsiz planı bu iş için yeterli.

---

## 1. Kodu GitHub'a koy

1. https://github.com → **New repository**
2. Adı `nobetci-eczane` yaz, **Private** seç (herkese açık olmasına gerek yok)
3. **Create repository** → boş repo açılacak
4. Kodu oraya yükle

> Eğer bilgisayarında git kurulu değilse, repo açıldıktan sonra
> **"uploading an existing file"** bağlantısına tıkla, `eczane-takip`
> klasörünü içinden seçip sürükle-bırak. `.gitignore` sayesinde
> `node_modules` ve `dist` zaten yüklenmez.

## 2. Vercel'de projeyi bağla

1. https://vercel.com → **Continue with GitHub** ile ücretsiz giriş
2. **Add New → Project** → `nobetci-eczane` reposunu seç → **Import**
3. Ayarlar:
   - **Root Directory:** `frontend` ← önemli, `frontend/vercel.json` burada okunur
   - Framework Preset: **Vite**
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Deploy** → `https://nobetci-eczane.vercel.app` gibi **sabit bir adres** gelir

## 3. Otomatik güncellemeyi bağla

Vercel, repoya her push olduğunda otomatik yeniden yayınlar — bunu ayrıca
Ayar → **Git** bölümünden açman gerekiyor ("Automatic Builds" açık olmalı).

## 4. Her gece veriyi tazelensin diye

Repo → **Settings → Secrets and variables → Actions** → **New repository secret**:

| Secret | Değer |
|---|---|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → üret |
| `VERCEL_ORG_ID` | Vercel proje ayarlarındaki `orgId` |
| `VERCEL_PROJECT_ID` | Vercel proje ayarlarındaki `projectId` |

Bu üçü girildikten sonra `.github/workflows/refresh.yml` her gece saat 00:15'te
kendiliğinden: 81 ili tarar → veriyi doğrular → derler → yayınlar.

## 5. İlk testi çalıştır

Repo → **Actions** sekmesi → "Nöbetçi eczane verisini tazele ve yayınla"
→ **Run workflow**.

Yeşil tik çıkması lazım. Çıkarsa artık site kendi kendini güncelliyor
ve sen hiçbir şey yapmıyorsun.

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Actions kırmızı, "çekilemedi" | Kaynak site hız sınırı | Actions'ta tekrar çalıştır, 1-2 deneme yeter |
| Site 1 günden eski uyarısı gösteriyor | Tarama başarısız oldu, doğrulama yayınlamayı engelledi | Actions ekranındaki hata loguna bak |
| Eczane sayısı anormal uyarısı | Tarama bozuk veri döndürdü | Site **eski haliyle yayında kalır**, güvendesin |

**Önemli:** Doğrulama başarısız olursa site **güncellenmez ama bozulmaz da** —
sana yanlış eczane bilgisi gösterilmez. Bu yüzden acele etmene gerek yok.
