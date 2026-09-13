import { listAllPlansAdmin } from "@/lib/actions/admin";
import { PlansTable } from "./plans-table";

export default async function AdminPlansPage() {
    const plans = await listAllPlansAdmin();

    return (
        <div>
            <h1 className="mb-6 font-display text-3xl">Planos</h1>
            <PlansTable rows={plans} />
        </div>
    );
}