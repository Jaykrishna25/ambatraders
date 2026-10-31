import { business, directionsUrl } from '../../data/business.js';
import { useCatalog } from '../../lib/catalog.jsx';
import { phoneHref } from '../../lib/contact.js';
import './Footer.css';

const year = new Date().getFullYear();

export default function Footer({ onCategory }) {
  const { categories } = useCatalog();
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a href="#home" className="footer__logo" aria-label="Amba Traders — back to top">
            <img src={business.logoFull} alt="Amba Traders — Mfg of Kurti, 3 Pcs & More" width="420" height="455" loading="lazy" />
          </a>
          <p>{business.tagline}. Embroidered 3-piece suit sets in Roman Glass, Mul Chandery and Glass Shiffon.</p>
        </div>

        <nav className="footer__col" aria-label="Collections">
          <h2>Collections</h2>
          <ul>
            {categories.map((c) => (
              <li key={c.id}>
                <a href="#products" onClick={() => onCategory(c.id)}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__col">
          <h2>Visit &amp; Contact</h2>
          <address>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="footer__addr">
              {business.address.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </a>
            <ul>
              {business.contacts.map((p) => (
                <li key={p.name}>
                  <a href={phoneHref(p)}>
                    {p.phone} <span>· {p.name.split(' ')[0]}</span>
                  </a>
                </li>
              ))}
              {business.listingUrl && (
                <li>
                  <a href={business.listingUrl} target="_blank" rel="noopener noreferrer">
                    Google listing ↗
                  </a>
                </li>
              )}
            </ul>
          </address>
        </div>
      </div>

      <div className="container footer__base">
        <p>
          © {year} {business.name}. All rights reserved. · GSTIN {business.gstin}
        </p>
        {business.credit && <p>{business.credit}</p>}
      </div>
    </footer>
  );
}
