import { useLang } from '../LangContext'
import '../Styles/Footer.css'

export default function Footer() {
  const { t, lang } = useLang()

  // A social linkek átkerültek a navbarba (ikonokkal). A CMS-ben a
  // beállítások változatlanul a footer_socials kulcson maradnak.
  return (
    <footer>
      <div className="footer-copy">© {new Date().getFullYear()} — {t.footer.copy}</div>
      <div className="footer-legal">
        <a href="/adatkezeles">{lang === 'hu' ? 'Adatkezelési tájékoztató' : 'Privacy Policy'}</a>
        <a href="/impresszum">{lang === 'hu' ? 'Impresszum' : 'Imprint'}</a>
      </div>
    </footer>
  )
}