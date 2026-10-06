import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24"
    >
      <h1 className="text-3xl font-semibold tracking-tight">PrepStack</h1>
      <p className="text-lg text-muted-foreground">
        Track every interview, prep specifically for it, and learn from real developer experiences,
        all in one place.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
