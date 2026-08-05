// ============================================================
// PORTFÓLIÓ ADATOK – itt cseréld le a Cloudinary URL-eket
// ============================================================

export const OWNER = {
  name: "Hajdu Tamás",
  nameShort: "NOX",
  title: "Fotós & Videós",
  location: "Budapest, Magyarország",
  bio1: "Budapesti fotós és videós vagyok, aki bulik, rendezvények és underground helyszínek dokumentálására specializálódott. Az Arsenal, a Lärm és a hasonló helyek a természetes közegem.",
  bio2: "Kezdő videoklipp-forgató – hiszek abban, hogy a mozgókép ugyanolyan nyers igazságot tud mutatni, mint egy jó állókép. Portrékon, urbex helyszíneken és utcán is otthon vagyok.",
  bio3: "Nem szépítem az életet. Megmutatom, ahogy van.",
  email: "tamasshajdu@gmail.com",
  instagram: "https://www.instagram.com/hajdutamass/",
  facebook: "https://www.facebook.com/HajduNOXTamas",
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