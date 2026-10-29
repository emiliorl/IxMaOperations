"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  checkFiles,
  fileKey,
  humanSize,
  mergeFiles,
  type FileProblem,
} from "@/lib/portal/attachments";

const MESSAGE_KEY: Record<FileProblem, string> = {
  too_many: "errorFilesTooMany",
  too_big: "errorFilesTooBig",
  bad_type: "errorFilesBadType",
  empty: "errorFilesBadType",
};

/**
 * File picker for screenshots and logs. Checks the choice instantly in the
 * browser (count, total size, allowed types) so nobody waits for an upload to
 * find out a file is too big. The server re-checks everything — this is only
 * for feedback; a wrong choice also blocks the form's submit button.
 *
 * Files are kept in a list the person can edit: picking again ADDS files, and
 * each file has its own remove button, so fixing "too big" means dropping one
 * file, not starting over. The real <input> is kept in step with the list (that
 * is what the form submits).
 */
export function FileField({ id }: { id: string }) {
  const t = useTranslations("Portal");
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File[]>([]);
  const [problem, setProblem] = useState<FileProblem | null>(null);

  /** Make the list, the form's real file input and the error message agree. */
  const apply = (files: File[]) => {
    const field = input.current;
    if (field) {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(file);
      field.files = transfer.files;
    }
    const found = checkFiles(files);
    setPicked(files);
    setProblem(found);
    // A custom validity message stops the form from submitting until it's fixed.
    field?.setCustomValidity(found ? t(MESSAGE_KEY[found], { n: MAX_FILES, size: humanSize(MAX_TOTAL_BYTES) }) : "");
  };

  // After a form action finishes the browser empties the file input; empty the list too so it never shows files that won't be sent.
  useEffect(() => {
    const field = input.current;
    const form = field?.form;
    if (!field || !form) return;
    const onReset = () => {
      setPicked([]);
      setProblem(null);
      field.setCustomValidity("");
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        name="files"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => apply(mergeFiles(picked, Array.from(event.target.files ?? [])))}
        className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-800 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:text-zinc-200 hover:file:border-zinc-600"
      />
      {picked.length > 0 && (
        <ul className="space-y-1 text-xs text-zinc-300">
          {picked.map((file) => (
            <li key={fileKey(file)} className="flex items-center gap-2 font-mono">
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="shrink-0 text-zinc-600">· {humanSize(file.size)}</span>
              <button
                type="button"
                onClick={() => apply(picked.filter((other) => fileKey(other) !== fileKey(file)))}
                aria-label={t("removeFile", { name: file.name })}
                title={t("removeFile", { name: file.name })}
                className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked.length > 1 && (
        <button type="button" onClick={() => apply([])} className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200">
          <X className="h-3 w-3" /> {t("clearFiles")}
        </button>
      )}
      {problem && (
        <p role="alert" className="text-xs text-red-400">
          {t(MESSAGE_KEY[problem], { n: MAX_FILES, size: humanSize(MAX_TOTAL_BYTES) })}
        </p>
      )}
    </div>
  );
}
