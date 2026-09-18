"use client";

import * as React from "react";
import Link from "next/link";
import { UserCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/layout/avatar";

export function UserMenu({
  name,
  imageUrl,
  avatarZoomPct,
  avatarPositionX,
  avatarPositionY,
  profileHref,
  onSignOut,
  align = "right",
}: {
  name: string;
  imageUrl?: string | null;
  avatarZoomPct?: number | null;
  avatarPositionX?: number | null;
  avatarPositionY?: number | null;
  profileHref: string;
  onSignOut: () => Promise<void>;
  /** De que lado o painel se estende a partir do botão. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tf-tap flex items-center gap-1.5"
      >
        <Avatar
          imageUrl={imageUrl}
          name={name}
          zoomPct={avatarZoomPct ?? undefined}
          positionX={avatarPositionX ?? undefined}
          positionY={avatarPositionY ?? undefined}
          className="h-6 w-6"
        />
        <span className="text-xs text-[var(--muted)]">{name?.split(" ")[0]}</span>
      </button>

      {open && (
        <div
          className={cn(
            "tf-panel absolute top-full z-30 mt-1.5 w-48 overflow-hidden p-1 shadow-lg",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          >
            <UserCircle className="h-4 w-4" /> Perfil
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onSignOut();
              } finally {
                setPending(false);
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-[var(--background)] disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" /> {pending ? "Saindo..." : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
