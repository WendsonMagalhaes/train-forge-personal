import "dotenv/config";
import { db } from "@/db";
import { users, exercises, students } from "@/db/schema";
import { hash } from "bcryptjs";

const DEFAULT_PASSWORD = "treino123";

// Trava de segurança: este script cria contas com senha fixa e pública
// (documentada no README). Nunca deve rodar contra um banco de produção —
// se DATABASE_URL apontar pra produção (ou NODE_ENV=production) por engano,
// o comando aborta antes de tocar no banco. Pra forçar mesmo assim (ex.:
// resetar um ambiente de staging), passe ALLOW_PROD_SEED=true.
function assertNotProduction() {
  const isProdEnv = process.env.NODE_ENV === "production";
  const looksLikeProdDb = /neon\.tech|amazonaws\.com|prod/i.test(process.env.DATABASE_URL ?? "") &&
    !/-dev|-staging|localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL ?? "");
  const allowed = process.env.ALLOW_PROD_SEED === "true";

  if ((isProdEnv || looksLikeProdDb) && !allowed) {
    console.error(
      "\n❌ Abortado: isso parece um ambiente de produção (NODE_ENV=production ou DATABASE_URL de produção).\n" +
      "   O seed cria contas com senha pública e conhecida (" + DEFAULT_PASSWORD + ") — não pode rodar aqui.\n" +
      "   Se tiver certeza do que está fazendo, rode de novo com ALLOW_PROD_SEED=true.\n"
    );
    process.exit(1);
  }
}

async function main() {
  assertNotProduction();
  console.log("Seeding Train Forge…");

  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  // ------------------------------------------------------------------ //
  // Admin
  // ------------------------------------------------------------------ //
  const [admin] = await db
    .insert(users)
    .values({
      name: "Admin Train Forge",
      email: "admin@trainforge.app",
      passwordHash,
      role: "admin",
    })
    .returning();

  console.log("Admin criado:", admin.email, `(senha: ${DEFAULT_PASSWORD})`);

  // ------------------------------------------------------------------ //
  // Personais (3 no total)
  // ------------------------------------------------------------------ //
  const trainersData = [
    { name: "Personal Demo", email: "personal@trainforge.app", brandColor: "#ff6a3d" },
    { name: "Ana Costa", email: "ana@trainforge.app", brandColor: "#2e7d5b" },
    { name: "Bruno Lima", email: "bruno@trainforge.app", brandColor: "#3d6aff" },
  ];

  const trainers = await db
    .insert(users)
    .values(
      trainersData.map((t) => ({
        name: t.name,
        email: t.email,
        passwordHash,
        role: "trainer" as const,
        brandColor: t.brandColor,
      }))
    )
    .returning();

  trainers.forEach((t) => console.log("Personal criado:", t.email, `(senha: ${DEFAULT_PASSWORD})`));

  // ------------------------------------------------------------------ //
  // Exercícios — biblioteca do primeiro personal (Demo)
  // ------------------------------------------------------------------ //
  const baseExercises = [
    { name: "Supino reto com barra", muscleGroup: "chest" as const },
    { name: "Agachamento livre", muscleGroup: "legs" as const },
    { name: "Puxada frontal", muscleGroup: "back" as const },
    { name: "Desenvolvimento com halteres", muscleGroup: "shoulders" as const },
    { name: "Rosca direta", muscleGroup: "biceps" as const },
    { name: "Tríceps corda", muscleGroup: "triceps" as const },
    { name: "Prancha abdominal", muscleGroup: "core" as const },
    { name: "Esteira - corrida leve", muscleGroup: "cardio" as const },
  ];

  await db.insert(exercises).values(baseExercises.map((e) => ({ ...e, trainerId: trainers[0].id })));

  console.log(`${baseExercises.length} exercícios cadastrados na biblioteca de ${trainers[0].name}.`);

  // ------------------------------------------------------------------ //
  // 10 alunos, divididos entre os 3 personais (4 / 3 / 3)
  // ------------------------------------------------------------------ //
  const studentNames = [
    "Carla Souza", "João Pereira", "Fernanda Lima", "Rafael Alves",
    "Juliana Rocha", "Marcelo Dias", "Patrícia Nunes", "Lucas Martins",
    "Camila Ferreira", "Diego Ramos",
  ];

  const studentsPerTrainer = [4, 3, 3]; // soma = 10, na mesma ordem de `trainers`

  let studentIndex = 0;
  for (let t = 0; t < trainers.length; t++) {
    const trainer = trainers[t];
    const count = studentsPerTrainer[t];

    for (let i = 0; i < count; i++) {
      const name = studentNames[studentIndex];
      const email = `${name.toLowerCase().split(" ")[0]}.${studentIndex + 1}@trainforge.app`;

      const [studentUser] = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash,
          role: "student",
          trainerId: trainer.id,
          mustChangePassword: true,
        })
        .returning();

      await db.insert(students).values({
        userId: studentUser.id,
        trainerId: trainer.id,
      });

      console.log(`  Aluno criado: ${email} → personal: ${trainer.name}`);
      studentIndex++;
    }
  }

  console.log(`\n${studentIndex} alunos cadastrados no total.`);
  console.log(`\nPronto! Senha padrão de todas as contas do seed: ${DEFAULT_PASSWORD}`);
  console.log(`- Admin: ${admin.email}`);
  trainers.forEach((t) => console.log(`- Personal: ${t.email}`));
  console.log(`- Alunos: veja a lista acima (obrigatório trocar a senha no 1º login)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });