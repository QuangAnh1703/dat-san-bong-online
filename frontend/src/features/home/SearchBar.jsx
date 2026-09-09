import { useState } from 'react';
import { today } from '../../lib/format';

const FIELD_TYPES = [
  { value: '', label: 'Tat ca' },
  { value: 'F5', label: 'San 5' },
  { value: 'F7', label: 'San 7' },
  { value: 'F11', label: 'San 11' },
];

const TIME_SLOTS = ['Ca ngay', '15:00 - 17:00', '17:30 - 19:00', '19:30 - 21:00', '21:00 - 23:00'];

export default function SearchBar({ districts, filters, onChange, onSubmit }) {
  const [gpsNote, setGpsNote] = useState(null);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsNote('Trinh duyet khong ho tro dinh vi - hay chon quan/huyen o tren.');
      return;
    }
    setGpsNote('Dang lay vi tri...');
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsNote(
        `Dang dung vi tri hien tai (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}).`
      ),
      () => setGpsNote('Da chuyen sang chon khu vuc thu cong - hay chon quan/huyen o tren.')
    );
  }

  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="wrap searchwrap">
      <form className="search" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className="field">
          <label htmlFor="f-area">Khu vuc</label>
          <select id="f-area" value={filters.district} onChange={set('district')}>
            <option value="">Tat ca quan/huyen</option>
            {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-type">Loai san</label>
          <select id="f-type" value={filters.fieldType} onChange={set('fieldType')}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-date">Ngay</label>
          <input id="f-date" type="date" value={filters.date || today()} onChange={set('date')} />
        </div>

        <div className="field">
          <label htmlFor="f-time">Khung gio</label>
          <select id="f-time" value={filters.time} onChange={set('time')}>
            {TIME_SLOTS.map((t) => <option key={t} value={t === 'Ca ngay' ? '' : t}>{t}</option>)}
          </select>
        </div>

        <button className="btn-primary" type="submit">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
               stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="7" cy="7" r="5" /><path d="M11 11l4 4" />
          </svg>
          Tim san
        </button>
      </form>

      <p className="gpsnote">
        {gpsNote || (
          <>
            Chua bat dinh vi.{' '}
            <button type="button" onClick={useGps}>Dung vi tri hien tai (GPS)</button>
          </>
        )}
      </p>
    </div>
  );
}
