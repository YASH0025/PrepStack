import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

import { socialSignInAction } from "../actions";
import { type SocialProvider } from "../backend";

const LABELS: Record<SocialProvider, string> = { google: "Google", github: "GitHub" };

/** "Continue with …" buttons. Renders nothing when no provider is configured. */
export function SocialSignIn({ providers, next }: { providers: SocialProvider[]; next?: string }) {
  if (providers.length === 0) return null;
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        {providers.map((provider) => (
          <form key={provider} action={socialSignInAction}>
            <input type="hidden" name="provider" value={provider} />
            {next && <input type="hidden" name="next" value={next} />}
            <Button type="submit" variant="outline" className="w-full">
              <LogIn />
              Continue with {LABELS[provider]}
            </Button>
          </form>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
