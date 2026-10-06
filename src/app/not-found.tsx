import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-24">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or you do not have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/today">Go to Today</Link>
          </Button>
        }
        className="w-full"
      />
    </main>
  );
}
