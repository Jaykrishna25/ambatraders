import { business } from '../../data/business.js';
import { categories, products } from '../../data/products.js';
import { Icon, Placeholder, Reveal, SectionHead } from '../ui/ui.jsx';
import { useTilt } from '../../lib/motion.js';
import './WhyChooseUs.css';

// Facts counted straight from the catalogue data, so they stay accurate as products change.
const count = (fn) => products.filter(fn).length;
const catalogueFacts = [
  {
    icon: 'layers',
    title: 'Complete 3-piece sets',
    text: 'Kurta, bottom and dupatta come together — matched in colour and finish.',
    stat: `${count((p) => p.pieces === 3)}/${products.length}`,
  },
  {
    icon: 'ruler',
    title: 'Sizes M to XXL',
    text: 'Offered as an M to XXL size combo across most of the collection.',
    stat: `${count((p) => p.sizes)} designs`,
  },
  {
    icon: 'pocket',
    title: 'Practical pockets',
    text: 'Pants and palazzos with pockets on the majority of designs.',
    stat: `${count((p) => /pocket/i.test(p.bottom))} designs`,
  },
  {
    icon: 'swatch',
    title: 'Dupattas with detail',
    text: `Jacquard-woven dupattas on ${count((p) => /jacquard/i.test(p.dupatta))} designs, embroidered work on ${count((p) => /work/i.test(p.dupatta))}.`,
    stat: `${categories.length} fabric lines`,
  },
];

function Card({ item, index }) {
  const tilt = useTilt();
  return (
    <Reveal as="li" delay={index * 90} className="why__item">
      <div ref={tilt} className="why__card glass">
        <span className="why__icon">
          <Icon name={item.icon} size={22} />
        </span>
        {item.stat && <span className="why__stat">{item.stat}</span>}
        <h3>{item.title}</h3>
        <p>{item.text}</p>
      </div>
    </Reveal>
  );
}

export default function WhyChooseUs() {
  const reasons = business.reasons ?? [];
  return (
    <section id="why" className="section why" aria-labelledby="why-title">
      <div className="why__bg" aria-hidden="true" />
      <div className="container">
        <SectionHead
          id="why-title"
          eyebrow="Why Amba Traders"
          align="center"
          title="Thoughtful details, in every set."
          intro="What you get with the designs in our current collection."
        />

        {reasons.length > 0 && (
          <ul className="why__grid why__grid--reasons">
            {reasons.map((r, i) => (
              <Card key={r.title} item={{ icon: r.icon || 'star', ...r }} index={i} />
            ))}
          </ul>
        )}

        <ul className="why__grid">
          {catalogueFacts.map((f, i) => (
            <Card key={f.title} item={f} index={i} />
          ))}
        </ul>

        {reasons.length === 0 && (
          <Reveal className="why__note">
            <Placeholder>[Add your own reasons — e.g. pricing, service, years in business]</Placeholder>
          </Reveal>
        )}
      </div>
    </section>
  );
}
