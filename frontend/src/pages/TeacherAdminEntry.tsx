import { useEffect, useState } from "react";
import { navigateReplace, navigateTo } from "../App";
import { ShieldAlert } from "lucide-react";
import { setAdminToken } from "../utils/adminSession";
import { adminApiFetch } from "../utils/adminApi";
import { parseAdminTokenFromUrlSegment } from "../utils/adminTokenUrl";
import TeacherDashboard from "./TeacherDashboard";

export default function TeacherAdminEntry({ segment }: { segment: string }) {
  const [error, setError] = useState("");
  const [readyToken, setReadyToken] = useState<string | null>(null);

  useEffect(() => {
    const token = parseAdminTokenFromUrlSegment(segment);
    if (!token) {
      setError("Link administrativo inválido.");
      return;
    }

    let cancelled = false;

    const validateAndStore = async () => {
      try {
        const response = await adminApiFetch(
          `/api/admin/exams/${encodeURIComponent(token)}`,
        );
        if (!response.ok) {
          if (!cancelled) {
            setError("Token administrativo inválido ou prova não encontrada.");
          }
          return;
        }

        setAdminToken(token);
        navigateReplace("/admin");
        if (!cancelled) {
          setReadyToken(token);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível validar o acesso administrativo.");
        }
      }
    };

    void validateAndStore();

    return () => {
      cancelled = true;
    };
  }, [segment]);

  if (readyToken) {
    return <TeacherDashboard />;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="w-14 h-14 bg-rose-950/80 border border-rose-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold">Acesso negado</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => navigateTo("/")}
          className="px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-850 cursor-pointer"
        >
          Voltar para Home
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400 text-sm">
        Validando acesso administrativo...
      </p>
    </div>
  );
}
