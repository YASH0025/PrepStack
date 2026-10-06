"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string;
  label: string;
}

const GLOBAL_SHORTCUTS: Shortcut[] = [
  { keys: "n", label: "New interview" },
  { keys: "/", label: "Search Interview Intel" },
  { keys: "r", label: "Start review" },
  { keys: "g then t", label: "Go to Today" },
  { keys: "g then m", label: "Go to My Roadmap" },
  { keys: "g then c", label: "Go to Calendar" },
  { keys: "g then i", label: "Go to Tracker" },
  { keys: "?", label: "Show this help" },
];

const PAGE_SHORTCUTS: Shortcut[] = [
  { keys: "d", label: "Topic page: mark topic done" },
  { keys: "space", label: "Review: reveal answer" },
  { keys: "1 – 4", label: "Review: Again / Hard / Good / Easy" },
];

/** True when the user is typing, so single-key shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const targets: Record<string, string> = {
          t: "/today",
          m: "/roadmap",
          c: "/interviews/calendar",
          i: "/interviews/tracker",
        };
        const href = targets[event.key];
        if (href) {
          event.preventDefault();
          router.push(href);
        }
        return;
      }

      switch (event.key) {
        case "g":
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1000);
          break;
        case "n":
          event.preventDefault();
          router.push("/interviews/tracker?new=1");
          break;
        case "/":
          event.preventDefault();
          router.push("/intel?focus=1");
          break;
        case "r":
          event.preventDefault();
          router.push("/practice/review/session");
          break;
        case "?":
          event.preventDefault();
          setHelpOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts are ignored while you are typing in a field.
          </DialogDescription>
        </DialogHeader>
        <ShortcutList title="Anywhere" shortcuts={GLOBAL_SHORTCUTS} />
        <ShortcutList title="On specific pages" shortcuts={PAGE_SHORTCUTS} />
      </DialogContent>
    </Dialog>
  );
}

function ShortcutList({ title, shortcuts }: { title: string; shortcuts: Shortcut[] }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.keys} className="contents">
            <dt>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                {shortcut.keys}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{shortcut.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
