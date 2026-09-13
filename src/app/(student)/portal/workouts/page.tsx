import { listMyWorkoutPlans } from "@/lib/actions/student-workout";
import { MyWorkoutsClient } from "./my-workouts-client";
import { Panel } from "@/components/ui/panel";

export default async function StudentWorkoutsPage() {
  const { cycle, plans } = await listMyWorkoutPlans();

  if (!cycle) {
    return (
      <Panel className="text-center">
        <p className="font-medium">Nenhum ciclo de treino ativo</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Fale com seu personal para montar sua ficha.</p>
      </Panel>
    );
  }

  return <MyWorkoutsClient cycle={cycle} plans={plans} />;
}
