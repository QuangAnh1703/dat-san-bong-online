/**
 * Du lieu mau dung khi backend/CSDL chua chay,
 * de giao dien van xem duoc va demo duoc.
 */
export const DEMO_VENUES = [
  { id: 1, name: 'San Cau Giay Center', district_name: 'Cau Giay', avg_rating: 4.6,
    rating_count: 128, field_count: 6, min_price: 250000, amenities: ['Den', 'Cang tin'] },
  { id: 2, name: 'San My Dinh A', district_name: 'Nam Tu Liem', avg_rating: 4.3,
    rating_count: 86, field_count: 3, min_price: 200000, amenities: ['Bai xe', 'Wifi'] },
  { id: 3, name: 'San Bach Khoa', district_name: 'Hai Ba Trung', avg_rating: 4.8,
    rating_count: 203, field_count: 2, min_price: 600000, amenities: ['Den', 'Trong tai'] },
  { id: 4, name: 'San Nam Tu Liem', district_name: 'Nam Tu Liem', avg_rating: 4.1,
    rating_count: 54, field_count: 8, min_price: 180000, amenities: ['Den'] },
];

export const DEMO_DISTRICTS = [
  { code: 'CG', name: 'Cau Giay' },
  { code: 'NTL', name: 'Nam Tu Liem' },
  { code: 'TX', name: 'Thanh Xuan' },
  { code: 'HBT', name: 'Hai Ba Trung' },
  { code: 'HM', name: 'Hoang Mai' },
  { code: 'LB', name: 'Long Bien' },
];

export const DEMO_DEALS = [
  { id: 1, name: 'San Thanh Xuan', hour: '19:00', oldPrice: 300000, newPrice: 240000, off: 20 },
  { id: 2, name: 'San Hoang Mai', hour: '20:30', oldPrice: 250000, newPrice: 200000, off: 20 },
  { id: 3, name: 'San Long Bien', hour: '21:00', oldPrice: 220000, newPrice: 165000, off: 25 },
];
