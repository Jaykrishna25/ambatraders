import { business } from '../data/business.js';

const digits = (v) => (v || '').replace(/\D/g, '');
const primary = () => business.contacts?.[0];

export const whatsappHref = (
  message = 'Hello Amba Traders, I would like to know more about your collection.',
  contact = primary(),
) => (contact?.whatsapp ? `https://wa.me/${digits(contact.whatsapp)}?text=${encodeURIComponent(message)}` : null);

export const phoneHref = (contact = primary()) => (contact?.phone ? `tel:+${digits(contact.phone)}` : null);

/** Best available enquiry action for a product. Falls back to the contact section. */
export function enquiry(product) {
  const msg = `Hello Amba Traders, I'd like to enquire about D.No ${product.dno} (${product.name}).`;
  const wa = whatsappHref(msg);
  if (wa) return { href: wa, external: true, label: 'WhatsApp' };
  const tel = phoneHref();
  if (tel) return { href: tel, external: false, label: 'Call' };
  return { href: '#contact', external: false, label: 'Contact' };
}
