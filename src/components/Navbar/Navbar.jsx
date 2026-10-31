import { useEffect, useState } from 'react';
import { BrandMark, Icon } from '../ui/ui.jsx';
import { business } from '../../data/business.js';
import { useCart } from '../../lib/cart.jsx';
import './Navbar.css';

const links = [
  { id: 'home', label: 'Home' },
  { id: 'products', label: 'Products' },
  { id: 'about', label: 'About Us' },
  { id: 'location', label: 'Shop Location' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('home');
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section in view.
  useEffect(() => {
    const sections = links.map((l) => document.getElementById(l.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // Mobile menu: lock scroll, close on Escape or when resized to desktop.
  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const mq = window.matchMedia('(min-width: 960px)');
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
      document.body.classList.remove('no-scroll');
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''}`}>
      <nav className="nav__inner container" aria-label="Main">
        <a href="#home" className="nav__brand" onClick={close}>
          <BrandMark size={40} />
          <span className="nav__name">
            Amba <span>Traders</span>
          </span>
          <span className="sr-only">{business.name} — home</span>
        </a>

        <ul className="nav__links" id="nav-menu">
          {links.map((l, i) => (
            <li key={l.id} style={{ '--i': i }}>
              <a
                href={`#${l.id}`}
                className={active === l.id ? 'is-active' : ''}
                aria-current={active === l.id ? 'true' : undefined}
                onClick={close}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="nav__menu-cta" style={{ '--i': links.length }}>
            <a href="#products" className="btn btn--primary" onClick={close}>
              View Products <Icon name="arrow" size={18} />
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="nav__cart"
          onClick={cart.openCart}
          aria-label={`Your order: ${cart.pieces} pieces`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0" />
          </svg>
          {cart.pieces > 0 && <span className="nav__badge">{cart.pieces > 999 ? '999+' : cart.pieces}</span>}
        </button>

        <a href="#products" className="btn btn--primary btn--sm nav__cta">
          View Products
        </a>

        <button
          type="button"
          className="nav__burger"
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>
    </header>
  );
}
