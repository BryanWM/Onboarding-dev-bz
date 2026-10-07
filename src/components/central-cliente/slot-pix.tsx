import { useState, useMemo, type ChangeEvent } from "react";
import { MessageCircle, QrCode, CheckCircle2, ShieldCheck, Upload, FileCheck, Loader2, AlertCircle } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { CopyRow } from "./copy-row";
import { gerarPixCopiaECola } from "@/lib/pix-util";
import { enviarComprovantePix } from "@/lib/supabase";

export const CHAVE_PIX_DEFAULT = "financeiro@wrmaxmarketing.com.br";
export const FAVORECIDO_DEFAULT = "KFGMoreira";
export const WHATSAPP_DEFAULT = "5586999216675";
const MAX_FILE_SIZE_COMPROVANTE = 15 * 1024 * 1024; // 15MB

interface SlotPixProps {
  chavePix?: string;
  favorecido?: string;
  whatsapp?: string;
  pixPago?: boolean;
  clienteId?: string;
}

function sanitizarNumeroWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

export function SlotPix({
  chavePix = CHAVE_PIX_DEFAULT,
  favorecido = FAVORECIDO_DEFAULT,
  whatsapp = WHATSAPP_DEFAULT,
  pixPago = false,
  clienteId = "cliente-atual",
}: SlotPixProps) {
  const [comprovanteArquivo, setComprovanteArquivo] = useState<File | null>(null);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const [comprovanteEnviadoNome, setComprovanteEnviadoNome] = useState<string | null>(null);
  const [canalEnvio, setCanalEnvio] = useState<"sistema" | "whatsapp">("whatsapp");

  const numeroFormatado = sanitizarNumeroWhatsapp(whatsapp);
  const mensagemWhatsapp = encodeURIComponent(
    "Olá! Acabei de realizar o pagamento via PIX para a WRMax e gostaria de enviar meu comprovante."
  );

  const pixCopiaEColaOficial = useMemo(() => {
    return gerarPixCopiaECola({
      chavePix,
      nomeRecebedor: favorecido,
      cidadeRecebedor: "TERESINA",
      txid: "KFGMoreira",
    });
  }, [chavePix, favorecido]);

  const qrCodeOficialUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    pixCopiaEColaOficial
  )}`;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErroTamanho(null);
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_FILE_SIZE_COMPROVANTE) {
        setErroTamanho("O comprovante excede o limite máximo permitido de 15MB. Selecione um arquivo menor.");
        setComprovanteArquivo(null);
        return;
      }
      setComprovanteArquivo(f);
    }
  };

  const handleUploadComprovante = async () => {
    if (!comprovanteArquivo) return;
    setEnviandoComprovante(true);
    try {
      await enviarComprovantePix(clienteId, comprovanteArquivo);
      setComprovanteEnviadoNome(comprovanteArquivo.name);
      setComprovanteArquivo(null);
    } finally {
      setEnviandoComprovante(false);
    }
  };

  return (
    <section className="metal-panel p-5 sm:p-7 overflow-hidden">
      <SlotHeader
        index="02"
        icon={<QrCode className="size-5" />}
        title="Pagamento via PIX"
        subtitle="QR Code oficial do PIX (BR Code oficial Banco Central), chave copia e cola e envio de comprovante."
      />

      <div className="mt-6 space-y-6">
        {pixPago && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 flex items-center gap-3.5 text-emerald-400">
            <CheckCircle2 className="size-6 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block text-base">Pagamento PIX Confirmado</span>
              Recebimento validado pelo financeiro WRMax. Sua esteira de implantação já está liberada.
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start min-w-0">
          <div className="flex flex-col items-center gap-3 mx-auto md:mx-0">
            <div className="relative size-60 rounded-xl border border-border/80 bg-white p-2.5 shadow-md flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={qrCodeOficialUrl}
                alt="QR Code PIX oficial Banco Central WRMax"
                className="size-full object-contain"
                loading="lazy"
              />
            </div>

            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Padrão BR Code Oficial (BACEN)
            </span>
          </div>

          <div className="space-y-4 min-w-0 w-full overflow-hidden">
            <CopyRow label="Chave PIX (E-mail)" value={chavePix} />
            <CopyRow label="Favorecido" value={favorecido} />
            <CopyRow label="Código PIX Copia e Cola (BR Code Oficial)" value={pixCopiaEColaOficial} />

            {/* Escolha do Canal de Envio de Comprovante */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <span className="block text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Como prefere enviar seu comprovante?
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCanalEnvio("sistema")}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                    canalEnvio === "sistema"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="size-4" />
                  <span>Anexar na Central</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCanalEnvio("whatsapp")}
                  className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border ${
                    canalEnvio === "whatsapp"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="size-4" />
                  <span>Pelo WhatsApp</span>
                </button>
              </div>

              {canalEnvio === "sistema" ? (
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/80 space-y-3">
                  {comprovanteEnviadoNome ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-2.5">
                      <FileCheck className="size-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">Comprovante anexado com sucesso!</p>
                        <p className="text-xs text-muted-foreground truncate">{comprovanteEnviadoNome}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {erroTamanho && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
                          <AlertCircle className="size-4 shrink-0" />
                          <span>{erroTamanho}</span>
                        </div>
                      )}

                      <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/60 bg-background text-sm text-muted-foreground cursor-pointer transition-colors">
                        <Upload className="size-4 text-primary shrink-0" />
                        <span className="truncate">
                          {comprovanteArquivo ? comprovanteArquivo.name : "Selecionar comprovante (PDF ou Imagem - máx 15MB)..."}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleUploadComprovante}
                        disabled={!comprovanteArquivo || enviandoComprovante}
                        className="metal-button w-full h-11 rounded-lg text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                      >
                        {enviandoComprovante ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        <span>{enviandoComprovante ? "Enviando Comprovante..." : "Enviar Comprovante ao Financeiro"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={`https://wa.me/${numeroFormatado}?text=${mensagemWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metal-button inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-primary-foreground cursor-pointer shadow-md"
                >
                  <MessageCircle className="size-4" />
                  <span>Enviar Comprovante via WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
