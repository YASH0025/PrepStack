import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth } from "@/modules/auth/service";
import { SignupForm } from "@/modules/auth/ui/auth-forms";
import { SocialSignIn } from "@/modules/auth/ui/social-sign-in";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Create your account</h1>
        </CardTitle>
        <CardDescription>
          Your tracker, notes and salary details stay private. Nothing is ever published without
          your explicit action.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SocialSignIn providers={(await getAuth()).socialProviders()} />
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
