import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { AlertTriangle, Info, X } from "lucide-react";

interface ModalOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  severity?: "info" | "warning" | "danger";
}

interface ModalContextType {
  alert: (message: string, options?: ModalOptions) => Promise<void>;
  confirm: (message: string, options?: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal deve ser utilizado dentro de um ModalProvider");
  }
  return context;
}

interface ModalState {
  isOpen: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  severity: "info" | "warning" | "danger";
  resolve: (value: boolean) => void;
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [modal, setModal] = useState<ModalState | null>(null);

  // Escuta tecla Escape para fechar modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal && modal.isOpen) {
        modal.resolve(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  const showAlert = useCallback((message: string, options?: ModalOptions) => {
    return new Promise<void>((resolve) => {
      setModal({
        isOpen: true,
        type: "alert",
        title: options?.title || "Aviso",
        message,
        confirmText: options?.confirmText || "OK",
        cancelText: "",
        severity: options?.severity || "info",
        resolve: () => {
          setModal(null);
          resolve();
        },
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, options?: ModalOptions) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        isOpen: true,
        type: "confirm",
        title: options?.title || "Confirmação",
        message,
        confirmText: options?.confirmText || "Confirmar",
        cancelText: options?.cancelText || "Cancelar",
        severity: options?.severity || "warning",
        resolve: (value: boolean) => {
          setModal(null);
          resolve(value);
        },
      });
    });
  }, []);

  const handleClose = () => {
    if (modal) {
      modal.resolve(false);
    }
  };

  const handleConfirm = () => {
    if (modal) {
      modal.resolve(true);
    }
  };

  const getIcon = () => {
    if (!modal) return null;
    switch (modal.severity) {
      case "danger":
        return (
          <div className="w-12 h-12 bg-rose-950/85 border border-rose-800/40 rounded-2xl flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        );
      case "warning":
        return (
          <div className="w-12 h-12 bg-amber-950/85 border border-amber-800/40 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "info":
      default:
        return (
          <div className="w-12 h-12 bg-cyan-950/85 border border-cyan-800/40 rounded-2xl flex items-center justify-center text-cyan-400 shrink-0">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (!modal) return "";
    switch (modal.severity) {
      case "danger":
        return "px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-500/10 cursor-pointer flex-1 sm:flex-initial text-center";
      case "warning":
        return "px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 cursor-pointer flex-1 sm:flex-initial text-center";
      case "info":
      default:
        return "px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 cursor-pointer flex-1 sm:flex-initial text-center";
    }
  };

  return (
    <ModalContext.Provider value={{ alert: showAlert, confirm: showConfirm }}>
      {children}

      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Underlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClose}
          />

          {/* Dialog Container */}
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 overflow-hidden transform transition-all animate-modal-in">
            {/* Background glowing decoration */}
            <div
              className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${
                modal.severity === "danger"
                  ? "bg-rose-500"
                  : modal.severity === "warning"
                    ? "bg-amber-500"
                    : "bg-cyan-500"
              }`}
            />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Body */}
            <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
              {getIcon()}
              <div className="space-y-1 w-full">
                <h3 className="text-lg font-bold text-slate-100 pr-6">
                  {modal.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed break-words whitespace-pre-line">
                  {modal.message}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              {modal.type === "confirm" && (
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-800 rounded-xl text-sm transition-all cursor-pointer flex-1 sm:flex-initial text-center"
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={getConfirmButtonClass()}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
