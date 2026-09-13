"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateMyAvatar, removeMyAvatar } from "@/lib/actions/profile";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/layout/avatar";
import { X } from "lucide-react";

export function AvatarForm({
  currentAvatarUrl,
  name,
  currentZoomPct = 100,
  currentPositionX = 50,
  currentPositionY = 50,
}: {
  currentAvatarUrl: string | null;
  name: string;
  currentZoomPct?: number;
  currentPositionX?: number;
  currentPositionY?: number;
}) {
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? "");
  const [zoomPct, setZoomPct] = useState(currentZoomPct);
  const [positionX, setPositionX] = useState(currentPositionX);
  const [positionY, setPositionY] = useState(currentPositionY);

  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await updateMyAvatar(formData)) ?? {},
    undefined
  );
  const [removing, startRemoveTransition] = useTransition();

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Foto atualizada." });
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleRemove() {
    startRemoveTransition(async () => {
      const res = await removeMyAvatar();
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        setAvatarUrl("");
        setZoomPct(100);
        setPositionX(50);
        setPositionY(50);
        toast({ variant: "success", description: "Foto removida." });
      }
    });
  }

  return (
    <div className="flex items-start gap-5">
      <Avatar imageUrl={avatarUrl} name={name} zoomPct={zoomPct} positionX={positionX} positionY={positionY} className="h-20 w-20" />

      <form action={formAction} className="flex min-w-0 flex-1 flex-col gap-3">
        <FileUpload name="avatarUrl" label="Foto" kind="avatar" accept="image/png,image/jpeg,image/webp" preview="none" onChange={setAvatarUrl} />

        {avatarUrl && (
          <div className="flex flex-col gap-3 rounded-[var(--radius)] bg-[var(--background)] p-3">
            <div>
              <Label htmlFor="avatarZoomPct" className="flex items-center justify-between text-xs">
                <span>Zoom</span>
                <span className="text-[var(--muted)]">{zoomPct}%</span>
              </Label>
              <input
                id="avatarZoomPct"
                type="range"
                min={100}
                max={250}
                step={5}
                value={zoomPct}
                onChange={(e) => setZoomPct(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--primary)]"
              />
            </div>
            <div>
              <Label htmlFor="avatarPositionX" className="flex items-center justify-between text-xs">
                <span>Posição horizontal</span>
                <span className="text-[var(--muted)]">{positionX}%</span>
              </Label>
              <input
                id="avatarPositionX"
                type="range"
                min={0}
                max={100}
                value={positionX}
                onChange={(e) => setPositionX(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--primary)]"
              />
            </div>
            <div>
              <Label htmlFor="avatarPositionY" className="flex items-center justify-between text-xs">
                <span>Posição vertical</span>
                <span className="text-[var(--muted)]">{positionY}%</span>
              </Label>
              <input
                id="avatarPositionY"
                type="range"
                min={0}
                max={100}
                value={positionY}
                onChange={(e) => setPositionY(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--primary)]"
              />
            </div>
          </div>
        )}

        <input type="hidden" name="avatarZoomPct" value={zoomPct} />
        <input type="hidden" name="avatarPositionX" value={positionX} />
        <input type="hidden" name="avatarPositionY" value={positionY} />

        <div className="flex items-center gap-4">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando…" : "Salvar foto"}
          </Button>
          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" /> Remover
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
