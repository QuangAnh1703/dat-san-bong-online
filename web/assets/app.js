'use strict';
/* ============================================================
   Trang chu - goi API that (/api/...), co du lieu mau du phong
   khi API hoac CSDL chua chay.
   ============================================================ */

const API = (location.port === '5500' || location.protocol === 'file:')
  ? 'http://localhost:3000'   // mo bang Live Server -> tro sang API
  : '';                       // duoc Express phuc vu -> cung goc

const vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'd';
const $   = id => document.getElementById(id);

/* ---------- Goi API co bat loi ---------- */
async function api(path) {
  const res = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ---------- Du lieu mau khi chua co CSDL ---------- */
const DEMO_VENUES = [
  { id:1, name:'San Cau Giay Center', district_name:'Cau Giay', avg_rating:4.6, rating_count:128,
    field_count:6, min_price:250000, amenities:['Den','Cang tin'], distance:'1,2 km' },
  { id:2, name:'San My Dinh A', district_name:'Nam Tu Liem', avg_rating:4.3, rating_count:86,
    field_count:3, min_price:200000, amenities:['Bai xe','Wifi'], distance:'2,4 km' },
  { id:3, name:'San Bach Khoa', district_name:'Hai Ba Trung', avg_rating:4.8, rating_count:203,
    field_count:2, min_price:600000, amenities:['Den','Trong tai'], distance:'3,1 km' },
  { id:4, name:'San Nam Tu Liem', district_name:'Nam Tu Liem', avg_rating:4.1, rating_count:54,
    field_count:8, min_price:180000, amenities:['Den'], distance:'4,0 km' },
];
const DEMO_DISTRICTS = [
  { code:'CG', name:'Cau Giay' }, { code:'NTL', name:'Nam Tu Liem' },
  { code:'TX', name:'Thanh Xuan' }, { code:'HBT', name:'Hai Ba Trung' },
  { code:'HM', name:'Hoang Mai' }, { code:'LB', name:'Long Bien' },
];
const DEALS = [
  { name:'San Thanh Xuan', hour:'19:00', old:300000, now:240000, off:20 },
  { name:'San Hoang Mai',  hour:'20:30', old:250000, now:200000, off:20 },
  { name:'San Long Bien',  hour:'21:00', old:220000, now:165000, off:25 },
];

/* ---------- Ve mot the san ---------- */
const PITCH_SVG = `<svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1">
  <rect x="6" y="6" width="148" height="88"/><line x1="80" y1="6" x2="80" y2="94"/><circle cx="80" cy="50" r="16"/>
  <rect x="6" y="28" width="18" height="44"/><rect x="136" y="28" width="18" height="44"/></svg>`;

function venueCard(v) {
  const tags = (v.amenities || []).map(a => `<span class="tag">${a}</span>`).join('');
  const meta = [v.distance, v.district_name].filter(Boolean).join(' &middot; ');
  return `<a class="venue" href="venue.html?id=${v.id}">
    <div class="thumb">${PITCH_SVG}<span class="slots">${v.field_count} san con</span></div>
    <div class="venue-body">
      <h3>${v.name}</h3>
      <div class="meta"><span>${meta}</span><span class="dot">&middot;</span>
        <span class="star">&#9733;</span><span class="mono">${Number(v.avg_rating).toFixed(1)}</span>
        <span style="color:var(--text-3)">(${v.rating_count})</span></div>
      <div class="tags">${tags}</div>
      <div class="price">${v.min_price ? vnd(v.min_price) : 'Lien he'} <small>/ gio</small></div>
    </div></a>`;
}

function renderVenues(list, note) {
  const box = $('venues');
  if (!list.length) {
    box.innerHTML = `<div class="state" style="grid-column:1/-1">
      <b>Khong tim thay san phu hop</b>Thu bo bot bo loc hoac chon quan/huyen khac.</div>`;
    return;
  }
  box.innerHTML = list.map(venueCard).join('');
  if (note) showBanner(note);
}

function showBanner(msg) {
  const b = $('api-banner');
  b.innerHTML = `<span aria-hidden="true">&#9888;</span> ${msg}`;
  b.classList.remove('hidden');
}

/* ---------- Nap danh sach san ---------- */
async function loadVenues() {
  const district = $('f-area').value;
  const q = new URLSearchParams();
  if (district) q.set('district', district);

  $('venues').innerHTML = Array.from({ length: 4 },
    () => '<div class="skeleton"></div>').join('');

  try {
    const r = await api('/api/venues?' + q.toString());
    const data = (r.data || []).map(v => ({ ...v, amenities: v.amenities || [] }));
    renderVenues(data);
    $('hero-eyebrow').textContent = `Ha Noi · ${data.length} cum san dang mo`;
    $('stat-slots').textContent = data.reduce((s, v) => s + Number(v.field_count || 0), 0);
    const avg = data.length
      ? (data.reduce((s, v) => s + Number(v.avg_rating || 0), 0) / data.length).toFixed(1)
      : '--';
    $('stat-rating').textContent = avg + '★';
  } catch (err) {
    console.warn('[API] khong goi duoc, dung du lieu mau:', err.message);
    const data = district
      ? DEMO_VENUES.filter(v => DEMO_DISTRICTS.find(d => d.code === district)?.name === v.district_name)
      : DEMO_VENUES;
    renderVenues(data, 'Chua ket noi duoc API (<code class="mono">' + (API || location.origin) +
      '</code>). Dang hien thi du lieu mau - chay <code class="mono">docker compose up -d</code> va <code class="mono">npm start</code> trong thu muc api.');
    $('hero-eyebrow').textContent = 'Ha Noi · du lieu mau';
    $('stat-slots').textContent = '19';
    $('stat-rating').textContent = '4.5★';
  }
}

/* ---------- Nap quan/huyen ---------- */
async function loadDistricts() {
  const sel = $('f-area');
  let list = DEMO_DISTRICTS;
  try {
    const r = await api('/api/districts');
    if (r.data && r.data.length) list = r.data;
  } catch (_) { /* dung danh sach mau */ }
  sel.insertAdjacentHTML('beforeend',
    list.map(d => `<option value="${d.code}">${d.name}</option>`).join(''));
}

/* ---------- Flash Sale + dem nguoc ---------- */
function renderDeals() {
  $('deals').innerHTML = DEALS.map(d => `
    <div class="deal">
      <div class="mini"><span></span></div>
      <div class="deal-info">
        <b>${d.name} &middot; <span class="mono">${d.hour}</span></b>
        <div class="deal-price"><s>${vnd(d.old)}</s><strong>${vnd(d.now)}</strong><span class="off">-${d.off}%</span></div>
      </div>
      <button class="btn-book" type="button">Dat ngay</button>
    </div>`).join('');
}

function startCountdown(seconds) {
  const el = $('clock');
  const pad = n => String(n).padStart(2, '0');
  setInterval(() => {
    if (seconds <= 0) return;
    seconds--;
    el.textContent = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds % 3600 / 60))}:${pad(seconds % 60)}`;
  }, 1000);
}

/* ---------- GPS: neu tu choi thi giu dropdown quan/huyen ---------- */
function setupGps() {
  $('btn-gps').addEventListener('click', () => {
    if (!navigator.geolocation) {
      $('gpsnote').textContent = 'Trinh duyet khong ho tro dinh vi - hay chon quan/huyen o tren.';
      return;
    }
    $('gpsnote').textContent = 'Dang lay vi tri...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: la, longitude: lo } = pos.coords;
        $('gpsnote').innerHTML = `Dang dung vi tri hien tai <span class="mono">(${la.toFixed(3)}, ${lo.toFixed(3)})</span>.`;
        $('list-title').textContent = 'San gan ban';
      },
      () => {
        $('gpsnote').textContent = 'Da chuyen sang chon khu vuc thu cong - hay chon quan/huyen o tren.';
        $('list-title').textContent = 'San dang mo';
      });
  });
}

/* ---------- Khoi tao ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  $('f-date').value = new Date().toISOString().slice(0, 10);
  renderDeals();
  startCountdown(1 * 3600 + 45 * 60);
  setupGps();
  await loadDistricts();
  await loadVenues();

  $('search-form').addEventListener('submit', e => { e.preventDefault(); loadVenues(); });
  $('f-area').addEventListener('change', loadVenues);
});
