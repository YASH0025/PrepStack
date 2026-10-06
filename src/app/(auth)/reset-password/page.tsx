import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/modules/auth/ui/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length >= 20;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Choose a new password</h1>
        </CardTitle>
        <CardDescription>
          {valid
            ? "Signing in again will be required on all your devices."
            : "This link is incomplete. Request a new reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Link href="/forgot-password" className="text-sm font-medium hover:underline">
            Request a new link
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
