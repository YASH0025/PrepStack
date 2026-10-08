"use client";

import * as React from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

import { type Language } from "../schemas";

// Monaco is served by this app (scripts/copy-vendor.mjs), not from a CDN.
loader.config({ paths: { vs: "/vendor/monaco/vs" } });

const MONACO_LANGUAGE: Record<Language, string> = { js: "javascript", py: "python" };

function useDarkMode(): boolean {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Monaco (the VS Code editor). Loaded on the client only. */
export default function CodeEditor({
  value,
  language,
  onChange,
  onRun,
  label,
}: {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  /** Ctrl/Cmd + Enter. */
  onRun: () => void;
  label: string;
}) {
  const dark = useDarkMode();
  const runRef = React.useRef(onRun);
  React.useEffect(() => {
    runRef.current = onRun;
  }, [onRun]);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGE[language]}
      value={value}
      theme={dark ? "vs-dark" : "light"}
      onChange={(next) => onChange(next ?? "")}
      onMount={handleMount}
      loading={<p className="p-4 text-sm text-muted-foreground">Loading editor…</p>}
      options={{
        ariaLabel: label,
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: language === "py" ? 4 : 2,
        automaticLayout: true,
        wordWrap: "on",
        padding: { top: 12 },
        fixedOverflowWidgets: true,
      }}
    />
  );
}
