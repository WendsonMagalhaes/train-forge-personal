"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MUSCLE_GROUP_LABEL } from "@/lib/constants";
import { Dumbbell, PlayCircle, Repeat } from "lucide-react";

type SubstituteExercise = {
  id: string;
  exerciseName: string;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroup: string;
  muscleGroupDetail?: string | null;
  equipment?: string | null;
};

type ExerciseInfo = {
  exerciseName: string;
  videoUrl: string | null;
  imageUrl: string | null;
  muscleGroup: string;
  muscleGroupDetail?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  instructions?: string | null;
  /** Exercícios que trabalham os mesmos músculos e podem substituir esse (cadastrados pelo personal). */
  substitutes?: SubstituteExercise[];
};

/** Detecta link do YouTube/Vimeo e devolve a URL de embed — senão, null. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Arquivo de mídia direto (gif/imagem ou vídeo) — tenta como imagem/gif primeiro (é o caso mais comum,
 *  inclusive o da API de exercícios importados) e cai pra vídeo se a imagem falhar ao carregar. Assim não
 *  depende de adivinhar pela extensão da URL, que nem sempre é confiável (CDNs, links sem extensão etc.). */
function DirectMedia({ url, alt, onBothFailed }: { url: string; alt: string; onBothFailed: () => void }) {
  const [stage, setStage] = useState<"image" | "video">("image");

  if (stage === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} onError={() => setStage("video")} className="w-full rounded-[var(--radius)] object-contain" />;
  }
  return (
    <video
      src={url}
      controls
      autoPlay
      loop
      muted
      playsInline
      onError={onBothFailed}
      className="w-full rounded-[var(--radius)] bg-black"
    />
  );
}

export function ExerciseHowToTrigger({ item, children }: { item: ExerciseInfo; children: React.ReactNode }) {
  return (
    <Dialog title={item.exerciseName} size="lg" trigger={children}>
      {() => <ExerciseHowToContent item={item} />}
    </Dialog>
  );
}

function ExerciseHowToContent({ item }: { item: ExerciseInfo }) {
  const embedUrl = item.videoUrl ? toEmbedUrl(item.videoUrl) : null;
  const [directFailed, setDirectFailed] = useState(false);
  const showDirect = item.videoUrl && !embedUrl;

  return (
    <div className="flex flex-col gap-4">
      {embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black">
          <iframe
            src={embedUrl}
            title={`Como executar: ${item.exerciseName}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : showDirect && !directFailed ? (
        <DirectMedia url={item.videoUrl!} alt={`Execução: ${item.exerciseName}`} onBothFailed={() => setDirectFailed(true)} />
      ) : item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.exerciseName} className="max-h-80 w-full rounded-[var(--radius)] object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius)] bg-[var(--background)]">
          <Dumbbell className="h-8 w-8 text-[var(--muted)]" />
        </div>
      )}

      {item.videoUrl && !embedUrl && directFailed && (
        <a
          href={item.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
        >
          <PlayCircle className="h-4 w-4" /> Assistir vídeo
        </a>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{MUSCLE_GROUP_LABEL[item.muscleGroup as keyof typeof MUSCLE_GROUP_LABEL] ?? item.muscleGroup}</Badge>
        {item.muscleGroupDetail && <Badge variant="outline">{item.muscleGroupDetail}</Badge>}
        {item.secondaryMuscles?.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}
        {item.equipment && <Badge variant="secondary">{item.equipment}</Badge>}
      </div>

      {item.instructions ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">Como executar</p>
          <p className="whitespace-pre-line text-sm text-[var(--foreground)]">{item.instructions}</p>
        </div>
      ) : (
        !item.videoUrl && !item.imageUrl && (
          <p className="text-sm text-[var(--muted)]">Seu personal ainda não adicionou instruções pra esse exercício.</p>
        )
      )}

      {item.substitutes && item.substitutes.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
            <Repeat className="h-3.5 w-3.5" /> Não pode fazer esse? Substitua por
          </p>
          <div className="flex flex-col gap-1.5">
            {item.substitutes.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--background)] p-2">
                {sub.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.imageUrl} alt={sub.exerciseName} className="h-9 w-9 shrink-0 rounded-[var(--radius)] object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--surface)]">
                    <Dumbbell className="h-4 w-4 text-[var(--muted)]" />
                  </div>
                )}
                <span className="truncate text-sm">{sub.exerciseName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
