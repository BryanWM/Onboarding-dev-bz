// Logo oficial (PNG branco, fundo transparente) em public/brand/wrmax-logo.png
export function LogoWrmax({ className = "h-7" }: { className?: string }) {
  return <img src="/brand/wrmax-logo.png" alt="WRMax Marketing" className={`${className} w-auto select-none`} draggable={false} />;
}
