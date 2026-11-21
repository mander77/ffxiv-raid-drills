import { useEffect } from "react";
import { useNavigate } from "react-router";

/** The old screens draw plain <a href="/..."> links. Open them with React Router, without loading
    the page again. A click with a modifier key, such as Ctrl-click for a new tab, works as usual.
    The rebuild drops this hook once no old screen is left. */
export function useInAppLinks(): void {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      // A React Router <Link> has already handled its own click (defaultPrevented).
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="/"]');
      if (!a || a.target) return;
      e.preventDefault();
      navigate(a.getAttribute("href") ?? "/");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
}
