"use client";

// Só entra em ação se o próprio RootLayout (src/app/layout.tsx) lançar um
// erro — nesse caso o layout normal não está de pé, então este arquivo
// precisa renderizar <html>/<body> do zero. Mantido propositalmente simples
// (sem depender de fontes do Google, ThemeProvider, etc.) para não correr o
// risco de falhar também.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#0d0d0e",
          color: "#f2f1ec",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div>
          <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Train Forge encontrou um erro inesperado
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#a3a29c" }}>
            Recarregue a página. Se persistir, avise o suporte.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#a3a29c" }}>
              Ref: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          style={{
            height: "2.5rem",
            padding: "0 1rem",
            borderRadius: "4px",
            border: "none",
            background: "#fdc903",
            color: "#141311",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
