"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

export function StudentRowLink({
  id,
  children,
  asRow = false,
}: {
  id: string;
  children: ReactNode;
  asRow?: boolean;
}) {
  const router = useRouter();

  if (asRow) {
    return (
      <tr
        onClick={() => router.push(`/dashboard/students/${id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push(`/dashboard/students/${id}`);
        }}
        role="link"
        tabIndex={0}
        className="tf-hairline cursor-pointer last:border-0 transition-colors hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--tf-ember)]"
      >
        {children}
      </tr>
    );
  }

  return (
    <Link href={`/dashboard/students/${id}`} className="block">
      {children}
    </Link>
  );
}
