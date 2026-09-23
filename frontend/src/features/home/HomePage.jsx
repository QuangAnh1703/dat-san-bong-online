import { useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from './Hero';
import SearchBar from './SearchBar';
import FlashSale from './FlashSale';
import VenueCard from '../../components/ui/VenueCard';
import SkeletonGrid from '../../components/ui/SkeletonGrid';
import EmptyState from '../../components/ui/EmptyState';
import Banner from '../../components/ui/Banner';
import { useVenues } from './useVenues';
import { DEMO_DEALS } from '../../lib/demoData';
import { today } from '../../lib/format';

/** WF-01 - Trang chu (Nguoi choi) */
export default function HomePage() {
  const [filters, setFilters] = useState({
    q: '',
    district: '',
    fieldType: '',
    date: today(),
    time: '',
    priceRange: [0, 1000000],
    amenities: [],
    minRating: 0,
  });
  const { districts, venues, loading, isDemo, reload } = useVenues(filters);

  const fieldCount = venues.reduce((s, v) => s + Number(v.field_count || 0), 0);
  const avgRating = venues.length
    ? (venues.reduce((s, v) => s + Number(v.avg_rating || 0), 0) / venues.length).toFixed(1)
    : '--';

  return (
    <main>
      <Hero
        venueCount={venues.length}
        fieldCount={fieldCount}
        avgRating={avgRating}
        isDemo={isDemo}
      />

      <SearchBar
        districts={districts}
        filters={filters}
        onChange={setFilters}
        onSubmit={reload}
      />

      <section className="wrap">
        <div className="sechead">
          <h2>{filters.district ? 'San trong khu vuc' : 'San gan ban'}</h2>
          <Link to="/tim-san">Xem tat ca →</Link>
        </div>

        {isDemo && (
          <Banner>
            Chua ket noi duoc backend. Dang hien thi du lieu mau - chay{' '}
            <code className="mono">docker compose up -d</code> trong <code className="mono">csdl/</code>{' '}
            va <code className="mono">npm run dev</code> trong <code className="mono">backend/</code>.
          </Banner>
        )}

        <div className="grid4">
          {loading && <SkeletonGrid count={4} />}
          {!loading && venues.length === 0 && (
            <EmptyState title="Khong tim thay san phu hop">
              Thu bo bot bo loc hoac chon quan/huyen khac.
            </EmptyState>
          )}
          {!loading && venues.map((v) => <VenueCard venue={v} key={v.id} />)}
        </div>
      </section>

      <FlashSale deals={DEMO_DEALS} />
    </main>
  );
}
