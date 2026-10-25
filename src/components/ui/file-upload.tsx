"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { CameraCapture, type CaptureView } from "@/components/ui/camera-capture";
import { Camera, Loader2, Upload, X, Play } from "lucide-react";

type UploadKind = "exercise-video" | "exercise-image" | "assessment-photo" | "trainer-logo" | "avatar";

/**
 * Upload de arquivo direto do browser pro Vercel Blob (sem passar pelo
 * servidor Next.js). Mantém um <input type="hidden" name={name}> com a URL
 * final, então qualquer <form action={serverAction}> existente continua
 * funcionando sem mudar a action — o valor chega como se fosse um campo de
 * texto normal.
 *
 * Também aceita colar uma URL externa direto (mantém compatibilidade com
 * conteúdo já cadastrado por link).
 *
 * Com `camera`, oferece "Tirar foto": abre a câmera com linhas de enquadramento
 * e envia a foto capturada direto. Se a câmera não estiver disponível, abre a
 * câmera nativa do aparelho pelo seletor de arquivos.
 */
export function FileUpload({
    name,
    label,
    kind,
    accept,
    defaultValue,
    value,
    compact = false,
    preview = "none",
    camera = false,
    guide = "front",
    onChange,
}: {
    name: string;
    label: string;
    kind: UploadKind;
    accept: string;
    defaultValue?: string | null;
    /** Modo controlado: quando informado, a URL vem de fora (ex.: após processar a imagem). */
    value?: string | null;
    /** Versão enxuta: só botões (Enviar/Trocar/Remover), sem rótulo, URL nem campo de link. O preview fica com quem usa. */
    compact?: boolean;
    preview?: "image" | "video" | "none";
    /** Mostra o botão "Tirar foto" (câmera com enquadramento). */
    camera?: boolean;
    /** Vista da foto: define a silhueta de enquadramento da câmera. */
    guide?: CaptureView;
    /** Chamado sempre que a URL final muda (upload concluído, link colado ou removido). */
    onChange?: (url: string) => void;
}) {
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const captureRef = useRef<HTMLInputElement>(null);
    const [urlState, setUrlState] = useState(defaultValue ?? "");
    const url = value !== undefined ? value ?? "" : urlState;
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [cameraOpen, setCameraOpen] = useState(false);

    function setUrl(next: string) {
        if (value === undefined) setUrlState(next);
        onChange?.(next);
    }

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setUploading(true);
        setProgress(0);
        try {
            const blob = await upload(file.name, file, {
                access: "public",
                handleUploadUrl: "/api/upload",
                clientPayload: JSON.stringify({ kind }),
                onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
            });
            setUrl(blob.url);
        } catch (err) {
            toast({
                variant: "error",
                description: err instanceof Error ? err.message : "Falha no upload do arquivo.",
            });
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
            if (captureRef.current) captureRef.current.value = "";
        }
    }

    const cameraButton = camera ? (
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => setCameraOpen(true)}>
            <Camera className="h-3.5 w-3.5" /> Tirar foto
        </Button>
    ) : null;

    const cameraOverlay = cameraOpen ? (
        <CameraCapture
            view={guide}
            onClose={() => setCameraOpen(false)}
            onCapture={(file) => {
                setCameraOpen(false);
                handleFile(file);
            }}
            onUnavailable={() => {
                setCameraOpen(false);
                captureRef.current?.click();
            }}
        />
    ) : null;

    // input de câmera nativa (fallback quando o navegador não libera a câmera)
    const captureInput = camera ? (
        <input
            ref={captureRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            aria-label={`${label} (câmera)`}
        />
    ) : null;

    if (compact) {
        return (
            <div>
                <input type="hidden" name={name} value={url} />
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                    aria-label={label}
                />
                {captureInput}
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                        {uploading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {progress}%
                            </>
                        ) : (
                            <>
                                <Upload className="h-3.5 w-3.5" /> {url ? "Trocar" : "Enviar"}
                            </>
                        )}
                    </Button>
                    {cameraButton}
                    {url && (
                        <button
                            type="button"
                            onClick={() => setUrl("")}
                            className="inline-flex h-8 items-center gap-1 px-1 text-xs text-[var(--muted)] hover:text-red-500"
                        >
                            <X className="h-3.5 w-3.5" /> Remover
                        </button>
                    )}
                </div>
                {cameraOverlay}
            </div>
        );
    }

    return (
        <div>
            <Label>{label}</Label>
            <input type="hidden" name={name} value={url} />

            {url ? (
                <div className="flex items-center gap-3">
                    {preview === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-14 w-14 rounded-[var(--radius)] object-cover" />
                    )}
                    {preview === "video" && (
                        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius)] border border-[var(--border)]">
                            <Play className="h-5 w-5 text-[var(--primary)]" />
                        </div>
                    )}
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-xs text-[var(--muted)] hover:text-[var(--primary)]"
                    >
                        {url}
                    </a>
                    <button
                        type="button"
                        onClick={() => setUrl("")}
                        className="ml-auto shrink-0 text-[var(--muted)] hover:text-red-500"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        onChange={(e) => handleFile(e.target.files?.[0])}
                        className="hidden"
                        id={`file-${name}`}
                    />
                    {captureInput}
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Enviando {progress}%
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" /> Enviar arquivo
                            </>
                        )}
                    </Button>
                    {cameraButton}
                    <span className="text-xs text-[var(--muted)]">ou</span>
                    <Input
                        placeholder="colar link (https://…)"
                        className="h-8 w-40 text-xs"
                        defaultValue=""
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
            )}
            {cameraOverlay}
        </div>
    );
}
