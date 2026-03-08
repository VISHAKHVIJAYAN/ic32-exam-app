import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Report() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const reportStr = sessionStorage.getItem('examReport');
    if (!reportStr) {
      navigate('/');
      return;
    }
    const data = JSON.parse(reportStr);
    setReport(data.examReport);

    if (data.examReport.accuracy >= 90) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify({ examReport: report }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ic32-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    if (!report) return;
    let text = `IC32 EXAM REPORT\n${'='.repeat(50)}\n`;
    text += `Date: ${new Date(report.date).toLocaleString()}\n`;
    text += `Score: ${report.score}/${report.total} (${report.accuracy}%)\n`;
    text += `Time: ${formatTime(report.timeSeconds)}\n`;
    text += `Result: ${report.accuracy >= 70 ? 'PASS ✅' : 'FAIL ❌'}\n\n`;

    text += `MODULE BREAKDOWN\n${'-'.repeat(50)}\n`;
    report.moduleBreakdown.forEach(m => {
      text += `M${m.module} - ${m.moduleName}: ${m.correct}/${m.total} (${m.accuracy}%)\n`;
    });

    if (report.wrongAnswers.length > 0) {
      text += `\nWRONG ANSWERS (${report.wrongAnswers.length})\n${'-'.repeat(50)}\n`;
      report.wrongAnswers.forEach((wa, i) => {
        text += `\n${i + 1}. [M${wa.moduleNumber}] ${wa.questionText}\n`;
        text += `   Your answer: ${wa.yourAnswerText}\n`;
        text += `   Correct: ${wa.correctAnswerText}\n`;
        text += `   Explanation: ${wa.explanation}\n`;
      });
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ic32-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  const passed = report.accuracy >= 70;
  const chartData = report.moduleBreakdown.map(m => ({
    name: `M${m.module}`,
    accuracy: m.accuracy,
    fullName: m.moduleName,
  }));

  const confettiColors = ['#16a34a', '#0d9488', '#f59e0b', '#dc2626', '#6366f1', '#ec4899'];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Confetti */}
      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200 }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                background: confettiColors[i % confettiColors.length],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                width: `${8 + Math.random() * 8}px`,
                height: `${8 + Math.random() * 8}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Score Header */}
      <div className="card" style={{
        textAlign: 'center', padding: '2rem', marginBottom: '1rem',
        borderColor: passed ? 'var(--color-success)' : 'var(--color-error)',
        background: passed ? 'rgba(22, 163, 74, 0.05)' : 'rgba(220, 38, 38, 0.05)',
      }}>
        <div style={{
          fontSize: '3rem', fontWeight: 800, lineHeight: 1.1,
          color: passed ? 'var(--color-success)' : 'var(--color-error)',
          marginBottom: '0.25rem'
        }}>
          {report.score}/{report.total}
        </div>
        <div style={{
          fontSize: '1.5rem', fontWeight: 700,
          color: passed ? 'var(--color-success)' : 'var(--color-error)',
          marginBottom: '0.5rem'
        }}>
          {report.accuracy}%
        </div>
        <div className={`badge ${passed ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.85rem', padding: '0.3rem 1rem' }}>
          {passed ? '✅ PASS' : '❌ FAIL'}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          ⏱️ {formatTime(report.timeSeconds)}
        </div>
      </div>

      {/* Module Breakdown Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Module Breakdown</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                  }}
                  formatter={(value, name, props) => [`${value}%`, props.payload.fullName]}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.accuracy >= 80 ? '#16a34a' : entry.accuracy >= 60 ? '#f59e0b' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Wrong Answers */}
      {report.wrongAnswers.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>
            ❌ Wrong Answers ({report.wrongAnswers.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.wrongAnswers.map((wa, i) => (
              <div key={i} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">M{wa.moduleNumber}</span>
                  <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{wa.questionId}</span>
                </div>
                <p style={{ fontWeight: 500, marginBottom: '0.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {wa.questionText}
                </p>
                <div style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.4rem',
                  background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)',
                  fontSize: '0.85rem',
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-error)', fontWeight: 600 }}>Your answer: </span>
                  {wa.yourAnswerText}
                </div>
                <div style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginBottom: '0.5rem',
                  background: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.2)',
                  fontSize: '0.85rem',
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Correct: </span>
                  {wa.correctAnswerText}
                </div>
                {wa.explanation && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, paddingTop: '0.25rem' }}>
                    💡 {wa.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={exportJSON}>
          📄 Export JSON
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={exportText}>
          📝 Export Text
        </button>
      </div>

      {/* Back Button */}
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>
    </div>
  );
}
