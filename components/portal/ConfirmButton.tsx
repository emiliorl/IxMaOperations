"use client";

import type { ReactNode } from "react";

/** A submit button that asks first ("Remove this authenticator app?"). The form around it is a server action. */
export function ConfirmButton({ confirmText, className, children }: { confirmText: string; className?: string; children: ReactNode }) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
