import { useMemo } from 'react'
import { useLang } from '../LangContext'
import { cldThumb, alignStyle, sizeClass } from '../lib/portfolioPages'

// Hány képet mutat egy szekció (auto módban ennyit fogyaszt a kategória-poolból)
const IMG_COUNT = { text_images: 4, images_text: 4, images_only: 8, text_only: 0 }

export default function CategorySections({ sections, catItems, onImageClick }) {
  const { lang } = useLang()

  // Hibrid képfeloldás: kézi image_ids, vagy auto a kategória képeiből
  // (szekciónként a következő adag – így nem ismétlődik minden blokkban).
  const resolved = useMemo(() => {
    const byId = new Map(catItems.map((i) => [i.id, i]))
    let cursor = 0
    return sections.map((s) => {
      const count = IMG_COUNT[s.type] ?? 4
      let images = []
      if (count > 0) {
        if (s.image_ids && s.image_ids.length) {
          images = s.image_ids.map((id) => byId.get(id)).filter(Boolean)
        } else {
          images = catItems.slice(cursor, cursor + count)
          cursor += count
        }
      }
      return { ...s, _images: images }
    })
  }, [sections, catItems])

  const titleOf = (s) => (lang === 'hu' ? s.title_hu : s.title_en || s.title_hu)
  const bodyOf = (s) => (lang === 'hu' ? s.body_hu : s.body_en || s.body_hu)

  const Tile = (it, title) => (
    <button
      key={it.id}
      className="cat-tile"
      onClick={() => onImageClick(it)}
      aria-label={it.title || title || ''}
    >
      <img
        src={cldThumb(it.cloudinaryUrl || it.cloudinary_url, 800)}
        alt={it.title ? `${it.title}` : title || 'Kép — Hajdú Tamás fotós'}
        loading="lazy"
      />
      {(it.videoUrl || it.video_url) && <span className="cat-tile-play">▶</span>}
    </button>
  )

  return (
    <div className="cat-sections">
      {resolved.map((s) => {
        const title = titleOf(s)
        const body = bodyOf(s)

        const TextBlock = (
          <div className="cat-sec-text">
            {title && (
              <h2 className={`cat-sec-title ${sizeClass(s.title_size)}`} style={alignStyle(s.title_align)}>
                {title}
              </h2>
            )}
            {body && (
              <div className={sizeClass(s.body_size)} style={alignStyle(s.body_align)}>
                {body.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="cat-sec-p">{p}</p>
                ))}
              </div>
            )}
          </div>
        )

        if (s.type === 'text_only') {
          return (
            <section key={s.id} className="cat-section cat-section--text-only">
              {TextBlock}
            </section>
          )
        }

        if (s.type === 'images_only') {
          return (
            <section key={s.id} className="cat-section cat-section--images-only">
              {title && (
                <h2 className={`cat-sec-title ${sizeClass(s.title_size)}`} style={alignStyle(s.title_align)}>
                  {title}
                </h2>
              )}
              <div className="cat-grid">{s._images.map((it) => Tile(it, title))}</div>
            </section>
          )
        }

        // text_images (szöveg + 2x2) vagy images_text (2x2 + szöveg)
        const reversed = s.type === 'images_text'
        return (
          <section key={s.id} className={`cat-section cat-section--split ${reversed ? 'is-reversed' : ''}`}>
            {TextBlock}
            <div className="cat-sec-2x2">{s._images.map((it) => Tile(it, title))}</div>
          </section>
        )
      })}
    </div>
  )
}
