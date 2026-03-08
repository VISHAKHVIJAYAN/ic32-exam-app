import db from '../db/database';

/**
 * Get overall stats from the database
 */
export async function getOverallStats() {
  const totalQuestions = await db.questions.count();
  const answeredQuestions = await db.answeredQuestions.toArray();
  const uniqueAnswered = new Set(answeredQuestions.map(a => a.questionId)).size;
  const correctAnswers = answeredQuestions.filter(a => a.isCorrect === 1).length;
  const totalAnswered = answeredQuestions.length;
  const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  // Streak
  const streakData = await db.userStats.get('streak');
  const streak = streakData ? streakData.count : 0;

  // Check if streak is still active (last activity was today or yesterday)
  let activeStreak = 0;
  if (streakData) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (streakData.lastDate === today || streakData.lastDate === yesterday) {
      activeStreak = streakData.count;
    }
  }

  return {
    totalQuestions,
    uniqueAnswered,
    accuracy,
    streak: activeStreak,
  };
}

/**
 * Get per-module stats
 */
export async function getModuleStats() {
  const allQuestions = await db.questions.toArray();
  const answeredQuestions = await db.answeredQuestions.toArray();

  // Group questions by module
  const modules = {};
  allQuestions.forEach(q => {
    if (!modules[q.moduleNumber]) {
      modules[q.moduleNumber] = {
        number: q.moduleNumber,
        name: q.moduleName,
        total: 0,
        attempted: 0,
        correct: 0,
      };
    }
    modules[q.moduleNumber].total++;
  });

  // Count attempts per module
  const answeredByModule = {};
  answeredQuestions.forEach(a => {
    if (!answeredByModule[a.moduleNumber]) {
      answeredByModule[a.moduleNumber] = { attempted: new Set(), correct: 0 };
    }
    answeredByModule[a.moduleNumber].attempted.add(a.questionId);
    if (a.isCorrect === 1) answeredByModule[a.moduleNumber].correct++;
  });

  Object.keys(answeredByModule).forEach(modNum => {
    if (modules[modNum]) {
      modules[modNum].attempted = answeredByModule[modNum].attempted.size;
      modules[modNum].correct = answeredByModule[modNum].correct;
    }
  });

  return Object.values(modules)
    .map(m => ({
      ...m,
      accuracy: m.attempted > 0 ? Math.round((m.correct / (m.correct + (m.attempted - m.correct))) * 100) : -1,
      color: m.attempted === 0 ? 'grey'
        : (m.correct / m.attempted * 100) >= 80 ? 'green'
        : (m.correct / m.attempted * 100) >= 60 ? 'yellow'
        : 'red',
    }))
    .sort((a, b) => a.number - b.number);
}

/**
 * Get recent exam sessions
 */
export async function getRecentSessions(limit = 5) {
  const sessions = await db.examSessions.orderBy('completedAt').reverse().limit(limit).toArray();
  return sessions;
}

/**
 * Get accuracy trend for last N sessions
 */
export async function getAccuracyTrend(limit = 20) {
  const sessions = await db.examSessions.orderBy('completedAt').reverse().limit(limit).toArray();
  return sessions.reverse().map((s, i) => ({
    session: i + 1,
    accuracy: s.accuracy,
    date: new Date(s.completedAt).toLocaleDateString(),
    score: `${s.score}/${s.total}`,
  }));
}

/**
 * Get summary stats for the progress page
 */
export async function getProgressSummary() {
  const sessions = await db.examSessions.toArray();
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return { totalSessions: 0, totalAttempted: 0, avgAccuracy: 0, bestScore: 0, streak: 0 };
  }

  const totalAttempted = sessions.reduce((sum, s) => sum + s.total, 0);
  const avgAccuracy = Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions);
  const bestScore = Math.max(...sessions.map(s => s.accuracy));

  const streakData = await db.userStats.get('streak');
  const streak = streakData ? streakData.count : 0;

  return { totalSessions, totalAttempted, avgAccuracy, bestScore, streak };
}
