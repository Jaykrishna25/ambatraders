import { useState } from 'react';
import { useReveal } from '../../lib/motion.js';
import { business, PLACEHOLDER } from '../../data/business.js';
import './ui.css';

/** Fades/lifts its children in when scrolled into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--delay': `${delay}ms`, ...rest.style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Clearly marked stand-in for a missing business detail. */
export function Placeholder({ children }) {
  return <span className="placeholder">{children}</span>;
}

/** Value or its placeholder. */
export function Detail({ value, field }) {
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  if (empty) return <Placeholder>{PLACEHOLDER[field]}</Placeholder>;
  if (Array.isArray(value)) return value.map((line) => <span key={line} className="detail-line">{line}</span>);
  return value;
}

/** Image that fades in once decoded, over a soft shimmer. */
export function SmartImage({ className = '', onLoad, ...props }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`smart-img ${loaded ? 'is-loaded' : ''} ${className}`}>
      <img
        loading="lazy"
        decoding="async"
        {...props}
        ref={(el) => {
          if (el?.complete && el.naturalWidth && !loaded) setLoaded(true);
        }}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
    </span>
  );
}

/** Real logo when supplied, otherwise a temporary monogram. */
export function BrandMark({ size = 40 }) {
  if (business.logo) {
    return (
      <span className="brand-badge" style={{ '--size': `${size}px` }}>
        <img src={business.logo} alt="" width={size} height={size} />
      </span>
    );
  }
  return (
    <span className="brand-monogram" style={{ '--size': `${size}px` }} aria-hidden="true">
      A
    </span>
  );
}

export function SectionHead({ eyebrow, title, intro, align = 'left', id }) {
  return (
    <Reveal className={`section-head section-head--${align}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {intro && <p className="section-intro">{intro}</p>}
    </Reveal>
  );
}

const paths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  arrowUpRight: 'M7 17 17 7M8 7h9v9',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  chat: 'M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  ruler: 'M3 17 17 3l4 4L7 21l-4-4Zm4-2 2 2m1-5 2 2m1-5 2 2',
  pocket: 'M5 4h14v8a7 7 0 0 1-14 0V4Zm0 4h14',
  sparkle: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  swatch: 'M4 20V6a2 2 0 0 1 2-2h4v16H4Zm6 0 8.5-8.5a2 2 0 0 0 0-2.8L15.3 5.5M10 20h10v-6',
  tag: 'M3 12V4h8l10 10-8 8L3 12Zm5-4a1 1 0 1 0 0-.01',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Zm-3 9 2 2 4-4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  store: 'M4 9h16l-1-5H5L4 9Zm0 0v11h16V9M9 20v-6h6v6',
  close: 'M6 6l12 12M18 6 6 18',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  box: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 9v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  wallet: 'M4 7a2 2 0 0 1 2-2h12v4M4 7v10a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2Zm12 6.5h.01',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  printer: 'M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  back: 'M19 12H5m6-6-6 6 6 6',
  check: 'm5 12 5 5 9-10',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
};

export function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] ?? paths.sparkle} />
    </svg>
  );
}
