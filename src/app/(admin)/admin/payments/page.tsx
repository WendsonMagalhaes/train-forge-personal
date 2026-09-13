import { listAllPaymentsAdmin } from "@/lib/actions/admin";
import { PaymentsTable } from "./payments-table";

export default async function AdminPaymentsPage() {
    const payments = await listAllPaymentsAdmin();

    return (
        <div>
            <h1 className="mb-6 font-display text-3xl">Pagamentos</h1>
            <p className="mb-4 text-sm text-[var(--muted)]">
                Visão somente leitura das 300 cobranças mais recentes, de todos os personais.
            </p>
            <PaymentsTable rows={payments} />
        </div>
    );
}