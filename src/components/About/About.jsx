import { business } from '../../data/business.js';
import { products, categories } from '../../data/products.js';
import { Reveal, SectionHead, SmartImage } from '../ui/ui.jsx';
import './About.css';

export default function About() {
  const shop = business.shopImages?.[0];
  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container about__inner">
        <div className="about__visual">
          {shop && (
            <Reveal className="about__photo">
              <SmartImage src={shop.src} alt={shop.alt} width={shop.width} height={shop.height} />
            </Reveal>
          )}
          <Reveal delay={200} className="about__logo">
            <img src={business.logoFull} alt="Amba Traders logo — Mfg of Kurti, 3 Pcs & More" width="420" height="455" loading="lazy" />
          </Reveal>
          <Reveal delay={320} className="about__tag glass">
            <span>Shops</span>
            <strong>{business.shopNumbers}</strong>
          </Reveal>
        </div>

        <div className="about__copy">
          <SectionHead id="about-title" eyebrow="About Us" title="Made by Amba Traders." />
          <Reveal>
            <p className="about__lead">
              {business.about ||
                'Amba Traders manufactures kurtis and 3-piece suit sets, from our shops at Sumel Business Park, near Kalupur Bridge in Ahmedabad.'}
            </p>
            <p className="about__text">
              Our current collection brings together {products.length} embroidered three-piece suit sets
              across {categories.length} fabric lines — from lustrous Roman Glass to airy Mul Chandery and
              textured Glass Shiffon Crush.
            </p>
            <ul className="about__lines">
              {categories.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
            <p className="about__gst">
              GSTIN <span>{business.gstin}</span>
            </p>
            <div className="about__actions">
              <a href="#location" className="btn btn--ghost">
                Visit the shop
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
