import { useRef, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, Download, MessageCircle } from "lucide-react";
import { useModal } from "./ModalProvider";
import { downloadQrCodePng, openWhatsAppShare } from "../utils/examCredentials";

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

  return (
    <div className="glass-panel border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Baixar QR (PNG)
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </button>
      </div>
    </div>
  );
}
