import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/modules/auth/service";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Signed-in users have no reason to see login/signup pages.
  if (await getCurrentUser()) redirect("/today");

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        PrepStack
      </Link>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
