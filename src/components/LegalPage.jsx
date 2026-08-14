import Navbar from './Navbar'
import Footer from './Footer'
import { useLang } from '../LangContext'
import '../Styles/Legal.css'

// Közös keret a jogi aloldalakhoz (Adatkezelés, Impresszum): navbar felül,
// tartalom középen, footer alul, plusz egy "Főoldal" vissza-link.
export default function LegalPage({ title, children }) {
  const { lang } = useLang()
  return (
    <>
      <Navbar subpage />
      <main className="legal-page">
        <div className="legal-inner">
          <a href="/" className="legal-home">← {lang === 'hu' ? 'Főoldal' : 'Home'}</a>
          <h1 className="legal-title">{title}</h1>
          <div className="legal-content">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}