/**
 * Amba Traders — business details.
 *
 * Sources: shop signboard, business card, logo and Google listing supplied by the owner.
 * Anything left empty ('' or null) is shown on the site as a clearly marked
 * placeholder, e.g. "[Add Email Address]", so nothing is ever invented.
 */
export const business = {
  name: 'Amba Traders',
  tagline: 'Mfg. of Kurtis & 3 Pieces',

  logo: '/logo/amba-traders-mark.png', // square emblem (nav, favicon)
  logoFull: '/logo/amba-traders-logo.png', // full lock-up with name + tagline

  // People on the card / signboard. The first one is the default for "Enquire Now".
  // Both numbers are marked as WhatsApp on the signboard.
  contacts: [
    { name: 'Aryan Kanjani', phone: '+91 79909 41983', whatsapp: '917990941983' },
    { name: 'Mahendra Kanjani', phone: '+91 93741 61899', whatsapp: '919374161899' },
  ],
  email: '',

  address: [
    'C-Block, 344–345, 3rd Floor,',
    'Sumel Business Park, Safal-4,',
    'Nr. Kalupur Bridge, Amdupura,',
    'Ahmedabad – 380025',
  ],
  shopNumbers: 'C-343 & C-344',
  gstin: '24ALNPK9090N1ZC',
  hours: '',

  // Google listing link supplied by the owner.
  listingUrl: 'https://share.google/vEcVIzzi2EDq0JxNR',
  // Directions + embedded map are built from the address on the business card.
  mapQuery: 'Sumel Business Park, Safal-4, Nr. Kalupur Bridge, Amdupura, Ahmedabad 380025',

  shopImages: [
    {
      src: '/shop/amba-traders-storefront.webp',
      alt: 'Amba Traders storefront at Sumel Business Park — two glass-fronted shops with black Amba Traders signboards',
      width: 1250,
      height: 606,
    },
  ],

  about: '',

  // Only things the owner has stated (signboard, card).
  reasons: [
    {
      icon: 'store',
      title: 'We make what we sell',
      text: 'Amba Traders manufactures its own kurtis and 3-piece suit sets.',
    },
    {
      icon: 'shield',
      title: 'GST-registered business',
      text: 'Registered under GST — GSTIN 24ALNPK9090N1ZC.',
    },
    {
      icon: 'chat',
      title: 'Talk to us directly',
      text: 'Call or WhatsApp Aryan or Mahendra directly about any design.',
    },
  ],

  credit: 'Made by Jaykrishna Navlani',
};

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.mapQuery)}`;
export const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&z=17&output=embed`;

/** Placeholder labels shown wherever a detail is missing. */
export const PLACEHOLDER = {
  whatsapp: '[Add WhatsApp Number]',
  phone: '[Add Phone Number]',
  email: '[Add Email Address]',
  address: '[Add Shop Address]',
  hours: '[Add Business Hours]',
  about: '[Add a short description of Amba Traders]',
  price: '[Add Price]',
};
