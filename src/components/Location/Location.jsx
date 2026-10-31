import { business, directionsUrl, mapEmbedUrl } from '../../data/business.js';
import { Detail, Icon, Reveal, SectionHead, SmartImage } from '../ui/ui.jsx';
import './Location.css';

export default function Location() {
  const shop = business.shopImages?.[0];
  return (
    <section id="location" className="section location" aria-labelledby="location-title">
      <div className="container">
        <SectionHead
          id="location-title"
          eyebrow="Shop Location"
          title="Come see the collection in person."
          intro="Feel the fabrics, check the fit and see the embroidery up close at our shops in Sumel Business Park."
        />

        <Reveal className="loc glass">
          <div className="loc__media">
            <div className="loc__empty" aria-hidden="true">
              <span className="loc__pin">
                <Icon name="pin" size={30} />
              </span>
            </div>
            <iframe
              title="Map showing Amba Traders at Sumel Business Park, Ahmedabad"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <div className="loc__info">
            {shop && (
              <div className="loc__shop">
                <SmartImage src={shop.src} alt={shop.alt} width={shop.width} height={shop.height} />
                <span className="loc__shop-tag">{business.shopNumbers}</span>
              </div>
            )}
            <h3>Amba Traders</h3>
            <address className="loc__rows">
              <p className="loc__row">
                <Icon name="pin" />
                <span>
                  <span className="loc__label">Address</span>
                  <Detail value={business.address} field="address" />
                </span>
              </p>
              <p className="loc__row">
                <Icon name="clock" />
                <span>
                  <span className="loc__label">Business hours</span>
                  <Detail value={business.hours} field="hours" />
                </span>
              </p>
            </address>

            <div className="loc__actions">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                <Icon name="pin" size={18} /> Get Directions
              </a>
              {business.listingUrl && (
                <a href={business.listingUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  View on Google <Icon name="arrowUpRight" size={18} />
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
