import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth, safeNextPath } from "@/modules/auth/service";
import { LoginForm } from "@/modules/auth/ui/auth-forms";
import { SocialSignIn } from "@/modules/auth/ui/social-sign-in";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Sign in</h1>
        </CardTitle>
        <CardDescription>Welcome back. Pick up where you left off.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {params.reset === "1" && (
          <Alert variant="success">
            <AlertDescription>Password updated. Sign in with your new password.</AlertDescription>
          </Alert>
        )}
        <SocialSignIn providers={(await getAuth()).socialProviders()} next={next} />
        <LoginForm next={next} />
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
