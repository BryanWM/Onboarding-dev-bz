import { Check, CheckCircle2, Copy, ExternalLink, FileText, QrCode, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import qrcodePixUrl from "@/assets/qrcode-pix.png";

export const ONBOARDING_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdyJjJicNhDIqPgkUSgEHwovvbywPsazFhWcPV3mJCVkobErg/viewform";

export function OnboardingFormCard() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard?.writeText(ONBOARDING_FORM_URL);
      ok = true;
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = ONBOARDING_FORM_URL;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <section className="metal-panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 size-52 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10">
            <FileText className="size-5 text-primary" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="metal-text text-lg font-bold">Onboarding do cliente</h2>
              <span className="rounded-full border border-primary/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                Formulário
              </span>
            </div>
            <p className="mt-1.5 max-w-xl text-sm leading-5 text-muted-foreground">
              Envie este link para o cliente preencher. As informações necessárias chegam prontas para o nosso time.
            </p>
            <p className="mt-2.5 truncate font-mono text-[10px] text-muted-foreground">{ONBOARDING_FORM_URL}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={ONBOARDING_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="metal-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-primary-foreground shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ExternalLink className="size-4" />
            Abrir formulário
          </a>
          <Button size="icon" variant="outline" aria-label="Copiar link do formulário" onClick={copy}>
            {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PixPanel() {
  const copy = (text: string) => navigator.clipboard?.writeText(text);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PixQrImporter />
      <div className="metal-panel p-5">
        <div className="mb-4 flex items-center gap-3">
          <QrCode className="text-primary" />
          <h2 className="font-semibold">Dados PIX</h2>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Chave PIX</p>
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-input/20 p-3 text-sm">
          <span className="truncate">financeiro@wrmaxmarketing.com.br</span>
          <Button size="icon" variant="ghost" onClick={() => copy("financeiro@wrmaxmarketing.com.br")} aria-label="Copiar chave">
            <Copy />
          </Button>
        </div>
        <p className="mt-4 text-[9px] uppercase tracking-widest text-muted-foreground">Favorecido</p>
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-input/20 p-3 text-sm">
          <span>KFGMoreira</span>
          <Button size="icon" variant="ghost" onClick={() => copy("KFGMoreira")} aria-label="Copiar favorecido">
            <Copy />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PixQrImporter() {
  const [custom, setCustom] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const preview = url ?? qrcodePixUrl;

  const pick = (file: File | null) => {
    if (url) URL.revokeObjectURL(url);
    setCustom(file);
    setUrl(file ? URL.createObjectURL(file) : null);
  };

  return (
    <section className="metal-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <QrCode className="size-5 text-primary" />
          <h2 className="font-semibold">QR Code PIX</h2>
        </div>
        <span className="rounded-full border border-primary/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-primary">
          Fixado
        </span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      <div className="m-4 flex flex-col items-center gap-3 rounded-md border border-dashed border-primary/35 p-6 text-center">
        <img src={preview} alt="QR Code PIX da WRMax" className="size-56 rounded-md border border-border bg-white p-2" />
        <p className="text-sm font-semibold">{custom ? custom.name : "QR Code PIX oficial"}</p>
        <p className="text-xs text-muted-foreground">{custom ? "Personalizado - pronto para usar" : "Já aparece por padrão - troque somente se quiser"}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Upload />
            Trocar imagem
          </Button>
          {custom && (
            <Button variant="ghost" size="sm" onClick={() => pick(null)}>
              <X />
              Restaurar fixado
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export function FileImporter({ title, hint, accept }: { title: string; hint: string; accept: string }) {
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);

  return (
    <section className="metal-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-primary" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        {file && (
          <Button size="icon" variant="ghost" aria-label="Remover arquivo" onClick={() => setFile(null)}>
            <X />
          </Button>
        )}
      </div>
      <button
        className="upload-zone m-4 flex min-h-32 w-[calc(100%-2rem)] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-primary/35 p-6 text-center transition hover:border-primary hover:bg-primary/5"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0] ?? null);
        }}
      >
        <input ref={input} type="file" accept={accept} hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <>
            <CheckCircle2 className="size-8 text-primary" />
            <span className="font-semibold">{file.name}</span>
            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB - pronto para usar</span>
          </>
        ) : (
          <>
            <Upload className="size-8 text-primary" />
            <span className="font-semibold">Importar do computador</span>
            <span className="text-xs text-muted-foreground">Clique ou arraste o arquivo aqui - {hint}</span>
          </>
        )}
      </button>
    </section>
  );
}
