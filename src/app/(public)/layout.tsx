import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/service";

/** Public, indexable pages: topic guides and community interview reports. */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">
            PrepStack
          </Link>
          <nav aria-label="Public" className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/topics" className="hover:text-foreground">
              Topics
            </Link>
            <Link href="/reports" className="hover:text-foreground">
              Interview experiences
            </Link>
          </nav>
          <div className="ml-auto flex gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/today">Open PrepStack</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
          Community reports are user-submitted and anonymized. They are not official or guaranteed
          questions.
        </p>
      </footer>
    </div>
  );
}
