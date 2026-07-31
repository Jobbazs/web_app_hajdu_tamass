import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import '../Styles/Termekismerteto.css'

/* Nem publikus termékismertető aloldal.
   – Nincs a navigációban/footerben, nincs a sitemapben.
   – noindex/nofollow: a keresők nem indexelik.
   – Csak az tudja megnyitni, aki ismeri a pontos URL-t. */

const UGYFEL = [
  ['Egyedi, igényes dizájn', 'a márkádhoz igazított, elegáns arculat'],
  ['Tökéletes mobilon is', 'telefonon, tableten, gépen egyaránt szép és használható'],
  ['Animált nyitókép (hero)', 'figyelemfelkeltő, mozgó feliratokkal'],
  ['Bemutatkozó szekció', 'a vállalkozásod és a te történeted'],
  ['Portfólió galéria', 'a munkák kategóriákba rendezve, borítóképes rácsban'],
  ['Kategória-aloldalak', 'külön oldal minden témának, saját tartalommal és morzsamenüvel'],
  ['Nagyképes megjelenítő', 'a képek kattintásra nagyban, galériaként lapozhatók'],
  ['Szolgáltatások szekció', 'a kínálatod áttekinthetően'],
  ['Online időpontfoglalás', 'a szabad időpontok listája, foglalás pár kattintással'],
  ['Várólista', 'betelt időpontra feliratkozás, automatikus értesítés, ha felszabadul'],
  ['Foglalás megerősítése / lemondása', 'e-mailben, egyetlen linkkel'],
  ['Automatikus e-mail értesítések', 'a foglalásokról, kézzel nem kell semmit küldeni'],
  ['Kapcsolati űrlap', 'beépített spam-védelemmel — nem kapsz szemétüzeneteket'],
  ['Kétnyelvű felület', 'magyar / angol, egy kattintással váltható'],
]

const ADMIN = [
  ['Biztonságos admin bejelentkezés', ''],
  ['Vezérlőpult', 'foglalási statisztikák, 12 havi grafikon, választható évvel'],
  ['Szöveg- és tartalomszerkesztés', 'a feliratok, szekciók és a nyitókép szavai'],
  ['Szekciók sorrendje', 'húzd-és-ejtsd (drag-and-drop) módon átrendezhető'],
  ['Portfólió kezelés', 'képfeltöltés, kategóriákba rendezés, sorrend drag-and-droppal'],
  ['Kategóriák kezelése', 'kategóriák és a hozzájuk tartozó szekciók'],
  ['Szolgáltatások kezelése', 'hozzáadás, szerkesztés, sorrend'],
  ['Egyedi szekciók', 'szabadon bővíthető, saját tartalomblokkok'],
  ['Foglaláskezelés', 'időpontok létrehozása, foglalások áttekintése, ügyfél-megbízhatóság követése'],
  ['Üzenetek', 'a kapcsolati űrlapból érkező üzenetek egy helyen'],
  ['Biztonságos képfeltöltés', 'közvetlenül a felhőbe'],
  ['Haladó beállítások', 'publikálás, frissítés és finomhangolás'],
]

const HATTER = [
  ['Google-barát (SEO)', 'meta adatok, megosztás-előnézet, strukturált adatok, sitemap és prerender'],
  ['Gyors betöltés', 'modern technológia, optimalizált képek'],
  ['Biztonság', 'védett admin felület, aláírt képfeltöltés, spam-szűrés az űrlapokon'],
  ['Megbízható e-mail kézbesítés', 'a rendszer levelei nem a spam mappában landolnak'],
  ['Automatizmus', 'a várólista lejáratát a rendszer magától kezeli'],
  ['Kétnyelvűség beépítve', 'a rendszer része, nem utólagos ráaggatás'],
]

const EGYEDI = [
  ['Teljesen a tiéd', 'nincs platform-fogság, nincs kényszerű havidíj egy bérelt rendszerre'],
  ['Bármi testreszabható', 'a dizájn és a funkciók a te igényeidre szabva'],
  ['Bővíthető', 'ahogy nő a vállalkozásod, úgy nőhet vele az oldal is'],
]

function FeatureGrid({ items }) {
  return (
    <ul className="ti-grid">
      {items.map(([term, desc], i) => (
        <li key={i} className="ti-item">
          <span className="ti-term">{term}</span>
          {desc && <span className="ti-desc"> — {desc}</span>}
        </li>
      ))}
    </ul>
  )
}

export default function Termekismerteto() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Termékismertető — Modern weboldal + online foglalási rendszer'
    // noindex: a keresők ne indexeljék ezt a nem publikus oldalt
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.title = prevTitle
      if (meta.parentNode) meta.parentNode.removeChild(meta)
    }
  }, [])

  return (
    <>
      <Navbar subpage />
      <main className="ti-page">
        <article className="ti-wrap">
          <header className="ti-hero">
            <div className="ti-kicker">Termékismertető</div>
            <h1 className="ti-title">Modern weboldal <span className="ti-plus">+</span> online foglalási rendszer</h1>
            <p className="ti-lead">Egyedi fejlesztésű weboldal, amit te magad kezelsz — fejlesztő nélkül.</p>
          </header>

          <p className="ti-para">
            Egy csomagban kapsz egy igényes bemutatkozó oldalt, egy online időpontfoglaló rendszert,
            és egy saját tartalomkezelőt (CMS), amivel bármikor módosíthatsz mindent.
            Kétnyelvű (magyar/angol), villámgyors, mobilbarát és Google-barát.
          </p>
          <p className="ti-para">
            <strong>Kinek ajánlott?</strong> Szolgáltató vállalkozásoknak, akik időpontra dolgoznak —
            fotós, kozmetikus, fodrász, edző, tanácsadó, masszőr, oktató, és bárki, akinek a foglalás a mindennapja.
          </p>

          <section className="ti-section">
            <h2 className="ti-h2">Amit a látogató lát — ügyfél funkciók</h2>
            <FeatureGrid items={UGYFEL} />
          </section>

          <section className="ti-section">
            <h2 className="ti-h2">Amit te kezelsz — admin funkciók (tartalomkezelő)</h2>
            <p className="ti-note">Bejelentkezés után egy egyszerű felületről mindent magad állítasz be:</p>
            <FeatureGrid items={ADMIN} />
            <div className="ti-callout">
              <strong>A lényeg:</strong> a weboldal teljes tartalma a saját kezedben van. Ha változik
              egy ár, egy szöveg, egy kép vagy egy időpont, azt percek alatt te intézed — fejlesztő nélkül.
            </div>
          </section>

          <section className="ti-section">
            <h2 className="ti-h2">A háttérben — a minőség, ami nem látszik, de sokat számít</h2>
            <FeatureGrid items={HATTER} />
          </section>

          <section className="ti-section">
            <h2 className="ti-h2">Miért egyedi fejlesztés — és nem sablon?</h2>
            <FeatureGrid items={EGYEDI} />
          </section>

          <footer className="ti-footer">
            <p className="ti-outro">Kérdésed van, vagy konkrét ajánlatot szeretnél a saját vállalkozásodra? Keress bizalommal.</p>
            <a className="ti-download" href="/Termekismerteto.docx" download>Letöltés Word-dokumentumként</a>
          </footer>
        </article>
      </main>
      <Footer />
    </>
  )
}
