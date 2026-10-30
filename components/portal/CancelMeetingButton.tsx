"use client";

/**
 * The submit button of the "cancel meeting" form: asks first, because cancelling removes the
 * event from the calendar and tells everyone invited. (The form itself is a server action.)
 */
export function CancelMeetingButton({ label, confirmText }: { label: string; confirmText: string }) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
      className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-zinc-800 text-sm text-zinc-400 hover:border-red-900/60 hover:text-red-400 sm:min-h-0 sm:w-auto sm:rounded-none sm:border-0 sm:text-xs sm:underline sm:underline-offset-4"
    >
      {label}
    </button>
  );
}
