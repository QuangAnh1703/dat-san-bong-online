import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PitchGraphic from '../../components/ui/PitchGraphic';
import Banner from '../../components/ui/Banner';
import EmptyState from '../../components/ui/EmptyState';
import FieldSchedule from './FieldSchedule';
import ReviewSection from './ReviewSection';
import { getVenue, getFieldSchedule } from '../../services/venues';
import { vnd } from '../../lib/format';
import { today } from '../../lib/format';

/** WF-03 - Chi tiet san & so do lich real-time */
export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedField, setSelectedField] = useState(null);

  useEffect(() => {
    if (!id) return;
    loadVenue();
  }, [id]);

  useEffect(() => {
    if (!venue?.fields || !selectedField) return;
    loadSchedule();
  }, [selectedField, selectedDate]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const { data } = await getVenue(id);
      setVenue(data);
      if (data.fields?.length) {
        setSelectedField(data.fields[0].id);
      }
    } catch (err) {
      console.error('[API] Error loading venue:', err);
      setVenue(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await getFieldSchedule(selectedField, selectedDate);
      setSchedule(data || {});
    } catch (err) {
      console.error('[API] Error loading schedule:', err);
    }
  };

  if (loading) {
    return (
      <main className="venue-detail">
        <section className="wrap">
          <div className="skeleton" style={{ height: 300 }}></div>
        </section>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className="venue-detail">
        <section className="wrap">
          <EmptyState title="Khong tim thay san">
            San nay co the da bi xoa hoac khong ton tai.
          </EmptyState>
        </section>
      </main>
    );
  }

  const {
    name, description, district_name, address, avg_rating, rating_count,
    field_count, min_price, max_price, amenities = [], phone, fields = [],
  } = venue;

  return (
    <main className="venue-detail">
      {/* Header - Thong tin san */}
      <section className="venue-header">
        <div className="wrap">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Quay lai
          </button>

          <div className="header-content">
            <h1>{name}</h1>

            <div className="venue-meta">
              <div className="meta-row">
                <span className="star">★</span>
                <span className="mono">{Number(avg_rating || 0).toFixed(1)}</span>
                <span className="text-2">({rating_count || 0} danh gia)</span>
                <span className="sep">·</span>
                <span className="text-2">{field_count} san</span>
              </div>

              <div className="meta-row">
                <span className="text-2">{district_name}</span>
                <span className="sep">·</span>
                <span className="text-2">{address}</span>
              </div>

              <div className="meta-row">
                <span className="price">
                  {min_price ? vnd(min_price) : 'Lien he'}
                  {max_price && min_price !== max_price && (
                    <> - {vnd(max_price)}</>
                  )}
                  <small> / gio</small>
                </span>
              </div>
            </div>

            <div className="amenities">
              {amenities.map((a) => <span className="tag" key={a}>{a}</span>)}
            </div>

            {description && <p className="description">{description}</p>}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="wrap">
        <div className="detail-layout">
          {/* Left - San va lich */}
          <div className="detail-main">
            {/* San */}
            <div className="venue-section">
              <h2>So do san</h2>
              <div className="pitch-showcase">
                <PitchGraphic />
              </div>
            </div>

            {/* Danh sach san con */}
            {fields.length > 0 && (
              <div className="venue-section">
                <h2>Chon san</h2>
                <div className="field-selector">
                  {fields.map((f) => (
                    <button
                      key={f.id}
                      className={`field-card ${selectedField === f.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedField(f.id)}
                    >
                      <div className="field-name">{f.name}</div>
                      <div className="field-type">{f.type}</div>
                      {f.price && <div className="field-price">{vnd(f.price)}/gio</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lich dat */}
            {selectedField && (
              <div className="venue-section">
                <h2>Lich dat</h2>
                <FieldSchedule
                  fieldId={selectedField}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  schedule={schedule}
                />
              </div>
            )}
          </div>

          {/* Right - Thong tin lien he */}
          <aside className="detail-sidebar">
            <div className="contact-card">
              <h3>Thong tin lien he</h3>
              {phone && (
                <div className="contact-row">
                  <span className="label">Dien thoai:</span>
                  <a href={`tel:${phone}`} className="contact-value">
                    {phone}
                  </a>
                </div>
              )}
              {address && (
                <div className="contact-row">
                  <span className="label">Dia chi:</span>
                  <span className="contact-value">{address}</span>
                </div>
              )}
              <button className="btn-primary" style={{ width: '100%', marginTop: 16 }}>
                Dat san ngay
              </button>
            </div>

            <Banner>
              Gia tien va lich dat co the thay doi. Vui long lien he san de xac nhan.
            </Banner>
          </aside>
        </div>
      </section>

      {/* Reviews */}
      <section className="wrap">
        <ReviewSection venueId={id} />
      </section>
    </main>
  );
}
