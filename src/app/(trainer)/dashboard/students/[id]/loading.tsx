import { PageLoading } from "@/components/ui/spinner";

// Fica dentro do layout do aluno: cabeçalho e abas continuam visíveis enquanto a aba carrega.
export default function Loading() {
  return <PageLoading label="Carregando aba…" />;
}
