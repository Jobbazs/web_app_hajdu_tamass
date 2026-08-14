import LegalPage from './LegalPage'

// Impresszum – töltsd ki a [KITÖLTENDŐ] helyeket a vállalkozási adataiddal.
// A tárhely- és domain-szolgáltató a weboldal tényleges beállítása alapján.
export default function Impresszum() {
  return (
    <LegalPage title="Impresszum">
      <h2>A szolgáltató (üzemeltető) adatai</h2>
      <ul>
        <li><strong>Név:</strong> [KITÖLTENDŐ – Hajdu Tamás / a vállalkozás neve]</li>
        <li><strong>Székhely:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Nyilvántartási szám (egyéni vállalkozó) / cégjegyzékszám:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Adószám:</strong> [KITÖLTENDŐ]</li>
        <li><strong>E-mail:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Telefon:</strong> [KITÖLTENDŐ]</li>
        <li><strong>Weboldal:</strong> https://hajdutamas.hu</li>
      </ul>

      <h2>Tárhelyszolgáltató</h2>
      <ul>
        <li><strong>Név:</strong> Vercel, Inc.</li>
        <li><strong>Cím:</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
        <li><strong>E-mail:</strong> privacy@vercel.com &nbsp;|&nbsp; Web: vercel.com</li>
      </ul>

      <h2>Domain / DNS-szolgáltató</h2>
      <ul>
        <li><strong>Név:</strong> DotRoll Kft.</li>
        <li><strong>Cím:</strong> 1148 Budapest, Fogarasi út 3-5.</li>
        <li><strong>E-mail:</strong> support@dotroll.com &nbsp;|&nbsp; Web: dotroll.com</li>
      </ul>

      <h2>Adatkezelés</h2>
      <p>A weboldal adatkezelésével kapcsolatos részletes tájékoztatást az <a href="/adatkezeles">Adatkezelési tájékoztató</a> tartalmazza.</p>

      <h2>Szerzői jog</h2>
      <p>A weboldalon megjelenő valamennyi kép és tartalom szerzői jogi védelem alatt áll. Engedély nélküli felhasználásuk, másolásuk, terjesztésük tilos. © [ÉV] [KITÖLTENDŐ – név]. Minden jog fenntartva.</p>
    </LegalPage>
  )
}