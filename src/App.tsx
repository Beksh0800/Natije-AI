import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import StudentDashboard from './pages/student/StudentDashboard';
import ArchivePage from './pages/student/ArchivePage';
import StudentHome from './pages/student/StudentHome';
import StudentArchivePage from './pages/student/StudentArchivePage';
import TeacherHome from './pages/teacher/TeacherHome';
import TeacherClassesPage from './pages/teacher/TeacherClassesPage';
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage';
import ClassDetailsPage from './pages/teacher/ClassDetailsPage';
import AssignmentsPage from './pages/teacher/AssignmentsPage';
import TeacherReview from './pages/teacher/TeacherReview';
import UploadWorkPage from './pages/teacher/UploadWorkPage';
import ParentDashboard from './pages/parent/ParentDashboard';
import JoinClassPage from './pages/student/JoinClassPage';
import StudentProgressPage from './pages/student/StudentProgressPage';
import TeacherStatsPage from './pages/teacher/TeacherStatsPage';
import ProfileSettings from './pages/settings/ProfileSettings';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (user.role === 'parent') return <Navigate to="/parent" replace />;
  return <StudentHome />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)' }}>Жүктелуде...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      
      {/* Student Routes */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/assignments" element={<ArchivePage />} />
      <Route path="/assignments/:id" element={<StudentDashboard />} />
      <Route path="/join-class" element={<JoinClassPage />} />
      <Route path="/archive" element={<StudentArchivePage />} />
      <Route path="/progress" element={<StudentProgressPage />} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<TeacherHome />} />
      <Route path="/teacher/classes" element={<TeacherClassesPage />} />
      <Route path="/teacher/classes/:classId" element={<ClassDetailsPage />} />
      <Route path="/teacher/upload" element={<UploadWorkPage />} />
      <Route path="/teacher/assignments" element={<AssignmentsPage />} />
      <Route path="/teacher/assignments/:id" element={<TeacherReview />} />
      <Route path="/teacher/students" element={<TeacherStudentsPage />} />
      <Route path="/teacher/stats" element={<TeacherStatsPage />} />

      {/* Parent Routes */}
      <Route path="/parent" element={<ParentDashboard />} />

      {/* Shared Authenticated Routes */}
      <Route path="/settings" element={<ProfileSettings />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
