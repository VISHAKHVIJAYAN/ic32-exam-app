/**
 * Parses and validates uploaded question JSON files.
 */

const REQUIRED_QUESTION_FIELDS = ['id', 'moduleNumber', 'moduleName', 'questionText', 'options', 'correctAnswerIndex'];

export function validateQuestionJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid JSON: not an object'] };
  }

  if (!data.questions || !Array.isArray(data.questions)) {
    return { valid: false, errors: ['Missing or invalid "questions" array'] };
  }

  if (data.questions.length === 0) {
    return { valid: false, errors: ['Questions array is empty'] };
  }

  // Validate sample of questions
  const sampleSize = Math.min(10, data.questions.length);
  for (let i = 0; i < sampleSize; i++) {
    const q = data.questions[i];
    for (const field of REQUIRED_QUESTION_FIELDS) {
      if (q[field] === undefined || q[field] === null) {
        errors.push(`Question ${i + 1} (${q.id || 'unknown'}): missing "${field}"`);
      }
    }
    if (q.options && (!Array.isArray(q.options) || q.options.length < 2)) {
      errors.push(`Question ${q.id || i + 1}: options must be an array with at least 2 items`);
    }
    if (q.correctAnswerIndex !== undefined && (q.correctAnswerIndex < 0 || q.correctAnswerIndex >= (q.options?.length || 0))) {
      errors.push(`Question ${q.id || i + 1}: correctAnswerIndex out of range`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      totalQuestions: data.questions.length,
      modules: getModuleStats(data.questions),
      difficulties: getDifficultyStats(data.questions),
      sampleQuestion: data.questions[0],
    },
    metadata: data.metadata || null,
  };
}

function getModuleStats(questions) {
  const modules = {};
  for (const q of questions) {
    const key = q.moduleNumber;
    if (!modules[key]) {
      modules[key] = { number: q.moduleNumber, name: q.moduleName, count: 0 };
    }
    modules[key].count++;
  }
  return Object.values(modules).sort((a, b) => a.number - b.number);
}

function getDifficultyStats(questions) {
  const stats = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const q of questions) {
    const d = (q.difficulty || '').toLowerCase();
    if (d in stats) stats[d]++;
    else stats.unknown++;
  }
  return stats;
}

/**
 * Batch insert questions into Dexie in chunks to avoid UI freeze.
 * @param {Dexie} db - Dexie database instance
 * @param {number} roomId - The quiz room ID
 * @param {Array} questions - Array of question objects
 * @param {function} onProgress - Callback with (completed, total)
 * @param {number} batchSize - Number of questions per batch
 */
export async function batchInsertQuestions(db, roomId, questions, onProgress, batchSize = 100) {
  const total = questions.length;
  let completed = 0;

  for (let i = 0; i < total; i += batchSize) {
    const batch = questions.slice(i, i + batchSize).map(q => ({
      questionId: q.id,
      roomId,
      moduleNumber: q.moduleNumber,
      moduleName: q.moduleName,
      domain: q.domain || '',
      difficulty: q.difficulty || 'medium',
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation || '',
      source: q.source || '',
      tags: q.tags || [],
    }));

    await db.questions.bulkAdd(batch);
    completed += batch.length;
    onProgress(completed, total);

    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return completed;
}
