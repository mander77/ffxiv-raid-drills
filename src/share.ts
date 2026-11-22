// Sharing the screen you are on. Every screen keeps its state in the address bar (see router.ts):
// a quiz card, a drill with its pattern code, a fight with its code, picks and moment. So sharing
// the current address shares exactly what is on screen.

/** What happened: the share sheet opened, the link was copied, a box showed the link to copy, or
    you closed the share sheet. */
export type ShareResult = "shared" | "copied" | "shown" | "cancelled";

/* On a phone or tablet the system share sheet opens. Elsewhere the link goes to the clipboard.
   Some browsers and embedded views block the Clipboard API; then the older copy from a hidden text
   field is tried, and if that fails too, a box shows the link to copy. */
export async function shareLink(): Promise<ShareResult> {
  const url = location.href,
    touch = window.matchMedia("(pointer: coarse)").matches;
  try {
    // TS note: `"share" in navigator` checks at run time; older browsers do not have it.
    if (touch && "share" in navigator) {
      await navigator.share({ title: document.title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (err) {
    // Closing the share sheet without sharing is not an error to report.
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    if (copyByField(url)) return "copied";
    window.prompt("Copy this link:", url);
    return "shown";
  }
}

/** The older way to copy: select the text in a hidden field and run the copy command. */
function copyByField(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(field);
  field.select();
  let ok = false;
  // TS note: execCommand is marked deprecated in the DOM types, but every browser still runs it,
  // and it is the only copy that works where the Clipboard API is blocked.
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  field.remove();
  return ok;
}
