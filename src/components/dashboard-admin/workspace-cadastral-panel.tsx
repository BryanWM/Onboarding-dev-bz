import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { CabecalhoPainel } from "./cabecalho-painel";

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

  const temDados = Boolean(dados && (dados.representante_cpf || dados.razao_social || dados.cnpj));
  const nome = dados?.representante_nome || dados?.razao_social;
  const empresa = dados?.razao_social && dados.razao_social !== nome ? dados.razao_social : null;
  const campos = temDados
    ? [
        { rotulo: "Tipo", valor: dados.cnpj ? "Pessoa jurídica" : "Pessoa física" },
        { rotulo: dados.cnpj ? "Responsável" : "Nome completo", valor: nome },
        { rotulo: "CPF", valor: dados.representante_cpf, mono: true },
        { rotulo: "Razão social", valor: empresa },
        { rotulo: "CNPJ", valor: dados.cnpj, mono: true },
        { rotulo: "E-mail financeiro", valor: dados.email_financeiro },
        { rotulo: "Telefone / WhatsApp", valor: dados.telefone_financeiro, mono: true },
        { rotulo: "Endereço registrado", valor: dados.logradouro },
        { rotulo: "CEP", valor: dados.cep, mono: true },
      ]
    : [];

  return (
    <section className="metal-panel p-5 sm:p-7 space-y-6">
      <CabecalhoPainel
        etapa={4}
        titulo="Dados cadastrais"
        descricao="Enviados pelo cliente na Central (envio único)."
        status={temDados ? { tom: "verde", texto: "Cadastrado pelo cliente" } : { tom: "neutro", texto: "Aguardando cliente" }}
      />

      {temDados ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {campos.map((campo) => (
            <div key={campo.rotulo} className="min-w-0">
              <dt className="rotulo">{campo.rotulo}</dt>
              <dd
                className={`mt-1 text-sm sm:text-[15px] break-words ${campo.valor ? "text-foreground" : "text-muted-foreground"} ${
                  campo.mono ? "font-mono" : ""
                }`}
              >
                {campo.valor || "Não informado"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" />
          O cliente ainda não preencheu os dados cadastrais.
        </p>
      )}
    </section>
  );
}