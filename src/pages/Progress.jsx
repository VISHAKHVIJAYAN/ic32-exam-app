import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import db from '../db/database';
import { getModuleStats, getAccuracyTrend, getProgressSummary } from '../lib/statsCalculator';

export default function Progress() {
  const [trend, setTrend] = useState([]);
  const [modules, setModules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(0);

  useEffect(() => {
    Promise.all([
      getAccuracyTrend(20),
      getModuleStats(),
      getProgressSummary(),
    ]).then(([t, m, s]) => {
      setTrend(t);
      setModules(m);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  const handleResetProgress = async () => {
    if (showResetConfirm < 2) {
      setShowResetConfirm(prev => prev + 1);
      return;
    }
    await db.examSessions.clear();
    await db.answeredQuestions.clear();
    await db.bookmarks.clear();
    await db.userStats.clear();
    setShowResetConfirm(0);
    // Reload stats
    const [t, m, s] = await Promise.all([
      getAccuracyTrend(20),
      getModuleStats(),
      getProgressSummary(),
    ]);
    setTrend(t);
    setModules(m);
    setSummary(s);
  };

  const resetLabels = ['Reset All Progress', 'Are you sure?', 'Confirm Reset'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    );
  }

  // Find weakest 3 modules
  const weakest = modules
    .filter(m => m.accuracy >= 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const chartModules = modules.map(m => ({
    name: `M${m.number}`,
    accuracy: m.accuracy >= 0 ? m.accuracy : 0,
    fullName: m.name,
    hasData: m.accuracy >= 0,
  }));

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Progress & Analytics
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Track your study performance
      </p>

      {/* Summary Stats */}
      {summary && summary.totalSessions > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <span className="stat-label" style={{ fontSize: '0.65rem' }}>Sessions</span>
            <span className="stat-value" style={{ fontSize: '1.3rem' }}>{summary.totalSessions}</span>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <span className="stat-label" style={{ fontSize: '0.65rem' }}>Avg Accuracy</span>
            <span className="stat-value" style={{
              fontSize: '1.3rem',
              color: summary.avgAccuracy >= 80 ? 'var(--color-success)' :
                     summary.avgAccuracy >= 60 ? 'var(--color-warning)' : 'var(--color-error)'
            }}>
              {summary.avgAccuracy}%
            </span>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem' }}>
            <span className="stat-label" style={{ fontSize: '0.65rem' }}>Best Score</span>
            <span className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--color-success)' }}>
              {summary.bestScore}%
            </span>
          </div>
        </div>
      )}

      {/* Accuracy Trend Chart */}
      {trend.length > 1 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Accuracy Trend</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                  labelFormatter={(label) => `Session ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: '#0d9488', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Module Performance Bar Chart */}
      {chartModules.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Module Performance</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartModules} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                  }}
                  formatter={(value, name, props) => [
                    props.payload.hasData ? `${value}%` : 'No data',
                    props.payload.fullName
                  ]}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {chartModules.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={!entry.hasData ? '#64748b' :
                        entry.accuracy >= 80 ? '#16a34a' :
                        entry.accuracy >= 60 ? '#f59e0b' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weakest Modules */}
      {weakest.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>
            ⚠️ Weakest Modules
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weakest.map(mod => (
              <div key={mod.number} className="card" style={{
                padding: '0.75rem 1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderColor: 'rgba(220, 38, 38, 0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-error">M{mod.number}</span>
                  <span style={{ fontSize: '0.85rem' }}>{mod.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--color-error)', fontSize: '0.9rem' }}>
                  {mod.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!summary || summary.totalSessions === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Complete some exams to see your analytics here.
          </p>
        </div>
      )}

      {/* Reset Progress */}
      {summary && summary.totalSessions > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <button
            className={`btn ${showResetConfirm > 0 ? 'btn-danger' : 'btn-secondary'}`}
            style={{ width: '100%' }}
            onClick={handleResetProgress}
          >
            {resetLabels[showResetConfirm]}
          </button>
          {showResetConfirm > 0 && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem' }}
              onClick={() => setShowResetConfirm(0)}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
