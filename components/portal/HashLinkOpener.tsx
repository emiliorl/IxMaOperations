"use client";

import { useEffect } from "react";

/**
 * Makes in-page links (`[text](#section-id)`) work with the collapsible cards:
 * it opens any closed <details> around the target, then scrolls to it.
 * Without JavaScript the links still jump to the heading; they just don't expand it.
 */
export function HashLinkOpener() {
  useEffect(() => {
    const go = (id: string, smooth: boolean) => {
      const target = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (!target) return false;
      for (let node: HTMLElement | null = target; node; node = node.parentElement) {
        if (node instanceof HTMLDetailsElement) node.open = true;
      }
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      return true;
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href^='#']");
      const href = link?.getAttribute("href");
      if (!href || href.length < 2) return;
      if (go(href.slice(1), true)) {
        event.preventDefault();
        history.replaceState(null, "", href);
      }
    };

    if (window.location.hash) go(window.location.hash.slice(1), false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
