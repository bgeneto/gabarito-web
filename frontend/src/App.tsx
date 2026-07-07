import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import TeacherCreate from "./pages/TeacherCreate";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentExam from "./pages/StudentExam";
import StudentResult from "./pages/StudentResult";
import SuperadminLogin from "./pages/SuperadminLogin";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import SuperadminExamDetail from "./pages/SuperadminExamDetail";
import { ModalProvider } from "./components/ModalProvider";

export type RoutePath =
  | { type: "home" }
  | { type: "student-exam"; publicCode: string }
  | { type: "student-result"; submissionId: string }
  | { type: "teacher-create" }
  | { type: "teacher-dashboard"; adminToken: string }
  | { type: "superadmin-login" }
  | { type: "superadmin-dashboard" }
  | { type: "superadmin-exam"; examId: string };

export function navigateTo(pathStr: string) {
  window.history.pushState(null, "", pathStr);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function parseCurrentRoute(): RoutePath {
  const path = window.location.pathname;

  if (path.startsWith("/prova/")) {
    const publicCode = path.replace("/prova/", "").trim();
    return { type: "student-exam", publicCode };
  }
  if (path.startsWith("/submissao/")) {
    const submissionId = path.replace("/submissao/", "").trim();
    return { type: "student-result", submissionId };
  }
  if (path.startsWith("/admin/")) {
    const adminToken = path.replace("/admin/", "").trim();
    return { type: "teacher-dashboard", adminToken };
  }
  if (path.startsWith("/superadmin/prova/")) {
    const examId = path.replace("/superadmin/prova/", "").trim();
    return { type: "superadmin-exam", examId };
  }
  if (path === "/superadmin/painel") {
    return { type: "superadmin-dashboard" };
  }
  if (path === "/superadmin" || path === "/superadmin/") {
    return { type: "superadmin-login" };
  }
  if (path === "/criar-prova") {
    return { type: "teacher-create" };
  }

  return { type: "home" };
}

function App() {
  const [route, setRoute] = useState<RoutePath>(parseCurrentRoute());
  const pageviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (pageviewTimer.current) clearTimeout(pageviewTimer.current);
    pageviewTimer.current = setTimeout(() => {
      fetch("/api/telemetry/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
      }).catch(() => {});
    }, 500);
    return () => {
      if (pageviewTimer.current) clearTimeout(pageviewTimer.current);
    };
  }, [route]);

  const isSuperadmin =
    route.type === "superadmin-login" ||
    route.type === "superadmin-dashboard" ||
    route.type === "superadmin-exam";

  const renderContent = () => {
    switch (route.type) {
      case "home":
        return <Home />;
      case "teacher-create":
        return <TeacherCreate />;
      case "teacher-dashboard":
        return <TeacherDashboard adminToken={route.adminToken} />;
      case "student-exam":
        return <StudentExam publicCode={route.publicCode} />;
      case "student-result":
        return <StudentResult submissionId={route.submissionId} />;
      case "superadmin-login":
        return <SuperadminLogin />;
      case "superadmin-dashboard":
        return <SuperadminDashboard />;
      case "superadmin-exam":
        return <SuperadminExamDetail examId={route.examId} />;
      default:
        return <Home />;
    }
  };

  return (
    <ModalProvider>
      <div className="min-h-screen bg-slate-950 bg-gradient-radial text-slate-100 flex flex-col">
        {/* Header Fixo */}
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div
            className={`${isSuperadmin ? "max-w-6xl" : "max-w-4xl"} mx-auto px-4 h-16 flex items-center justify-between`}
          >
            <div
              onClick={() => navigateTo("/")}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                📝
              </span>
              <span className="font-extrabold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Gabarito<span className="text-slate-100">WEB</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
              {isSuperadmin && (
                <span className="px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-400">
                  Somente leitura
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                v1.0.1
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          className={`flex-1 w-full ${isSuperadmin ? "max-w-6xl" : "max-w-4xl"} mx-auto px-4 py-8 flex flex-col justify-start`}
        >
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
          <p>
            © 2026-{new Date().getFullYear()} GabaritoWEB. Desenvolvido com ❤️
            para facilitar a vida de professores e alunos.
          </p>
        </footer>
      </div>
    </ModalProvider>
  );
}

export default App;
