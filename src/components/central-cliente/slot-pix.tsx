import { useState, useMemo, type ChangeEvent } from "react";
import { QrCode, CheckCircle2, Upload, FileCheck, Loader2, AlertCircle } from "lucide-react";
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
  token?: string;
  clienteId?: string;
  comprovanteEnviadoInicial?: string | null;
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
  token = "",
  clienteId = "cliente-atual",
  comprovanteEnviadoInicial = null,
}: SlotPixProps) {
  const [comprovanteArquivo, setComprovanteArquivo] = useState<File | null>(null);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const [comprovanteEnviadoNome, setComprovanteEnviadoNome] = useState<string | null>(comprovanteEnviadoInicial);

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

  // Selecionar o arquivo ja envia: um clique so ("Enviar comprovante").
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setErroTamanho(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FILE_SIZE_COMPROVANTE) {
      setErroTamanho("O comprovante excede o limite máximo permitido de 15MB. Selecione um arquivo menor.");
      return;
    }
    setComprovanteArquivo(f);
    setEnviandoComprovante(true);
    try {
      await enviarComprovantePix(token, f, clienteId);
      setComprovanteEnviadoNome(f.name);
    } catch (err) {
      setErroTamanho(err instanceof Error ? err.message : "Não foi possível enviar o comprovante.");
    } finally {
      setEnviandoComprovante(false);
      setComprovanteArquivo(null);
    }
  };

  return (
    <section className="metal-panel p-5 sm:p-7 overflow-hidden">
      <SlotHeader
        index="02"
        icon={<QrCode className="size-5" />}
        title="Pagamento via PIX"
        subtitle="Pague pelo app do seu banco com o QR Code ou a chave PIX. Depois, envie o comprovante."
      />

      <div className="mt-6 space-y-6">
        {pixPago && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="text-sm font-semibold">Pagamento confirmado pelo financeiro WRMax.</span>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-[176px_1fr] items-center min-w-0">
          <div className="size-44 mx-auto sm:mx-0 rounded-xl bg-white p-2 flex items-center justify-center overflow-hidden shrink-0">
            <img src={qrCodeOficialUrl} alt="QR Code PIX oficial WRMax" className="size-full object-contain" loading="lazy" />
          </div>

          <div className="space-y-3.5 min-w-0 w-full overflow-hidden">
            <CopyRow label="Chave PIX (e-mail)" value={chavePix} />
            <CopyRow label="PIX copia e cola" value={pixCopiaEColaOficial} />
            <p className="text-xs text-muted-foreground">
              Favorecido: <span className="text-foreground">{favorecido}</span>
            </p>
          </div>
        </div>

        {erroTamanho && (
          <div role="alert" className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{erroTamanho}</span>
          </div>
        )}

        {comprovanteEnviadoNome ? (
          <div role="status" className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-3">
            <FileCheck className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Comprovante enviado!</p>
              <p className="text-xs text-muted-foreground truncate">{comprovanteEnviadoNome}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <label
              className={`metal-button h-12 px-6 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                enviandoComprovante ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {enviandoComprovante ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              <span>{enviandoComprovante ? `Enviando ${comprovanteArquivo?.name || "comprovante"}...` : "Enviar comprovante"}</span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                disabled={enviandoComprovante}
                className="sr-only"
                aria-label="Enviar comprovante (PDF ou imagem, até 15MB)"
              />
            </label>
            <a
              href={`https://wa.me/${numeroFormatado}?text=${mensagemWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enviar comprovante via WhatsApp"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Prefiro enviar pelo WhatsApp
            </a>
          </div>
        )}
      </div>
    </section>
  );
}