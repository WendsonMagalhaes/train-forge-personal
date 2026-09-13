-- Aplica manualmente as mudanças de schema (substitutos de exercício + tamanho/
-- posição de logo e foto). Idempotente: pode rodar quantas vezes precisar,
-- não dá erro se a coluna/tabela já existir. Use isso se `npm run db:migrate`
-- não estiver refletindo no seu banco (ex: DATABASE_URL apontando pra outro
-- banco, ou o histórico de migrations do drizzle estar com algo preso).
--
-- Como rodar: cole esse SQL inteiro no SQL editor do seu projeto Neon
-- (console.neon.tech > seu projeto > SQL Editor) e execute. Ou, se preferir
-- linha de comando: psql "$DATABASE_URL" -f scripts/apply-logo-substitutes-migration.sql

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "logo_size_pct" integer NOT NULL DEFAULT 100;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "logo_position_x" integer NOT NULL DEFAULT 50;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "logo_position_y" integer NOT NULL DEFAULT 50;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "logo_palette_colors" jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_zoom_pct" integer NOT NULL DEFAULT 100;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_position_x" integer NOT NULL DEFAULT 50;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_position_y" integer NOT NULL DEFAULT 50;

CREATE TABLE IF NOT EXISTS "exercise_substitutes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "exercise_id" uuid NOT NULL,
    "substitute_exercise_id" uuid NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "exercise_substitutes"
        ADD CONSTRAINT "exercise_substitutes_exercise_id_exercises_id_fk"
        FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "exercise_substitutes"
        ADD CONSTRAINT "exercise_substitutes_substitute_exercise_id_exercises_id_fk"
        FOREIGN KEY ("substitute_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "exercise_substitutes_pair_unique"
    ON "exercise_substitutes" USING btree ("exercise_id", "substitute_exercise_id");

-- Confirma o que ficou gravado (rode separado se seu client não mostrar o resultado do ALTER acima)
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE 'logo_%' OR column_name LIKE 'avatar_%';
