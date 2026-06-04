// ============================================================
// PORTFÓLIÓ ADATOK – itt cseréld le a Cloudinary URL-eket
// ============================================================

export const OWNER = {
  name: "Hajdú Tamáss",
  nameShort: "NOX",
  title: "Fotós & Videós",
  location: "Budapest, Magyarország",
  bio1: "Budapesti fotós és videós vagyok, aki bulik, rendezvények és underground helyszínek dokumentálására specializálódott. Az Arsenal, a Lärm és a hasonló helyek a természetes közegem.",
  bio2: "Kezdő videoklipp-forgató – hiszek abban, hogy a mozgókép ugyanolyan nyers igazságot tud mutatni, mint egy jó állókép. Portrékon, urbex helyszíneken és utcán is otthon vagyok.",
  bio3: "Nem szépítem az életet. Megmutatom, ahogy van.",
  email: "grega.balazs@gmail.com",
  instagram: "https://www.instagram.com/hajdutamass/?hl=hu",
  // tiktok: "https://tiktok.com/",
  // behance: "https://behance.net/",
  portraitUrl:
    "https://res.cloudinary.com/dpeavk0xh/image/upload/f_auto,q_auto/My%20Brand/DSC_6589_urvqzb", // Cloudinary URL a portréhoz
  // Cloudinary URL a portréhoz
};

export const SERVICES = [
  {
    id: "01",
    name: "Rendezvény & Buli",
    description:
      "Bulik, rávek, underground partik dokumentálása. Teljes éjszakás jelenlét, szerkesztett képsorozat leadás másnapra.",
  },
  {
    id: "02",
    name: "Portré & Stúdió",
    description:
      "Stúdió- és outdoor portrék. Természetes és konceptuális megközelítéssel, professzionális retussal.",
  },
  {
    id: "03",
    name: "Videóklipp",
    description:
      "Zenészeknek és előadóknak. Helyszíni forgatás, vágás, color grading. Egyedi vizuális nyelv minden projekthez.",
  },
];

export const PORTFOLIO_ITEMS = [
  // ── MEZŐK MAGYARÁZATA ──────────────────────────────────────────────────────
  // cloudinaryUrl : a thumbnail/kép URL-je (image/upload/...)
  // videoUrl      : CSAK videóknál töltsd ki (video/upload/...)
  //                 Ha üres marad, a modal figyelmeztet, de nem crashel
  // category      : 'event' | 'portrait' | 'video' | 'urbex'
  // span          : 'large' | 'medium' | 'small'  (rácson belüli méret)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 1,
    title: "Arsenal — 2024.03",
    category: "event",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
    span: "large",
  },
  {
    id: 2,
    title: "Portré — Stúdió",
    category: "portrait",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
    span: "medium",
  },
  {
    id: 3,
    title: "Urbex — Keleti",
    category: "urbex",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1518709779341-56cf4535e94b?w=600&q=80",
    span: "medium",
  },
  {
    id: 4,
    title: "Lärm — 2024",
    category: "event",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    span: "medium",
  },
  {
    id: 5,
    title: "Portré — Utca",
    category: "portrait",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    span: "small",
  },
  {
    id: 6,
    title: "Klipp — 2024",
    category: "video",
    // thumbnail: Cloudinary auto-generált videó előnézet (so_2 = 2. mp-nél)
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&q=80",
    // videoUrl: ide jön a Cloudinary video/upload URL-ed
    // Példa: 'https://res.cloudinary.com/CLOUD_NAME/video/upload/f_auto,q_auto/portfolio/klipp-2024.mp4'
    videoUrl: "",
    span: "medium",
  },
  {
    id: 7,
    title: "Természet",
    category: "urbex",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
    span: "small",
  },
  {
    id: 8,
    title: "Rendezvény",
    category: "event",
    cloudinaryUrl:
      "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80",
    span: "small",
  },
];

export const FILTER_LABELS = {
  all: "Mind",
  event: "Rendezvény",
  portrait: "Portré",
  video: "Videó",
  urbex: "Urbex",
};

export const SERVICE_OPTIONS = [
  "Válassz...",
  "Rendezvény / Buli fotózás",
  "Portré fotózás",
  "Videóklipp forgatás",
  "Egyéb",
];
