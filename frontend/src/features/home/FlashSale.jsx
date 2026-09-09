import { useCountdown } from './useCountdown';
import { vnd, hms } from '../../lib/format';

export default function FlashSale({ deals, seconds = 6300 }) {
  const left = useCountdown(seconds);
  if (!deals.length) return null;   // Wireframe: an hoan toan khi khong co deal

  return (
    <section className="wrap" style={{ paddingTop: 8 }}>
      <div className="flash">
        <div className="flashhead">
          <h2><span className="bolt" aria-hidden="true">⚡</span> Flash Sale gio chot</h2>
          <div className="countdown">
            Uu dai ket thuc sau <span className="clock mono">{hms(left)}</span>
          </div>
        </div>

        <div className="grid3">
          {deals.map((d) => (
            <div className="deal" key={d.id}>
              <div className="mini"><span /></div>
              <div className="deal-info">
                <b>{d.name} · <span className="mono">{d.hour}</span></b>
                <div className="deal-price">
                  <s>{vnd(d.oldPrice)}</s>
                  <strong>{vnd(d.newPrice)}</strong>
                  <span className="off">-{d.off}%</span>
                </div>
              </div>
              <button className="btn-book" type="button">Dat ngay</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
