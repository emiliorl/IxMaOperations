"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Loader2, PenLine } from "lucide-react";
import { addComment, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { errorMessageKey } from "./error-messages";
import { FileField } from "./FileField";
import { Markdown } from "./Markdown";

export function CommentForm({ locale, ticketId, isAdmin }: { locale: string; ticketId: string; isAdmin: boolean }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(addComment, {});
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEs = locale !== "en";

  const insertFormatting = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = message.substring(start, end) || placeholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const nextMessage = message.substring(0, start) + replacement + message.substring(end);
    setMessage(nextMessage);

    setTimeout(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ticketId" value={ticketId} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="c-message" className="text-xs font-mono uppercase tracking-wider text-zinc-400 mr-2">
            {t("addComment")}
          </label>
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              tab === "write" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <PenLine className="h-3 w-3" />
            {t("previewWrite")}
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
              tab === "preview" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Eye className="h-3 w-3" />
            {t("previewTab")}
          </button>
        </div>

        {tab === "write" && (
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-400">
            <button
              type="button"
              title={isEs ? "Negrita (**texto**)" : "Bold (**text**)"}
              onClick={() => insertFormatting("**", "**", isEs ? "texto" : "text")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white font-bold"
            >
              B
            </button>
            <button
              type="button"
              title={isEs ? "Cursiva (*texto*)" : "Italic (*text*)"}
              onClick={() => insertFormatting("*", "*", isEs ? "texto" : "text")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white italic font-serif"
            >
              I
            </button>
            <button
              type="button"
              title={isEs ? "Código (`código`)" : "Inline code (`code`)"}
              onClick={() => insertFormatting("`", "`", isEs ? "código" : "code")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white text-[11px]"
            >
              {"</>"}
            </button>
            <button
              type="button"
              title={isEs ? "Bloque de código (```código```)" : "Code block (```code```)"}
              onClick={() => insertFormatting("```text\n", "\n```", isEs ? "código o prompt" : "code or prompt")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white text-[11px]"
            >
              {"{ }"}
            </button>
            <button
              type="button"
              title={isEs ? "Lista (* elemento)" : "Bullet list (* item)"}
              onClick={() => insertFormatting("\n* ", "", isEs ? "elemento" : "item")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white text-[11px]"
            >
              {"•—"}
            </button>
            <button
              type="button"
              title={isEs ? "Línea divisoria (---)" : "Horizontal rule (---)"}
              onClick={() => insertFormatting("\n\n---\n\n", "", "")}
              className="rounded px-1.5 py-0.5 hover:bg-zinc-800 hover:text-white text-[11px]"
            >
              {"―"}
            </button>
          </div>
        )}
      </div>

      {tab === "write" ? (
        <Textarea
          ref={textareaRef}
          id="c-message"
          name="message"
          rows={6}
          required
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isEs ? "Escribe tu respuesta... (soporta Markdown: negrita, listas, código)" : "Write your reply... (Markdown supported: bold, lists, code)"}
          className="text-xs sm:text-sm font-mono leading-relaxed"
        />
      ) : (
        <>
          <input type="hidden" name="message" value={message} />
          <div className="min-h-[140px] max-h-[380px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
            {message.trim() ? (
              <Markdown>{message}</Markdown>
            ) : (
              <p className="text-xs italic text-zinc-500">{t("previewEmpty")}</p>
            )}
          </div>
        </>
      )}

      <FileField id="c-files" />
      {isAdmin && (
        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input type="checkbox" name="internal" className="accent-zinc-300" />
          {t("internalNote")}
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {t(errorMessageKey(state.error, "ticket"), { n: 5, size: "4 MB" })}
        </p>
      )}
      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
