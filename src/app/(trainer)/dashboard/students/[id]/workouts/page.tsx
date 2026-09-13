import { listCycles, listPlansWithExercises } from "@/lib/actions/workouts";
import { listExercises } from "@/lib/actions/exercises";
import { WorkoutsClient } from "./workouts-client";

export default async function StudentWorkoutsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cycles = await listCycles(id);
  const cyclesWithPlans = await Promise.all(
    cycles.map(async (cycle) => ({ ...cycle, plans: await listPlansWithExercises(cycle.id) }))
  );
  const exerciseLibrary = await listExercises();

  return <WorkoutsClient studentId={id} cycles={cyclesWithPlans} exerciseLibrary={exerciseLibrary} />;
}
