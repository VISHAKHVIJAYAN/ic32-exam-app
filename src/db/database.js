import Dexie from 'dexie';

const db = new Dexie('IC32ExamApp');

db.version(1).stores({
  // Quiz Rooms — each uploaded JSON becomes a room
  quizRooms: '++id, name, uploadedAt, totalQuestions, fileName',

  // Questions — stored per room
  questions: '++autoId, questionId, roomId, moduleNumber, moduleName, domain, difficulty, [roomId+moduleNumber]',

  // Exam Sessions — completed exams
  examSessions: '++id, startedAt, completedAt, score, total, accuracy',

  // Answered Questions — track what user has answered
  answeredQuestions: 'questionId, roomId, moduleNumber, isCorrect, answeredAt',

  // Bookmarked Questions
  bookmarks: 'questionId, roomId, moduleNumber',

  // User Stats
  userStats: 'key'
});

export default db;
