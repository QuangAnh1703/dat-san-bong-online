import { useState } from 'react';
import Banner from '../../components/ui/Banner';
import { vnd } from '../../lib/format';

/** WF-05 - Dat san dinh ky */
export default function SubscriptionPage() {
  const [selected, setSelected] = useState(null);

  const plans = [
    {
      id: 'weekly',
      name: 'Hang tuan',
      price: 1500000,
      period: '4 lan/thang',
      perSession: 375000,
      features: ['Dat san cung gio, cung ngay moi tuan', 'Muc gia uu dai 20%', 'Huy lich tu do', 'Ho tro thanh toan'],
    },
    {
      id: 'bi-weekly',
      name: 'Hang hai tuan',
      price: 800000,
      period: '2 lan/thang',
      perSession: 400000,
      features: ['Dat san cung gio, cung ngay moi 2 tuan', 'Muc gia uu dai 15%', 'Huy lich tu do', 'Ho tro thanh toan'],
      popular: true,
    },
    {
      id: 'monthly',
      name: 'Hang thang',
      price: 450000,
      period: '1 lan/thang',
      perSession: 450000,
      features: ['Dat san cung gio, cung ngay moi thang', 'Muc gia co dinh', 'Huy lich tu do', 'Ho tro thanh toan'],
    },
  ];

  return (
    <main className="subscription-page">
      <section className="wrap">
        <div className="subscription-header">
          <h1>Dat san dinh ky</h1>
          <p>Dat san thuong xuyen voi muc gia uu dai</p>
        </div>

        <Banner>
          Goi dinh ky se tu dong gia han moi thang. Ban co the huy bat cu luc nao khong can phat sinh chi phi.
        </Banner>

        {/* Plans */}
        <div className="plans-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${selected === plan.id ? 'is-selected' : ''} ${plan.popular ? 'is-popular' : ''}`}
              onClick={() => setSelected(plan.id)}
            >
              {plan.popular && <div className="popular-badge">Pho bien</div>}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">{vnd(plan.price)}</div>
                <div className="plan-period">{plan.period}</div>
              </div>

              <div className="plan-per-session">
                <span className="label">Binh quan:</span>
                <span className="value">{vnd(plan.perSession)}/lan</span>
              </div>

              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <span className="check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`plan-btn ${selected === plan.id ? 'is-active' : ''}`}
                onClick={() => setSelected(plan.id)}
              >
                {selected === plan.id ? '✓ Da chon' : 'Chon goi nay'}
              </button>
            </div>
          ))}
        </div>

        {/* Setup form */}
        {selected && (
          <div className="subscription-setup">
            <h2>Cau hinh dat san dinh ky</h2>

            <div className="setup-form">
              <div className="form-group">
                <label htmlFor="venue">San bong</label>
                <select id="venue">
                  <option>Chon san...</option>
                  <option>San Cau Giay Center</option>
                  <option>San My Dinh A</option>
                  <option>San Bach Khoa</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="field">San con</label>
                <select id="field">
                  <option>Chon san con...</option>
                  <option>San 1 - 5a side</option>
                  <option>San 2 - 5a side</option>
                  <option>San 3 - 7a side</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="day">Ngay trong tuan</label>
                <select id="day">
                  <option>Chon ngay...</option>
                  <option>Thu 2</option>
                  <option>Thu 3</option>
                  <option>Thu 4</option>
                  <option>Thu 5</option>
                  <option>Thu 6</option>
                  <option>Thu 7</option>
                  <option>Chu nhat</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time">Khung gio</label>
                <select id="time">
                  <option>Chon gio...</option>
                  <option>15:00 - 16:30</option>
                  <option>17:00 - 18:30</option>
                  <option>19:00 - 20:30</option>
                  <option>20:30 - 22:00</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="start">Bat dau tu</label>
                <input id="start" type="date" />
              </div>

              <div className="payment-info">
                <div className="info-row">
                  <span>Goi da chon:</span>
                  <strong>
                    {plans.find((p) => p.id === selected)?.name} - {vnd(plans.find((p) => p.id === selected)?.price)}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Tong thanh toan:</span>
                  <strong>{vnd(plans.find((p) => p.id === selected)?.price)}</strong>
                </div>
              </div>

              <button className="btn-primary" style={{ width: '100%' }}>
                Xac nhan dat san dinh ky
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
