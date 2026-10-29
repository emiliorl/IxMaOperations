"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ACCEPT_ATTRIBUTE, MAX_FILES, MAX_TOTAL_BYTES, checkFiles, humanSize, type FileProblem } from "@/lib/portal/attachments";

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
 */
export function FileField({ id }: { id: string }) {
  const t = useTranslations("Portal");
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File[]>([]);
  const [problem, setProblem] = useState<FileProblem | null>(null);

  const validate = (files: File[]) => {
    const found = checkFiles(files);
    setProblem(found);
    // A custom validity message stops the form from submitting until it's fixed.
    input.current?.setCustomValidity(found ? t(MESSAGE_KEY[found], { n: MAX_FILES, size: humanSize(MAX_TOTAL_BYTES) }) : "");
  };

  const clear = () => {
    if (input.current) input.current.value = "";
    setPicked([]);
    validate([]);
  };

  return (
    <div className="space-y-2">
      <input
        ref={input}
        id={id}
        name="files"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          setPicked(files);
          validate(files);
        }}
        className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-md file:border file:border-zinc-800 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:text-zinc-200 hover:file:border-zinc-600"
      />
      {picked.length > 0 && (
        <ul className="space-y-1 text-xs text-zinc-300">
          {picked.map((file) => (
            <li key={`${file.name}-${file.size}`} className="font-mono">
              {file.name} <span className="text-zinc-600">· {humanSize(file.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {picked.length > 0 && (
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200">
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
