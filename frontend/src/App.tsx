import { useState, useEffect } from 'react';
import Home from './pages/Home';
import TeacherCreate from './pages/TeacherCreate';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentExam from './pages/StudentExam';
import StudentResult from './pages/StudentResult';

export type RoutePath =
  | { type: 'home' }
  | { type: 'student-exam'; publicCode: string }
  | { type: 'student-result'; submissionId: string }
  | { type: 'teacher-create' }
  | { type: 'teacher-dashboard'; adminToken: string };

export function navigateTo(pathStr: string) {
  window.history.pushState(null, '', pathStr);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function parseCurrentRoute(): RoutePath {
  const path = window.location.pathname;
  
  if (path.startsWith('/prova/')) {
    const publicCode = path.replace('/prova/', '').trim();
    return { type: 'student-exam', publicCode };
  }
  if (path.startsWith('/submissao/')) {
    const submissionId = path.replace('/submissao/', '').trim();
    return { type: 'student-result', submissionId };
  }
  if (path.startsWith('/admin/')) {
    const adminToken = path.replace('/admin/', '').trim();
    return { type: 'teacher-dashboard', adminToken };
  }
  if (path === '/criar-prova') {
    return { type: 'teacher-create' };
  }
  
  return { type: 'home' };
}

function App() {
  const [route, setRoute] = useState<RoutePath>(parseCurrentRoute());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderContent = () => {
    switch (route.type) {
      case 'home':
        return <Home />;
      case 'teacher-create':
        return <TeacherCreate />;
      case 'teacher-dashboard':
        return <TeacherDashboard adminToken={route.adminToken} />;
      case 'student-exam':
        return <StudentExam publicCode={route.publicCode} />;
      case 'student-result':
        return <StudentResult submissionId={route.submissionId} />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-radial text-slate-100 flex flex-col">
      {/* Header Fixo */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            onClick={() => navigateTo('/')} 
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
            <span className="font-extrabold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Gabarito<span className="text-slate-100">WEB</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
              MVP v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col justify-start">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>© 2026 GabaritoWEB. Desenvolvido para simplificar correções.</p>
      </footer>
    </div>
  );
}

export default App;
