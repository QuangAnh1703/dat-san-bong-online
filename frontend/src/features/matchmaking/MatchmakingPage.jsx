import { useState, useEffect } from 'react';
import EmptyState from '../../components/ui/EmptyState';
import { listPosts, createPost, sendJoinRequest, listJoinRequests } from '../../services/community';

/** WF-08 - Ghep chan le */
export default function MatchmakingPage() {
  const [tab, setTab] = useState('browse'); // browse | create | myRequests
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Create post form
  const [formData, setFormData] = useState({
    district_code: '',
    play_date: '',
    time_span: null,
    required_level: 'INTERMEDIATE',
    content: '',
    expires_at: '',
  });

  // Browse requests
  const [myRequests, setMyRequests] = useState([]);
  const [requestSelectedPostId, setRequestSelectedPostId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    if (tab === 'browse') {
      fetchPosts();
    } else if (tab === 'myRequests') {
      fetchMyRequests();
    }
  }, [tab]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const result = await listPosts({ type: 'PLAYER_FINDS_TEAM' });
      setPosts(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyRequests() {
    setLoading(true);
    try {
      const result = await listJoinRequests({});
      setMyRequests(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!formData.district_code || !formData.play_date || !formData.expires_at) {
      setError('Vui long dien day du thong tin');
      return;
    }

    setLoading(true);
    try {
      await createPost({
        type: 'PLAYER_FINDS_TEAM',
        district_code: formData.district_code,
        play_date: formData.play_date,
        time_span: formData.time_span,
        required_level: formData.required_level,
        content: formData.content,
        expires_at: formData.expires_at,
      });
      setSuccessMessage('Da tao bai dang tim doi thanh cong!');
      setFormData({
        district_code: '',
        play_date: '',
        time_span: null,
        required_level: 'INTERMEDIATE',
        content: '',
        expires_at: '',
      });
      setTimeout(() => {
        setSuccessMessage('');
        setTab('browse');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    if (!requestSelectedPostId || !requestMessage.trim()) {
      setError('Vui long chon bai va nhap tin nhan');
      return;
    }

    try {
      await sendJoinRequest({
        post_id: requestSelectedPostId,
        message: requestMessage,
      });
      setSuccessMessage('Da gui yeu cau!');
      setRequestSelectedPostId(null);
      setRequestMessage('');
      setTimeout(() => {
        setSuccessMessage('');
        fetchPosts();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to send request');
    }
  }

  return (
    <main className="matchmaking-page">
      <section className="wrap">
        <div className="matchmaking-header">
          <h1>Ghep chan le</h1>
          <p>Tim doi choi phu hop voi ban</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #eee' }}>
          <button
            onClick={() => setTab('browse')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'browse' ? '3px solid #0066cc' : 'none',
              color: tab === 'browse' ? '#0066cc' : '#666',
              cursor: 'pointer',
              fontWeight: tab === 'browse' ? 'bold' : 'normal',
            }}
          >
            Tim doi
          </button>
          <button
            onClick={() => setTab('create')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'create' ? '3px solid #0066cc' : 'none',
              color: tab === 'create' ? '#0066cc' : '#666',
              cursor: 'pointer',
              fontWeight: tab === 'create' ? 'bold' : 'normal',
            }}
          >
            Tao bai dang
          </button>
          <button
            onClick={() => setTab('myRequests')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'myRequests' ? '3px solid #0066cc' : 'none',
              color: tab === 'myRequests' ? '#0066cc' : '#666',
              cursor: 'pointer',
              fontWeight: tab === 'myRequests' ? 'bold' : 'normal',
            }}
          >
            Yeu cau cua toi
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div style={{ padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '16px' }}>
            {successMessage}
          </div>
        )}
        {error && (
          <div style={{ padding: '12px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Browse Posts */}
        {tab === 'browse' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>Loading...</div>
          ) : posts.length === 0 ? (
            <EmptyState title="Chua co ai tim ban choi">
              Hay tro lai sau.
            </EmptyState>
          ) : (
            <div className="players-list">
              {posts.map((post) => (
                <div key={post.id} className="player-card">
                  <div className="player-info">
                    <h3>Tim {post.slots_needed} co nhan</h3>
                    <div className="player-meta">
                      <span className="level">{post.required_level}</span>
                      <span className="position">{post.play_date}</span>
                    </div>
                    {post.content && (
                      <p className="player-bio">{post.content}</p>
                    )}
                    {post.deal_note && (
                      <p className="player-looking">Keo: {post.deal_note}</p>
                    )}
                  </div>

                  <div className="player-actions">
                    <button
                      className="btn-small"
                      onClick={() => setRequestSelectedPostId(post.id)}
                    >
                      Gui yeu cau
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Create Post Form */}
        {tab === 'create' && (
          <form onSubmit={handleCreatePost} style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Khu vuc
              </label>
              <input
                type="text"
                value={formData.district_code}
                onChange={(e) => setFormData({ ...formData, district_code: e.target.value })}
                placeholder="Vd: HK"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Ngay thi dau
              </label>
              <input
                type="date"
                value={formData.play_date}
                onChange={(e) => setFormData({ ...formData, play_date: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Trinh do
              </label>
              <select
                value={formData.required_level}
                onChange={(e) => setFormData({ ...formData, required_level: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="BEGINNER">So cap</option>
                <option value="INTERMEDIATE">Trung binh</option>
                <option value="GOOD">Kha</option>
                <option value="SEMI_PRO">Phui</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Mo ta (tuy chon)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Mo ta ve nhu cau cua ban..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Het han yeu cau
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Dang tao...' : 'Tao bai dang'}
            </button>
          </form>
        )}

        {/* My Requests */}
        {tab === 'myRequests' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>Loading...</div>
          ) : myRequests.length === 0 ? (
            <EmptyState title="Chua co yeu cau nao">
              Hay tim dung doi cho minh.
            </EmptyState>
          ) : (
            <div>
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    background: '#f9f9f9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4>Yeu cau tham gia</h4>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                        {req.message}
                      </p>
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#999' }}>
                        Trang thai: <strong>{req.status}</strong>
                      </p>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      background: req.status === 'ACCEPTED' ? '#d4edda' : req.status === 'REJECTED' ? '#f8d7da' : '#e7e7ff',
                      color: req.status === 'ACCEPTED' ? '#155724' : req.status === 'REJECTED' ? '#721c24' : '#004085',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Modal for sending request */}
        {requestSelectedPostId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
            }}>
              <h3>Gui yeu cau tham gia</h3>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Noi gi ve ban va nang luc cua ban..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  marginTop: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn-primary"
                  onClick={handleSendRequest}
                  style={{ flex: 1 }}
                >
                  Gui yeu cau
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setRequestSelectedPostId(null);
                    setRequestMessage('');
                  }}
                  style={{ flex: 1 }}
                >
                  Huy
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
