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
      className="text-xs text-zinc-500 underline underline-offset-4 hover:text-red-400"
    >
      {label}
    </button>
  );
}
