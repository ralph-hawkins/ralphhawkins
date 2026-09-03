// The masthead — the name in the site header — and its type, solved the same
// way a post title's is.
//
// It is here rather than written into base.njk because three things need it
// and they must not drift apart: the markup that prints it, the fit that sizes
// it, and poster-grid.js, which derives the breakpoint where the name stops
// stacking from that same fit. One string, one solver, one answer.
//
// Not called `hero`: front matter already uses `hero: false` to drop the header
// on the notes list, and a global of that name sitting under the same key is a
// collision waiting to confuse someone.
const { posterFit } = require("../_11ty/title-fit.js");

const NAME = "Ralph Hawkins";

// The fitter fills the measure with the longest line, so the line it chooses is
// what decides the size. For a two-word name there are only two candidates and
// the site wants both:
//
//   one   "Ralph Hawkins" on a line — 6.375em, which is what posterFit picks
//         on its own at every width, being nearer its targets than the break
//   two   "Ralph" over "Hawkins" — 3.755em, the longest of the two words
//
// The second is obtained by fitting that longest word, which is the same
// question the solver asks internally when it costs a multi-line candidate:
// how wide is the longest line. Asking it this way rather than adding a
// forced-line-count argument keeps the width arithmetic — advances, GPOS
// kerning and the letter-spacing that has to be added after every character —
// in the one place that already implements it.
//
// The break itself needs no instruction. poster.css sets the title's box to the
// fitted line width in em, and the browser breaks to fit the box; the hero does
// the same. A box one word wide *is* the two-line stack.
const words = NAME.split(/\s+/);
const longest = words.reduce((a, b) => (posterFit(b).lineWide > posterFit(a).lineWide ? b : a));

module.exports = {
  name: NAME,
  longestWord: longest,
  one: posterFit(NAME),
  two: posterFit(longest),
};
