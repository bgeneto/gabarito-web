import { useId, useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, Download, Printer } from "lucide-react";
import { useModal } from "./ModalProvider";
import {
  downloadQrCodePng,
  exportQrSharePdf,
  openWhatsAppShare,
} from "../utils/examCredentials";

/** Official WhatsApp mark: white ring + green bubble + white handset. */
function WhatsAppIcon({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `wa-grad-${uid}`;
  const filterId = `wa-blur-${uid}`;
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 175.216 175.552"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="85.915"
          x2="86.535"
          y1="32.567"
          y2="137.092"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#57d163" />
          <stop offset="1" stopColor="#23b33a" />
        </linearGradient>
        <filter
          id={filterId}
          width="1.115"
          height="1.114"
          x="-.057"
          y="-.057"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="3.531" />
        </filter>
      </defs>
      {/* Soft drop shadow */}
      <path
        fill="#b3b3b3"
        filter={`url(#${filterId})`}
        d="m54.532 138.45 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.523h.023c33.707 0 61.139-27.426 61.153-61.135.006-16.335-6.349-31.696-17.895-43.251A60.75 60.75 0 0 0 87.94 25.983c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.558zm-40.811 23.544L24.16 123.88c-6.438-11.154-9.825-23.808-9.821-36.772.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954zm0 0"
      />
      {/* White outer ring (defines the official mark silhouette) */}
      <path
        fill="#fff"
        d="m12.966 161.238 10.439-38.114a73.42 73.42 0 0 1-9.821-36.772c.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954z"
      />
      {/* Green bubble */}
      <path
        fill={`url(#${gradId})`}
        d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.559 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.524h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.929z"
      />
      {/* White handset */}
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043c-1.226 0-3.218.46-4.902 2.3s-6.435 6.287-6.435 15.332 6.588 17.785 7.506 19.013 12.718 20.381 31.405 27.75c15.529 6.124 18.689 4.906 22.061 4.6s10.877-4.447 12.408-8.74 1.532-7.971 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.562-5.981-2.91-.919-4.137.921-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.84 1.836-3.065.307-2.301-.153-3.22-4.032-10.011-5.666-13.647"
      />
    </svg>
  );
}

export interface QrSharePanelProps {
  title: string;
  description?: string;
  qrValue: string;
  codeLabel: string;
  codeValue: string;
  linkLabel: string;
  linkValue: string;
  downloadFilename: string;
  whatsappMessage: string;
  extraActions?: ReactNode;
}

export default function QrSharePanel({
  title,
  description,
  qrValue,
  codeLabel,
  codeValue,
  linkLabel,
  linkValue,
  downloadFilename,
  whatsappMessage,
  extraActions,
}: QrSharePanelProps) {
  const { alert } = useModal();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadQrPng = async () => {
    const container = qrContainerRef.current;
    if (!container) {
      await alert("Não foi possível gerar a imagem do QR code.");
      return;
    }
    try {
      await downloadQrCodePng(container, downloadFilename);
    } catch {
      await alert("Erro ao baixar o QR code.");
    }
  };

  const handleShareWhatsApp = () => {
    openWhatsAppShare(whatsappMessage);
  };

  const handleSavePdf = () => {
    exportQrSharePdf(downloadFilename);
  };

  return (
    <>
      <div id="qr-share-print" className="hidden">
        <h1>GabaritoWEB — {title}</h1>
        {description && <p className="print-subtitle">{description}</p>}
        <div className="print-qr">
          <QRCodeSVG value={qrValue} size={200} />
        </div>
        <p>
          <strong>{codeLabel}:</strong> {codeValue}
        </p>
        <p className="print-break-word">
          <strong>{linkLabel}:</strong> {linkValue}
        </p>
      </div>

      <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-cyan-400">
              {title}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-slate-400 mb-4">{description}</p>
          )}

          <div
            ref={qrContainerRef}
            className="flex items-center justify-center bg-white p-4 rounded-xl max-w-[220px] mx-auto mb-4 border border-slate-200"
          >
            <QRCodeSVG value={qrValue} size={220} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                {codeLabel}
              </span>
              <span className="font-mono font-bold text-sm tracking-wider">
                {codeValue}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(codeValue, "code")}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={`Copiar ${codeLabel}`}
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between">
            <div className="text-left truncate mr-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                {linkLabel}
              </span>
              <span className="font-mono text-xs text-slate-300 block truncate">
                {linkValue}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(linkValue, "link")}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={`Copiar ${linkLabel}`}
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {extraActions}
          <button
            onClick={handleDownloadQrPng}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400/70 rounded-xl text-xs font-bold text-cyan-300 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar QR
          </button>
          <button
            onClick={handleSavePdf}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 hover:border-red-400/70 rounded-xl text-xs font-bold text-red-300 transition-all cursor-pointer"
            title="Salvar ou imprimir em PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Salvar PDF
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 hover:border-emerald-400/80 rounded-xl text-xs font-bold text-emerald-300 transition-all cursor-pointer"
          >
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}
