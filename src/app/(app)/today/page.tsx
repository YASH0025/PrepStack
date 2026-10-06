import type { Metadata } from "next";

import { PageHeader } from "@/components/page";
import { requireUser } from "@/modules/auth/service";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser("/today");
  return <PageHeader title="Today" description={`Signed in as ${user.email}.`} />;
}
