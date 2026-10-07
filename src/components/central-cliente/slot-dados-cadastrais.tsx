import { useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Loader2, AlertCircle, User, Briefcase, Lock } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { submeterCadastroCliente } from "@/lib/supabase";

interface SlotDadosCadastraisProps {
  token: string;
  cadastroPreenchidoInicial?: boolean;
  dadosIniciais?: Record<string, any> | null;
  onCadastroSucesso?: () => void;
}

export function SlotDadosCadastrais({
  token,
  cadastroPreenchidoInicial = false,
  dadosIniciais = null,
  onCadastroSucesso,
}: SlotDadosCadastraisProps) {
  const [tipoPessoa, setTipoPessoa] = useState<"pj" | "pf">("pj");
  const [isPreenchido, setIsPreenchido] = useState(cadastroPreenchidoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome_ou_razao: dadosIniciais?.razao_social || "",
    cpf_ou_cnpj: dadosIniciais?.cnpj || "",
    nome_fantasia: dadosIniciais?.nome_fantasia || "",
    logradouro: dadosIniciais?.logradouro || "",
    email_financeiro: dadosIniciais?.email_financeiro || "",
    telefone_financeiro: dadosIniciais?.telefone_financeiro || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome_ou_razao || !form.cpf_ou_cnpj || !form.email_financeiro) {
      setErro("Preencha o Nome/Razão Social, CPF/CNPJ e E-mail.");
      return;
    }

    setLoading(true);
    setErro(null);

    const payload = {
      razao_social: form.nome_ou_razao,
      cnpj: form.cpf_ou_cnpj,
      nome_fantasia: form.nome_fantasia || null,
      representante_nome: form.nome_ou_razao,
      representante_cpf: form.cpf_ou_cnpj,
      email_financeiro: form.email_financeiro,
      telefone_financeiro: form.telefone_financeiro || null,
      logradouro: form.logradouro || null,
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

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="04"
        icon={<Building2 className="size-5" />}
        title="Dados Cadastrais da Empresa"
        subtitle="Informe seus dados cadastrais (Pessoa Física ou Jurídica) para emissão do contrato pelo gestor."
      />

      <div className="mt-6">
        {isPreenchido ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Dados cadastrais enviados com sucesso!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Seus dados foram registrados com segurança e já estão à disposição do gestor da conta.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold self-start sm:self-auto">
                <Lock className="size-3" />
                ENVIO ÚNICO CONCLUÍDO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-xs font-mono uppercase text-muted-foreground block mb-0.5">
                  Nome / Razão Social
                </span>
                <p className="font-semibold text-foreground break-words">
                  {form.nome_ou_razao || dadosIniciais?.razao_social || "Informado"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-xs font-mono uppercase text-muted-foreground block mb-0.5">
                  CPF / CNPJ
                </span>
                <p className="font-semibold text-foreground font-mono">
                  {form.cpf_ou_cnpj || dadosIniciais?.cnpj || "Informado"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-xs font-mono uppercase text-muted-foreground block mb-0.5">
                  E-mail de Contato
                </span>
                <p className="font-semibold text-foreground break-words">
                  {form.email_financeiro || dadosIniciais?.email_financeiro || "Informado"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-xs font-mono uppercase text-muted-foreground block mb-0.5">
                  Telefone / WhatsApp
                </span>
                <p className="font-semibold text-foreground font-mono">
                  {form.telefone_financeiro || dadosIniciais?.telefone_financeiro || "Informado"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {erro && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Alternador PF ou PJ */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium">Tipo de Contratante:</span>
              <div className="inline-flex rounded-lg border border-border bg-secondary/30 p-1">
                <button
                  type="button"
                  onClick={() => setTipoPessoa("pj")}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                    tipoPessoa === "pj"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Briefcase className="size-3.5" />
                  Empresa (PJ)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPessoa("pf")}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                    tipoPessoa === "pf"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="size-3.5" />
                  Pessoa Física (PF)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  {tipoPessoa === "pj" ? "Razão Social *" : "Nome Completo *"}
                </label>
                <input
                  type="text"
                  name="nome_ou_razao"
                  value={form.nome_ou_razao}
                  onChange={handleChange}
                  required
                  placeholder={tipoPessoa === "pj" ? "Nome empresarial Ltda" : "Nome Completo"}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  {tipoPessoa === "pj" ? "CNPJ *" : "CPF *"}
                </label>
                <input
                  type="text"
                  name="cpf_ou_cnpj"
                  value={form.cpf_ou_cnpj}
                  onChange={handleChange}
                  required
                  placeholder={tipoPessoa === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  E-mail para Faturamento e Contrato *
                </label>
                <input
                  type="email"
                  name="email_financeiro"
                  value={form.email_financeiro}
                  onChange={handleChange}
                  required
                  placeholder="financeiro@suaempresa.com.br"
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                  Telefone / WhatsApp Financeiro
                </label>
                <input
                  type="text"
                  name="telefone_financeiro"
                  value={form.telefone_financeiro}
                  onChange={handleChange}
                  placeholder="(86) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                Endereço Completo (Rua, Número, Bairro, Cidade/UF)
              </label>
              <input
                type="text"
                name="logradouro"
                value={form.logradouro}
                onChange={handleChange}
                placeholder="Ex: Av. Frei Serafim, 1200 - Centro, Teresina/PI"
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="metal-button w-full h-12 rounded-lg text-sm font-bold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              <span>{loading ? "Salvando informações..." : "Confirmar Dados Cadastrais (Envio Único)"}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
