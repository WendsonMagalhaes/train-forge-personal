<div align="center">

# 🏋️ Train Forge

**Sistema completo de gestão para personal trainers**

Painel do personal (desktop) · Portal do aluno (PWA mobile) · Painel administrativo

Next.js 16 · TypeScript · PostgreSQL (Neon) · Drizzle ORM · Tailwind CSS 4

</div>

---

## 📖 Sobre o projeto

**Train Forge** é uma plataforma web para personal trainers gerenciarem toda a operação do
negócio em um só lugar: alunos, avaliações físicas, treinos, financeiro, agenda, nutrição e
comunicação — com um portal dedicado para que cada aluno acompanhe sua evolução pelo celular.

O sistema tem **três áreas de acesso**, controladas por papel de usuário (`admin`, `trainer`,
`student`) e protegidas por middleware de autenticação:

| Área                      | Rota         | Perfil              | Uso                                                                     |
| ------------------------- | ------------ | ------------------- | ----------------------------------------------------------------------- |
| 🛠️ **Admin**              | `/admin`     | `admin`             | Gestão global: usuários, planos, cobranças, sessões, ciclos, exercícios |
| 🧑‍🏫 **Painel do Personal** | `/dashboard` | `trainer` / `admin` | Operação do dia a dia com os alunos                                     |
| 📱 **Portal do Aluno**    | `/portal`    | `student`           | Acompanhamento pessoal, instalável como app (PWA)                       |

Cada personal define sua própria **cor de marca** (`brandColor`), que é aplicada
automaticamente tanto no seu painel quanto no portal de todos os seus alunos — sem precisar
tocar em CSS.

---

## ✨ Funcionalidades

### 👥 Gestão de alunos (CRM)

- Cadastro completo, listagem com busca e filtros, histórico de saúde/anamnese
- Notas internas, controle de status (ativo/inativo/trancado)
- Ficha individual do aluno com abas (avaliações, treinos, nutrição, notas)

### 📊 Avaliação física

- Registro de medidas e testes físicos ao longo do tempo
- Gráficos de evolução (`evolution-charts.tsx`) para acompanhar progresso

### 🏋️ Treinos

- Biblioteca de exercícios (com grupo muscular, criação/edição/exclusão)
- Montagem de fichas de treino por ciclo/periodização
- Portal do aluno mostra o **treino do dia**, calculado a partir do ciclo ativo e do dia da semana
- Registro de execução pelo aluno (carga, RPE, histórico)

### 🥗 Nutrição

- Planos nutricionais criados pelo personal para cada aluno
- Registro de refeições/log nutricional pelo aluno

### 💰 Financeiro

- Planos e ciclos de cobrança (mensal, trimestral, semestral, anual, avulso)
- Integração com **Asaas** (Pix, boleto, cartão de crédito) via API + webhooks
- Emissão de recibo/fatura em **PDF** (`/api/invoices/[paymentId]/pdf`)
- Controle de status de pagamento (pendente, pago, atrasado, reembolsado)

### 📅 Agenda

- Agendamento de sessões (presencial/online), confirmação, remarcação, faltas
- Lembretes automáticos de sessão via **cron job diário** (`vercel.json`, 08h)

### 💬 Comunicação

- Chat entre personal e aluno (thread por aluno)
- Conteúdo educativo/novidades publicadas pelo personal
- Notificações **push** (Web Push/VAPID) e por **e-mail** (Resend)
- Sino de notificações no painel

### 📈 Relatórios & Analytics

- Painel de relatórios com métricas de adesão, evolução e receita

### 🔐 Autenticação & segurança

- **NextAuth v5** com provider de credenciais (e-mail + senha, hash com `bcryptjs`)
- Sessão via JWT, papéis (`admin` / `trainer` / `student`)
- Fluxo de **senha provisória obrigatória** — usuário novo ou resetado pelo admin é forçado a
  trocar a senha antes de acessar qualquer outra rota
- Middleware (`proxy.ts`) protegendo `/dashboard`, `/portal`, `/admin` e `/change-password`,
  com redirecionamento automático conforme o papel do usuário

### 📱 PWA (Portal do Aluno)

- `manifest.json` + `service worker` para instalação no celular como app
- Suporte a notificações push mesmo com o app fechado

### 🎨 Identidade visual

- Paleta grafite / ember / latão, tipografia **Big Shoulders Display** + **IBM Plex Sans**
- Tema **dark/light** com toggle e persistência
- Componentes de UI próprios (Button, Input, Panel, Badge, Dialog, Toast, Autocomplete,
  Multi-select, File Upload) construídos sobre **shadcn/ui** (estilo `new-york`)

---

## 🧱 Stack técnica

| Camada             | Tecnologia                                                    |
| ------------------ | ------------------------------------------------------------- |
| Framework          | [Next.js 16](https://nextjs.org) (App Router, Server Actions) |
| Linguagem          | TypeScript 5                                                  |
| UI                 | React 19 · Tailwind CSS 4 · shadcn/ui · lucide-react          |
| Gráficos           | Recharts                                                      |
| Formulários        | React Hook Form + Zod (`@hookform/resolvers`)                 |
| Banco de dados     | PostgreSQL via [Neon](https://neon.tech) (serverless)         |
| ORM                | [Drizzle ORM](https://orm.drizzle.team) + Drizzle Kit         |
| Autenticação       | NextAuth v5 (beta) + `@auth/drizzle-adapter` + bcryptjs       |
| Pagamentos         | [Asaas](https://www.asaas.com) (Pix / boleto / cartão)        |
| E-mail             | [Resend](https://resend.com)                                  |
| Push notifications | `web-push` (VAPID)                                            |
| Arquivos/Uploads   | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)    |
| Geração de PDF     | `pdf-lib`                                                     |
| Datas              | `date-fns`                                                    |
| Deploy             | Vercel (com cron job nativo)                                  |

---

## 📂 Estrutura de pastas

```
src/
  app/
    (admin)/admin/          # painel administrativo (usuários, planos, cobranças, ciclos, sessões, exercícios)
    (trainer)/dashboard/    # painel do personal — alunos, treinos, financeiro, agenda, chat, relatórios, settings
    (student)/portal/       # portal do aluno (PWA) — treino do dia, progresso, agenda, chat, nutrição
    api/
      auth/[...nextauth]/   # rota do NextAuth
      cron/session-reminders/  # lembretes automáticos de sessão
      invoices/[paymentId]/pdf/ # geração de recibo em PDF
      upload/                # upload de arquivos (Vercel Blob)
      webhooks/payments/     # webhook de cobranças (Asaas)
    login/, change-password/
    layout.tsx, page.tsx, globals.css
  components/
    layout/                 # navegação, chat, sino de notificações
    pwa/                    # registro de service worker, push subscribe
    theme/                  # dark/light theme (provider, script, toggle)
    ui/                     # componentes de UI reutilizáveis
  db/
    schema/                 # um arquivo por módulo (users, students, assessments, workouts,
                             # execution, nutrition, finance, schedule, communication)
    index.ts                # client Drizzle + conexão Neon
  lib/
    actions/                # Server Actions por módulo
    auth/                   # configuração NextAuth
    notifications/          # e-mail (Resend) e push (web-push)
    payments/                # cliente da API Asaas
    theme/                   # resolução da cor de marca por personal
    validations/             # schemas Zod
  proxy.ts                  # middleware de autenticação e controle de acesso por papel
scripts/
  seed.ts                   # popula o banco com dados de exemplo
public/
  manifest.json, sw.js      # PWA do portal do aluno
```

---

## 🗄️ Modelo de dados

Schema definido em Drizzle ORM, organizado por módulo em `src/db/schema/`:

- **`users`** — contas (admin/trainer/student), `brandColor`, senha provisória
- **`students`** — dados do aluno, vínculo com o `trainerId`, objetivo, status, anamnese
- **`assessments`** — avaliações físicas (medidas, testes, evolução)
- **`workouts`** — exercícios, fichas de treino, ciclos/periodização
- **`execution`** — registros de execução do aluno (carga, RPE, histórico)
- **`nutrition`** — planos nutricionais e log de refeições
- **`finance`** — planos, cobranças, pagamentos, integração com Asaas
- **`schedule`** — sessões, status (agendada/confirmada/concluída/falta/remarcada/cancelada)
- **`communication`** — mensagens de chat e conteúdo educativo

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- Node.js 20+
- Conta gratuita no [Neon](https://neon.tech) (Postgres serverless)

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```bash
# Banco de dados (obrigatório)
DATABASE_URL="postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require"

# Autenticação (obrigatório)
AUTH_SECRET="gere-um-valor-aleatorio"   # ex: openssl rand -base64 32

# Pagamentos — Asaas (opcional, necessário para cobranças reais)
ASAAS_API_KEY="sua-chave-sandbox-ou-producao"
ASAAS_API_URL="https://api-sandbox.asaas.com/v3"   # opcional, default = sandbox
ASAAS_WEBHOOK_TOKEN="token-configurado-no-painel-asaas"

# E-mail — Resend (opcional, necessário para notificações por e-mail)
RESEND_API_KEY="sua-chave-resend"

# Push notifications — Web Push / VAPID (opcional)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."

# Upload de arquivos — Vercel Blob (opcional)
BLOB_READ_WRITE_TOKEN="..."
```

### 3. Sincronizar o schema com o banco

Durante o desenvolvimento (sem dados de produção), a forma mais rápida:

```bash
npm run db:push
```

Para produção, use o fluxo com histórico de migrations:

```bash
npm run db:generate   # gera as migrations a partir do schema
npm run db:migrate    # aplica no banco
```

> 💡 Erro `Failed query: select ... "goals" ...`? O banco está com uma versão antiga do
> schema. Rode `npm run db:push` novamente (seguro enquanto não há dados reais em produção).

### 4. Popular com dados de exemplo

```bash
npm run db:seed
```

Cria um personal de teste:

- **E-mail:** `personal@trainforge.app`
- **Senha:** `treino123`

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

- 🧑‍🏫 Painel do personal: `http://localhost:3000/dashboard`
- 📱 Portal do aluno: `http://localhost:3000/portal` (cadastre um aluno pelo painel primeiro)
- 🛠️ Admin: `http://localhost:3000/admin`

---

## 📜 Scripts disponíveis

| Comando               | Descrição                                          |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Sobe o servidor de desenvolvimento                 |
| `npm run build`       | Build de produção                                  |
| `npm run start`       | Sobe o servidor a partir do build                  |
| `npm run lint`        | Roda o ESLint                                      |
| `npm run db:generate` | Gera arquivos de migration a partir do schema      |
| `npm run db:migrate`  | Aplica migrations pendentes no banco               |
| `npm run db:push`     | Sincroniza o schema direto com o banco (dev)       |
| `npm run db:studio`   | Abre o Drizzle Studio (explorador visual do banco) |
| `npm run db:seed`     | Popula o banco com dados de exemplo                |

---

## ☁️ Deploy

O projeto está pronto para deploy na **Vercel**, com integração nativa ao Neon e um
**cron job** já configurado (`vercel.json`) para disparar lembretes de sessão todos os dias
às 08h (`/api/cron/session-reminders`).

```bash
npx vercel
```

Configure no painel da Vercel as mesmas variáveis de ambiente do `.env.local`.

---

## 🎨 Identidade visual e cor por personal

Cada personal (`users.brandColor`) define a cor de marca do sistema:

- Se não definida, usa o **ember padrão** do Train Forge (`#ff6a3d`).
- Aplicada via **CSS custom properties** (`--primary`, `--tf-ember`, `--tf-ember-dim`)
  injetadas no layout raiz de `(trainer)` e `(student)` a partir do banco — nenhum CSS
  estático precisa mudar.
- Alunos sempre herdam a cor do **próprio personal**, resolvida via `trainerId`.

Ver `src/lib/theme/brand-color.ts` e `src/lib/theme/resolve-brand-color.ts`.

---

## 🗺️ Roadmap

- [ ] Refinar telas administrativas de exercícios/ciclos/planos
- [ ] Fotos de evolução na avaliação física
- [ ] Integração de nutrição com nutricionista externo
- [ ] Relatórios avançados de retenção/churn
- [ ] Reposição automática de aulas perdidas

---

<div align="center">

Feito com 🧡 em Next.js — **Train Forge**

</div>
