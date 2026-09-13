import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Endpoint genérico de upload direto-do-browser pro Vercel Blob.
// Usado tanto pelo personal (vídeo/imagem de exercício) quanto para
// fotos de avaliação física. O client nunca recebe o token de escrita —
// ele só pede uma URL assinada aqui, e o upload real vai direto pro Blob.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user) {
          throw new Error("Não autorizado");
        }

        // clientPayload identifica o tipo de upload ("exercise-video",
        // "exercise-image", "assessment-photo", "trainer-logo", "avatar") —
        // "avatar" é o único tipo liberado pra aluno também (foto de perfil);
        // os demais continuam exclusivos do personal.
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const trainerOnlyKinds = ["exercise-video", "exercise-image", "assessment-photo", "trainer-logo"];
        const allowedKinds = [...trainerOnlyKinds, "avatar"];

        const authorized =
          allowedKinds.includes(payload.kind) &&
          (payload.kind === "avatar" ? true : session.user.role === "trainer");

        if (!authorized) {
          throw new Error("Não autorizado para este tipo de upload");
        }

        return {
          allowedContentTypes:
            payload.kind === "trainer-logo" || payload.kind === "avatar"
              ? ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
              : ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"],
          addRandomSuffix: true,
          maximumSizeInBytes:
            payload.kind === "exercise-video" ? 200 * 1024 * 1024 : payload.kind === "trainer-logo" || payload.kind === "avatar" ? 5 * 1024 * 1024 : 15 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId: session.user.id, kind: payload.kind }),
        };
      },
      onUploadCompleted: async () => {
        // Nada a persistir aqui — o client salva a URL retornada junto com o
        // formulário (exercício ou avaliação) no próprio submit.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload" },
      { status: 400 }
    );
  }
}