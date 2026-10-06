import * as React from "react";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/*
 * Server-renderable form fields (no client state). Used by admin and other
 * simple forms that post FormData to server actions.
 */

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function InputField({
  label,
  name,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string; hint?: React.ReactNode }) {
  const id = props.id ?? `f-${name}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <Input id={id} name={name} {...props} />
    </Field>
  );
}

export function TextareaField({
  label,
  name,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
}) {
  const id = props.id ?? `f-${name}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <Textarea id={id} name={name} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  hint,
  options,
  className,
  placeholder,
  ...props
}: React.ComponentProps<typeof NativeSelect> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  const id = props.id ?? `f-${name}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} className={className}>
      <NativeSelect id={id} name={name} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  value,
  hint,
}: {
  label: React.ReactNode;
  name: string;
  defaultChecked?: boolean;
  value?: string;
  hint?: string;
}) {
  const id = `f-${name}-${value ?? "on"}`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value ?? "on"}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-input accent-primary"
      />
      <label htmlFor={id} className="grid gap-0.5 text-sm">
        <span>{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}
