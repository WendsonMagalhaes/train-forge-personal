import { pgTable, uuid, text, timestamp, pgEnum, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["trainer", "student", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null when using OAuth
  image: text("image"),
  role: userRoleEnum("role").notNull().default("student"),
  // For students, which trainer manages them. Null for trainer/admin users.
  trainerId: uuid("trainer_id"),
  // true logo após cadastro (senha provisória) ou reset de senha pelo admin —
  // força a tela de troca de senha no próximo login antes de liberar o resto do sistema.
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  // Cor de marca do personal (hex, ex: "#ff6a3d"). Usada para "pintar" todo o
  // sistema — dashboard do próprio personal E o portal dos alunos dele.
  // Null = usa o ember padrão do Train Forge.
  brandColor: text("brand_color"),
  logoUrl: text("logo_url"),
  // Tamanho (%, 50-300, 100 = padrão) e posição (%, 0-100 cada eixo) de exibição
  // da logo — controla o "zoom"/enquadramento dela dentro da caixa onde aparece
  // (sidebar, topo do portal do aluno etc.), pra corrigir logos que renderizam
  // pequenas demais por causa de espaço vazio dentro do próprio arquivo.
  logoSizePct: integer("logo_size_pct").notNull().default(100),
  logoPositionX: integer("logo_position_x").notNull().default(50),
  logoPositionY: integer("logo_position_y").notNull().default(50),
  // Paleta de cores extraída automaticamente da logo (hex), pra sugerir como
  // opção de cor de marca em `BrandColorForm`. Recalculada no upload da logo.
  logoPaletteColors: jsonb("logo_palette_colors").$type<string[]>(),
  // Zoom (%, 100-250) e posição (%, 0-100 cada eixo) de enquadramento da foto
  // de perfil do personal dentro do círculo onde ela aparece.
  avatarZoomPct: integer("avatar_zoom_pct").notNull().default(100),
  avatarPositionX: integer("avatar_position_x").notNull().default(50),
  avatarPositionY: integer("avatar_position_y").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  trainer: one(users, {
    fields: [users.trainerId],
    references: [users.id],
  }),
  students: many(users),
}));
