import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { publicPassport } from "@/modules/passport/service";
import { PassportView } from "@/modules/passport/ui/passport-view";

/** Private share links: never indexed or followed. */
export const metadata: Metadata = {
  title: "Readiness passport",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicPassportPage({ params }: PageProps<"/passport/[token]">) {
  const { token } = await params;
  const snapshot = await publicPassport(token);
  if (!snapshot) notFound();
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PassportView data={snapshot.data} generatedAt={snapshot.generatedAt} />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
        <span className="flex-1">Preparing for interviews? Build your own plan and passport.</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/signup">Try PrepStack</Link>
        </Button>
      </div>
    </div>
  );
}
