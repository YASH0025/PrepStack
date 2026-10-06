"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Submit button that asks for confirmation first. Use inside a <form> whose
 * action is a server action (e.g. a delete).
 */
export function ConfirmSubmit({
  message,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
