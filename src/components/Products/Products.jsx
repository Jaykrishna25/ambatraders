import { useEffect, useRef, useState } from 'react';
import { categories, products, categoryName } from '../../data/products.js';
import { Icon, SectionHead, SmartImage } from '../ui/ui.jsx';
import { useTilt } from '../../lib/motion.js';
import { enquiry } from '../../lib/contact.js';
import './Products.css';

function EnquireButton({ product, className = 'btn btn--primary btn--sm' }) {
  const action = enquiry(product);
  return (
    <a
      href={action.href}
      className={className}
      {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      aria-label={`Enquire now about D.No ${product.dno}, ${product.name}`}
    >
      Enquire Now <Icon name="arrow" size={16} />
    </a>
  );
}

function ProductCard({ product, index, onView }) {
  const tilt = useTilt();
  return (
    <li className="pcard" style={{ '--i': index }}>
      <article ref={tilt} className="pcard__inner" aria-labelledby={`p-${product.id}`}>
        <button
          type="button"
          className="pcard__media"
          onClick={() => onView(product)}
          aria-label={`View full catalogue image for D.No ${product.dno}`}
        >
          <SmartImage
            src={product.thumb}
            alt={`${product.name} — 3-piece suit set, D.No ${product.dno}`}
            width="543"
            height="724"
          />
          <span className="pcard__zoom" aria-hidden="true">
            <Icon name="expand" size={18} />
          </span>
          <span className="pcard__dno" aria-hidden="true">
            D.No {product.dno}
          </span>
        </button>

        <div className="pcard__body">
          <p className="pcard__cat">{categoryName(product.category)}</p>
          <h3 id={`p-${product.id}`} className="pcard__name">
            {product.name}
          </h3>
          <p className="pcard__desc">{product.description}</p>
          <ul className="pcard__chips" aria-label="Set details">
            <li>{product.pieces} pcs</li>
            <li>{product.bottom}</li>
            <li>{product.dupatta}</li>
            {product.sizes && <li>{product.sizes}</li>}
          </ul>
          <div className="pcard__foot">
            {product.price ? <p className="pcard__price">{product.price}</p> : <span />}
            <EnquireButton product={product} />
          </div>
        </div>
      </article>
    </li>
  );
}

function Lightbox({ product, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (product && !d.open) d.showModal();
    if (!product && d.open) d.close();
  }, [product]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-labelledby="lightbox-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {product && (
        <div className="lightbox__panel">
          <button type="button" className="lightbox__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={22} />
          </button>
          <div className="lightbox__media">
            <img
              src={product.image}
              alt={`Catalogue card for D.No ${product.dno}: ${product.name} with close-ups of the embroidery, bottom and dupatta`}
              width="1086"
              height="1448"
            />
          </div>
          <div className="lightbox__info">
            <p className="pcard__cat">{categoryName(product.category)}</p>
            <h3 id="lightbox-title">{product.name}</h3>
            <p className="lightbox__dno">D.No {product.dno}</p>
            <p className="pcard__desc">{product.description}</p>
            <dl className="lightbox__specs">
              <div>
                <dt>Set</dt>
                <dd>{product.pieces}-piece</dd>
              </div>
              <div>
                <dt>Bottom</dt>
                <dd>{product.bottom}</dd>
              </div>
              <div>
                <dt>Dupatta</dt>
                <dd>{product.dupatta}</dd>
              </div>
              {product.sizes && (
                <div>
                  <dt>Sizes</dt>
                  <dd>{product.sizes}</dd>
                </div>
              )}
              {product.price && (
                <div>
                  <dt>Price</dt>
                  <dd>{product.price}</dd>
                </div>
              )}
            </dl>
            <EnquireButton product={product} className="btn btn--primary" />
          </div>
        </div>
      )}
    </dialog>
  );
}

export default function Products({ category, onCategory }) {
  const [viewing, setViewing] = useState(null);
  const list = category === 'all' ? products : products.filter((p) => p.category === category);
  const filters = [{ id: 'all', name: 'All designs' }, ...categories];

  return (
    <section id="products" className="section products" aria-labelledby="products-title">
      <div className="container">
        <SectionHead
          id="products-title"
          eyebrow="Products"
          title={
            <>
              The <em className="gold-text">collection.</em>
            </>
          }
          intro="Tap any design to see the full catalogue card with close-ups of the embroidery, bottom and dupatta."
        />

        <div className="filters" role="group" aria-label="Filter by fabric">
          {filters.map((f) => {
            const count = f.id === 'all' ? products.length : products.filter((p) => p.category === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                className="filter"
                aria-pressed={category === f.id}
                onClick={() => onCategory(f.id)}
              >
                {f.name}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {list.length} {list.length === 1 ? 'design' : 'designs'}
          {category !== 'all' ? ` in ${categoryName(category)}` : ''}.
        </p>

        <ul className="pgrid" key={category}>
          {list.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onView={setViewing} />
          ))}
        </ul>
      </div>

      <Lightbox product={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
