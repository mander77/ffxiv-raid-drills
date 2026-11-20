// The Share button in the header (index.html, with the usual share icon: a box with an arrow
// pointing up out of it). Every screen keeps its state in the address bar (see router.ts):
// a quiz card, a drill with its pattern code, a fight with its code, picks and moment.
// So sharing the current address shares exactly what is on screen.

/* On a phone or tablet the system share sheet opens. Elsewhere the link goes to the clipboard,
   and the button says "Link copied" for two seconds. Some browsers and embedded views block the
   Clipboard API; then the older copy from a hidden text field is tried, and if that fails too,
   a box shows the link to copy. */
export async function shareLink(btn: HTMLButtonElement): Promise<void> {
  const url = location.href, touch = window.matchMedia("(pointer: coarse)").matches;
  const label = btn.querySelector<HTMLElement>(".sharelbl") ?? btn;
  const copied = (): void => {
    label.textContent = "Link copied";
    setTimeout(() => { label.textContent = "Share"; }, 2000);
  };
  try {
    // TS note: `"share" in navigator` checks at run time; older browsers do not have it.
    if(touch && "share" in navigator){ await navigator.share({title:document.title, url}); return; }
    await navigator.clipboard.writeText(url);
    copied();
  } catch(err){
    // Closing the share sheet without sharing is not an error to report.
    if(err instanceof DOMException && err.name === "AbortError") return;
    if(copyByField(url)) copied();
    else window.prompt("Copy this link:", url);
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
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  field.remove();
  return ok;
}
