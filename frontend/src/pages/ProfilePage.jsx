import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage, useApp } from '../context/AppContext';
import { Save, AlertCircle, UserCircle, Mail, Phone } from 'lucide-react';
import { initialsOf } from '../components/Navbar';
import { Card, PageLayout } from '../components/ui/PageLayout';
import { POSITIONS } from '../services/mappers';

const INPUT =
  'w-full h-11 px-3 rounded-xl border border-slate-700 bg-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none';
const LABEL = 'text-xs text-slate-300 font-semibold block mb-1.5';

const ROLE_LABEL = { player: 'Người chơi', owner: 'Chủ sân', admin: 'Admin' };

export const ProfilePage = () => {
  const { user, updateUser, saveTeam, districts, showToast } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [teamName, setTeamName] = useState(user.team?.name || '');
  const [memberCount, setMemberCount] = useState(user.team?.memberCount || 10);
  const [skillLevel, setSkillLevel] = useState(user.skillLevel);
  const [districtCode, setDistrictCode] = useState(user.districtCode || '');
  const [position, setPosition] = useState(user.preferredPosition);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Hồ sơ tải xong sau khi trang đã render -> đồng bộ lại form
  useEffect(() => {
    setName(user.name);
    setTeamName(user.team?.name || '');
    setMemberCount(user.team?.memberCount || 10);
    setSkillLevel(user.skillLevel);
    setDistrictCode(user.districtCode || '');
    setPosition(user.preferredPosition);
  }, [user.id, user.team?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateUser({ name, skillLevel, preferredPosition: position, districtCode: districtCode || null });
      // Đội bóng là tùy chọn: chỉ lưu khi đã có đội hoặc vừa nhập tên đội
      if (teamName.trim() || user.team) {
        if (!teamName.trim()) throw new Error('Tên đội bóng không được để trống');
        await saveTeam({ name: teamName, memberCount, skillLevel, districtCode: districtCode || null });
      }
      showToast('Đã lưu hồ sơ');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      backTo="/"
      icon={UserCircle}
      eyebrow="Tài khoản"
      title="Hồ Sơ Cá Nhân & Đội Bóng"
      description="Quản lý thông tin đội bóng phủi, cấp độ thi đấu và điểm uy tín."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tóm tắt tài khoản */}
        <Card className="lg:sticky lg:top-24 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xl shrink-0">
              {initialsOf(user.name)}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-white truncate">{user.name || 'Chưa đặt tên'}</div>
              <div className="text-xs font-bold text-amber-400 uppercase mt-0.5">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[0.8125rem] text-slate-400">Trận đã thi đấu</div>
              <div className="text-2xl font-black text-white font-display tabular-nums">{user.matchesPlayed}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[0.8125rem] text-slate-400">Điểm uy tín</div>
              <div className="text-2xl font-black text-emerald-400 font-display tabular-nums">
                {user.reputationScore}
                <span className="text-sm text-slate-500">/100</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">{user.phone || 'Chưa có số điện thoại'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">{user.email || 'Chưa có email'}</span>
            </div>
            <p className="text-[0.8125rem] text-slate-500">
              Số điện thoại và email dùng để đăng nhập nên không đổi được.
            </p>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-white">Thông tin cá nhân</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Họ và tên</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} required />
              </div>
              <div>
                <label className={LABEL}>Trình độ</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className={`${INPUT} cursor-pointer`}
                >
                  <option value="chill">Vừa đá vừa thở (Vui vẻ U35)</option>
                  <option value="intermediate">Trung bình khá (Chạy nhiệt)</option>
                  <option value="hardcore">Phủi cứng (Thể lực dồi dào)</option>
                  <option value="pro">Bán chuyên / Thi đấu giải</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Vị trí sở trường</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className={`${INPUT} cursor-pointer`}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Khu vực sân nhà thường đá</label>
                <select
                  value={districtCode}
                  onChange={(e) => setDistrictCode(e.target.value)}
                  className={`${INPUT} cursor-pointer`}
                >
                  <option value="">— Chưa chọn —</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Đội bóng phủi</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.team
                  ? 'Bạn là đội trưởng của đội này.'
                  : 'Nhập tên đội để tạo đội (cần có đội để đăng tin tìm đối).'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className={LABEL}>Tên đội bóng</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ví dụ: FC Anh Em Xây Dựng"
                  maxLength={120}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Số thành viên</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={memberCount}
                  onChange={(e) => setMemberCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={INPUT}
                />
              </div>
            </div>
          </Card>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};
