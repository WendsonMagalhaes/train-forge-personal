import { getMyPaymentHistory } from "@/lib/actions/finance";
import { StudentPortalFinanceClient } from "./student-portal-finance-client";

export default async function StudentFinancePage() {
  const { subscription, history } = await getMyPaymentHistory();

  return <StudentPortalFinanceClient subscription={subscription} history={history} />;
}
