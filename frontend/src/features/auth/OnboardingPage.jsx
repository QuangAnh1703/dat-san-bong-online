import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Onboarding.css';

const STEPS = {
  PROFILE: 'profile',
  SKILL: 'skill',
  POSITION: 'position',
  AVATAR: 'avatar',
  COMPLETE: 'complete',
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, token, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.PROFILE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel || 'BEGINNER');
  const [preferredPosition, setPreferredPosition] = useState(user?.preferredPosition || 'ANY');
  const [districtCode, setDistrictCode] = useState(user?.districtCode || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleNext = async (e) => {
    e?.preventDefault();
    setError('');

    // Validation
    if (currentStep === STEPS.PROFILE) {
      if (!fullName.trim()) {
        setError('Vui lòng nhập họ tên');
        return;
      }
      if (fullName.length > 120) {
        setError('Họ tên không quá 120 ký tự');
        return;
      }
      setCurrentStep(STEPS.SKILL);
    } else if (currentStep === STEPS.SKILL) {
      setCurrentStep(STEPS.POSITION);
    } else if (currentStep === STEPS.POSITION) {
      setCurrentStep(STEPS.AVATAR);
    } else if (currentStep === STEPS.AVATAR) {
      // Save profile
      await saveProfile();
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          skill_level: skillLevel,
          preferred_position: preferredPosition,
          district_code: districtCode || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Cập nhật hồ sơ thất bại');
      }

      const data = await response.json();
      updateProfile(data.profile);
      setCurrentStep(STEPS.COMPLETE);

      // Redirect after 2 seconds
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message || 'Cập nhật hồ sơ thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getProgress = () => {
    const steps = [STEPS.PROFILE, STEPS.SKILL, STEPS.POSITION, STEPS.AVATAR];
    return ((steps.indexOf(currentStep) + 1) / steps.length) * 100;
  };

  if (!token) return null;

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {currentStep !== STEPS.COMPLETE && (
          <>
            <div className="onboarding-header">
              <h1>⚽ Hoàn tất hồ sơ của bạn</h1>
              <p>Giúp chúng tôi biết bạn hơn</p>
            </div>

            {/* Progress bar */}
            <div className="progress-wrapper">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
              <p className="progress-text">{Math.round(getProgress())}%</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Step 1: Full Name */}
            {currentStep === STEPS.PROFILE && (
              <form onSubmit={handleNext} className="onboarding-form">
                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Nhập họ và tên của bạn"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="field-hint">{fullName.length}/120 ký tự</p>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleSkip}>
                    Bỏ qua
                  </button>
                  <button type="submit" className="btn-primary">
                    Tiếp tục
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Skill Level */}
            {currentStep === STEPS.SKILL && (
              <form onSubmit={handleNext} className="onboarding-form">
                <div className="form-group">
                  <label htmlFor="skillLevel">Trình độ chơi</label>
                  <select
                    id="skillLevel"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    autoFocus
                  >
                    <option value="BEGINNER">Mới bắt đầu</option>
                    <option value="INTERMEDIATE">Trung bình</option>
                    <option value="GOOD">Khá</option>
                    <option value="SEMI_PRO">Bán chuyên</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentStep(STEPS.PROFILE)}
                  >
                    ← Quay lại
                  </button>
                  <button type="submit" className="btn-primary">
                    Tiếp tục
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Position */}
            {currentStep === STEPS.POSITION && (
              <form onSubmit={handleNext} className="onboarding-form">
                <div className="form-group">
                  <label htmlFor="position">Vị trí yêu thích</label>
                  <select
                    id="position"
                    value={preferredPosition}
                    onChange={(e) => setPreferredPosition(e.target.value)}
                    autoFocus
                  >
                    <option value="GK">Thủ môn</option>
                    <option value="DF">Hậu vệ</option>
                    <option value="MF">Tiền vệ</option>
                    <option value="FW">Tiền đạo</option>
                    <option value="ANY">Đá ở bất kỳ vị trí</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="district">Quận/huyện (tùy chọn)</label>
                  <input
                    id="district"
                    type="text"
                    placeholder="Nhập mã quận (VD: Q1, Q2)"
                    value={districtCode}
                    onChange={(e) => setDistrictCode(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentStep(STEPS.SKILL)}
                  >
                    ← Quay lại
                  </button>
                  <button type="submit" className="btn-primary">
                    Tiếp tục
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Avatar & Bio */}
            {currentStep === STEPS.AVATAR && (
              <form onSubmit={handleNext} className="onboarding-form">
                <div className="form-group">
                  <label htmlFor="bio">Về bạn (tùy chọn)</label>
                  <textarea
                    id="bio"
                    placeholder="Viết gì đó về bạn..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="field-hint">{bio.length}/500 ký tự</p>
                </div>

                <div className="form-group">
                  <label htmlFor="avatar">Ảnh đại diện (tùy chọn)</label>
                  <input
                    id="avatar"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  {avatarUrl && (
                    <img src={avatarUrl} alt="Preview" className="avatar-preview" />
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCurrentStep(STEPS.POSITION)}
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Đang lưu...' : 'Hoàn tất'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Complete */}
        {currentStep === STEPS.COMPLETE && (
          <div className="onboarding-complete">
            <div className="success-icon">✅</div>
            <h2>Hoàn tất!</h2>
            <p>Hồ sơ của bạn đã được cập nhật thành công</p>
            <p className="redirect-text">Quay về trang chủ...</p>
          </div>
        )}
      </div>
    </div>
  );
}
