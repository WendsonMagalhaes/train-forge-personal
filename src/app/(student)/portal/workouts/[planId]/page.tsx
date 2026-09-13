import Link from "next/link";
import { getWorkoutPlanDetail } from "@/lib/actions/student-workout";
import { TodayWorkoutClient } from "../../today-workout-client";
import { ChevronLeft } from "lucide-react";

export default async function StudentWorkoutPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const { plan, blocks } = await getWorkoutPlanDetail(planId);

  return (
    <div className="space-y-4">
      <Link href="/portal/workouts" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ChevronLeft className="h-4 w-4" /> Meus treinos
      </Link>
      <h1 className="font-display text-xl">{plan.label}</h1>
      <TodayWorkoutClient planId={plan.id} blocks={blocks} />
    </div>
  );
}
