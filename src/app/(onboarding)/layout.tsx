import Link from "next/link";

import { UserMenu } from "@/components/app-shell/user-menu";
import { ThemeToggle } from "@/components/theme";
import { requireUser } from "@/modules/auth/service";

/** Focused layout for onboarding and the first diagnostic: no main navigation. */
export default async function OnboardingLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser("/onboarding");
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-12 items-center gap-2 border-b px-4">
        <Link href="/today" className="font-semibold tracking-tight">
          PrepStack
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu email={user.email} />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
