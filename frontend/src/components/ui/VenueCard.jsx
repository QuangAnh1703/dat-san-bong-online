import { Link } from 'react-router-dom';
import PitchGraphic from './PitchGraphic';
import { vnd } from '../../lib/format';

export default function VenueCard({ venue }) {
  const { id, name, district_name, avg_rating, rating_count,
          field_count, min_price, amenities = [], distance } = venue;

  return (
    <Link className="venue" to={`/san/${id}`}>
      <div className="thumb">
        <PitchGraphic />
        <span className="slots">{field_count} san con</span>
      </div>

      <div className="venue-body">
        <h3>{name}</h3>

        <div className="meta">
          <span>{[distance, district_name].filter(Boolean).join(' · ')}</span>
          <span className="dot">·</span>
          <span className="star">★</span>
          <span className="mono">{Number(avg_rating || 0).toFixed(1)}</span>
          <span style={{ color: 'var(--text-3)' }}>({rating_count || 0})</span>
        </div>

        <div className="tags">
          {amenities.map((a) => <span className="tag" key={a}>{a}</span>)}
        </div>

        <div className="price">
          {min_price ? vnd(min_price) : 'Lien he'} <small>/ gio</small>
        </div>
      </div>
    </Link>
  );
}
