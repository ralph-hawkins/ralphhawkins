// Ctrl+Alt+G draws the poster's grid over it, and again puts it away.
//
// Hidden on purpose: nothing on the page advertises it and nothing in the
// layout moves when it is on. It exists to check by eye what the measurements
// assert — that the body column's edges land on sheet column lines — without
// opening devtools or reaching for a screenshot harness.
//
// All this does is set an attribute; poster.css draws every line, from the
// same custom properties the real grid is built from. That is the point: an
// overlay drawn from its own numbers would agree with itself and tell you
// nothing.
(() => {
  const root = document.documentElement;
  const KEY = "poster-grid";

  // Kept across pages, because checking one poster against the next is the
  // whole use for it and re-pressing on every navigation would defeat that.
  // localStorage can throw where storage is blocked, and a grid overlay is
  // not worth an uncaught error on someone's phone.
  try {
    if (localStorage.getItem(KEY)) root.setAttribute("data-poster-grid", "");
  } catch {}

  addEventListener("keydown", (event) => {
    if (!event.ctrlKey || !event.altKey || event.code !== "KeyG") return;
    // e.code, not e.key: Option+G on a Mac produces "©", so the letter you
    // pressed is not the letter you get. The physical key is layout-proof.
    event.preventDefault();
    const on = root.toggleAttribute("data-poster-grid");
    try {
      if (on) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {}
  });
})();
