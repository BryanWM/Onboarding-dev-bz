import { useState, useEffect } from "react";
import { Building, CheckCircle2, Clock, Mail, Phone, MapPin, User, FileText } from "lucide-react";

interface WorkspaceCadastralPanelProps {
  dadosCadastrais?: any;
  clienteId?: string;
  linkToken?: string;
}

export function WorkspaceCadastralPanel({
  dadosCadastrais: dadosIniciais,
  clienteId,
  linkToken,
}: WorkspaceCadastralPanelProps) {
  const [dados, setDados] = useState<any>(() => {
    if (dadosIniciais) return dadosIniciais;
    if (typeof window !== "undefined") {
      try {
        if (linkToken) {
          const item = localStorage.getItem(`wrmax_cadastro_${linkToken}`);
          if (item) return JSON.parse(item);
        }
        if (clienteId) {
          const item = localStorage.getItem(`wrmax_cadastro_${clienteId}`);
          if (item) return JSON.parse(item);
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (dadosIniciais) {
      setDados(dadosIniciais);
      return;
    }

    const checarStorage = () => {
      if (typeof window === "undefined") return;
      try {
        if (linkToken) {
          const item = localStorage.getItem(`wrmax_cadastro_${linkToken}`);
          if (item) {
            setDados(JSON.parse(item));
            return;
          }
        }
        if (clienteId) {
          const item = localStorage.getItem(`wrmax_cadastro_${clienteId}`);
          if (item) {
            setDados(JSON.parse(item));
            return;
          }
        }
        setDados(null);
      } catch {}
    };

    checarStorage();

    const onCadastro = (e: any) => {
      const detail = e?.detail;
      if (
        (linkToken && detail?.token === linkToken) ||
        (clienteId && detail?.clienteId === clienteId)
      ) {
        if (detail?.dados) {
          setDados(detail.dados);
        } else {
          checarStorage();
        }
      }
    };

    window.addEventListener("wrmax:cadastro_submetido", onCadastro);
    window.addEventListener("storage", checarStorage);
    return () => {
      window.removeEventListener("wrmax:cadastro_submetido", onCadastro);
      window.removeEventListener("storage", checarStorage);
    };
  }, [dadosIniciais, clienteId, linkToken]);

  const temDados = Boolean(dados && (dados.razao_social || dados.cnpj));

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <Building className="size-5 text-primary" />
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Dados Cadastrais do Cliente (Etapa 4)
          </h2>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start sm:self-auto flex items-center gap-1.5 ${
            temDados
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          {temDados ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
          {temDados ? "CADASTRADO PELO CLIENTE" : "AGUARDANDO CLIENTE"}
        </span>
      </div>

      {temDados ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <FileText className="size-3.5 text-primary" />
              Razão Social / Nome Completo
            </span>
            <p className="font-bold text-sm sm:text-base text-foreground break-words">
              {dados.razao_social || "Não informado"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <Building className="size-3.5 text-primary" />
              CNPJ / CPF
            </span>
            <p className="font-bold text-sm sm:text-base text-foreground font-mono">
              {dados.cnpj || "Não informado"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              Nome Fantasia / Representante
            </span>
            <p className="font-bold text-sm sm:text-base text-foreground break-words">
              {dados.nome_fantasia || dados.representante_nome || dados.razao_social || "Não informado"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <Mail className="size-3.5 text-primary" />
              E-mail Financeiro
            </span>
            <p className="font-semibold text-sm text-foreground break-all">
              {dados.email_financeiro || "Não informado"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <Phone className="size-3.5 text-primary" />
              Telefone / WhatsApp
            </span>
            <p className="font-semibold text-sm text-foreground font-mono">
              {dados.telefone_financeiro || "Não informado"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-1">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" />
              Endereço Registrado
            </span>
            <p className="font-semibold text-sm text-foreground break-words">
              {dados.logradouro || "Não informado"}
            </p>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center space-y-3 rounded-xl border border-dashed border-border/80 bg-secondary/10 p-6">
          <Clock className="size-8 text-muted-foreground/60 mx-auto" />
          <h4 className="text-sm sm:text-base font-semibold text-foreground">
            O cliente ainda não preencheu o formulário cadastral
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Assim que o cliente submeter os dados pelo link temporário (Slot 04 da Central), as informações fiscais e corporativas serão sincronizadas e exibidas automaticamente nesta tela.
          </p>
        </div>
      )}
    </section>
  );
}
