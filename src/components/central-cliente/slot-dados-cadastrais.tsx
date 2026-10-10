import { useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Loader2, AlertCircle, Lock } from "lucide-react";
import { SlotHeader } from "./slot-header";
import { submeterCadastroCliente } from "@/lib/supabase";
import { cnpjValido, cpfValido, mascararCnpj, mascararCpf } from "@/lib/documentos";

interface SlotDadosCadastraisProps {
  token: string;
  cadastroPreenchidoInicial?: boolean;
  dadosIniciais?: Record<string, any> | null;
  onCadastroSucesso?: () => void;
}

const CLASSE_CAMPO =
  "w-full h-11 px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/80 transition-colors";
const CLASSE_ROTULO = "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5";

// Formulario unico (sem separar PF/PJ): CPF obrigatorio, empresa e CNPJ opcionais.
export function SlotDadosCadastrais({
  token,
  cadastroPreenchidoInicial = false,
  dadosIniciais = null,
  onCadastroSucesso,
}: SlotDadosCadastraisProps) {
  const [isPreenchido, setIsPreenchido] = useState(cadastroPreenchidoInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
    if (form.cnpj && !cnpjValido(form.cnpj)) {
      setErro("CNPJ inválido. Confira os números ou deixe o campo em branco.");
      return;
    }

    setLoading(true);
    setErro(null);

    const payload = {
      representante_nome: form.nome.trim(),
      representante_cpf: form.cpf,
      // Sem empresa, o contratante e a propria pessoa
      razao_social: form.razao_social.trim() || form.nome.trim(),
      cnpj: form.cnpj || null,
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

  const nomeExibido = form.nome || dadosIniciais?.representante_nome || dadosIniciais?.razao_social;
  const empresaExibida = form.razao_social || (dadosIniciais?.razao_social !== nomeExibido ? dadosIniciais?.razao_social : "");
  const resumo = [
    { rotulo: "Nome completo", valor: nomeExibido },
    { rotulo: "CPF", valor: form.cpf || dadosIniciais?.representante_cpf, mono: true },
    { rotulo: "Empresa / CNPJ", valor: [empresaExibida, form.cnpj || dadosIniciais?.cnpj].filter(Boolean).join(" · ") || "Não informado" },
    { rotulo: "E-mail", valor: form.email_financeiro || dadosIniciais?.email_financeiro },
    { rotulo: "Telefone / WhatsApp", valor: form.telefone_financeiro || dadosIniciais?.telefone_financeiro, mono: true },
  ];

  return (
    <section className="metal-panel p-5 sm:p-7">
      <SlotHeader
        index="04"
        icon={<Building2 className="size-5" />}
        title="Dados Cadastrais"
        subtitle="Informe seus dados para a emissão do contrato. Se contratar por uma empresa, inclua também a razão social e o CNPJ."
      />

      <div className="mt-6">
        {isPreenchido ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-foreground">Dados cadastrais enviados com sucesso!</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Seus dados foram registrados com segurança e já estão à disposição do gestor da conta.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs font-mono self-start sm:self-auto">
                <Lock className="size-3" />
                ENVIO ÚNICO CONCLUÍDO
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {resumo.map((item) => (
                <div key={item.rotulo} className="p-3 rounded-lg bg-background/50 border border-border/60">
                  <span className="text-xs font-mono uppercase text-muted-foreground block mb-0.5">{item.rotulo}</span>
                  <p className={`font-semibold text-foreground break-words ${item.mono ? "tabular-nums" : ""}`}>
                    {item.valor || "Informado"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {erro && (
              <div role="alert" className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cad-nome" className={CLASSE_ROTULO}>Nome completo *</label>
                <input id="cad-nome" type="text" name="nome" value={form.nome} onChange={handleChange} required autoComplete="name" placeholder="Seu nome completo" className={CLASSE_CAMPO} />
              </div>

              <div>
                <label htmlFor="cad-cpf" className={CLASSE_ROTULO}>CPF *</label>
                <input id="cad-cpf" type="text" inputMode="numeric" name="cpf" value={form.cpf} onChange={handleChange} required placeholder="000.000.000-00" className={`${CLASSE_CAMPO} font-mono`} />
              </div>

              <div>
                <label htmlFor="cad-razao" className={CLASSE_ROTULO}>Razão social (opcional)</label>
                <input id="cad-razao" type="text" name="razao_social" value={form.razao_social} onChange={handleChange} autoComplete="organization" placeholder="Nome empresarial Ltda" className={CLASSE_CAMPO} />
              </div>

              <div>
                <label htmlFor="cad-cnpj" className={CLASSE_ROTULO}>CNPJ (opcional)</label>
                <input id="cad-cnpj" type="text" inputMode="numeric" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className={`${CLASSE_CAMPO} font-mono`} />
              </div>

              <div>
                <label htmlFor="cad-email" className={CLASSE_ROTULO}>E-mail para faturamento e contrato *</label>
                <input id="cad-email" type="email" name="email_financeiro" value={form.email_financeiro} onChange={handleChange} required autoComplete="email" placeholder="financeiro@suaempresa.com.br" className={CLASSE_CAMPO} />
              </div>

              <div>
                <label htmlFor="cad-telefone" className={CLASSE_ROTULO}>Telefone / WhatsApp</label>
                <input id="cad-telefone" type="tel" name="telefone_financeiro" value={form.telefone_financeiro} onChange={handleChange} autoComplete="tel" placeholder="(86) 99999-9999" className={`${CLASSE_CAMPO} font-mono`} />
              </div>
            </div>

            <div>
              <label htmlFor="cad-endereco" className={CLASSE_ROTULO}>Endereço completo (rua, número, bairro, cidade/UF)</label>
              <input id="cad-endereco" type="text" name="logradouro" value={form.logradouro} onChange={handleChange} autoComplete="street-address" placeholder="Ex: Av. Frei Serafim, 1200 - Centro, Teresina/PI" className={CLASSE_CAMPO} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="metal-button w-full h-12 rounded-lg text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
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
