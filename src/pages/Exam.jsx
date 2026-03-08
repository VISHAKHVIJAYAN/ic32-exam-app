import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db/database';
import { buildQuestionPool, saveExamResults, generateReport } from '../lib/examEngine';

export default function Exam() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState(new Map());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [config, setConfig] = useState(null);

  // Load questions on mount
  useEffect(() => {
    const configStr = sessionStorage.getItem('examConfig');
    if (!configStr) {
      navigate('/practice');
      return;
    }
    const examConfig = JSON.parse(configStr);
    setConfig(examConfig);
    setStartedAt(new Date().toISOString());

    buildQuestionPool(examConfig).then(pool => {
      if (pool.length === 0) {
        alert('No questions match your filters. Try different settings.');
        navigate('/practice');
        return;
      }
      setQuestions(pool);
      setLoading(false);
    });

    // Load bookmarks
    db.bookmarks.toArray().then(bms => {
      setBookmarkedIds(new Set(bms.map(b => b.questionId)));
    });
  }, [navigate]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (index) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    setAnswers(prev => new Map(prev).set(currentQ.questionId, selectedOption));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      finishExam();
    }
  };

  const toggleBookmark = useCallback(async () => {
    if (!currentQ) return;
    const qId = currentQ.questionId;
    if (bookmarkedIds.has(qId)) {
      await db.bookmarks.delete(qId);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
    } else {
      await db.bookmarks.put({
        questionId: qId,
        roomId: currentQ.roomId,
        moduleNumber: currentQ.moduleNumber,
      });
      setBookmarkedIds(prev => new Set(prev).add(qId));
    }
  }, [currentQ, bookmarkedIds]);

  const finishExam = async () => {
    const completedAt = new Date().toISOString();
    const finalAnswers = new Map(answers);

    // If last question was submitted, include it
    if (isSubmitted && currentQ) {
      finalAnswers.set(currentQ.questionId, selectedOption);
    }

    const score = questions.filter(q => finalAnswers.get(q.questionId) === q.correctAnswerIndex).length;

    await saveExamResults({
      startedAt,
      completedAt,
      questions,
      answers: finalAnswers,
      score,
      total: questions.length,
    });

    const report = generateReport({
      questions,
      answers: finalAnswers,
      startedAt,
      completedAt,
      selectedModules: config?.selectedModules || [],
      roomNames: config?.roomNames || [],
    });

    sessionStorage.setItem('examReport', JSON.stringify(report));
    sessionStorage.removeItem('examConfig');
    navigate('/report');
  };

  const handleEndExam = () => {
    setShowEndConfirm(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        if (!isSubmitted && currentQ && idx < currentQ.options.length) {
          setSelectedOption(idx);
        }
      } else if (e.key === 'Enter') {
        if (!isSubmitted && selectedOption !== null) {
          handleSubmit();
        } else if (isSubmitted) {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ color: 'var(--color-text-secondary)' }}>Loading questions...</div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const optionLetters = ['A', 'B', 'C', 'D'];
  const isBookmarked = bookmarkedIds.has(currentQ.questionId);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={toggleBookmark}
            style={{
              background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
              padding: '0.25rem', transition: 'transform 0.2s',
            }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            {isBookmarked ? '⭐' : '☆'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', color: 'var(--color-error)', minHeight: 'auto', padding: '0.4rem 0.6rem' }}
            onClick={handleEndExam}
          >
            End Exam
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Module Badge */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
          Module {currentQ.moduleNumber}
        </span>
        {currentQ.difficulty && (
          <span
            className={`badge ${
              currentQ.difficulty === 'easy' ? 'badge-success' :
              currentQ.difficulty === 'hard' ? 'badge-error' : 'badge-warning'
            }`}
            style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}
          >
            {currentQ.difficulty}
          </span>
        )}
      </div>

      {/* Question Text */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 500 }}>
          {currentQ.questionText}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {currentQ.options.map((option, idx) => {
          let className = 'option-card';
          if (isSubmitted) {
            className += ' disabled';
            if (idx === currentQ.correctAnswerIndex) className += ' correct';
            else if (idx === selectedOption && idx !== currentQ.correctAnswerIndex) className += ' wrong';
          } else if (idx === selectedOption) {
            className += ' selected';
          }

          return (
            <div
              key={idx}
              className={className}
              onClick={() => handleSelectOption(idx)}
            >
              <div className="option-letter">{optionLetters[idx]}</div>
              <div style={{ flex: 1, fontSize: '0.95rem', lineHeight: 1.5 }}>{option}</div>
              {isSubmitted && idx === currentQ.correctAnswerIndex && (
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>✅</span>
              )}
              {isSubmitted && idx === selectedOption && idx !== currentQ.correctAnswerIndex && (
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>❌</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation (after submit) */}
      {isSubmitted && currentQ.explanation && (
        <div className="card" style={{
          marginBottom: '1rem', padding: '1rem',
          borderColor: selectedOption === currentQ.correctAnswerIndex ? 'var(--color-success)' : 'var(--color-error)',
          background: selectedOption === currentQ.correctAnswerIndex
            ? 'rgba(22, 163, 74, 0.05)'
            : 'rgba(220, 38, 38, 0.05)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            💡 Explanation
          </div>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {currentQ.explanation}
          </p>
        </div>
      )}

      {/* Action Button */}
      {!isSubmitted ? (
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          disabled={selectedOption === null}
          onClick={handleSubmit}
        >
          Submit Answer
        </button>
      ) : (
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          onClick={handleNext}
        >
          {currentIndex < questions.length - 1 ? 'Next Question →' : '🏁 Finish Exam'}
        </button>
      )}

      {/* End Exam Confirmation Modal */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>End Exam?</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              You've answered {answers.size} of {questions.length} questions. Are you sure you want to end this exam?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={finishExam}>
                Yes, End Exam
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEndConfirm(false)}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
