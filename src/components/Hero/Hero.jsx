import { useEffect, useRef } from 'react';
import { Icon } from '../ui/ui.jsx';
import { directionsUrl } from '../../data/business.js';
import { useCatalog } from '../../lib/catalog.jsx';
import { prefersReducedMotion } from '../../lib/motion.js';
import './Hero.css';

const FEATURED = ['1153', '1130', '1150'];

export default function Hero() {
  const ref = useRef(null);
  const { categories, products, categoryName } = useCatalog();
  const picked = FEATURED.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const featured = picked.length === 3 ? picked : products.slice(0, 3);

  // Pointer + scroll parallax via CSS custom properties (no animation library).
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let frame = 0;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', x.toFixed(3));
        el.style.setProperty('--my', y.toFixed(3));
      });
    };
    const onScroll = () => {
      const y = Math.min(window.scrollY / window.innerHeight, 1.2);
      el.style.setProperty('--sy', y.toFixed(3));
    };
    if (fine) el.addEventListener('pointermove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const secondary = { href: directionsUrl, label: 'Get Directions', icon: 'pin', external: true };

  return (
    <section id="home" className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow hero__glow--plum" />
        <div className="hero__glow hero__glow--gold" />
        <div className="hero__glow hero__glow--rose" />
        <svg className="hero__arches" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
          <path d="M120 600V260a180 180 0 0 1 360 0v340" />
          <path d="M160 600V270a140 140 0 0 1 280 0v330" />
          <path d="M40 600V300a260 260 0 0 1 520 0v300" />
        </svg>
        <div className="hero__grain" />
      </div>

      <div className="hero__inner container">
        <div className="hero__copy">
          <p className="eyebrow hero__in" style={{ '--d': '0ms' }}>
            Manufacturer of Kurtis &amp; 3-Piece Sets
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="hero__line hero__in" style={{ '--d': '80ms' }}>
              Embroidered elegance,
            </span>
            <span className="hero__line hero__in gold-text" style={{ '--d': '180ms' }}>
              <em>ready to wear.</em>
            </span>
          </h1>
          <p className="hero__lede hero__in" style={{ '--d': '300ms' }}>
            Explore {products.length} designs in Roman Glass, Mul Chandery and Glass Shiffon — complete
            kurta, bottom and dupatta sets, made by Amba Traders in Ahmedabad.
          </p>

          <div className="hero__actions hero__in" style={{ '--d': '420ms' }}>
            <a href="#products" className="btn btn--primary">
              Explore Products <Icon name="arrow" size={18} />
            </a>
            <a
              href={secondary.href}
              className="btn btn--ghost"
              {...(secondary.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <Icon name={secondary.icon} size={18} /> {secondary.label}
            </a>
          </div>

          <p className="hero__where hero__in" style={{ '--d': '480ms' }}>
            <Icon name="pin" size={16} /> Sumel Business Park, near Kalupur Bridge, Ahmedabad
          </p>

          <dl className="hero__facts hero__in" style={{ '--d': '540ms' }}>
            <div>
              <dt>Designs</dt>
              <dd>{products.length}</dd>
            </div>
            <div>
              <dt>Fabric lines</dt>
              <dd>{categories.length}</dd>
            </div>
            <div>
              <dt>Sizes</dt>
              <dd>M–XXL</dd>
            </div>
          </dl>
        </div>

        <div className="hero__stage" aria-label="Featured designs">
          {featured.map((p, i) => (
            <a
              key={p.id}
              href="#products"
              className={`hero__card hero__card--${i}`}
              style={{ '--d': `${300 + i * 140}ms` }}
            >
              <span className="hero__card-float">
                <img
                  src={p.model}
                  alt={`${p.name}, D.No ${p.dno}`}
                  width="413"
                  height="1071"
                  fetchPriority={i === 1 ? 'high' : 'auto'}
                  decoding="async"
                />
                <span className="hero__card-tag">
                  <strong>D.No {p.dno}</strong>
                  <span>{categoryName(p.category)}</span>
                </span>
              </span>
            </a>
          ))}
          <div className="hero__plinth" aria-hidden="true" />
        </div>
      </div>

      <a href="#categories" className="hero__scroll" aria-label="Scroll to collections">
        <span />
      </a>
    </section>
  );
}
