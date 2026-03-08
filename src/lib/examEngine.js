import db from '../db/database';

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build the question pool based on user selections
 */
export async function buildQuestionPool({
  selectedRoomIds,
  selectedModules,
  questionCount,
  questionFilter, // 'all' | 'unanswered' | 'wrong' | 'bookmarked'
  difficulty, // 'all' | 'easy' | 'medium' | 'hard'
}) {
  // Get all questions from selected rooms & modules
  let questions = await db.questions
    .where('roomId')
    .anyOf(selectedRoomIds)
    .toArray();

  // Filter by modules
  questions = questions.filter(q => selectedModules.includes(q.moduleNumber));

  // Filter by difficulty
  if (difficulty !== 'all') {
    questions = questions.filter(q => q.difficulty === difficulty);
  }

  // Filter by question state
  if (questionFilter === 'unanswered') {
    const answeredIds = new Set(
      (await db.answeredQuestions.toArray()).map(a => a.questionId)
    );
    questions = questions.filter(q => !answeredIds.has(q.questionId));
  } else if (questionFilter === 'wrong') {
    const wrongIds = new Set(
      (await db.answeredQuestions.where('isCorrect').equals(0).toArray()).map(a => a.questionId)
    );
    questions = questions.filter(q => wrongIds.has(q.questionId));
  } else if (questionFilter === 'bookmarked') {
    const bookmarkedIds = new Set(
      (await db.bookmarks.toArray()).map(b => b.questionId)
    );
    questions = questions.filter(q => bookmarkedIds.has(q.questionId));
  }

  // Shuffle
  questions = shuffleArray(questions);

  // Slice to requested count
  if (questionCount !== 'all' && questionCount < questions.length) {
    questions = questions.slice(0, questionCount);
  }

  return questions;
}

/**
 * Save exam results to the database
 */
export async function saveExamResults({
  startedAt,
  completedAt,
  questions,
  answers, // Map<questionId, selectedIndex>
  score,
  total,
}) {
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  // Save exam session
  const sessionId = await db.examSessions.add({
    startedAt,
    completedAt,
    score,
    total,
    accuracy,
  });

  // Save each answered question
  const answeredEntries = questions.map(q => {
    const selectedIndex = answers.get(q.questionId);
    const isCorrect = selectedIndex === q.correctAnswerIndex ? 1 : 0;
    return {
      questionId: q.questionId,
      roomId: q.roomId,
      moduleNumber: q.moduleNumber,
      isCorrect,
      answeredAt: completedAt,
    };
  });

  await db.answeredQuestions.bulkPut(answeredEntries);

  // Update streak
  await updateStreak();

  return sessionId;
}

/**
 * Update study streak
 */
async function updateStreak() {
  const today = new Date().toISOString().split('T')[0];

  let streakData = await db.userStats.get('streak');
  if (!streakData) {
    streakData = { key: 'streak', lastDate: today, count: 1 };
    await db.userStats.put(streakData);
    return;
  }

  if (streakData.lastDate === today) return; // Already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (streakData.lastDate === yesterday) {
    streakData.count += 1;
  } else {
    streakData.count = 1; // Streak broken
  }
  streakData.lastDate = today;
  await db.userStats.put(streakData);
}

/**
 * Generate export report
 */
export function generateReport({ questions, answers, startedAt, completedAt, selectedModules, roomNames }) {
  const score = questions.filter(q => answers.get(q.questionId) === q.correctAnswerIndex).length;
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const timeSeconds = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);

  // Module breakdown
  const moduleMap = {};
  questions.forEach(q => {
    if (!moduleMap[q.moduleNumber]) {
      moduleMap[q.moduleNumber] = { module: q.moduleNumber, moduleName: q.moduleName, correct: 0, total: 0 };
    }
    moduleMap[q.moduleNumber].total++;
    if (answers.get(q.questionId) === q.correctAnswerIndex) {
      moduleMap[q.moduleNumber].correct++;
    }
  });
  const moduleBreakdown = Object.values(moduleMap).map(m => ({
    ...m,
    accuracy: m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0,
  })).sort((a, b) => a.module - b.module);

  // Wrong answers
  const wrongAnswers = questions
    .filter(q => answers.get(q.questionId) !== q.correctAnswerIndex)
    .map(q => ({
      questionId: q.questionId,
      moduleNumber: q.moduleNumber,
      moduleName: q.moduleName,
      questionText: q.questionText,
      yourAnswer: answers.get(q.questionId),
      yourAnswerText: q.options[answers.get(q.questionId)] || 'Not answered',
      correctAnswer: q.correctAnswerIndex,
      correctAnswerText: q.options[q.correctAnswerIndex],
      explanation: q.explanation,
      tags: q.tags || [],
    }));

  return {
    examReport: {
      date: completedAt,
      score,
      total,
      accuracy,
      timeSeconds,
      modulesSelected: selectedModules,
      quizRoomsUsed: roomNames,
      moduleBreakdown,
      wrongAnswers,
    }
  };
}
