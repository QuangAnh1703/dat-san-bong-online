import { useCallback, useEffect, useState } from 'react';
import { getDistricts, getVenues } from '../../services/venues';
import { DEMO_DISTRICTS, DEMO_VENUES } from '../../lib/demoData';

/**
 * Nap quan/huyen + danh sach san.
 * Neu backend chua chay thi tra ve du lieu mau va bat co isDemo
 * de giao dien hien banner canh bao thay vi trang trang.
 */
export function useVenues(filters) {
  const [districts, setDistricts] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    getDistricts()
      .then((d) => setDistricts(d.length ? d : DEMO_DISTRICTS))
      .catch(() => setDistricts(DEMO_DISTRICTS));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVenues({ district: filters.district });
      setVenues(data);
      setIsDemo(false);
    } catch (err) {
      console.warn('[API] khong goi duoc, dung du lieu mau:', err.message);
      const name = DEMO_DISTRICTS.find((d) => d.code === filters.district)?.name;
      setVenues(name ? DEMO_VENUES.filter((v) => v.district_name === name) : DEMO_VENUES);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [filters.district]);

  useEffect(() => { load(); }, [load]);

  return { districts, venues, loading, isDemo, reload: load };
}
