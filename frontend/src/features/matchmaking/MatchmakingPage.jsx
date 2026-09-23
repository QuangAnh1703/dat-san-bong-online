import { useState } from 'react';
import EmptyState from '../../components/ui/EmptyState';

/** WF-08 - Ghep chan le */
export default function MatchmakingPage() {
  const [players] = useState([
    {
      id: 1,
      name: 'Tran Van A',
      level: 'Trung binh',
      position: 'Tinh vuot',
      age: 26,
      rating: 4.8,
      bio: 'Choi la chinh, co kinh nghiem',
      looking: 'Tim san de choi',
    },
    {
      id: 2,
      name: 'Nguyen Thi B',
      level: 'Cao',
      position: 'Thu mon',
      age: 24,
      rating: 4.9,
      bio: 'Thu mon co kinh nghiem',
      looking: 'Dang tim ban choi',
    },
    {
      id: 3,
      name: 'Pham Van C',
      level: 'So cap',
      position: 'Tien dai',
      age: 21,
      rating: 4.2,
      bio: 'Dang hoc tap, rat tich cuc',
      looking: 'Tim ban choi chi dao',
    },
  ]);

  const [matched, setMatched] = useState([]);

  const handleMatch = (player) => {
    setMatched([...matched, player.id]);
  };

  return (
    <main className="matchmaking-page">
      <section className="wrap">
        <div className="matchmaking-header">
          <h1>Ghep chan le</h1>
          <p>Tim ban choi phu hop voi ban</p>
        </div>

        {players.length === 0 ? (
          <EmptyState title="Chua co ai tim ban choi">
            Hay tro lai sau.
          </EmptyState>
        ) : (
          <div className="players-list">
            {players.map((player) => (
              <div
                key={player.id}
                className={`player-card ${matched.includes(player.id) ? 'is-matched' : ''}`}
              >
                <div className="player-avatar">
                  {player.name.charAt(0)}
                </div>

                <div className="player-info">
                  <h3>{player.name}</h3>

                  <div className="player-meta">
                    <span className="level">{player.level}</span>
                    <span className="position">{player.position}</span>
                    <span className="age">{player.age} tuoi</span>
                  </div>

                  <div className="player-rating">
                    <span className="stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`star ${i < Math.floor(player.rating) ? 'is-filled' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="rating-value">{player.rating}</span>
                  </div>

                  <p className="player-bio">{player.bio}</p>
                  <p className="player-looking">{player.looking}</p>
                </div>

                <div className="player-actions">
                  {matched.includes(player.id) ? (
                    <div className="matched-badge">✓ Da ghep</div>
                  ) : (
                    <>
                      <button
                        className="btn-small"
                        onClick={() => handleMatch(player)}
                      >
                        Ghep
                      </button>
                      <button className="btn-small">Xem thong tin</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
