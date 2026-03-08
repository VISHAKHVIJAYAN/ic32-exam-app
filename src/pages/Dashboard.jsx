import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverallStats, getModuleStats, getRecentSessions } from '../lib/statsCalculator';

const MODULE_NAMES = {
  1: 'Intro to Control Systems Security',
  2: 'Risk Assessment & Management',
  3: 'Models & Security Levels',
  4: 'Zones and Conduits',
  5: 'System Security Requirements',
  6: 'Component Security Requirements',
  7: 'Security Program Management',
  8: 'Secure Development Lifecycle',
  9: 'Patch Management',
  10: 'Security Monitoring',
  11: 'Incident Response',
  12: 'Business Continuity',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalQuestions: 0, uniqueAnswered: 0, accuracy: 0, streak: 0 });
  const [modules, setModules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOverallStats(),
      getModuleStats(),
      getRecentSessions(5),
    ]).then(([s, m, sess]) => {
      setStats(s);
      setModules(m);
      setSessions(sess);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        IC32 Exam Practice
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Welcome back! Ready to study?
      </p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <span className="stat-label">Questions</span>
          <span className="stat-value" style={{ color: 'var(--color-accent)' }}>{stats.totalQuestions}</span>
          <span className="stat-sub">total available</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Attempted</span>
          <span className="stat-value" style={{ color: 'var(--color-primary-light, #2a4a7f)' }}>{stats.uniqueAnswered}</span>
          <span className="stat-sub">unique questions</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value" style={{
            color: stats.accuracy >= 80 ? 'var(--color-success)' :
                   stats.accuracy >= 60 ? 'var(--color-warning)' :
                   stats.accuracy > 0 ? 'var(--color-error)' : 'var(--color-text-muted)'
          }}>
            {stats.accuracy > 0 ? `${stats.accuracy}%` : '—'}
          </span>
          <span className="stat-sub">overall</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Streak</span>
          <span className="stat-value" style={{ color: stats.streak > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
            {stats.streak}
          </span>
          <span className="stat-sub">{stats.streak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/practice')}>
          🚀 Start Practice
        </button>
        {stats.totalQuestions === 0 && (
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/settings/question-bank')}>
            📤 Upload Questions
          </button>
        )}
      </div>

      {/* Module Grid */}
      {modules.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Modules</h2>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.65rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block' }} /> ≥80%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-warning)', display: 'inline-block' }} /> 60-79%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-error)', display: 'inline-block' }} /> &lt;60%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-text-muted)', display: 'inline-block' }} /> None
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.6rem' }}>
            {modules.map(mod => (
              <div key={mod.number} className={`module-card ${mod.color}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>M{mod.number}</span>
                  {mod.accuracy >= 0 && (
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: mod.color === 'green' ? 'var(--color-success)' :
                             mod.color === 'yellow' ? 'var(--color-warning)' :
                             mod.color === 'red' ? 'var(--color-error)' : 'var(--color-text-muted)'
                    }}>
                      {mod.accuracy}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.5rem', lineHeight: 1.3, minHeight: '2.2em' }}>
                  {mod.name || MODULE_NAMES[mod.number] || `Module ${mod.number}`}
                </div>
                <div className="progress-bar" style={{ height: '4px' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${mod.total > 0 ? (mod.attempted / mod.total) * 100 : 0}%`,
                      background: mod.color === 'green' ? 'var(--color-success)' :
                                  mod.color === 'yellow' ? 'var(--color-warning)' :
                                  mod.color === 'red' ? 'var(--color-error)' : 'var(--color-text-muted)',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {mod.attempted}/{mod.total} attempted
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Recent Sessions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.map(session => (
              <div key={session.id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {new Date(session.completedAt).toLocaleDateString()} • {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.score}/{session.total}</span>
                  <span className={`badge ${session.accuracy >= 70 ? 'badge-success' : 'badge-error'}`}>
                    {session.accuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalQuestions === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Upload questions in Settings → Question Bank to get started
          </p>
        </div>
      )}
    </div>
  );
}
