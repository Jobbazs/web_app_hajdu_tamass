import { createContext, useContext, useState, useEffect } from 'react'

// ============================================================
// FORDÍTÁSOK
// ============================================================
export const TRANSLATIONS = {
  hu: {
    // Meta (document.title / meta description nyelvváltáskor)
    meta: {
      title:       'Hajdu Tamás — Fotós & Videós | Budapest',
      description: 'Budapesti fotós és videós. Rendezvények, underground bulik, portrék, videóklippek. Arzenál és hasonló helyszínek.',
    },
    // Navbar
    nav: {
      about:    'Rólam',
      portfolio:'Portfólió',
      services: 'Szolgáltatások',
      contact:  'Kapcsolat',
    },
    // Hero
    hero: {
      eyebrow:   'Fotós & Videós',
      line1:     'Ahol a fény',
      line2:     'meghal.',
      subtitle:  'Rendezvények, underground helyszínek, portrék és urbex — a képek, amelyek megmaradnak.',
      cta:       'Portfólió megtekintése',
      scroll:    'Görgess',
    },
    // About
    about: {
      label:   'Rólam',
      title1:  'A kamera',
      title2:  'mögött',
      bio1:    'Budapesti fotós és videós vagyok, aki bulik, rendezvények és underground helyszínek dokumentálására specializálódott. Az Arsenal, a Lärm és a hasonló helyek a természetes közegem.',
      bio2:    'Kezdő videoklipp-forgató – hiszek abban, hogy a mozgókép ugyanolyan nyers igazságot tud mutatni, mint egy jó állókép. Portrékon, urbex helyszíneken és utcán is otthon vagyok.',
      bio3:    'Nem szépítem az életet. Megmutatom, ahogy van.',
      tags:    ['Rendezvény', 'Rave / Buli', 'Videóklipp', 'Portré', 'Urbex'],
      imgAlt:  'Portré fotó',
    },
    // Portfolio
    portfolio: {
      label:   'Munkáim',
      title:   'Portfólió',
      filters: {
        all:      'Mind',
        event:    'Rendezvény',
        portrait: 'Portré',
        video:    'Videó',
        urbex:    'Urbex',
      },
    },
    // Modal
    modal: {
      prev:         'Előző',
      next:         'Következő →',
      close:        'Bezár',
      noVideo:      'Videó URL nincs megadva.',
      noVideoHint:  'Add hozzá a videoUrl mezőt a data.js-ben.',
    },
    // Services
    services: {
      label: 'Mit kínálok',
      title: 'Szolgáltatások',
      items: [
        { id: '01', name: 'Rendezvény & Buli',  desc: 'Bulik, rávek, underground partik dokumentálása. Teljes éjszakás jelenlét, szerkesztett képsorozat leadás másnapra.' },
        { id: '02', name: 'Portré & Stúdió',    desc: 'Stúdió- és outdoor portrék. Természetes és konceptuális megközelítéssel, professzionális retussal.' },
        { id: '03', name: 'Videóklipp',          desc: 'Zenészeknek és előadóknak. Helyszíni forgatás, vágás, color grading. Egyedi vizuális nyelv minden projekthez.' },
      ],
    },
    // Contact
    contact: {
      label:       'Írj nekem',
      title:       'Kapcsolat',
      intro:       'Legyen szó rendezvényről, klippről vagy egyedi projektről – szívesen hallom az elképzeléseidet.',
      name:        'Neved',
      namePh:      'Kis János',
      email:       'Email',
      emailPh:     'valaki@email.com',
      service:     'Szolgáltatás',
      message:     'Üzeneted',
      messagePh:   'Meséld el az elképzelésed...',
      send:        'Üzenet küldése →',
      sending:     'Küldés...',
      success:     '✓  Üzeneted megérkezett! Hamarosan visszajelzek.',
      errName:     'Kérlek add meg a neved.',
      errEmail:    'Érvényes email szükséges.',
      errMessage:  'Az üzenet mező nem lehet üres.',
      errSend:      'Hiba történt az elküldés során. Kérlek próbáld újra.',
      attachBtn:    'Inspiráció csatolása',
      attachHint:   'JPG, PNG, WEBP, HEIC – max. 10 MB',
      attachRemove: 'Eltávolít',
      errFileType:  'Csak képfájl tölthető fel (JPG, PNG, WEBP, HEIC, GIF).',
      errFileSize:  'A fájl mérete maximum 10 MB lehet.',
      errUpload:    'Feltöltési hiba. Kérlek próbáld újra.',
      serviceOptions: [
        'Válassz...',
        'Rendezvény / Buli fotózás',
        'Portré fotózás',
        'Videóklipp forgatás',
        'Egyéb',
      ],
    },
    // ThankYou popup
    thankYou: {
      eyebrow:      'Üzenet elküldve',
      titleLine1:   'Köszönöm,',
      titleLine2:   'hogy megkerestél.',
      body:         'Hamarosan visszajelzek. Addig is nézd meg a portfóliómat.',
      bodyWithName: 'Hamarosan visszajelzek, {name}. Addig is nézd meg a portfóliómat.',
      closeBtn:     'Vissza az oldalra',
      dismiss:      'Bezárás',
    },
    // Footer
    footer: {
      copy: 'Budapest, Magyarország',
    },
  },

  en: {
    // Meta (document.title / meta description on language switch)
    meta: {
      title:       'Hajdu Tamás — Photographer & Videographer | Budapest',
      description: 'Budapest-based photographer and videographer. Events, underground parties, portraits, music videos.',
    },
    nav: {
      about:    'About',
      portfolio:'Portfolio',
      services: 'Services',
      contact:  'Contact',
    },
    hero: {
      eyebrow:  'Photographer & Videographer',
      line1:    'Where the light',
      line2:    'dies.',
      subtitle: 'Events, underground venues, portraits and urbex — images that stay with you.',
      cta:      'View Portfolio',
      scroll:   'Scroll',
    },
    about: {
      label:  'About',
      title1: 'Behind the',
      title2: 'camera',
      bio1:   'Budapest-based photographer and videographer specializing in parties, events and underground venues. Arsenal, Lärm and similar places are my natural habitat.',
      bio2:   'Aspiring music video director – I believe moving image can carry the same raw truth as a still. I also shoot portraits, urbex locations and street.',
      bio3:   "I don't beautify life. I show it as it is.",
      tags:   ['Events', 'Rave / Party', 'Music Video', 'Portrait', 'Urbex'],
      imgAlt: 'Portrait photo',
    },
    portfolio: {
      label:   'My Work',
      title:   'Portfolio',
      filters: {
        all:      'All',
        event:    'Event',
        portrait: 'Portrait',
        video:    'Video',
        urbex:    'Urbex',
      },
    },
    modal: {
      prev:        '← Previous',
      next:        'Next →',
      close:       'Close',
      noVideo:     'No video URL provided.',
      noVideoHint: 'Add the videoUrl field in data.js.',
    },
    services: {
      label: 'What I offer',
      title: 'Services',
      items: [
        { id: '01', name: 'Event & Party',    desc: 'Parties, raves, underground events. Full-night coverage with edited photo sets delivered the next day.' },
        { id: '02', name: 'Portrait & Studio',desc: 'Studio and outdoor portraits. Natural and conceptual approaches with professional retouching.' },
        { id: '03', name: 'Music Video',      desc: 'For musicians and performers. On-location shooting, editing, color grading. A unique visual language for every project.' },
      ],
    },
    contact: {
      label:      'Get in touch',
      title:      'Contact',
      intro:      "Whether it's an event, a music video or a unique project — I'd love to hear your idea.",
      name:       'Your name',
      namePh:     'John Smith',
      email:      'Email',
      emailPh:    'someone@email.com',
      service:    'Service',
      message:    'Your message',
      messagePh:  'Tell me about your idea...',
      send:       'Send message →',
      sending:    'Sending...',
      success:    '✓  Message received! I will get back to you soon.',
      errName:    'Please enter your name.',
      errEmail:   'A valid email address is required.',
      errMessage: 'The message field cannot be empty.',
      errSend:      'Something went wrong. Please try again.',
      attachBtn:    'Attach inspiration',
      attachHint:   'JPG, PNG, WEBP, HEIC – max. 10 MB',
      attachRemove: 'Remove',
      errFileType:  'Only image files are accepted (JPG, PNG, WEBP, HEIC, GIF).',
      errFileSize:  'File size must be under 10 MB.',
      errUpload:    'Upload error. Please try again.',
      serviceOptions: [
        'Choose...',
        'Event / Party photography',
        'Portrait photography',
        'Music video',
        'Other',
      ],
    },
    // ThankYou popup
    thankYou: {
      eyebrow:      'Message sent',
      titleLine1:   'Thank you',
      titleLine2:   'for reaching out.',
      body:         "I'll get back to you soon. In the meantime, explore my portfolio.",
      bodyWithName: "I'll get back to you soon, {name}. In the meantime, explore my portfolio.",
      closeBtn:     'Back to the site',
      dismiss:      'Close',
    },
    // Footer
    footer: {
      copy: 'Budapest, Hungary',
    },
  },
}

// ============================================================
// CONTEXT
// ============================================================
const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState('hu')
  const t = TRANSLATIONS[lang]
  const toggleLang = () => setLang(l => l === 'hu' ? 'en' : 'hu')

  // SEO: document.title, meta description és <html lang> szinkronban tartása
  // a felhasználó által épp választott nyelvvel, hogy a keresőmotorok és
  // a képernyőolvasók a ténylegesen látott nyelvet lássák.
  useEffect(() => {
    document.documentElement.lang = lang

    if (t.meta?.title) document.title = t.meta.title

    if (t.meta?.description) {
      let descTag = document.querySelector('meta[name="description"]')
      if (!descTag) {
        descTag = document.createElement('meta')
        descTag.setAttribute('name', 'description')
        document.head.appendChild(descTag)
      }
      descTag.setAttribute('content', t.meta.description)
    }

    const ogLocale = document.querySelector('meta[property="og:locale"]')
    if (ogLocale) ogLocale.setAttribute('content', lang === 'hu' ? 'hu_HU' : 'en_US')
  }, [lang, t])

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
