import { useState, useEffect } from 'react';
import EmptyState from '../../components/ui/EmptyState';
import { listPosts, sendJoinRequest } from '../../services/community';

/** WF-07 - Tim doi giao huu */
export default function FindTeamPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    type: 'TEAM_FINDS_PLAYER',
    skill_level: '',
  });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  async function fetchPosts() {
    setLoading(true);
    setError(null);
    try {
      const result = await listPosts(filters);
      setPosts(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest() {
    if (!selectedPostId || !requestMessage.trim()) {
      setError('Vui long nhap loi nhan');
      return;
    }

    setSubmitting(true);
    try {
      await sendJoinRequest({
        post_id: selectedPostId,
        message: requestMessage,
      });
      setSuccessMessage('Da gui yeu cau, doi sap phan hoi!');
      setSelectedPostId(null);
      setRequestMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="team-page">
      <section className="wrap">
        <div className="team-header">
          <h1>Tim doi giao huu</h1>
          <p>Ket noi voi cac doi bong da va tham gia giao huu</p>
        </div>

        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Trinh do</label>
            <select
              value={filters.skill_level}
              onChange={(e) => setFilters({ ...filters, skill_level: e.target.value })}
            >
              <option value="">Tat ca</option>
              <option value="BEGINNER">Sơ cấp</option>
              <option value="INTERMEDIATE">Trung bình</option>
              <option value="GOOD">Khá</option>
              <option value="SEMI_PRO">Phủi</option>
            </select>
          </div>
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>Loading...</div>
        ) : posts.length === 0 ? (
          <EmptyState title="Chua co bai dang nao">
            Hay tro lai sau hoac tao mot bai dang cua ban.
          </EmptyState>
        ) : (
          <div className="teams-grid">
            {posts.map((post) => (
              <div key={post.id} className="team-card">
                <div className="team-header-card">
                  <div className="team-avatar">
                    {post.team_id ? 'T' : 'P'}
                  </div>
                  <div className="team-info-basic">
                    <h3>
                      {post.type === 'TEAM_FINDS_PLAYER' ? 'Tim co nhan' : 'Tim doi'}
                    </h3>
                    <div className="team-meta">
                      <span className="level">{post.required_level}</span>
                      {post.slots_needed && (
                        <span className="members">{post.slots_needed} slot can</span>
                      )}
                    </div>
                  </div>
                </div>

                {post.content && (
                  <p className="team-description">{post.content}</p>
                )}

                <div className="team-stats">
                  {post.play_date && (
                    <div className="stat">
                      <span className="label">Ngay thi dau:</span>
                      <span className="value">{post.play_date}</span>
                    </div>
                  )}
                  {post.deal_note && (
                    <div className="stat">
                      <span className="label">Keo:</span>
                      <span className="value">{post.deal_note}</span>
                    </div>
                  )}
                </div>

                {post.cost_kind && (
                  <div className="team-looking">
                    <span className="badge">
                      {post.cost_kind === 'FREE' ? 'Mien phi' : `${post.cost_amount}đ`}
                    </span>
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setSelectedPostId(post.id)}
                >
                  Lien he doi
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal for sending request */}
        {selectedPostId && (
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
                placeholder="Noi gi ve ban..."
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
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Dang gui...' : 'Gui yeu cau'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedPostId(null);
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
