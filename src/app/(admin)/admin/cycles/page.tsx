import { listAllCyclesAdmin } from "@/lib/actions/admin";
import { CyclesTable } from "./cycles-table";

export default async function AdminCyclesPage() {
    const cycles = await listAllCyclesAdmin();

    return (
        <div>
            <h1 className="mb-6 font-display text-3xl">Ciclos de treino</h1>
            <p className="mb-4 text-sm text-[var(--muted)]">Mostrando os 300 ciclos mais recentes, de todos os personais.</p>
            <CyclesTable rows={cycles} />
        </div>
    );
}