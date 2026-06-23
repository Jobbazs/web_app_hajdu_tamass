import { useLang } from '../LangContext'
import { OWNER } from '../data'
import '../Styles/Footer.css'

export default function Footer() {
  const { t } = useLang()
  return (
    <footer>
      <div className="footer-logo">
        {OWNER.nameShort}<span className="logo-accent">.</span>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} — {t.footer.copy}</div>
      <div className="footer-socials">
        <a href={OWNER.instagram} target="_blank" rel="https://www.instagram.com/hajdutamass/">Instagram</a>
        {/* <a href={OWNER.tiktok}    target="_blank" rel="noreferrer">TikTok</a> */}
        {/* <a href={OWNER.behance}   target="_blank" rel="noreferrer">Behance</a> */}
      </div>
    </footer>
  )
}
