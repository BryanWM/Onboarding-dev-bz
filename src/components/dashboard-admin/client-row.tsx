import { Copy, Check, ShieldAlert, ShieldCheck, ArrowRight, Trash2 } from "lucide-react";

interface ClientRowProps {
  cliente: any;
  copiedToken: string | null;
  onCopy: (text: string, id: string) => void;
  onProrrogar: (linkId: string, minutos: number) => void;
  onToggleBloqueio: (link: any) => void;
  onDeleteRequest: (target: { linkId: string; nome: string }) => void;
  onSelect: (cliente: any) => void;
}

export function ClientRow({
  cliente,
  copiedToken,
  onCopy,
  onProrrogar,
  onToggleBloqueio,
  onDeleteRequest,
  onSelect,
}: ClientRowProps) {
  const link = cliente.links_temporarios?.[0];
  const isBloqueado = Boolean(link?.bloqueado_manualmente);
  const isExpirado = link ? new Date(link.expira_em) <= new Date() : false;
  const linkUrl = link ? `${window.location.origin}/c/${link.token}` : "";
  const temContrato = Boolean(cliente.contratos?.[0]?.liberado_para_cliente);

  const formatarTempo = (expiraEm: string, bloqueado: boolean) => {
    if (bloqueado) return "Bloqueado";
    const diff = new Date(expiraEm).getTime() - Date.now();
    if (diff <= 0) return "Expirado";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m restantes`;
  };

  return (
    <tr className="hover:bg-secondary/20 transition-colors">
      <td className="py-3 px-3">
        <p className="font-semibold text-foreground">{cliente.nome_completo}</p>
        <p className="text-[11px] text-muted-foreground">{cliente.email || cliente.whatsapp || "Sem contato"}</p>
      </td>
      <td className="py-3 px-3">
        {link ? (
          <div className="space-y-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
              isBloqueado
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : isExpirado
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {isBloqueado ? "BLOQUEADO" : isExpirado ? "EXPIRADO" : "LINK ATIVO"}
            </span>
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <span className="truncate max-w-[120px]">{link.token}</span>
              <span>· {formatarTempo(link.expira_em, isBloqueado)}</span>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">Sem link</span>
        )}
      </td>
      <td className="py-3 px-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
          cliente.pix_pago
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-secondary text-muted-foreground border border-border"
        }`}>
          {cliente.pix_pago ? "PAGO" : "PENDENTE"}
        </span>
      </td>
      <td className="py-3 px-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${
          temContrato
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-secondary text-muted-foreground border border-border"
        }`}>
          {temContrato ? "LIBERADO" : "PENDENTE"}
        </span>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="inline-flex items-center gap-1.5">
          {link && (
            <>
              <button
                type="button"
                onClick={() => onCopy(linkUrl, link.id)}
                className="h-7 px-2 rounded bg-secondary/40 hover:bg-secondary text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Copiar link"
              >
                {copiedToken === link.id ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </button>
              <button
                type="button"
                onClick={() => onProrrogar(link.id, 30)}
                className="h-7 px-2 rounded bg-secondary/40 hover:bg-secondary text-[10px] font-mono text-foreground border border-border cursor-pointer"
                title="+30 minutos"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={() => onToggleBloqueio(link)}
                className={`h-7 px-2 rounded text-[10px] font-mono border transition-colors cursor-pointer flex items-center gap-1 ${
                  isBloqueado
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                }`}
                title={isBloqueado ? "Desbloquear link" : "Bloquear link"}
              >
                {isBloqueado ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
              </button>
              <button
                type="button"
                onClick={() => onDeleteRequest({ linkId: link.id, nome: cliente.nome_completo })}
                className="h-7 px-2 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-mono border border-destructive/20 cursor-pointer"
                title="Excluir link"
              >
                <Trash2 className="size-3" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onSelect(cliente)}
            className="metal-button h-7 px-3 rounded text-[11px] font-semibold text-primary-foreground flex items-center gap-1 cursor-pointer shadow-sm ml-1"
          >
            <span>Gerenciar</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
