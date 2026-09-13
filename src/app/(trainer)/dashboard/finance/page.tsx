import { listPlans, listSubscriptionsOverview, listAllPaymentsHistory } from "@/lib/actions/finance";
import { listStudentsForPicker } from "@/lib/actions/schedule";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const [plans, subscriptions, studentOptions, allPayments] = await Promise.all([
    listPlans(),
    listSubscriptionsOverview(),
    listStudentsForPicker(),
    listAllPaymentsHistory(),
  ]);

  return (
    <FinanceClient
      plans={plans}
      subscriptions={subscriptions}
      studentOptions={studentOptions}
      allPayments={allPayments}
    />
  );
}
