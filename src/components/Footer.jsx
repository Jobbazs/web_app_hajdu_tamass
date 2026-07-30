import { useLang } from '../LangContext'
import { OWNER } from '../data'
import '../Styles/Footer.css'

export default function Footer() {
  const { t } = useLang()

  // A social linkek átkerültek a navbarba (ikonokkal). A CMS-ben a
  // beállítások változatlanul a footer_socials kulcson maradnak.
  return (
    <footer>
      <div className="footer-logo">
        {OWNER.nameShort}<span className="logo-accent">.</span>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} — {t.footer.copy}</div>
    </footer>
  )
}
