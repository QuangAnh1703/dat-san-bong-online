import { useState } from 'react';
import EmptyState from '../../components/ui/EmptyState';

/** WF-07 - Tim doi giao huu */
export default function FindTeamPage() {
  const [teams] = useState([
    {
      id: 1,
      name: 'FC Thao Dien',
      level: 'Trung binh',
      members: 8,
      avgAge: 28,
      wins: 12,
      losses: 3,
      description: 'Doi choi giao huu, quan trong la vui ve va ro ren',
      looking: 'Dang tim them nguoi choi',
    },
    {
      id: 2,
      name: 'Pho Tho United',
      level: 'Cao',
      members: 11,
      avgAge: 25,
      wins: 18,
      losses: 2,
      description: 'Doi choi co kinh nghiem, tham gia giai dau',
      looking: 'Dang tim them nguoi choi gioi',
    },
  ]);

  return (
    <main className="team-page">
      <section className="wrap">
        <div className="team-header">
          <h1>Tim doi giao huu</h1>
          <p>Ket noi voi cac doi bong da va tham gia giao huu</p>
        </div>

        {teams.length === 0 ? (
          <EmptyState title="Chua co doi nao">
            Hay tro lai sau hoac tao mot doi cua ban.
          </EmptyState>
        ) : (
          <div className="teams-grid">
            {teams.map((team) => (
              <div key={team.id} className="team-card">
                <div className="team-header-card">
                  <div className="team-avatar">
                    {team.name.charAt(0)}
                  </div>
                  <div className="team-info-basic">
                    <h3>{team.name}</h3>
                    <div className="team-meta">
                      <span className={`level level-${team.level.toLowerCase()}`}>
                        {team.level}
                      </span>
                      <span className="members">{team.members} thanh vien</span>
                    </div>
                  </div>
                </div>

                <p className="team-description">{team.description}</p>

                <div className="team-stats">
                  <div className="stat">
                    <span className="label">Tuoi TB:</span>
                    <span className="value">{team.avgAge}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Thang/Thua:</span>
                    <span className="value">{team.wins}/{team.losses}</span>
                  </div>
                </div>

                <div className="team-looking">
                  <span className="badge">{team.looking}</span>
                </div>

                <button className="btn-primary" style={{ width: '100%' }}>
                  Lien he doi
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
