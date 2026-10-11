import { useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Loader2, AlertCircle, User } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { submeterCadastroCliente } from "@/lib/supabase";
import { cnpjValido, cpfValido, mascararCnpj, mascararCpf } from "@/lib/documentos";

interface SlotDadosCadastraisProps {
  token: string;
  cadastroPreenchidoInicial?: boolean;
  dadosIniciais?: Record<string, any> | null;
  onCadastroSucesso?: () => void;
}

type TipoPessoa = "pf" | "pj";

const CLASSE_CAMPO =
  "w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors";
const CLASSE_ROTULO =
  "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5";

// CPF e obrigatorio para pessoa fisica e juridica. Pessoa juridica soma o nome
// da empresa e o CNPJ (os dois obrigatorios nessa opcao).
export function SlotDadosCadastrais({
  token,
  cadastroPreenchidoInicial = false,
  dadosIniciais = null,
  onCadastroSucesso,
}: SlotDadosCadastraisProps) {
  const [isPreenchido, setIsPreenchido] = useState(cadastroPreenchidoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoPessoa>(dadosIniciais?.cnpj ? "pj" : "pf");

  const [form, setForm] = useState({
    nome: dadosIniciais?.representante_nome || "",
    cpf: dadosIniciais?.representante_cpf || "",
    razao_social:
      dadosIniciais?.razao_social && dadosIniciais.razao_social !== dadosIniciais?.representante_nome
        ? dadosIniciais.razao_social
        : "",
    cnpj: dadosIniciais?.cnpj || "",
    email_financeiro: dadosIniciais?.email_financeiro || "",
    telefone_financeiro: dadosIniciais?.telefone_financeiro || "",
    logradouro: dadosIniciais?.logradouro || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const valor = name === "cpf" ? mascararCpf(value) : name === "cnpj" ? mascararCnpj(value) : value;
    setForm((prev) => ({ ...prev, [name]: valor }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.cpf || !form.email_financeiro.trim()) {
      setErro("Preencha o nome completo, o CPF e o e-mail.");
      return;
    }
    if (!cpfValido(form.cpf)) {
      setErro("CPF inválido. Confira os números e tente de novo.");
      return;
    }
    if (tipo === "pj") {
      if (!form.razao_social.trim() || !form.cnpj) {
        setErro("Para pessoa jurídica, preencha o nome da empresa e o CNPJ.");
        return;
      }
      if (!cnpjValido(form.cnpj)) {
        setErro("CNPJ inválido. Confira os números e tente de novo.");
        return;
      }
    }

    setLoading(true);
    setErro(null);

    const pj = tipo === "pj";
    const payload = {
      representante_nome: form.nome.trim(),
      representante_cpf: form.cpf,
      // Pessoa fisica: o contratante e a propria pessoa
      razao_social: pj ? form.razao_social.trim() : form.nome.trim(),
      cnpj: pj ? form.cnpj : null,
      email_financeiro: form.email_financeiro.trim(),
      telefone_financeiro: form.telefone_financeiro.trim() || null,
      logradouro: form.logradouro.trim() || null,
    };

    try {
      await submeterCadastroCliente(token, payload);
      setIsPreenchido(true);
      onCadastroSucesso?.();
    } catch (err: any) {
      setErro(err?.message || "Ocorreu um erro ao salvar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Resumo depois do envio (usa o que veio do banco quando a tela recarrega)
  const nomeExibido = form.nome || dadosIniciais?.representante_nome || dadosIniciais?.razao_social;
  const cnpjExibido = form.cnpj || dadosIniciais?.cnpj;
  const empresaExibida =
    form.razao_social || (dadosIniciais?.razao_social !== nomeExibido ? dadosIniciais?.razao_social : "");
  const ehPj = Boolean(cnpjExibido) || (isPreenchido && tipo === "pj");
  const resumo = [
    { rotulo: "Tipo", valor: ehPj ? "Pessoa jurídica" : "Pessoa física" },
    ...(ehPj
      ? [
          { rotulo: "Empresa", valor: empresaExibida },
          { rotulo: "CNPJ", valor: cnpjExibido },
        ]
      : []),
    { rotulo: ehPj ? "Responsável" : "Nome completo", valor: nomeExibido },
    { rotulo: "CPF", valor: form.cpf || dadosIniciais?.representante_cpf },
    { rotulo: "E-mail", valor: form.email_financeiro || dadosIniciais?.email_financeiro },
    { rotulo: "Telefone / WhatsApp", valor: form.telefone_financeiro || dadosIniciais?.telefone_financeiro },
  ];

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="04"
        icon={<Building2 className="size-5" />}
        title="Dados Cadastrais"
        subtitle="Seus dados para a emissão do contrato. Envio único."
      />

      <div className="mt-6">
        {isPreenchido ? (
          <div className="space-y-4">
            <p role="status" className="flex items-center gap-2.5 text-sm text-emerald-300">
              <CheckCircle2 className="size-5 shrink-0" />
              <span className="font-semibold">Dados cadastrais enviados com sucesso!</span>
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {resumo.map((item) => (
                <div key={item.rotulo} className="min-w-0">
                  <dt className="rotulo">{item.rotulo}</dt>
                  <dd className="mt-0.5 text-foreground break-words">{item.valor || "Informado"}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {erro && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Pessoa fisica ou juridica */}
            <div
              role="radiogroup"
              aria-label="Tipo de contratante"
              className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-[var(--campo)] border border-[var(--linha)] sm:max-w-sm"
            >
              {(
                [
                  { id: "pf", rotulo: "Pessoa física", icone: <User className="size-4" /> },
                  { id: "pj", rotulo: "Pessoa jurídica", icone: <Building2 className="size-4" /> },
                ] as const
              ).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  role="radio"
                  aria-checked={tipo === op.id}
                  onClick={() => {
                    setTipo(op.id);
                    setErro(null);
                  }}
                  className={`h-10 rounded-[7px] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    tipo === op.id ? "chip-ouro" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {op.icone}
                  {op.rotulo}
                </button>
              ))}
            </div>

            {tipo === "pj" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cad-razao" className={CLASSE_ROTULO}>
                    Nome da empresa *
                  </label>
                  <input
                    id="cad-razao"
                    type="text"
                    name="razao_social"
                    value={form.razao_social}
                    onChange={handleChange}
                    autoComplete="organization"
                    placeholder="Razão social da empresa"
                    className={CLASSE_CAMPO}
                  />
                </div>
                <div>
                  <label htmlFor="cad-cnpj" className={CLASSE_ROTULO}>
                    CNPJ *
                  </label>
                  <input
                    id="cad-cnpj"
                    type="text"
                    inputMode="numeric"
                    name="cnpj"
                    value={form.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0000-00"
                    className={`${CLASSE_CAMPO} font-mono`}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cad-nome" className={CLASSE_ROTULO}>
                  {tipo === "pj" ? "Nome do responsável *" : "Nome completo *"}
                </label>
                <input
                  id="cad-nome"
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Nome completo"
                  className={CLASSE_CAMPO}
                />
              </div>
              <div>
                <label htmlFor="cad-cpf" className={CLASSE_ROTULO}>
                  CPF *
                </label>
                <input
                  id="cad-cpf"
                  type="text"
                  inputMode="numeric"
                  name="cpf"
                  value={form.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  className={`${CLASSE_CAMPO} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="cad-email" className={CLASSE_ROTULO}>
                  E-mail *
                </label>
                <input
                  id="cad-email"
                  type="email"
                  name="email_financeiro"
                  value={form.email_financeiro}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="financeiro@suaempresa.com.br"
                  className={CLASSE_CAMPO}
                />
              </div>
              <div>
                <label htmlFor="cad-telefone" className={CLASSE_ROTULO}>
                  Telefone / WhatsApp
                </label>
                <input
                  id="cad-telefone"
                  type="tel"
                  name="telefone_financeiro"
                  value={form.telefone_financeiro}
                  onChange={handleChange}
                  autoComplete="tel"
                  placeholder="(86) 99999-9999"
                  className={`${CLASSE_CAMPO} font-mono`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cad-endereco" className={CLASSE_ROTULO}>
                Endereço (rua, número, bairro, cidade/UF)
              </label>
              <input
                id="cad-endereco"
                type="text"
                name="logradouro"
                value={form.logradouro}
                onChange={handleChange}
                autoComplete="street-address"
                placeholder="Ex: Av. Frei Serafim, 1200 - Centro, Teresina/PI"
                className={CLASSE_CAMPO}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="metal-button w-full sm:w-auto h-12 px-6 rounded-lg text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>{loading ? "Salvando informações..." : "Confirmar Dados Cadastrais"}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
