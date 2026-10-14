import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage, useApp } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { PageLayout } from '../components/ui/PageLayout';
import { Users, MapPin, Calendar, Clock, Award, Plus, Send, CheckCircle2, Loader2, Inbox } from 'lucide-react';

const REQUEST_STATUS = {
  PENDING: 'Đã gửi lời mời · Chờ phản hồi',
  ACCEPTED: 'Lời mời đã được chấp nhận',
  REJECTED: 'Lời mời bị từ chối',
};

export const MatchmakingPage = () => {
  const {
    challenges,
    challengesLoading,
    isLoggedIn,
    user,
    applyToChallenge,
    getChallengeRequests,
    respondChallengeRequest,
    activeChallengeToApply,
    setActiveChallengeToApply,
    setIsAuthModalOpen,
    showToast,
  } = useApp();
  const navigate = useNavigate();

  // Lời mời trên bài của chính mình
  const [openRequestsFor, setOpenRequestsFor] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const [filterLevel, setFilterLevel] = useState('all');

  // Application form modal state
  const [applicantTeam, setApplicantTeam] = useState('');
  const [applicantPhone, setApplicantPhone] = useState(user.phone);
  const [applicantMessage, setApplicantMessage] = useState(
    'Đội bên mình muốn giao lưu vui vẻ, văn minh và tôn trọng đối thủ!',
  );
  const [sending, setSending] = useState(false);
  const [applyError, setApplyError] = useState(null);

  useEffect(() => {
    setApplicantPhone(user.phone);
    setApplicantTeam(user.team?.name || '');
  }, [user.id, user.team?.id]);

  const toggleRequests = async (challengeId) => {
    if (openRequestsFor === challengeId) {
      setOpenRequestsFor(null);
      return;
    }
    setOpenRequestsFor(challengeId);
    setRequestsLoading(true);
    try {
      setRequests(await getChallengeRequests(challengeId));
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setRequestsLoading(false);
    }
  };

  const respond = async (req, accept) => {
    setRespondingId(req.id);
    try {
      await respondChallengeRequest(req.id, accept);
      setOpenRequestsFor(null);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const openNewPost = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate('/giao-huu/dang-tin');
  };

  const filteredChallenges = challenges.filter((c) => {
    if (filterLevel === 'all') return true;
    return c.skillLevel === filterLevel;
  });

  const handleSendApplication = async (e) => {
    e.preventDefault();
    if (!activeChallengeToApply) return;
    if (!applicantTeam.trim() || !applicantPhone.trim()) {
      setApplyError('Vui lòng nhập tên đội và số điện thoại!');
      return;
    }

    setSending(true);
    setApplyError(null);
    try {
      // Backend chỉ lưu một lời nhắn -> gộp tên đội và SĐT vào đó
      await applyToChallenge(
        activeChallengeToApply.id,
        `${applicantTeam.trim()} (${applicantPhone.trim()}): ${applicantMessage.trim()}`.slice(0, 300),
      );
      setActiveChallengeToApply(null);
    } catch (err) {
      setApplyError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout
      backTo="/"
      eyebrow="Cộng đồng bóng đá phong trào"
      icon={Users}
      title="Cáp kèo & Tìm đối thủ"
      description="Các đội đã chốt sân đang chờ đối thủ: chọn kèo đúng trình độ, gửi lời mời thách đấu hoặc tự đăng tin tìm đối."
      actions={
        <button
          onClick={openNewPost}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng tin tìm đối thủ</span>
        </button>
      }
    >
      {/* Level filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
        <span className="text-xs text-slate-400 font-medium shrink-0">Lọc trình độ:</span>
        {[
          { id: 'all', label: 'Tất cả kèo' },
          { id: 'chill', label: 'Vừa đá vừa thở (Văn phòng/U35)' },
          { id: 'intermediate', label: 'Trung bình khá' },
          { id: 'hardcore', label: 'Phủi cứng / Bào thể lực' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterLevel(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              filterLevel === item.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!isLoggedIn ? (
        <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 p-8">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Đăng nhập để xem các kèo đang mở</p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
          >
            Đăng nhập
          </button>
        </div>
      ) : challengesLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tải kèo...</span>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800 p-8">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Chưa có kèo nào đang mở</p>
          <p className="text-xs text-slate-400 mt-1">Quay lại sau hoặc thử bộ lọc trình độ khác.</p>
        </div>
      ) : (
        /* Challenges Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-slate-900 rounded-2xl p-5 border border-emerald-950 hover:border-emerald-700/60 shadow-xl flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Top Host & Skill */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <span>Bài đăng #{challenge.id}</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors mt-0.5">
                      {challenge.hostTeam}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[0.75rem] font-bold border shrink-0 ${
                      challenge.skillLevel === 'chill'
                        ? 'bg-teal-950/80 text-teal-300 border-teal-800'
                        : challenge.skillLevel === 'intermediate'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800'
                    }`}
                  >
                    {challenge.skillLabel}
                  </span>
                </div>

                {/* Match Information */}
                <div className="space-y-2 py-3 border-y border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-white">{challenge.pitchName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{challenge.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-white">{challenge.timeSlot}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300 font-medium">
                    <Award className="w-3.5 h-3.5" />
                    <span>Hình thức: {challenge.costSharing}</span>
                  </div>
                </div>

                {/* Note message */}
                <div className="mt-3 text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 line-clamp-2">
                  "{challenge.note}"
                </div>

                {challenge.status === 'matched' && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ĐÃ CÁP KÈO THÀNH CÔNG! Đang chuẩn bị thi đấu.</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {challenge.status === 'open' && (
                <div className="mt-5 pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 min-w-0 truncate">
                      Đăng bởi: <span className="text-white font-medium">{challenge.contactName}</span>
                    </div>
                    {challenge.authorId === user.id ? (
                      <button
                        onClick={() => toggleRequests(challenge.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>Lời mời ({challenge.pendingRequests})</span>
                      </button>
                    ) : challenge.myRequestStatus ? (
                      <span className="text-[0.8125rem] font-bold text-amber-300 text-right">
                        {REQUEST_STATUS[challenge.myRequestStatus] || challenge.myRequestStatus}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setApplyError(null);
                          setActiveChallengeToApply(challenge);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-md active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Cáp kèo ngay</span>
                      </button>
                    )}
                  </div>

                  {openRequestsFor === challenge.id && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      {requestsLoading ? (
                        <div className="text-[0.8125rem] text-slate-400">Đang tải lời mời...</div>
                      ) : requests.filter((r) => r.status === 'PENDING').length === 0 ? (
                        <div className="text-[0.8125rem] text-slate-400">Chưa có đội nào gửi lời mời.</div>
                      ) : (
                        requests
                          .filter((r) => r.status === 'PENDING')
                          .map((r) => (
                            <div
                              key={r.id}
                              className="space-y-1.5 pb-2 border-b border-slate-800 last:border-0 last:pb-0"
                            >
                              <div className="text-xs text-white font-bold">
                                {r.teamName || r.requesterName}
                                {r.requesterPhone && (
                                  <span className="text-slate-400 font-normal"> · {r.requesterPhone}</span>
                                )}
                              </div>
                              {r.message && <div className="text-[0.8125rem] text-slate-400 italic">"{r.message}"</div>}
                              <div className="flex gap-2">
                                <button
                                  disabled={respondingId === r.id}
                                  onClick={() => respond(r, true)}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs cursor-pointer"
                                >
                                  Chấp nhận cáp kèo
                                </button>
                                <button
                                  disabled={respondingId === r.id}
                                  onClick={() => respond(r, false)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 text-xs cursor-pointer"
                                >
                                  Từ chối
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Gửi lời mời thách đấu */}
      {activeChallengeToApply && (
        <Modal
          title="Gửi Lời Mời Cáp Kèo"
          description={
            <>
              Thách đấu với <span className="text-emerald-400 font-bold">{activeChallengeToApply.hostTeam}</span>
            </>
          }
          onClose={() => setActiveChallengeToApply(null)}
        >
          <form onSubmit={handleSendApplication} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Tên đội bóng của bạn:</label>
              <input
                type="text"
                value={applicantTeam}
                onChange={(e) => setApplicantTeam(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Số điện thoại đội trưởng:</label>
              <input
                type="tel"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Lời nhắn giao lưu (Trình độ, phong cách thi đấu):
              </label>
              <textarea
                rows={3}
                value={applicantMessage}
                onChange={(e) => setApplicantMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[0.8125rem] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Thông tin trận đấu:</div>
              <div>• Sân: {activeChallengeToApply.pitchName}</div>
              <div>
                • Giờ đá: {activeChallengeToApply.date} ({activeChallengeToApply.timeSlot})
              </div>
              <div>• Thể thức: {activeChallengeToApply.costSharing}</div>
            </div>

            {applyError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300">{applyError}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveChallengeToApply(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold cursor-pointer"
              >
                {sending ? 'Đang gửi...' : 'Xác nhận gửi lời mời'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PageLayout>
  );
};
