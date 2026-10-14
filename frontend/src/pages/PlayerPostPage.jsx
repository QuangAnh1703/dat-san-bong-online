import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertCircle } from 'lucide-react';
import { errorMessage, useApp } from '../context/AppContext';
import { apiClient } from '../services/api';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import {
  FREELANCE_LEVELS,
  POSITIONS,
  formatViDate,
  levelLabel,
  positionLabel,
  skillToApi,
  todayISO,
} from '../services/mappers';

const inputCls =
  'w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none';
const labelCls = 'text-xs text-slate-300 font-semibold block mb-1.5';
const MAX_AREAS = 5;

export const PlayerPostPage = () => {
  const { user, districts, districtName, showToast } = useApp();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('20:30');
  const [areas, setAreas] = useState(user.districtCode ? [user.districtCode] : []);
  const [positions, setPositions] = useState(user.preferredPosition ? [user.preferredPosition] : ['ANY']);
  const [level, setLevel] = useState(skillToApi(user.skillLevel));
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!areas.length) {
      setError('Chọn ít nhất một khu vực mong muốn');
      return;
    }
    if (end <= start) {
      setError('Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiClient.freelance.createPlayerPost({
        play_date: date,
        start,
        end,
        district_codes: areas,
        positions: positions.length ? positions : ['ANY'],
        level,
        content: content.trim(),
      });
      showToast('Đã đăng tin tìm đội. Các đội sẽ thấy bạn ở tab "Người chơi tìm đội".');
      navigate('/ghep-chan-le?tab=cua-toi');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout
      backTo="/ghep-chan-le"
      backLabel="Về Ghép chân lẻ"
      icon={Search}
      eyebrow="Ghép chân lẻ"
      title="Đăng Tin Tìm Đội"
      description="Báo khung giờ rảnh và khu vực mong muốn, các đội đang thiếu người sẽ mời bạn."
    >
      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-white">1. Khung giờ rảnh</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Ngày</label>
                <input
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Từ</label>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Đến</label>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} required />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-white">2. Khu vực mong muốn</h2>
              <span className="text-xs text-slate-400 tabular-nums">
                Đã chọn {areas.length}/{MAX_AREAS}
              </span>
            </div>
            <ChoiceChips
              options={districts.map((d) => ({ value: d.code, label: d.name }))}
              value={areas}
              onChange={setAreas}
              max={MAX_AREAS}
            />
          </Card>

          <Card className="space-y-4">
            <h2 className="text-base font-bold text-white">3. Hồ sơ thi đấu</h2>
            <div>
              <label className={labelCls}>Vị trí sở trường</label>
              <ChoiceChips options={POSITIONS} value={positions} onChange={setPositions} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Trình độ</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                  {FREELANCE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Giới thiệu ngắn (không bắt buộc)</label>
              <textarea
                rows={3}
                maxLength={500}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: Đá hậu vệ, chạy khỏe, đúng giờ"
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-24 space-y-3 text-xs">
          <h2 className="text-base font-bold text-white">Tóm tắt tin đăng</h2>
          <div className="space-y-2 text-slate-400">
            <Row label="Người chơi" value={user.name || user.phone} />
            <Row label="Rảnh" value={`${formatViDate(date)} · ${start} - ${end}`} />
            <Row label="Khu vực" value={areas.length ? areas.map(districtName).join(', ') : 'Chưa chọn'} />
            <Row label="Vị trí" value={(positions.length ? positions : ['ANY']).map(positionLabel).join(', ')} />
            <Row label="Trình độ" value={levelLabel(level)} />
            <Row label="Điểm uy tín" value={user.reputationScore} highlight />
          </div>
          <p className="pt-3 border-t border-slate-800 text-[0.8125rem] text-slate-500">
            Lời mời từ đội tự hết hạn nếu bạn không phản hồi trong 30 phút. Tin tự gỡ khi tới giờ rảnh.
          </p>
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
          >
            <Search className="w-4 h-4" />
            <span>{sending ? 'Đang đăng...' : 'Đăng tin tìm đội'}</span>
          </button>
        </Card>
      </form>
    </PageLayout>
  );
};

const Row = ({ label, value, highlight }) => (
  <div className="flex justify-between gap-3">
    <span className="shrink-0">{label}:</span>
    <span className={`font-semibold text-right ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</span>
  </div>
);
