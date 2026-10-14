import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiClient, SESSION_EXPIRED_EVENT, tokenStore } from '../services/api';
import {
  buildSlots,
  distanceKm,
  mapAdminUser,
  mapBooking,
  mapComplaint,
  mapJoinRequest,
  mapReport,
  mapTeam,
  mapOwnerRequest,
  mapPendingVenue,
  mapPost,
  mapProfile,
  mapVenue,
  pitchTypeToFieldType,
  skillToApi,
  todayISO,
} from '../services/mappers';

const GUEST_USER = {
  team: null,
  id: '',
  role: 'player',
  districtCode: null,
  name: 'Khách',
  phone: '',
  email: '',
  teamName: '',
  memberCount: 0,
  skillLevel: 'intermediate',
  homeDistrict: '',
  matchesPlayed: 0,
  reputationScore: 0,
};

export const errorMessage = (err) =>
  err instanceof ApiError || err instanceof Error ? err.message : 'Đã có lỗi xảy ra';

const AppContext = createContext(undefined);

async function fetchSchedules(pitch, date) {
  return Promise.all(
    pitch.subPitches.map(async (sub) => {
      const res = await apiClient.fields.getSchedule(sub.id, date);
      return { ...sub, slots: buildSlots(pitch, sub, date, res.slots || []) };
    }),
  );
}

export const AppProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [districts, setDistricts] = useState([]);

  const [rawPitches, setRawPitches] = useState([]);
  const [pitchesLoading, setPitchesLoading] = useState(true);
  const [pitchesError, setPitchesError] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  const [adminStats, setAdminStats] = useState(null);
  const [ownerApplications, setOwnerApplications] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [pendingVenues, setPendingVenues] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [adminReport, setAdminReport] = useState(null);

  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedPitchType, setSelectedPitchType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [gpsActive, setGpsActiveState] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeChallengeToApply, setActiveChallengeToApply] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastTone, setToastTone] = useState('success');

  const showToast = useCallback((msg, tone = 'success') => {
    setToastMessage(msg);
    setToastTone(tone);
    setTimeout(() => setToastMessage((cur) => (cur === msg ? null : cur)), 4000);
  }, []);

  const districtName = useCallback(
    (code) => (code ? districts.find((d) => d.code === code)?.name || code : ''),
    [districts],
  );

  // ------------------------------------------------------------ auth

  const loadProfile = useCallback(async () => {
    const [profile, team] = await Promise.all([apiClient.profile.get(), apiClient.teams.getMine()]);
    const mapped = mapProfile(profile, districtName, mapTeam(team.team));
    setAuthUser(mapped);
    return mapped;
  }, [districtName]);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setAuthUser(null);
    setBookings([]);
    setChallenges([]);
  }, []);

  useEffect(() => {
    apiClient
      .getDistricts()
      .then((res) => setDistricts(res.data || []))
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setAuthLoading(false);
      return;
    }
    loadProfile()
      .catch(() => clearSession())
      .finally(() => setAuthLoading(false));
    // chỉ chạy lúc khởi động
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tên quận trong hồ sơ phụ thuộc danh mục quận tải về sau
  useEffect(() => {
    setAuthUser((u) => (u ? { ...u, homeDistrict: districtName(u.districtCode) } : u));
  }, [districtName]);

  useEffect(() => {
    const onExpired = () => {
      clearSession();
      showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'error');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession, showToast]);

  // Token nằm trong localStorage dùng chung mọi tab: tab khác đăng nhập tài khoản khác thì tab này
  // đang gửi token của người đó (vd. tab chủ sân gọi /api/owner/* bằng token người chơi -> FORBIDDEN)
  const authUserIdRef = useRef(null);
  authUserIdRef.current = authUser?.id ?? null;

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== tokenStore.key && e.key !== null) return;
      if (!tokenStore.get()) {
        clearSession();
        return;
      }
      const prevId = authUserIdRef.current;
      loadProfile()
        .then((profile) => {
          if (profile.id === prevId) return;
          showToast(`Tab khác đã đăng nhập tài khoản ${profile.name || ''}, trang đã chuyển theo.`);
        })
        .catch(() => clearSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clearSession, loadProfile, showToast]);

  const startSession = async (res) => {
    tokenStore.set(res.access_token, res.refresh_token);
    await loadProfile();
  };

  const login = async (identifier, password) => {
    const isEmail = identifier.includes('@');
    const res = await apiClient.auth.login(
      isEmail ? { email: identifier.trim(), password } : { phone_number: identifier.replace(/\s/g, ''), password },
    );
    await startSession(res);
  };

  const registerWithPhone = async ({ phone, password, name, districtCode, role }) => {
    const res = await apiClient.auth.registerWithPhone({
      phone_number: phone.replace(/\s/g, ''),
      password,
      full_name: name.trim(),
      district_code: districtCode || undefined,
      role,
    });
    await startSession(res);
  };

  const requestEmailOtp = async (email) => {
    await apiClient.auth.requestOtp(email.trim());
  };

  const registerWithEmail = async ({ email, otp, password, name, role }) => {
    const { temp_token } = await apiClient.auth.verifyOtp(email.trim(), otp.trim());
    const res = await apiClient.auth.registerWithOtp({
      temp_token,
      password,
      full_name: name.trim(),
      role,
    });
    await startSession(res);
  };

  const logout = () => {
    clearSession();
    showToast('Đã đăng xuất.');
  };

  const updateUser = async ({ name, districtCode, skillLevel, preferredPosition }) => {
    await apiClient.profile.update({
      ...(name !== undefined && { full_name: name }),
      ...(districtCode !== undefined && { district_code: districtCode }),
      ...(skillLevel !== undefined && { skill_level: skillToApi(skillLevel) }),
      ...(preferredPosition !== undefined && { preferred_position: preferredPosition }),
    });
    await loadProfile();
    showToast('Cập nhật hồ sơ thành công!');
  };

  const saveTeam = async ({ name, memberCount, skillLevel, districtCode }) => {
    await apiClient.teams.save({
      name: name.trim(),
      member_count: memberCount,
      skill_level: skillToApi(skillLevel),
      ...(districtCode !== undefined && { district_code: districtCode }),
    });
    await loadProfile();
  };

  // Mỗi tài khoản chỉ có đúng giao diện của vai trò mình, không chuyển qua lại
  const role = authUser?.role || 'player';

  // ------------------------------------------------------------ venues

  const reloadPitches = useCallback(async () => {
    setPitchesLoading(true);
    setPitchesError(null);
    try {
      const list = await apiClient.venues.getAll();
      const today = todayISO();
      const pitches = await Promise.all(
        (list.data || []).map(async (row) => {
          const pitch = mapVenue(await apiClient.venues.getById(String(row.id)));
          return { ...pitch, subPitches: await fetchSchedules(pitch, today) };
        }),
      );
      setRawPitches(pitches);
    } catch (err) {
      setRawPitches([]);
      setPitchesError(errorMessage(err));
    } finally {
      setPitchesLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadPitches();
  }, [reloadPitches]);

  const pitches = useMemo(() => {
    if (!userLocation) return rawPitches;
    return rawPitches.map((p) =>
      p.latitude != null && p.longitude != null
        ? { ...p, distanceKm: distanceKm(userLocation.lat, userLocation.lon, p.latitude, p.longitude) }
        : p,
    );
  }, [rawPitches, userLocation]);

  const setGpsActive = (active) => {
    if (!active) {
      setGpsActiveState(false);
      return;
    }
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsActiveState(true);
      },
      () => {
        setGpsActiveState(false);
        showToast('Không lấy được vị trí. Hãy cho phép truy cập vị trí trong trình duyệt.', 'error');
      },
    );
  };

  const loadSubPitches = (pitch, date) => fetchSchedules(pitch, date);

  const ownerPitches = useMemo(() => {
    if (!authUser) return [];
    if (authUser.role === 'admin') return pitches;
    return pitches.filter((p) => p.ownerId === authUser.id);
  }, [pitches, authUser]);

  // Cụm sân đang quản lý dùng chung cho mọi trang của chủ sân
  const [managedPitchId, setManagedPitchId] = useState('');
  const managedPitch = ownerPitches.find((p) => p.id === managedPitchId) || ownerPitches[0] || null;

  const addSubPitch = async (pitchId, name, type) => {
    await apiClient.fields.create({ venue_id: Number(pitchId), name, type: pitchTypeToFieldType(type) });
    await reloadPitches();
    showToast(`Đã thêm sân con "${name}" thành công!`);
  };

  const deleteSubPitch = async (subPitchId) => {
    await apiClient.fields.delete(subPitchId);
    await reloadPitches();
    showToast('Đã xóa sân con khỏi cụm sân.');
  };

  const getVenueRevenue = async (pitchId) => {
    const res = await apiClient.venues.getRevenue(pitchId);
    return (res.data || []).map((r) => ({
      date: r.play_date,
      gross: Number(r.gross_amount) || 0,
      deposit: Number(r.deposit_amount) || 0,
      count: Number(r.booking_count) || 0,
    }));
  };

  // ------------------------------------------------------------ bookings

  const reloadBookings = useCallback(async () => {
    if (!tokenStore.get()) {
      setBookings([]);
      return;
    }
    setBookingsLoading(true);
    try {
      const res = await apiClient.bookings.getMine();
      setBookings((res.data || []).map((b) => mapBooking(b, rawPitches)));
    } catch (err) {
      showToast(`Không tải được lịch đặt: ${errorMessage(err)}`, 'error');
    } finally {
      setBookingsLoading(false);
    }
  }, [rawPitches, showToast]);

  useEffect(() => {
    if (authUser) reloadBookings();
  }, [authUser?.id, reloadBookings]);

  const createBooking = async (input) => {
    if (!authUser) throw new Error('Bạn cần đăng nhập để đặt sân');
    const res = await apiClient.bookings.create({
      field_id: Number(input.subPitch.id),
      play_date: input.date,
      start: input.startTime,
      end: input.endTime,
      guest_name: input.bookerName || undefined,
      guest_phone: input.phone ? input.phone.replace(/\s/g, '') : undefined,
      note: input.note || undefined,
      service_ids: (input.serviceIds || []).map(Number),
      pay_full: !!input.payFull,
      looking_for_rival: !!input.lookingForRival,
      deal_note: input.dealNote || undefined,
    });
    // Response tạo đơn không kèm tên sân con -> lấy từ lựa chọn trên UI
    const booking = {
      ...mapBooking({ ...res, venue_name: input.pitch.name }, rawPitches),
      subPitchId: input.subPitch.id,
      subPitchName: input.subPitch.name,
      lookingForRival: !!res.match_post_id,
    };
    if (res.match_post_id) reloadChallenges();
    await reloadBookings();
    return booking;
  };

  const createRecurringBooking = async (input) => {
    const res = await apiClient.bookings.createRecurring({
      field_id: Number(input.subPitchId),
      weekdays: input.weekdays,
      start_date: input.startDate,
      months: input.months,
      start: input.startTime,
      end: input.endTime,
      note: input.note,
    });
    await reloadBookings();
    return {
      code: res.code,
      sessions: Number(res.sessions_total) || 0,
      total: Number(res.total_amount) || 0,
      deposit: Number(res.deposit_amount) || 0,
      discountPercent: Number(res.contract_discount) || 0,
    };
  };

  const toTransfer = (t) => ({
    bankName: t.bank_name || null,
    bankAccount: t.bank_account || null,
    bankHolder: t.bank_holder || null,
    amount: Number(t.amount ?? t.deposit_amount) || 0,
    content: t.content || `SANBONG ${t.code}`,
  });

  const getTransferInfo = async (bookingCode) => toTransfer(await apiClient.bookings.getByCode(bookingCode));

  const reportTransfer = async (bookingCode) => {
    const res = await apiClient.payments.reportTransfer(bookingCode);
    await reloadBookings();
    showToast('Đã gửi xác nhận chuyển khoản. Chủ sân sẽ đối soát và xác nhận đơn.');
    return toTransfer(res.transfer);
  };

  const fileComplaint = async (bookingCode, subject, content) => {
    await apiClient.complaints.create({ booking_code: bookingCode, subject, content });
    await reloadBookings();
    showToast('Đã gửi khiếu nại. Quản trị viên sẽ xem xét và phản hồi.');
  };

  const rateBooking = async (bookingCode, pitchRating, serviceRating, comment) => {
    await apiClient.bookings.rate(bookingCode, {
      pitch_rating: pitchRating,
      service_rating: serviceRating,
      comment,
    });
    await reloadBookings();
    showToast('Cảm ơn bạn đã đánh giá sân!');
  };

  const leaveMatch = async (bookingCode) => {
    const res = await apiClient.freelance.leave(bookingCode);
    await reloadBookings();
    if (res.penalty > 0) {
      await loadProfile();
      showToast(`Đã hủy tham gia. Hủy sát giờ (< 1 tiếng) nên bạn bị trừ ${res.penalty} điểm uy tín.`, 'error');
    } else {
      showToast('Đã hủy tham gia trận đấu.');
    }
  };

  const cancelBooking = async (bookingId) => {
    await apiClient.bookings.cancel(bookingId);
    await reloadBookings();
    showToast('Đã hủy lịch đặt sân.');
  };

  // ------------------------------------------------------------ community

  const reloadChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const res = await apiClient.community.getPosts();
      setChallenges((res.data || []).map((p) => mapPost(p, districtName)));
    } catch {
      setChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, [districtName]);

  // Backend yêu cầu đăng nhập mới xem được bài cáp kèo
  useEffect(() => {
    if (authUser) reloadChallenges();
  }, [authUser?.id, reloadChallenges]);

  const applyToChallenge = async (challengeId, message) => {
    await apiClient.community.sendRequest({ post_id: challengeId, message });
    await reloadChallenges();
    showToast('Đã gửi lời mời! Người đăng bài sẽ liên hệ lại với bạn.');
  };

  const createChallenge = async (bookingDbId, dealNote, content) => {
    await apiClient.community.createTeamPost({ booking_id: bookingDbId, deal_note: dealNote, content });
    await reloadChallenges();
    showToast('Đã đăng tin tìm đối lên sàn cáp kèo!');
  };

  const getChallengeRequests = async (challengeId) => {
    const res = await apiClient.community.getRequestsForPost(challengeId);
    return (res.data || []).map(mapJoinRequest);
  };

  const respondChallengeRequest = async (requestId, accept) => {
    await apiClient.community.respondRequest(requestId, accept ? 'ACCEPTED' : 'REJECTED');
    await reloadChallenges();
    showToast(accept ? 'Đã chấp nhận lời mời, kèo đã được chốt!' : 'Đã từ chối lời mời.');
  };

  // ------------------------------------------------------------ admin

  const reloadAdmin = useCallback(async () => {
    // Tải độc lập: một endpoint lỗi không làm trống cả trang quản trị
    const [stats, requests, users, venues, tickets, report] = await Promise.allSettled([
      apiClient.admin.getStats(),
      apiClient.admin.getOwnerRequests(),
      apiClient.admin.getUsers(),
      apiClient.admin.getPendingVenues(),
      apiClient.admin.getComplaints(),
      apiClient.admin.getReports(),
    ]);
    if (tickets.status === 'fulfilled') setComplaints((tickets.value.data || []).map(mapComplaint));
    if (report.status === 'fulfilled') setAdminReport(mapReport(report.value));
    if (stats.status === 'fulfilled') {
      const s = stats.value;
      setAdminStats({
        totalVenues: Number(s.total_venues) || 0,
        pendingVenues: Number(s.pending_venues) || 0,
        approvedVenues: Number(s.approved_venues) || 0,
        totalUsers: Number(s.total_users) || 0,
        totalBookings: Number(s.total_bookings) || 0,
      });
    }
    if (requests.status === 'fulfilled') {
      setOwnerApplications((requests.value.data || []).map((r) => mapOwnerRequest(r, districtName)));
    }
    if (users.status === 'fulfilled') setUsersList((users.value.data || []).map(mapAdminUser));
    if (venues.status === 'fulfilled') setPendingVenues((venues.value.data || []).map(mapPendingVenue));

    const failed = [stats, requests, users, venues, tickets, report].find((r) => r.status === 'rejected');
    if (failed) throw failed.reason;
  }, [districtName]);

  useEffect(() => {
    if (authUser?.role === 'admin' && role === 'admin') {
      reloadAdmin().catch((err) => showToast(`Không tải được dữ liệu quản trị: ${errorMessage(err)}`, 'error'));
    }
  }, [authUser?.role, role, reloadAdmin, showToast]);

  const approveApplication = async (id) => {
    await apiClient.admin.approveOwnerRequest(id);
    await reloadAdmin();
    showToast('Đã phê duyệt yêu cầu lên chủ sân!');
  };

  const rejectApplication = async (id, reason) => {
    await apiClient.admin.rejectOwnerRequest(id, reason);
    await reloadAdmin();
    showToast('Đã từ chối yêu cầu.');
  };

  const updateUserRole = async (userId, next) => {
    await apiClient.admin.updateUserRole(userId, next.toUpperCase());
    await reloadAdmin();
    showToast('Đã cập nhật phân quyền.');
  };

  const setUserLocked = async (userId, locked) => {
    await apiClient.admin.updateUserStatus(userId, locked ? 'LOCKED' : 'ACTIVE');
    await reloadAdmin();
    showToast(locked ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
  };

  const resolveComplaint = async (id, outcome, resolution) => {
    const res = await apiClient.admin.resolveComplaint(id, outcome, resolution);
    await Promise.all([reloadAdmin(), reloadPitches()]);
    showToast(
      outcome === 'REFUND'
        ? `Đã hoàn cọc ${Number(res.refunded_amount || 0).toLocaleString('vi-VN')}đ cho khách.`
        : 'Đã từ chối khiếu nại.',
    );
  };

  const approveVenue = async (id) => {
    await apiClient.admin.approveVenue(id);
    await Promise.all([reloadAdmin(), reloadPitches()]);
    showToast('Đã duyệt cụm sân.');
  };

  const rejectVenue = async (id, reason) => {
    await apiClient.admin.rejectVenue(id, reason);
    await reloadAdmin();
    showToast('Đã từ chối cụm sân.');
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn: !!authUser,
        authLoading,
        user: authUser || GUEST_USER,
        login,
        registerWithPhone,
        requestEmailOtp,
        registerWithEmail,
        logout,
        updateUser,
        saveTeam,
        role,
        districts,
        districtName,
        pitches,
        pitchesLoading,
        pitchesError,
        reloadPitches,
        loadSubPitches,
        ownerPitches,
        managedPitch,
        setManagedPitchId,
        addSubPitch,
        deleteSubPitch,
        getVenueRevenue,
        bookings,
        bookingsLoading,
        reloadBookings,
        createBooking,
        createRecurringBooking,
        cancelBooking,
        rateBooking,
        leaveMatch,
        reportTransfer,
        getTransferInfo,
        fileComplaint,
        challenges,
        challengesLoading,
        applyToChallenge,
        createChallenge,
        getChallengeRequests,
        respondChallengeRequest,
        adminStats,
        ownerApplications,
        approveApplication,
        rejectApplication,
        usersList,
        updateUserRole,
        setUserLocked,
        complaints,
        resolveComplaint,
        adminReport,
        pendingVenues,
        approveVenue,
        rejectVenue,
        reloadAdmin,
        searchKeyword,
        setSearchKeyword,
        selectedDistrict,
        setSelectedDistrict,
        selectedPitchType,
        setSelectedPitchType,
        selectedDate,
        setSelectedDate,
        selectedTimeRange,
        setSelectedTimeRange,
        gpsActive,
        setGpsActive,
        isAuthModalOpen,
        setIsAuthModalOpen,
        activeChallengeToApply,
        setActiveChallengeToApply,
        toastMessage,
        toastTone,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
