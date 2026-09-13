/**
 * Avatar circular compartilhado — usado pra foto de perfil do personal e do
 * aluno em todos os lugares que a exibem (sidebar, header do portal, tela de
 * perfil). Diferente da `Logo`, aqui o contêiner tem tamanho fixo e
 * `overflow-hidden`, então `zoomPct` realmente recorta a imagem (não só
 * "vaza" visualmente) — dá pra reenquadrar a foto sem reeditar o arquivo.
 */
export function Avatar({
  imageUrl,
  name,
  className = "h-10 w-10",
  zoomPct = 100,
  positionX = 50,
  positionY = 50,
}: {
  imageUrl?: string | null;
  name: string;
  className?: string;
  zoomPct?: number;
  positionX?: number;
  positionY?: number;
}) {
  if (imageUrl) {
    return (
      <span className={`${className} block shrink-0 overflow-hidden rounded-full`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          style={{
            transform: zoomPct !== 100 ? `scale(${zoomPct / 100})` : undefined,
            objectPosition: `${positionX}% ${positionY}%`,
          }}
        />
      </span>
    );
  }

  const initial = name?.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <span
      className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 font-semibold text-[var(--primary)]`}
    >
      {initial}
    </span>
  );
}
