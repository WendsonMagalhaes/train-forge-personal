"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

/**
 * Captura de foto de evolução com linhas de enquadramento.
 * A foto é recortada no formato 3:4 exibido na tela, então o que aparece
 * dentro das linhas é exatamente o que vai pra comparação.
 */
export function CameraCapture({
  onCapture,
  onClose,
  onUnavailable,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable();
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1706 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        if (!cancelled) onUnavailable();
      }
    }

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    setBusy(true);

    // recorte 3:4 centralizado, igual ao object-cover da tela
    const w = video.videoWidth;
    const h = video.videoHeight;
    const targetRatio = 3 / 4;
    let sx = 0, sy = 0, cropW = w, cropH = h;
    if (w / h > targetRatio) {
      cropW = Math.round(h * targetRatio);
      sx = Math.round((w - cropW) / 2);
    } else {
      cropH = Math.round(w / targetRatio);
      sy = Math.round((h - cropH) / 2);
    }

    const outW = Math.min(cropW, 1200);
    const outH = Math.round((outW * 4) / 3);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext("2d")?.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
      <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[var(--radius)] bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

        {/* linhas de enquadramento (viewBox 3:4) */}
        <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <rect x="12" y="12" width="276" height="376" fill="none" stroke="#fdc903" strokeOpacity="0.6" strokeDasharray="6 6" />
          <line x1="150" y1="12" x2="150" y2="388" stroke="#fdc903" strokeOpacity="0.7" strokeDasharray="4 6" />
          {[
            { y: 44, label: "Topo da cabeça" },
            { y: 110, label: "Ombros" },
            { y: 230, label: "Cintura" },
            { y: 360, label: "Pés" },
          ].map((l) => (
            <g key={l.y}>
              <line x1="12" y1={l.y} x2="288" y2={l.y} stroke="#fdc903" strokeOpacity="0.8" strokeWidth="1" />
              <text x="18" y={l.y - 4} fill="#ffffff" fillOpacity="0.85" fontSize="11">{l.label}</text>
            </g>
          ))}
          {/* silhueta de referência */}
          <ellipse cx="150" cy="78" rx="24" ry="30" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeDasharray="5 5" />
          <path
            d="M 110 112 Q 150 100 190 112 L 215 160 L 205 240 L 200 360 L 165 360 L 150 250 L 135 360 L 100 360 L 95 240 L 85 160 Z"
            fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeDasharray="5 5"
          />
        </svg>
      </div>

      <div className="flex w-full max-w-sm items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          <X className="h-4 w-4" /> Fechar
        </Button>
        <Button type="button" onClick={capture} disabled={!ready || busy}>
          <Camera className="h-4 w-4" /> {busy ? "Capturando…" : "Capturar"}
        </Button>
      </div>
    </div>
  );
}
