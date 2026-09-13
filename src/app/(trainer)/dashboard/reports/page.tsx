import {
  defaultLast30DaysPeriod,
  getRevenueByPeriod,
  getWorkoutAdherence,
  getRetentionChurn,
  getPhysicalEvolutionSummary,
} from "@/lib/actions/reports";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const period =
    params.from && params.to
      ? { from: params.from, to: params.to }
      : await defaultLast30DaysPeriod();

  const [revenue, adherence, retention, evolution] = await Promise.all([
    getRevenueByPeriod(period),
    getWorkoutAdherence(period),
    getRetentionChurn(period),
    getPhysicalEvolutionSummary(period),
  ]);

  return (
    <ReportsClient
      period={period}
      revenue={revenue}
      adherence={adherence}
      retention={retention}
      evolution={evolution}
    />
  );
}
