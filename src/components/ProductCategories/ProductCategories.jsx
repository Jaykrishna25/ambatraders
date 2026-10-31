import { useCatalog } from '../../lib/catalog.jsx';
import { Icon, Reveal, SectionHead, SmartImage } from '../ui/ui.jsx';
import { useTilt } from '../../lib/motion.js';
import './ProductCategories.css';

function CategoryCard({ category, index, onSelect }) {
  const tilt = useTilt();
  const { products } = useCatalog();
  const count = products.filter((p) => p.category === category.id).length;
  return (
    <Reveal as="li" delay={index * 90} className="cat">
      <a
        ref={tilt}
        href="#products"
        className="cat__card"
        onClick={() => onSelect(category.id)}
        aria-label={`${category.name} — ${count} designs. View products`}
      >
        <SmartImage
          className="cat__img"
          src={category.cover}
          alt=""
          width="413"
          height="1071"
        />
        <span className="cat__shine" aria-hidden="true" />
        <span className="cat__body">
          <span className="cat__count">{count} designs</span>
          <span className="cat__name">{category.name}</span>
          <span className="cat__blurb">{category.blurb}</span>
          <span className="cat__go" aria-hidden="true">
            View <Icon name="arrowUpRight" size={16} />
          </span>
        </span>
      </a>
    </Reveal>
  );
}

export default function ProductCategories({ onSelect }) {
  const { categories } = useCatalog();
  return (
    <section id="categories" className="section cats" aria-labelledby="cats-title">
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[0, 1].map((k) => (
            <span key={k}>
              {categories.map((c) => (
                <span key={c.id} className="marquee__item">
                  {c.name} <i>✦</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="container">
        <SectionHead
          id="cats-title"
          eyebrow="Collections"
          title={
            <>
              Every fabric line, <em className="gold-text">one standard.</em>
            </>
          }
          intro="Choose a fabric to see every design in it — each one a complete three-piece set."
        />
        <ul className="cats__grid">
          {categories.map((c, i) => (
            <CategoryCard key={c.id} category={c} index={i} onSelect={onSelect} />
          ))}
        </ul>
      </div>
    </section>
  );
}
