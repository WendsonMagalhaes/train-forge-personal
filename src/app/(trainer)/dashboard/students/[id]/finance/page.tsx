import { listPaymentHistoryForStudent } from "@/lib/actions/finance";
import { StudentFinanceHistory } from "./student-finance-history";

export default async function StudentFinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const history = await listPaymentHistoryForStudent(id);

  return <StudentFinanceHistory history={history} />;
}
