import LegalPage from './LegalPage'

// Adatkezelési tájékoztató – a szöveg a GDPR 13. cikkét követi.
// FONTOS: töltsd ki a [KITÖLTENDŐ] helyeket, és élesítés előtt nézesd át
// adatvédelmi szakértővel/ügyvéddel.
export default function Adatkezeles() {
  return (
    <LegalPage title="Adatkezelési tájékoztató">
      <p className="legal-updated">Hatályos: [DÁTUM]</p>

      <h2>1. Az adatkezelő</h2>
      <ul>
        <li><strong>Név:</strong> [KITÖLTENDŐ – Hajdu Tamás / a vállalkozás neve]</li>
        <li><strong>Székhely:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Nyilvántartási szám / cégjegyzékszám:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Adószám:</strong> [KITÖLTENDŐ]</li>
        <li><strong>E-mail:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Telefon:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Weboldal:</strong> https://hajdutamas.hu</li>
      </ul>
      <p>Adatvédelmi tisztviselő kijelölése nem kötelező, mivel az adatkezelés nem éri el a GDPR 37. cikke szerinti küszöböt.</p>

      <h2>2. A kezelt adatok köre, célja, jogalapja és megőrzési ideje</h2>

      <h3>2.1 Kapcsolatfelvétel (kapcsolati űrlap)</h3>
      <ul>
        <li><strong>Kezelt adatok:</strong> név, e-mail cím, az üzenet szövege, opcionálisan feltöltött kép(ek).</li>
        <li><strong>Cél:</strong> a megkeresés megválaszolása, kapcsolattartás, ajánlatadás.</li>
        <li><strong>Jogalap:</strong> az érintett hozzájárulása (GDPR 6. cikk (1) a)); illetve a szerződéskötést megelőző lépések (6. cikk (1) b)).</li>
        <li><strong>Megőrzés:</strong> a megkeresés lezárását követő [pl. 1 év], vagy a hozzájárulás visszavonásáig. Megbízás esetén a számviteli és elévülési szabályok szerint.</li>
      </ul>

      <h3>2.2 Visszaélés-megelőzés (spam-szűrés)</h3>
      <ul>
        <li><strong>Kezelt adatok:</strong> a beküldés időpontja és az IP-cím (kizárólag az automatizált visszaélések kiszűréséhez).</li>
        <li><strong>Cél:</strong> a kapcsolati űrlappal való visszaélés megakadályozása.</li>
        <li><strong>Jogalap:</strong> az adatkezelő jogos érdeke (6. cikk (1) f)).</li>
        <li><strong>Megőrzés:</strong> rövid idejű, a korlátozás céljához szükséges ideig.</li>
      </ul>

      <h3>2.3 Időpontfoglalás</h3>
      <ul>
        <li><strong>Kezelt adatok:</strong> név, e-mail cím, telefonszám, a foglalás adatai (időpont, szolgáltatás), üzenet.</li>
        <li><strong>Cél:</strong> időpont egyeztetése, visszaigazolás, a szolgáltatás teljesítése.</li>
        <li><strong>Jogalap:</strong> szerződés teljesítése, illetve szerződéskötést megelőző lépések (6. cikk (1) b)).</li>
        <li><strong>Megőrzés:</strong> a szolgáltatás teljesítését követően [pl. az elévülési idő szerint]. A lemondott/lejárt foglalásokat a rendszer automatikusan törli.</li>
      </ul>

      <h3>2.4 Sütik és technikai tárolás</h3>
      <ul>
        <li>A weboldal a működéséhez szükséges technikai tárolást használ (pl. a kiválasztott nyelv megjegyzése).</li>
        <li>Az admin bejelentkezés munkamenet-sütit használ – kizárólag az üzemeltetőt érinti.</li>
        <li><strong>Süti nélküli, névtelen látogatottság-mérés</strong> (nem tesz sütit, nincs állandó azonosító) – lásd a Süti tájékoztatót.</li>
        <li>A weboldal nem használ harmadik féltől származó, hozzájárulás-köteles marketing- vagy követő sütit.</li>
      </ul>

      <h3>2.5 Üzemeltetés és hibafigyelés</h3>
      <p>A stabil működés érdekében hibanaplózó szolgáltatás (GlitchTip) technikai adatokat (hibaüzenet, böngésző típusa, IP-cím) rögzíthet hiba esetén; a tárhelyszolgáltató (Vercel) szervernaplói szintén rögzítenek technikai adatokat. Jogalap: jogos érdek (6. cikk (1) f)).</p>

      <h2>3. Az adatszolgáltatás kötelező vagy önkéntes jellege</h2>
      <ul>
        <li><strong>Kapcsolatfelvétel:</strong> az adatok megadása önkéntes, hozzájáruláson alapul. Hiányában a megkeresés nem küldhető be.</li>
        <li><strong>Időpontfoglalás:</strong> a név, e-mail és telefonszám a foglalás teljesítéséhez szükséges. Ezek hiányában a foglalás nem dolgozható fel.</li>
      </ul>

      <h2>4. Adatfeldolgozók és címzettek</h2>
      <table className="legal-table">
        <thead><tr><th>Szolgáltató</th><th>Funkció</th><th>Székhely</th></tr></thead>
        <tbody>
          <tr><td>Supabase, Inc.</td><td>adatbázis, fájltárolás, hitelesítés</td><td>USA / EU</td></tr>
          <tr><td>Vercel, Inc.</td><td>tárhely, CDN, süti nélküli látogatottság-mérés</td><td>USA</td></tr>
          <tr><td>Cloudinary Ltd.</td><td>képtárolás és -kiszolgálás (CDN)</td><td>USA / Izrael</td></tr>
          <tr><td>Resend (Plexo, Inc.)</td><td>visszaigazoló / értesítő e-mailek</td><td>USA</td></tr>
          <tr><td>EmailJS</td><td>kapcsolati értesítő e-mail</td><td>USA</td></tr>
          <tr><td>GlitchTip (Burke Software and Consulting LLC)</td><td>hibafigyelés (app.glitchtip.com)</td><td>USA</td></tr>
          <tr><td>DotRoll Kft.</td><td>domain, DNS</td><td>Magyarország</td></tr>
        </tbody>
      </table>
      <p>Ezen felül az adatkezelő személyes adatot csak jogszabályi kötelezettség alapján, az arra jogosult hatóság hivatalos megkeresésére továbbít.</p>

      <h2>5. Adattovábbítás harmadik országba</h2>
      <p>Egyes adatfeldolgozók az EGT-n kívül (jellemzően az USA-ban) is kezelhetnek adatokat. Az adattovábbítás megfelelő garanciák mellett történik – az Európai Bizottság általános szerződési feltételei (SCC) és/vagy az EU–USA adatvédelmi keret alapján. A garanciák másolata a fenti elérhetőségen kérhető.</p>

      <h2>6. Automatizált döntéshozatal, profilalkotás</h2>
      <p>Az adatkezelő nem alkalmaz kizárólag automatizált adatkezelésen alapuló, az érintettre joghatással járó döntéshozatalt, és nem végez profilalkotást. A visszaélés-szűrés kizárólag technikai jellegű.</p>

      <h2>7. Az érintett jogai</h2>
      <p>Az érintett jogosult tájékoztatást és hozzáférést kérni (15. cikk), helyesbítést (16. cikk), törlést (17. cikk), az adatkezelés korlátozását (18. cikk), adathordozhatóságot (20. cikk), tiltakozni (21. cikk), valamint a hozzájárulását bármikor visszavonni (a visszavonás a korábbi adatkezelés jogszerűségét nem érinti).</p>
      <p>Ahol az adatkezelés jogos érdeken alapul, az érintett kérésére az adatkezelő tájékoztatást ad az érdekmérlegelési teszt szempontjairól. A kérelmeket a fenti e-mail címen lehet benyújtani; az adatkezelő legkésőbb egy hónapon belül válaszol.</p>

      <h2>8. Jogorvoslat</h2>
      <p>Panasz esetén az érintett a felügyeleti hatósághoz fordulhat:</p>
      <ul>
        <li><strong>Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</strong></li>
        <li>Cím: 1055 Budapest, Falk Miksa utca 9-11.</li>
        <li>Postacím: 1363 Budapest, Pf. 9.</li>
        <li>Telefon: +36 (1) 391-1400</li>
        <li>E-mail: ugyfelszolgalat@naih.hu &nbsp;|&nbsp; Web: naih.hu</li>
      </ul>
      <p>Az érintett bírósághoz is fordulhat.</p>

      <h2>9. Adatbiztonság</h2>
      <p>Az adatkezelő megfelelő technikai és szervezési intézkedéseket alkalmaz: titkosított (HTTPS) kapcsolat, hozzáférés-korlátozás, adatbázis-szintű biztonsági szabályok, aláírt fájlfeltöltés.</p>

      <h2>10. Az adatok más célból történő kezelése</h2>
      <p>Ha az adatkezelő a személyes adatokat a gyűjtésük céljától eltérő célból kívánja kezelni, a további adatkezelést megelőzően tájékoztatja az érintettet az eltérő célról.</p>

      <h2>11. A tájékoztató módosítása</h2>
      <p>Az adatkezelő fenntartja a jogot a tájékoztató módosítására. A mindenkor hatályos változat a weboldalon érhető el.</p>

      <h2>Süti (cookie) tájékoztató</h2>
      <p>A süti egy kis adatfájl, amelyet a weboldal a böngésződben tárol. Ez a weboldal:</p>
      <ul>
        <li><strong>Működéshez szükséges (funkcionális) tárolást</strong> használ (pl. a kiválasztott nyelv). Ehhez nem kell hozzájárulás.</li>
        <li><strong>Süti nélküli, névtelen látogatottság-mérést</strong> használ (Vercel Web Analytics), amely nem tesz sütit és nem használ állandó azonosítót – ezért nem igényel hozzájárulást.</li>
        <li><strong>Adminisztrációs munkamenetet</strong> csak az üzemeltető bejelentkezésekor; a látogatókat nem érinti.</li>
        <li><strong>Harmadik féltől származó marketing-/követő sütit</strong> jelenleg nem használ.</li>
      </ul>
      <p>A sütiket a böngésződ beállításaiban bármikor törölheted vagy korlátozhatod.</p>
    </LegalPage>
  )
}