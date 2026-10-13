import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Rotas dinâmicas (todas as telas logadas) não ficam em cache no navegador por padrão,
    // então cada aba visitada era refeita do zero. Com 30s, voltar a uma aba recente é instantâneo.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
