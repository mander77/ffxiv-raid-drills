import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { tabLink, tabOf } from "../router";
import { TABS } from "../tabs";

/** The tabs under the header. Each is a link to its tab; the one you are on is marked.
    On a phone the strip scrolls sideways, and at 520 px and narrower the six tabs show as two rows of three. */
export function TabNav() {
  const current = tabOf(useLocation().pathname);
  // TS note: useRef holds a value between draws without drawing again. Here it holds the <nav>
  // element once React has made it.
  const nav = useRef<HTMLElement>(null);

  // Keep the current tab in view when the strip scrolls sideways.
  useEffect(() => {
    const strip = nav.current;
    const on = strip?.querySelector<HTMLElement>(`[data-tab="${current}"]`);
    if (!strip || !on) return;
    const left = on.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + on.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = Math.max(0, left - 12);
  }, [current]);

  return (
    <nav
      ref={nav}
      aria-label="Tabs"
      className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] max-[521px]:grid max-[521px]:grid-cols-3 max-[521px]:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((t) => (
        <Link
          key={t.id}
          to={tabLink(t.id)}
          data-tab={t.id}
          aria-current={t.id === current ? "page" : undefined}
          className={cn(
            "flex-none border-b-[3px] border-transparent px-[13px] pt-2.5 pb-[9px] text-[15px] whitespace-nowrap text-ink-2 no-underline hover:text-ink",
            "aria-[current=page]:border-heal aria-[current=page]:font-bold aria-[current=page]:text-ink",
            "max-[521px]:px-1 max-[521px]:pt-2 max-[521px]:pb-[7px] max-[521px]:text-center",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
