/**
 * Amba Traders — product catalogue (manufactured by Amba Traders).
 *
 * Fabric, bottom, dupatta and size details are taken from the text printed
 * on each supplier catalogue card. Colour names describe the photo.
 *
 * To add a product: drop the image(s) in /public/products and /public/models,
 * then add an entry below. `price` is shown only when set (e.g. '₹1,299').
 */

export const categories = [
  {
    id: 'roman-glass',
    name: 'Roman Glass Sets',
    blurb: 'Lustrous Roman Glass kurtas with matching pocket pants and jacquard dupattas.',
    cover: '/models/1130-roman-glass-ivory.webp',
  },
  {
    id: 'roman-glass-palazzo',
    name: 'Roman Glass Palazzo',
    blurb: 'Short embroidered kurtas with wide pocket palazzos — many with embroidered hems.',
    cover: '/models/1252-roman-glass-palazzo-azure.webp',
  },
  {
    id: 'mul-chandery-ghera',
    name: 'Mul Chandery Ghera',
    blurb: 'Flared, gathered kurtas with embroidered yokes and Roman pants.',
    cover: '/models/1153-mul-chandery-ghera-violet.webp',
  },
  {
    id: 'mul-chandery',
    name: 'Mul Chandery Sets',
    blurb: 'Straight-cut Mul Chandery kurtas with pocket pants and worked dupattas.',
    cover: '/models/1205-mul-chandery-magenta.webp',
  },
  {
    id: 'glass-shiffon',
    name: 'Glass Shiffon Crush',
    blurb: 'Textured crush-finish kurtas with pocket pants and jacquard dupattas.',
    cover: '/models/1180-glass-shiffon-crush-rose.webp',
  },
];

const SIZES = 'M to XXL';

const p = (dno, slug, category, colour, details, description) => ({
  id: String(dno),
  dno,
  name: `${colour} ${details.fabric}`,
  colour,
  category,
  ...details,
  description,
  price: null,
  image: `/products/${dno}-${slug}.webp`,
  thumb: `/products/${dno}-${slug}-sm.webp`,
  model: `/models/${dno}-${slug}.webp`,
});

const romanGlass = { fabric: 'Roman Glass Set', pieces: 3, bottom: 'Pant with pocket', dupatta: 'Jacquard dupatta', sizes: SIZES };
const romanPalazzo = { fabric: 'Roman Glass Palazzo Set', pieces: 3, bottom: 'Palazzo with pocket', dupatta: 'Dupatta work', sizes: null };
const romanPalazzoJacquard = { ...romanPalazzo, dupatta: 'Jacquard dupatta' };
const romanPalazzoFull = { ...romanPalazzo, dupatta: 'Roman Glass dupatta', sizes: SIZES };
const ghera = { fabric: 'Mul Chandery Ghera Set', pieces: 3, bottom: 'Roman pant', dupatta: 'Dupatta work', sizes: SIZES };
const mul = { fabric: 'Mul Chandery Set', pieces: 3, bottom: 'Pant with pocket', dupatta: 'Dupatta work', sizes: SIZES };
const shiffon = { fabric: 'Glass Shiffon Crush Set', pieces: 3, bottom: 'Pant with pocket', dupatta: 'Jacquard dupatta', sizes: SIZES };

export const products = [
  // Roman Glass — pant sets
  p(1130, 'roman-glass-ivory', 'roman-glass', 'Ivory', romanGlass,
    'Ivory kurta with pastel pink-and-blue floral embroidery and a scalloped hem border.'),
  p(1131, 'roman-glass-champagne', 'roman-glass', 'Champagne', romanGlass,
    'Champagne kurta with gold leaf work and soft pink floral sprays.'),
  p(1170, 'roman-glass-sage', 'roman-glass', 'Sage Green', romanGlass,
    'Sage kurta with a multicolour embroidered placket and border, gold-buti dupatta.'),
  p(1171, 'roman-glass-lavender', 'roman-glass', 'Lavender', romanGlass,
    'Lavender kurta with pastel floral embroidery and sequin detailing.'),
  p(1172, 'roman-glass-rose', 'roman-glass', 'Rose Pink', romanGlass,
    'Rose kurta with a beaded placket and multicolour floral hem.'),
  p(1173, 'roman-glass-powder-blue', 'roman-glass', 'Powder Blue', romanGlass,
    'Powder-blue kurta with silver neckline work and pastel flower border.'),
  p(1174, 'roman-glass-pearl-white', 'roman-glass', 'Pearl White', romanGlass,
    'Pearl-white kurta with a colourful beaded placket and rainbow floral hem.'),

  // Roman Glass — palazzo sets
  p(1120, 'roman-glass-palazzo-lilac', 'roman-glass-palazzo', 'Lilac', romanPalazzo,
    'Lilac short kurta with pearl neckline and gold embroidered border.'),
  p(1121, 'roman-glass-palazzo-teal', 'roman-glass-palazzo', 'Teal', romanPalazzo,
    'Teal short kurta with a gold geometric-floral hem and scalloped dupatta.'),
  p(1122, 'roman-glass-palazzo-mauve', 'roman-glass-palazzo', 'Mauve', romanPalazzoJacquard,
    'Mauve kurta with a pearl-trimmed neckline and gold floral border.'),
  p(1123, 'roman-glass-palazzo-olive', 'roman-glass-palazzo', 'Olive', romanPalazzo,
    'Olive kurta with a pearl neckline, ivory floral hem and scalloped dupatta.'),
  p(1250, 'roman-glass-palazzo-moss', 'roman-glass-palazzo', 'Moss Grey', romanPalazzoFull,
    'Moss-grey kurta and embroidered palazzo with ivory floral vines and a pearl neckline.'),
  p(1251, 'roman-glass-palazzo-plum', 'roman-glass-palazzo', 'Plum', romanPalazzoFull,
    'Plum kurta and embroidered palazzo with gold floral borders and a beaded neckline.'),
  p(1252, 'roman-glass-palazzo-azure', 'roman-glass-palazzo', 'Azure Blue', romanPalazzoFull,
    'Azure kurta and embroidered palazzo with silver geometric-floral work and pearl neckline.'),
  p(1253, 'roman-glass-palazzo-orchid', 'roman-glass-palazzo', 'Orchid', romanPalazzoFull,
    'Orchid kurta and embroidered palazzo with gold paisley borders and stone-set neckline.'),

  // Mul Chandery Ghera
  p(1150, 'mul-chandery-ghera-rani', 'mul-chandery-ghera', 'Rani Pink', ghera,
    'Rani-pink flared kurta with a bold multicolour floral yoke.'),
  p(1151, 'mul-chandery-ghera-sky', 'mul-chandery-ghera', 'Sky Blue', ghera,
    'Sky-blue flared kurta with a paisley embroidered yoke and sequin dupatta.'),
  p(1152, 'mul-chandery-ghera-stone', 'mul-chandery-ghera', 'Stone Grey', ghera,
    'Stone-grey flared kurta with a pink rose yoke and teal-buti dupatta.'),
  p(1153, 'mul-chandery-ghera-violet', 'mul-chandery-ghera', 'Violet', ghera,
    'Violet flared kurta with a vibrant floral yoke and embroidered cuffs.'),

  // Mul Chandery — pant sets
  p(1201, 'mul-chandery-rose', 'mul-chandery', 'Rose', mul,
    'Rose kurta with ivory neckline work and pink-and-olive star florals.'),
  p(1202, 'mul-chandery-periwinkle', 'mul-chandery', 'Periwinkle', mul,
    'Periwinkle kurta with a gold sequin placket and floral motif.'),
  p(1203, 'mul-chandery-pista', 'mul-chandery', 'Pista Green', mul,
    'Pista-green kurta with pink floral embroidery and sequin accents.'),
  p(1204, 'mul-chandery-olive', 'mul-chandery', 'Olive', mul,
    'Olive kurta with ivory and pink floral embroidery.'),
  p(1205, 'mul-chandery-magenta', 'mul-chandery', 'Magenta', mul,
    'Magenta kurta with ivory neckline work and green floral motifs.'),

  // Glass Shiffon Crush
  p(1180, 'glass-shiffon-crush-rose', 'glass-shiffon', 'Rose', shiffon,
    'Rose crush kurta with pastel appliqué-style leaf embroidery.'),
  p(1181, 'glass-shiffon-crush-beige', 'glass-shiffon', 'Beige', shiffon,
    'Beige crush kurta with brown floral embroidery and pearl centres.'),
];

export const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? id;
