import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExamSetup from './pages/ExamSetup';
import Exam from './pages/Exam';
import Report from './pages/Report';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import QuestionBank from './pages/QuestionBank';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<ExamSetup />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/report" element={<Report />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/question-bank" element={<QuestionBank />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
