// Fundo da identidade da landing: quase preto quente, brilho dourado bem
// difuso e uma rede de pontos e linhas finas. Fica fixo atras do conteudo.
const PONTOS: Array<[number, number, number]> = [
  [980, 70, 1.6], [1110, 150, 2], [1240, 96, 1.4], [1180, 290, 1.6], [1360, 210, 1.2],
  [160, 420, 1.4], [260, 510, 1.8], [820, 460, 1.2], [930, 380, 1.6], [620, 80, 1.2],
  [420, 230, 1], [90, 140, 1.2], [1300, 520, 1.4], [700, 610, 1],
];
const LINHAS: Array<[number, number, number, number]> = [
  [980, 70, 1110, 150], [1110, 150, 1240, 96], [1110, 150, 1180, 290],
  [160, 420, 260, 510], [820, 460, 930, 380], [1180, 290, 1360, 210],
];

export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div
        className="absolute -top-72 -right-44 size-[820px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--glow), transparent 62%)" }}
      />
      <div
        className="absolute top-[55%] -left-64 size-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, var(--glow-2), transparent 65%)" }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMin slice">
        <g stroke="var(--ponto-linha)" strokeWidth="1">
          {LINHAS.map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}-${x2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <g fill="var(--ponto)">
          {PONTOS.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      </svg>
    </div>
  );
}
