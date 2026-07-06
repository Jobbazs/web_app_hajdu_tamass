import { useLang } from '../LangContext'
import { useSiteContent } from '../hooks'
import { OWNER } from '../data'
import '../Styles/Footer.css'

export default function Footer() {
  const { t }       = useLang()
  const { content } = useSiteContent()

  // Social linkek – site_content-ből (JSON), fallback az OWNER-re
  let socials = []
  try {
    const raw = content['footer_socials']
    if (raw) socials = JSON.parse(raw)
  } catch {}

  // Fallback ha még nincs DB-ben
  if (!socials.length && OWNER.instagram) {
    socials = [{ label: 'Instagram', url: OWNER.instagram }]
  }

  return (
    <footer>
      <div className="footer-logo">
        {OWNER.nameShort}<span className="logo-accent">.</span>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} — {t.footer.copy}</div>
      <div className="footer-socials">
        {socials.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
        ))}
      </div>
    </footer>
  )
}
