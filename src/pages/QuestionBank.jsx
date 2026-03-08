import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import db from '../db/database';
import { validateQuestionJSON, batchInsertQuestions } from '../lib/questionParser';

export default function QuestionBank() {
  const [rooms, setRooms] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [uploadState, setUploadState] = useState('idle'); // idle | preview | uploading | done | error
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadRooms = useCallback(async () => {
    const allRooms = await db.quizRooms.toArray();
    setRooms(allRooms);
    const count = await db.questions.count();
    setTotalQuestions(count);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setUploadState('idle');

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateQuestionJSON(data);

      if (!result.valid) {
        setErrorMsg(result.errors.join('\n'));
        setUploadState('error');
        return;
      }

      setParsedData(data);
      setValidationResult(result);
      setRoomName(file.name.replace(/\.json$/i, ''));
      setUploadState('preview');
    } catch (err) {
      setErrorMsg(`Failed to parse file: ${err.message}`);
      setUploadState('error');
    }

    // Reset file input
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!parsedData || !roomName.trim()) return;

    setUploadState('uploading');
    setUploadProgress({ completed: 0, total: parsedData.questions.length });

    try {
      // Create quiz room
      const roomId = await db.quizRooms.add({
        name: roomName.trim(),
        uploadedAt: new Date().toISOString(),
        totalQuestions: parsedData.questions.length,
        fileName: roomName.trim(),
        modulesCovered: validationResult.stats.modules.map(m => m.number),
      });

      // Batch insert questions
      await batchInsertQuestions(
        db,
        roomId,
        parsedData.questions,
        (completed, total) => setUploadProgress({ completed, total })
      );

      setUploadState('done');
      setParsedData(null);
      setValidationResult(null);
      loadRooms();
    } catch (err) {
      setErrorMsg(`Upload failed: ${err.message}`);
      setUploadState('error');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    await db.questions.where('roomId').equals(roomId).delete();
    await db.quizRooms.delete(roomId);
    setDeleteConfirm(null);
    loadRooms();
  };

  const handleRenameRoom = async (roomId) => {
    if (!editName.trim()) return;
    await db.quizRooms.update(roomId, { name: editName.trim() });
    setEditingRoom(null);
    setEditName('');
    loadRooms();
  };

  const resetUpload = () => {
    setUploadState('idle');
    setParsedData(null);
    setValidationResult(null);
    setRoomName('');
    setErrorMsg('');
    setUploadProgress({ completed: 0, total: 0 });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Link to="/settings" className="btn btn-ghost" style={{ padding: '0.5rem' }}>←</Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Question Bank</h1>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Upload and manage your question sets
      </p>

      {/* Total Stats */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          You have <strong style={{ color: 'var(--color-accent)' }}>{totalQuestions}</strong> questions across <strong style={{ color: 'var(--color-accent)' }}>{rooms.length}</strong> rooms
        </span>
      </div>

      {/* Upload Section */}
      {uploadState === 'idle' && (
        <label className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          padding: '2rem', cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px',
          marginBottom: '1.5rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem' }}>📤</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Upload Questions (JSON)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Tap to select a JSON file from your device
            </div>
          </div>
          <input
            type="file"
            accept=".json,application/json,*/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>❌</span>
            <strong style={{ color: 'var(--color-error)' }}>Upload Error</strong>
          </div>
          <pre style={{
            fontSize: '0.8rem', color: 'var(--color-text-secondary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--color-bg-secondary)', padding: '0.75rem',
            borderRadius: '0.5rem', marginBottom: '1rem'
          }}>
            {errorMsg}
          </pre>
          <button className="btn btn-secondary" onClick={resetUpload}>Try Again</button>
        </div>
      )}

      {/* Preview State */}
      {uploadState === 'preview' && validationResult && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <strong>File Validated Successfully</strong>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Questions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{validationResult.stats.totalQuestions}</div>
            </div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Modules</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{validationResult.stats.modules.length}</div>
            </div>
          </div>

          {/* Modules covered */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Modules covered:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {validationResult.stats.modules.map(m => (
                <span key={m.number} className="badge badge-primary">
                  M{m.number} ({m.count})
                </span>
              ))}
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Difficulty:</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {validationResult.stats.difficulties.easy > 0 && (
                <span className="badge badge-success">Easy: {validationResult.stats.difficulties.easy}</span>
              )}
              {validationResult.stats.difficulties.medium > 0 && (
                <span className="badge badge-warning">Medium: {validationResult.stats.difficulties.medium}</span>
              )}
              {validationResult.stats.difficulties.hard > 0 && (
                <span className="badge badge-error">Hard: {validationResult.stats.difficulties.hard}</span>
              )}
            </div>
          </div>

          {/* Sample Question */}
          {validationResult.stats.sampleQuestion && (
            <div style={{
              background: 'var(--color-bg-secondary)', padding: '0.75rem',
              borderRadius: '0.5rem', marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Sample Question
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                {validationResult.stats.sampleQuestion.questionText.substring(0, 150)}
                {validationResult.stats.sampleQuestion.questionText.length > 150 ? '...' : ''}
              </div>
            </div>
          )}

          {/* Room Name Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Quiz Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Enter a name for this quiz room"
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleConfirmUpload} style={{ flex: 1 }}>
              Confirm Upload
            </button>
            <button className="btn btn-secondary" onClick={resetUpload}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Uploading Questions...</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {uploadProgress.completed} / {uploadProgress.total}
          </div>
          <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.completed / uploadProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {uploadProgress.total > 0 ? Math.round((uploadProgress.completed / uploadProgress.total) * 100) : 0}% complete
          </div>
        </div>
      )}

      {/* Done State */}
      {uploadState === 'done' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-success)' }}>
            Upload Complete!
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {uploadProgress.completed} questions added successfully
          </div>
          <button className="btn btn-primary" onClick={resetUpload}>Upload More</button>
        </div>
      )}

      {/* Quiz Room List */}
      {rooms.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Quiz Rooms</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rooms.map(room => (
              <div key={room.id} className="card">
                {editingRoom === room.id ? (
                  /* Rename Mode */
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRenameRoom(room.id)}
                      autoFocus
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: '0.5rem',
                        border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                        color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none',
                      }}
                    />
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', minHeight: 'auto' }} onClick={() => handleRenameRoom(room.id)}>Save</button>
                    <button className="btn btn-ghost" style={{ minHeight: 'auto' }} onClick={() => setEditingRoom(null)}>Cancel</button>
                  </div>
                ) : deleteConfirm === room.id ? (
                  /* Delete Confirmation */
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.5rem' }}>
                      Delete "{room.name}"?
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                      This will remove {room.totalQuestions} questions permanently.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-danger" style={{ padding: '0.5rem 1rem', minHeight: 'auto' }} onClick={() => handleDeleteRoom(room.id)}>
                        Yes, Delete
                      </button>
                      <button className="btn btn-ghost" style={{ minHeight: 'auto' }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* Normal View */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{room.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {room.totalQuestions} questions • {new Date(room.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }}
                          onClick={() => { setEditingRoom(room.id); setEditName(room.name); }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem' }}
                          onClick={() => setDeleteConfirm(room.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {room.modulesCovered && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {room.modulesCovered.map(m => (
                          <span key={m} className="badge badge-primary">M{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
