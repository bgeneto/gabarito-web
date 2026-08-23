import { useState, useRef, useEffect } from "react";
import {
  User,
  LogOut,
  ClipboardList,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../App";

export default function UserNav() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="w-16 h-7 bg-slate-900 animate-pulse rounded-full" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => navigateTo("/entrar")}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
      >
        <User className="w-3.5 h-3.5 text-cyan-400" />
        <span>Entrar</span>
      </button>
    );
  }

  const emailDisplay =
    user.email.length > 20 ? user.email.slice(0, 18) + "..." : user.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-800/60 transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
      >
        <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 text-[10px] font-bold uppercase">
          {user.email.charAt(0)}
        </div>
        <span className="max-w-[120px] sm:max-w-[180px] truncate group-hover:text-cyan-300 transition-colors">
          {emailDisplay}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/90 ring-1 ring-white/10 py-2 z-50 animate-fade-in text-xs">
          <div className="px-4 py-2.5 border-b border-slate-800 mb-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Conectado como
            </div>
            <div
              className="text-slate-100 font-semibold truncate mt-0.5"
              title={user.email}
            >
              {user.email}
            </div>
          </div>

          <button
            onClick={() => {
              setDropdownOpen(false);
              navigateTo("/minhas-provas");
            }}
            className="w-full px-4 py-2.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium">Minhas Provas (Professor)</span>
          </button>

          <button
            onClick={() => {
              setDropdownOpen(false);
              navigateTo("/meus-resultados");
            }}
            className="w-full px-4 py-2.5 text-left text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-medium">Meus Resultados (Aluno)</span>
          </button>

          <div className="border-t border-slate-800 my-1" />

          <button
            onClick={async () => {
              setDropdownOpen(false);
              await logout();
              navigateTo("/");
            }}
            className="w-full px-4 py-2.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="font-medium">Sair da conta</span>
          </button>
        </div>
      )}
    </div>
  );
}
