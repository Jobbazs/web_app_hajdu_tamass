import { useLang } from '../LangContext'
import { useServices } from '../hooks'

export default function Services() {
  const { lang, t } = useLang()
  const { services, loading } = useServices()
  const s = t.services

  // Ha Supabase-ből már töltött, azt használja – fallback a LangContext-re
  const items = services.length > 0
    ? services.map(svc => ({
        id:   svc.number,
        name: lang === 'hu' ? svc.name_hu : svc.name_en,
        desc: lang === 'hu' ? svc.desc_hu : svc.desc_en,
      }))
    : s.items

  return (
    <section id="services">
      <div className="container">
        <div className="section-label">{s.label}</div>
        <h2 className="section-title">{s.title}</h2>
        <div className="services-grid">
          {items.map(item => (
            <div key={item.id} className="service-card">
              <div className="service-number">{item.id}</div>
              <div className="service-name">{item.name}</div>
              <p className="service-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
