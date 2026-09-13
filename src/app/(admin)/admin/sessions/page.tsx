import { listAllSessionsAdmin } from "@/lib/actions/admin";
import { SessionsTable } from "./sessions-table";

export default async function AdminSessionsPage() {
    const sessions = await listAllSessionsAdmin();

    return (
        <div>
            <h1 className="mb-6 font-display text-3xl">Sessões</h1>
            <p className="mb-4 text-sm text-[var(--muted)]">Mostrando as 300 sessões mais recentes, de todos os personais.</p>
            <SessionsTable rows={sessions} />
        </div>
    );
}