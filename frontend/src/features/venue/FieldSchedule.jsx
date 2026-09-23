import { useState } from 'react';
import { vnd } from '../../lib/format';
import { today, addDays } from '../../lib/format';

const TIME_SLOTS = [
  '06:00 - 07:30', '07:30 - 09:00', '09:00 - 10:30', '10:30 - 12:00',
  '12:00 - 13:30', '13:30 - 15:00', '15:00 - 16:30', '16:30 - 18:00',
  '18:00 - 19:30', '19:30 - 21:00', '21:00 - 22:30',
];

export default function FieldSchedule({ fieldId, selectedDate, onDateChange, schedule }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const getSlotStatus = (slot) => {
    if (!schedule.slots) return 'available';
    const booked = schedule.slots[slot];
    return booked ? 'booked' : 'available';
  };

  const getSlotPrice = (slot) => {
    if (!schedule.prices) return schedule.price;
    return schedule.prices[slot] || schedule.price;
  };

  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today(), i));

  return (
    <div className="field-schedule">
      {/* Date picker */}
      <div className="date-picker">
        {nextDays.map((date) => {
          const isSelected = date === selectedDate;
          const dayName = new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' }).replace('.', '');
          const dayNum = date.split('-')[2];

          return (
            <button
              key={date}
              className={`date-btn ${isSelected ? 'is-active' : ''}`}
              onClick={() => onDateChange(date)}
            >
              <div className="day-name">{dayName}</div>
              <div className="day-num">{dayNum}</div>
            </button>
          );
        })}
      </div>

      {/* Time slots grid */}
      <div className="time-slots">
        {TIME_SLOTS.map((slot) => {
          const status = getSlotStatus(slot);
          const price = getSlotPrice(slot);
          const isSelected = selectedSlot === slot;

          return (
            <button
              key={slot}
              className={`slot ${status} ${isSelected ? 'is-active' : ''}`}
              disabled={status === 'booked'}
              onClick={() => setSelectedSlot(slot)}
            >
              <div className="slot-time">{slot}</div>
              <div className="slot-price">{price ? vnd(price) : '—'}</div>
              <div className="slot-status">
                {status === 'booked' ? 'Da dat' : 'Trong'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected slot info */}
      {selectedSlot && (
        <div className="slot-info">
          <div className="selected-info">
            <span>Chon: <strong>{selectedSlot}</strong></span>
            <span>Ngay: <strong>{selectedDate}</strong></span>
            <span>Gia: <strong>{vnd(getSlotPrice(selectedSlot))}</strong></span>
          </div>
          <button className="btn-primary" style={{ width: '100%' }}>
            Dat san
          </button>
        </div>
      )}
    </div>
  );
}
