import { useState } from 'react';
import SearchBar from '../home/SearchBar';
import FilterSidebar from './FilterSidebar';
import VenueCard from '../../components/ui/VenueCard';
import SkeletonGrid from '../../components/ui/SkeletonGrid';
import EmptyState from '../../components/ui/EmptyState';
import Banner from '../../components/ui/Banner';
import { useVenues } from '../home/useVenues';
import { today } from '../../lib/format';

/** WF-02 - Ket qua tim kiem & bo loc */
export default function SearchPage() {
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

  const [sortBy, setSortBy] = useState('name'); // name, price-asc, price-desc, rating
  const [showFilters, setShowFilters] = useState(false);

  const { districts, venues, loading, isDemo, reload } = useVenues(filters);

  // Sort venues
  const sortedVenues = [...venues].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return (a.min_price || 0) - (b.min_price || 0);
      case 'price-desc':
        return (b.min_price || 0) - (a.min_price || 0);
      case 'rating':
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <main className="search-page">
      <section className="wrap">
        <div className="search-header">
          <h1>Tim san bong</h1>
          <SearchBar
            districts={districts}
            filters={filters}
            onChange={setFilters}
            onSubmit={reload}
          />
        </div>

        {isDemo && (
          <Banner>
            Chua ket noi duoc backend. Dang hien thi du lieu mau - chay{' '}
            <code className="mono">docker compose up -d</code> trong <code className="mono">csdl/</code>{' '}
            va <code className="mono">npm run dev</code> trong <code className="mono">backend/</code>.
          </Banner>
        )}

        <div className="search-layout">
          {/* Filter sidebar - desktop fixed, mobile toggle */}
          <aside className={`filter-sidebar ${showFilters ? 'is-open' : ''}`}>
            <div className="filter-header">
              <h2>Bo loc</h2>
              <button className="close-btn" onClick={() => setShowFilters(false)}>
                ✕
              </button>
            </div>
            <FilterSidebar
              districts={districts}
              filters={filters}
              onChange={setFilters}
            />
          </aside>

          {/* Main content */}
          <div className="search-content">
            {/* Toolbar */}
            <div className="search-toolbar">
              <div className="result-info">
                <span className="count">{sortedVenues.length} san</span>
                {filters.district && (
                  <span className="filter-tag">
                    {districts.find((d) => d.code === filters.district)?.name || filters.district}
                  </span>
                )}
              </div>

              <div className="sort-controls">
                <label htmlFor="sort">Sap xep:</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Ten san</option>
                  <option value="price-asc">Gia (thap den cao)</option>
                  <option value="price-desc">Gia (cao den thap)</option>
                  <option value="rating">Danh gia cao nhat</option>
                </select>
              </div>

              <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                ☰ Bo loc
              </button>
            </div>

            {/* Results */}
            <div className="grid4">
              {loading && <SkeletonGrid count={8} />}
              {!loading && sortedVenues.length === 0 && (
                <EmptyState title="Khong tim thay san phu hop">
                  Thu bo bot bo loc hoac chon quan/huyen khac.
                </EmptyState>
              )}
              {!loading && sortedVenues.map((v) => <VenueCard venue={v} key={v.id} />)}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
