import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import db from '../db/database';
import { useState } from 'react';

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(0); // 0=none, 1=first, 2=second, 3=third

  const handleExportAll = async () => {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        quizRooms: await db.quizRooms.toArray(),
        questions: await db.questions.toArray(),
        examSessions: await db.examSessions.toArray(),
        answeredQuestions: await db.answeredQuestions.toArray(),
        bookmarks: await db.bookmarks.toArray(),
        userStats: await db.userStats.toArray(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ic32-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.quizRooms || !data.questions) {
        alert('Invalid backup file format');
        return;
      }
      if (!confirm('This will merge imported data with existing data. Continue?')) return;

      if (data.quizRooms.length) await db.quizRooms.bulkPut(data.quizRooms);
      if (data.questions.length) await db.questions.bulkPut(data.questions);
      if (data.examSessions?.length) await db.examSessions.bulkPut(data.examSessions);
      if (data.answeredQuestions?.length) await db.answeredQuestions.bulkPut(data.answeredQuestions);
      if (data.bookmarks?.length) await db.bookmarks.bulkPut(data.bookmarks);
      if (data.userStats?.length) await db.userStats.bulkPut(data.userStats);

      alert('Import complete!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  };

  const handleResetAll = async () => {
    if (showResetConfirm < 3) {
      setShowResetConfirm(prev => prev + 1);
      return;
    }
    try {
      await db.questions.clear();
      await db.quizRooms.clear();
      await db.examSessions.clear();
      await db.answeredQuestions.clear();
      await db.bookmarks.clear();
      await db.userStats.clear();
      setShowResetConfirm(0);
      alert('All data has been reset.');
    } catch (err) {
      alert('Reset failed: ' + err.message);
    }
  };

  const resetLabels = [
    'Reset All Data',
    'Are you sure? Tap again',
    'This cannot be undone! Tap once more',
    'FINAL: Delete everything?',
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Settings
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Manage your app preferences
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Dark Mode Toggle */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600 }}>🌙 Dark Mode</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </div>
          </div>
          <button
            className={`toggle-switch${isDark ? ' active' : ''}`}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          />
        </div>

        {/* Question Bank */}
        <Link to="/settings/question-bank" className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
          <div>
            <div style={{ fontWeight: 600 }}>📚 Question Bank</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Upload and manage question sets
            </div>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>›</span>
        </Link>

        {/* Export Data */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={handleExportAll}>
          <div>
            <div style={{ fontWeight: 600 }}>💾 Export All Data</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Download a backup of all your data
            </div>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>›</span>
        </div>

        {/* Import Data */}
        <label className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div>
            <div style={{ fontWeight: 600 }}>📥 Import Data</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Restore from a backup file
            </div>
          </div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>›</span>
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>

        {/* Reset All Data */}
        <div
          className="card"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            borderColor: showResetConfirm > 0 ? 'var(--color-error)' : 'rgba(220, 38, 38, 0.3)',
            background: showResetConfirm >= 3 ? 'rgba(220, 38, 38, 0.1)' : undefined,
          }}
          onClick={handleResetAll}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-error)' }}>
              🗑️ {resetLabels[showResetConfirm]}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {showResetConfirm === 0 ? 'Delete everything and start fresh' : `Confirmation ${showResetConfirm} of 3`}
            </div>
          </div>
          {showResetConfirm > 0 && (
            <button
              className="btn btn-ghost"
              style={{ minHeight: 'auto', fontSize: '0.75rem' }}
              onClick={(e) => { e.stopPropagation(); setShowResetConfirm(0); }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* About */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>ℹ️ About</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            IC32 Exam Practice App v1.0
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            ISA/IEC 62443 Cybersecurity Fundamentals
          </div>
        </div>
      </div>
    </div>
  );
}
