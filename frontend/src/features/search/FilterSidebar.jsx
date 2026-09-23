import { vnd } from '../../lib/format';

export default function FilterSidebar({ districts, filters, onChange }) {
  const handleDistrictChange = (code) => {
    onChange({ ...filters, district: code });
  };

  const handleFieldTypeChange = (fieldType) => {
    onChange({ ...filters, fieldType: filters.fieldType === fieldType ? '' : fieldType });
  };

  const handlePriceChange = (value) => {
    onChange({ ...filters, priceRange: [0, value] });
  };

  const handleAmenityChange = (amenity) => {
    const updated = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    onChange({ ...filters, amenities: updated });
  };

  const handleRatingChange = (rating) => {
    onChange({ ...filters, minRating: rating });
  };

  const amenityOptions = ['Den', 'Bai xe', 'Wifi', 'Cang tin', 'Trong tai'];
  const fieldTypeOptions = [
    { value: 'F5', label: '5-a-side' },
    { value: 'F7', label: '7-a-side' },
    { value: 'F11', label: '11-a-side' },
  ];

  return (
    <div className="filter-group">
      {/* District Filter */}
      <div className="filter-section">
        <h3>Quan / Huyen</h3>
        <div className="filter-options">
          <label className="checkbox">
            <input
              type="radio"
              name="district"
              value=""
              checked={!filters.district}
              onChange={() => handleDistrictChange('')}
            />
            <span>Tat ca</span>
          </label>
          {districts.map((d) => (
            <label className="checkbox" key={d.code}>
              <input
                type="radio"
                name="district"
                value={d.code}
                checked={filters.district === d.code}
                onChange={() => handleDistrictChange(d.code)}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Field Type Filter */}
      <div className="filter-section">
        <h3>Loai san</h3>
        <div className="filter-options">
          {fieldTypeOptions.map((type) => (
            <label className="checkbox" key={type.value}>
              <input
                type="checkbox"
                checked={filters.fieldType === type.value}
                onChange={() => handleFieldTypeChange(type.value)}
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h3>Gia tien (toi da)</h3>
        <div className="price-slider">
          <input
            type="range"
            min="0"
            max="1000000"
            step="50000"
            value={filters.priceRange[1]}
            onChange={(e) => handlePriceChange(Number(e.target.value))}
            className="slider"
          />
          <div className="price-display">{vnd(filters.priceRange[1])}</div>
        </div>
      </div>

      {/* Amenities Filter */}
      <div className="filter-section">
        <h3>Tien nghi</h3>
        <div className="filter-options">
          {amenityOptions.map((amenity) => (
            <label className="checkbox" key={amenity}>
              <input
                type="checkbox"
                checked={filters.amenities.includes(amenity)}
                onChange={() => handleAmenityChange(amenity)}
              />
              <span>{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="filter-section">
        <h3>Danh gia (toi thieu)</h3>
        <div className="rating-options">
          {[0, 3, 3.5, 4, 4.5].map((rating) => (
            <label className="radio" key={rating}>
              <input
                type="radio"
                name="rating"
                value={rating}
                checked={filters.minRating === rating}
                onChange={() => handleRatingChange(rating)}
              />
              <span>{rating === 0 ? 'Khong yeu cau' : `${rating}+ sao`}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        className="btn-reset"
        onClick={() =>
          onChange({
            district: '',
            fieldType: '',
            date: filters.date,
            time: '',
            priceRange: [0, 1000000],
            amenities: [],
            minRating: 0,
          })
        }
      >
        Dat lai bo loc
      </button>
    </div>
  );
}
