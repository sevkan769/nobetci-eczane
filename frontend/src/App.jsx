import { useCallback, useEffect, useMemo, useState } from 'react'

const DATA = `${import.meta.env.BASE_URL}data`.replace(/\/{2,}/g, '/')

/* ---------------- yardımcılar ---------------- */

function parseHash() {
  const m = /^#\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/.exec(window.location.hash)
  return m ? { il: m[1], ilce: m[2] ?? '' } : null
}

function writeHash(il, ilce) {
  const next = ilce ? `#/${il}/${ilce}` : `#/${il}`
  if (window.location.hash !== next) history.replaceState(null, '', next)
}

function autoDark() {
  const h = new Date().getHours()
  return h >= 19 || h < 7
}

function mapsUrl(p) {
  if (p.lat != null && p.lon != null) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.ad}, ${p.adres}`)}`
}

/* ---------------- tema düğmesi ---------------- */

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Tema değiştir"
      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80
                 text-slate-600 backdrop-blur transition hover:bg-slate-100 active:scale-95
                 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
    </button>
  )
}

/* ---------------- eczane kartı ---------------- */

function PharmacyCard({ p, index }) {
  return (
    <li className="card">
      <div className="flex items-start gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10
                     text-sm font-bold text-emerald-600 dark:text-emerald-400"
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-white">{p.ad}</h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{p.adres}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {p.tel && (
          <a className="btn-call flex-1 sm:flex-none" href={`tel:${p.tel}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" />
            </svg>
            {p.telGosterim || p.tel}
          </a>
        )}
        <a className="btn-map flex-1 sm:flex-none" href={mapsUrl(p)} target="_blank" rel="nofollow noreferrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Yol tarifi
        </a>
      </div>
    </li>
  )
}

/* ---------------- ana ekrana ekle ---------------- */

function useInstall() {
  const [prompt, setPrompt] = useState(null)
  const [kurulu, setKurulu] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches ?? false
  )

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onKuruldu = () => {
      setPrompt(null)
      setKurulu(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onKuruldu)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onKuruldu)
    }
  }, [])

  return { prompt, kurulu, kur: async () => { prompt?.prompt(); await prompt?.userChoice } }
}

function InstallCard({ install }) {
  const { prompt, kurulu, kur } = install
  const [dahaOnceGoster, setDahaOnceGoster] = useState(
    () => localStorage.getItem('kurulumKapatildi') !== '1'
  )
  const [iphoneBilgi, setIphoneBilgi] = useState(false)

  if (kurulu || !dahaOnceGoster) return null

  // iOS'ta beforeinstallprompt gelmez, tarayıcıda paylaş menüsü gerekir
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!prompt && !iOS) return null

  const kapat = () => {
    localStorage.setItem('kurulumKapatildi', '1')
    setDahaOnceGoster(false)
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4
                    dark:border-sky-900/60 dark:bg-sky-950/40">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500 text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Telefonuna ekle</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {iphoneBilgi
            ? 'Safari’de alttaki Paylaş butonuna bas → "Ana Ekrana Ekle"'
            : 'Uygulama gibi açılsın, çevrimdışı da çalışsın.'}
        </p>
      </div>
      {prompt ? (
        <button
          onClick={kur}
          className="shrink-0 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95
                     transition px-3.5 py-2 text-sm font-semibold text-white"
        >
          Ekle
        </button>
      ) : (
        <button
          onClick={() => setIphoneBilgi((v) => !v)}
          className="shrink-0 rounded-xl border border-sky-300 px-3.5 py-2 text-sm font-semibold
                     text-sky-700 transition active:scale-95 dark:border-sky-700 dark:text-sky-300"
        >
          Nasıl?
        </button>
      )}
      <button onClick={kapat} aria-label="Kapat" className="shrink-0 text-slate-400 hover:text-slate-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/* ---------------- ana bileşen ---------------- */

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('tema')
    return saved ? saved === 'koyu' : autoDark()
  })
  const [iller, setIller] = useState([])
  const [meta, setMeta] = useState(null)
  const [ilSlug, setIlSlug] = useState('')
  const [ilceSlug, setIlceSlug] = useState('')
  const [ilData, setIlData] = useState(null)
  const [ilceData, setIlceData] = useState(null)
  const [loadingIl, setLoadingIl] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('tema', dark ? 'koyu' : 'acik')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#020617' : '#0ea5e9')
  }, [dark])

  // ilk yükleme: iller + hash'ten geri yükleme
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [list, m] = await Promise.all([
          fetch(`${DATA}/iller.json`).then((r) => r.json()),
          fetch(`${DATA}/meta.json`).then((r) => r.json()).catch(() => null),
        ])
        if (cancelled) return
        setIller(list)
        setMeta(m)
        const h = parseHash()
        const start = h?.il && list.some((x) => x.slug === h.il) ? h.il : 'istanbul'
        setIlSlug(start)
        setIlceSlug(h?.ilce ?? '')
      } catch {
        /* çevrimdışı */
      } finally {
        if (!cancelled) setLoadingIl(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // il değişince il verisini çek
  useEffect(() => {
    if (!ilSlug) return
    let cancelled = false
    setIlceData(null)
    ;(async () => {
      try {
        const d = await (await fetch(`${DATA}/${ilSlug}.json`)).json()
        if (!cancelled) setIlData(d)
      } catch {
        if (!cancelled) setIlData(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ilSlug])

  const ilceler = useMemo(
    () => (ilData?.ilceler ?? []).filter((d) => d.ad !== 'Merkez' || d.slug === ilceSlug),
    [ilData, ilceSlug]
  )

  // geçerli ilçe (veri varsa en kalabalık ilçeyi seç — daha iyi ilk izlenim)
  useEffect(() => {
    if (!ilceler.length) return
    if (!ilceSlug || !ilceler.some((d) => d.slug === ilceSlug)) {
      const dolu = ilceler.filter((d) => d.eczane.length).sort((a, b) => b.eczane.length - a.eczane.length)[0]
      setIlceSlug((dolu ?? ilceler[0]).slug)
    }
  }, [ilceler, ilceSlug])

  useEffect(() => {
    if (ilSlug) writeHash(ilSlug, ilceSlug)
  }, [ilSlug, ilceSlug])

  useEffect(() => {
    setQ('')
  }, [ilceSlug])

  const eczane = useMemo(() => {
    const d = ilceler.find((x) => x.slug === ilceSlug)
    const list = d?.eczane ?? []
    const s = q.trim().toLocaleLowerCase('tr')
    if (!s) return list
    return list.filter((p) =>
      [p.ad, p.adres, p.tel, p.telGosterim, p.ilce, p.il]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(s)
    )
  }, [ilceler, ilceSlug, q])

  const seciliIl = iller.find((x) => x.slug === ilSlug)
  const seciliIlce = ilceler.find((x) => x.slug === ilceSlug)
  const genel = useMemo(
    () => ({
      il: meta?.il ?? iller.length,
      ilce: meta?.ilce ?? iller.reduce((n, x) => n + (x.ilce ?? 0), 0),
      eczane: meta?.eczane ?? iller.reduce((n, x) => n + (x.eczane ?? 0), 0),
    }),
    [iller, meta]
  )

  // veri ne kadar eski? 36 saatten fazlaysa kullanıcıyı uyar (yanlış bilgi göstermemek için)
  const veriYasi = useMemo(() => {
    if (!meta?.derlendi) return null
    const saat = (Date.now() - new Date(meta.derlendi).getTime()) / 3_600_000
    if (!Number.isFinite(saat) || saat < 0) return null
    return saat
  }, [meta])

  const veriEski = veriYasi != null && veriYasi > 36

  useEffect(() => {
    const t = seciliIl && seciliIlce
      ? `${seciliIlce.ad} nöbetçi eczane — ${seciliIl.ad} | Nöbetçi Eczane Bul`
      : 'Nöbetçi Eczane Bul — Tüm Türkiye'
    document.title = t
  }, [seciliIl, seciliIlce])

  const onIl = useCallback((e) => {
    setIlSlug(e.target.value)
    setIlceSlug('')
  }, [])

  const install = useInstall()

  if (loadingIl) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-16">
      {/* üst bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur
                         dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <g transform="rotate(-45 12 12)">
                <rect x="9" y="5" width="6" height="14" rx="3" fill="currentColor" />
              </g>
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold leading-tight tracking-tight">
              Nöbetçi Eczane Bul
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {seciliIlce && seciliIl ? `${seciliIlce.ad}, ${seciliIl.ad}` : 'Türkiye geneli'}
            </p>
          </div>
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5">
        {/* seçiciler */}
        <section className="card !p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="il">İl</label>
              <select id="il" className="select" value={ilSlug} onChange={onIl}>
                {iller.map((x) => (
                  <option key={x.slug} value={x.slug}>{x.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ilce">İlçe</label>
              <select
                id="ilce"
                className="select"
                value={ilceSlug}
                onChange={(e) => setIlceSlug(e.target.value)}
                disabled={!ilData}
              >
                {ilceler.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.ad} ({d.eczane.length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {eczane.length > 0 && (
            <div className="relative mt-3">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                   width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="select !pl-9"
                placeholder="Eczane, adres veya telefon ara…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
              />
            </div>
          )}
        </section>

        <InstallCard install={install} />

        {veriEski && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm leading-relaxed
                          text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <strong>Dikkat:</strong> Liste{' '}
            {veriYasi >= 48
              ? `${Math.floor(veriYasi / 24)} gündür güncellenemedi`
              : `${Math.floor(veriYasi)} saat önce güncellendi`}
            . Nöbet değişmiş olabilir — aramadan önce mutlaka telefonla teyit et.
          </div>
        )}

        {/* sonuç başlığı */}
        {seciliIlce && (
          <div className="mt-6 mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-tight">
              {seciliIlce.ad} nöbetçi eczane
              <span className="ml-2 text-sm font-semibold text-slate-400">{eczane.length}</span>
            </h2>
            {ilceData?.tarih && (
              <p className="shrink-0 text-xs font-medium text-slate-400">{ilceData.tarih}</p>
            )}
          </div>
        )}

        {/* liste */}
        {eczane.length > 0 ? (
          <ul className="space-y-3">
            {eczane.map((p, i) => (
              <PharmacyCard key={`${p.tel}-${i}`} p={p} index={i} />
            ))}
          </ul>
        ) : (
          !loadingIl && (
            <div className="card text-center">
              <p className="text-sm font-semibold">
                {q ? 'Aramana uyan eczane yok.' : 'Bu ilçede bugün nöbetçi eczane yok.'}
              </p>
              {q && (
                <button onClick={() => setQ('')} className="mt-2 text-sm font-semibold text-sky-600 hover:underline">
                  Aramayı temizle
                </button>
              )}
            </div>
          )
        )}

        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed
                      text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Uyarı:</strong> Nöbet listeleri değişebilir, bazı eczaneler sadece gerektiğinde açık
          kalabilir. Yola çıkmadan önce telefonla teyit etmen en doğrusu.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-slate-400">
          <span>
            <strong className="font-bold text-slate-500 dark:text-slate-400">{genel.il} il</strong> ·{' '}
            <strong className="font-bold text-slate-500 dark:text-slate-400">{genel.ilce} ilçe</strong> ·{' '}
            <strong className="font-bold text-slate-500 dark:text-slate-400">{genel.eczane} nöbetçi eczane</strong>
          </span>
          <span>· veriler sigortalifedergi.com'dan derlendi · son güncelleme {ilData?.tarih ?? '—'}</span>
        </div>
      </main>
    </div>
  )
}
