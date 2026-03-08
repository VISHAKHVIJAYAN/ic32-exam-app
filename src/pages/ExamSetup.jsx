import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../db/database';

export default function ExamSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [moduleData, setModuleData] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [availableCount, setAvailableCount] = useState(0);

  // Load rooms
  useEffect(() => {
    db.quizRooms.toArray().then(setRooms);
  }, []);

  // When rooms are selected, load available modules
  useEffect(() => {
    if (selectedRooms.length === 0) {
      setModuleData([]);
      return;
    }
    db.questions
      .where('roomId')
      .anyOf(selectedRooms)
      .toArray()
      .then(questions => {
        const modules = {};
        questions.forEach(q => {
          if (!modules[q.moduleNumber]) {
            modules[q.moduleNumber] = { number: q.moduleNumber, name: q.moduleName, count: 0 };
          }
          modules[q.moduleNumber].count++;
        });
        const sorted = Object.values(modules).sort((a, b) => a.number - b.number);
        setModuleData(sorted);
        setSelectedModules(sorted.map(m => m.number));
      });
  }, [selectedRooms]);

  // Calculate available questions
  useEffect(() => {
    if (selectedRooms.length === 0 || selectedModules.length === 0) {
      setAvailableCount(0);
      return;
    }
    db.questions
      .where('roomId')
      .anyOf(selectedRooms)
      .toArray()
      .then(questions => {
        let filtered = questions.filter(q => selectedModules.includes(q.moduleNumber));
        if (difficulty !== 'all') {
          filtered = filtered.filter(q => q.difficulty === difficulty);
        }
        setAvailableCount(filtered.length);
      });
  }, [selectedRooms, selectedModules, difficulty]);

  const toggleRoom = (id) => {
    setSelectedRooms(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAllRooms = () => {
    setSelectedRooms(prev =>
      prev.length === rooms.length ? [] : rooms.map(r => r.id)
    );
  };

  const toggleModule = (num) => {
    setSelectedModules(prev =>
      prev.includes(num) ? prev.filter(m => m !== num) : [...prev, num]
    );
  };

  const toggleAllModules = () => {
    setSelectedModules(prev =>
      prev.length === moduleData.length ? [] : moduleData.map(m => m.number)
    );
  };

  const startExam = () => {
    const config = {
      selectedRoomIds: selectedRooms,
      selectedModules,
      questionCount: questionCount === 'all' ? availableCount : Math.min(questionCount, availableCount),
      questionFilter,
      difficulty,
      roomNames: rooms.filter(r => selectedRooms.includes(r.id)).map(r => r.name),
    };
    sessionStorage.setItem('examConfig', JSON.stringify(config));
    navigate('/exam');
  };

  const countOptions = [10, 20, 30, 50, 90, 'all'];

  if (rooms.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Practice Setup</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Configure your exam session</p>
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📝</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No questions uploaded yet. Head to Settings to upload your question bank.</p>
          <button className="btn btn-primary" onClick={() => navigate('/settings/question-bank')}>Upload Questions</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Practice Setup</h1>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: s <= step ? 'var(--color-accent)' : 'var(--color-border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Step 1: Select Quiz Rooms */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Step 1: Select Quiz Rooms</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Choose which question banks to practice from</p>

          <div
            className={`checkbox-wrapper${selectedRooms.length === rooms.length ? ' checked' : ''}`}
            onClick={toggleAllRooms}
            style={{ marginBottom: '0.75rem' }}
          >
            <div className="custom-checkbox">
              {selectedRooms.length === rooms.length && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Select All</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{rooms.length} rooms available</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {rooms.map(room => (
              <div
                key={room.id}
                className={`checkbox-wrapper${selectedRooms.includes(room.id) ? ' checked' : ''}`}
                onClick={() => toggleRoom(room.id)}
              >
                <div className="custom-checkbox">
                  {selectedRooms.includes(room.id) && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{room.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{room.totalQuestions} questions</div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={selectedRooms.length === 0}
            onClick={() => setStep(2)}
          >
            Next → Select Modules
          </button>
        </div>
      )}

      {/* Step 2: Select Modules */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Step 2: Select Modules</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Choose which modules to include</p>

          <div
            className={`checkbox-wrapper${selectedModules.length === moduleData.length ? ' checked' : ''}`}
            onClick={toggleAllModules}
            style={{ marginBottom: '0.75rem' }}
          >
            <div className="custom-checkbox">
              {selectedModules.length === moduleData.length && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Select All</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{moduleData.length} modules</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {moduleData.map(mod => (
              <div
                key={mod.number}
                className={`checkbox-wrapper${selectedModules.includes(mod.number) ? ' checked' : ''}`}
                onClick={() => toggleModule(mod.number)}
              >
                <div className="custom-checkbox">
                  {selectedModules.includes(mod.number) && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>
                    <span className="badge badge-primary" style={{ marginRight: '0.5rem' }}>M{mod.number}</span>
                    {mod.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{mod.count} questions</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={selectedModules.length === 0}
              onClick={() => setStep(3)}
            >
              Next → Configure
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configure Exam */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Step 3: Configure Exam</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {availableCount} questions available
          </p>

          {/* Question Count */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Number of Questions
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {countOptions.map(opt => (
                <button
                  key={opt}
                  className={`btn ${questionCount === opt ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1rem', minHeight: '40px', fontSize: '0.85rem' }}
                  onClick={() => setQuestionCount(opt)}
                >
                  {opt === 'all' ? `All (${availableCount})` : opt}
                </button>
              ))}
            </div>
          </div>

          {/* Question Filter */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Question Filter
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'unanswered', label: 'Unanswered' },
                { value: 'wrong', label: 'Previously Wrong' },
                { value: 'bookmarked', label: 'Bookmarked' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`btn ${questionFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1rem', minHeight: '40px', fontSize: '0.85rem' }}
                  onClick={() => setQuestionFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Difficulty
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {[
                { value: 'all', label: 'All' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`btn ${difficulty === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 1rem', minHeight: '40px', fontSize: '0.85rem' }}
                  onClick={() => setDifficulty(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '1rem', padding: '1rem' }}
              disabled={availableCount === 0}
              onClick={startExam}
            >
              🚀 Start Exam ({questionCount === 'all' ? availableCount : Math.min(questionCount, availableCount)} questions)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
