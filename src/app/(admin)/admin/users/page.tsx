import { listAllUsers, listTrainersForPicker } from "@/lib/actions/admin";
import { NewUserButton } from "./new-user-button";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const [rows, trainerOptions] = await Promise.all([listAllUsers(), listTrainersForPicker()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Usuários</h1>
        <NewUserButton trainerOptions={trainerOptions} />
      </div>

      <UsersTable rows={rows} trainerOptions={trainerOptions} />
    </div>
  );
}
