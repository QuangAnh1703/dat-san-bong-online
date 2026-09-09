export default function Hero({ venueCount, fieldCount, avgRating, isDemo }) {
  return (
    <div className="hero">
      <div className="bg" aria-hidden="true" />
      <svg className="lines" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1200 420">
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="24" y="24" width="1152" height="372" rx="2" />
          <line x1="600" y1="24" x2="600" y2="396" />
          <circle cx="600" cy="210" r="66" />
          <rect x="24" y="110" width="112" height="200" />
          <rect x="1064" y="110" width="112" height="200" />
          <rect x="24" y="165" width="44" height="90" />
          <rect x="1132" y="165" width="44" height="90" />
        </g>
        <circle cx="600" cy="210" r="4" fill="currentColor" />
      </svg>

      <div className="wrap">
        <div className="eyebrow">
          Ha Noi · {venueCount} cum san dang mo{isDemo ? ' (du lieu mau)' : ''}
        </div>
        <h1>Dat san trong 60 giay, khong can goi dien.</h1>
        <p className="lede">
          Xem lich trong theo thoi gian thuc cua tung san con, giu cho 5 phut va dat coc
          online. Het dat trung, het "anh goi lai sau nhe".
        </p>

        <div className="hero-stats">
          <div><b>{fieldCount}</b><span>san con dang hoat dong</span></div>
          <div><b>{avgRating}★</b><span>danh gia trung binh</span></div>
          <div><b>5 phut</b><span>thoi gian giu cho</span></div>
        </div>
      </div>
    </div>
  );
}
