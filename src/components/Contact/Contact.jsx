import { business, directionsUrl } from '../../data/business.js';
import { Detail, Icon, Reveal } from '../ui/ui.jsx';
import { phoneHref, whatsappHref } from '../../lib/contact.js';
import { useTilt } from '../../lib/motion.js';
import './Contact.css';

function Person({ person, index }) {
  const tilt = useTilt();
  const wa = whatsappHref(undefined, person);
  const tel = phoneHref(person);
  return (
    <Reveal as="li" delay={index * 80} className="method">
      <div ref={tilt} className="method__card glass">
        <span className="method__icon">
          <Icon name="phone" size={22} />
        </span>
        <span className="method__label">{person.name}</span>
        <span className="method__value">{person.phone}</span>
        <span className="method__btns">
          {tel && (
            <a href={tel} className="btn btn--ghost btn--sm" aria-label={`Call ${person.name}`}>
              <Icon name="phone" size={16} /> Call
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary btn--sm"
              aria-label={`WhatsApp ${person.name}`}
            >
              <Icon name="chat" size={16} /> WhatsApp
            </a>
          )}
        </span>
      </div>
    </Reveal>
  );
}

function Method({ icon, label, value, field, href, external, index }) {
  const tilt = useTilt();
  const content = (
    <>
      <span className="method__icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="method__label">{label}</span>
      <span className="method__value">
        <Detail value={value} field={field} />
      </span>
      {href && <Icon name="arrowUpRight" size={18} className="method__go" />}
    </>
  );
  return (
    <Reveal as="li" delay={index * 80} className="method">
      {href ? (
        <a
          ref={tilt}
          href={href}
          className="method__card glass"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {content}
        </a>
      ) : (
        <div ref={tilt} className="method__card glass">
          {content}
        </div>
      )}
    </Reveal>
  );
}

export default function Contact() {
  const contacts = business.contacts ?? [];
  const wa = whatsappHref();

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="contact__glow" aria-hidden="true" />
      <div className="container">
        <Reveal className="contact__cta">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title">
            Found a design you love? <em className="gold-text">Let&rsquo;s talk.</em>
          </h2>
          <p className="contact__intro">
            Share the D.No of any design to ask about colours, sizes and availability — or visit us at the shop.
          </p>
          <div className="contact__actions">
            {wa ? (
              <a href={wa} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={18} /> Chat on WhatsApp
              </a>
            ) : (
              <a href="#products" className="btn btn--primary">
                Browse the collection <Icon name="arrow" size={18} />
              </a>
            )}
            <a href={directionsUrl} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={18} /> Get Directions
            </a>
          </div>
        </Reveal>

        <ul className="contact__grid">
          {contacts.map((p, i) => (
            <Person key={p.name} person={p} index={i} />
          ))}
          <Method
            icon="mail"
            label="Email"
            value={business.email}
            field="email"
            href={business.email ? `mailto:${business.email}` : null}
            index={contacts.length}
          />
          <Method
            icon="pin"
            label="Visit"
            value={business.address}
            field="address"
            href={directionsUrl}
            external
            index={contacts.length + 1}
          />
        </ul>

        <Reveal className="contact__hours">
          <Icon name="clock" size={18} />
          <span>Business hours:</span> <Detail value={business.hours} field="hours" />
        </Reveal>
      </div>
    </section>
  );
}
