// The two breakpoints computed rather than chosen: the poster's wing, and the
// masthead's one-line/two-line switch. Both are the same measure arithmetic —
// how wide is the body's text column at a given viewport — so they live
// together and share the constants below.
//
// The poster's geometry needs no query at all: poster.css floors the space
// outside the body column to a whole pair of modules with round(), so the
// sheet is always MEASURE + 2j x MODULE and each wing is exactly j modules
// wide by construction. Nothing there can drift.
//
// What still needs a threshold is *arrangement*: the date and the week number
// move out of the body's three columns and into the wings, and they can only
// do that once a wing exists. A query is the only way to ask that question,
// and a query cannot read a custom property — var() is not resolved when
// media conditions are evaluated, so @media (min-width: var(--module)) is
// simply invalid. So the number is worked out here, from the same constants
// the stylesheet builds the geometry from, and substituted into the built CSS
// by css-bundle.js. Change --font-size-base and this follows; write the
// number by hand and it would not.
//
// Mirrors src/css/variables.css. These four are the only inputs.
const ROOT_PX = 16;
const FONT_SIZE_BASE_REM = 1.43;
const SIDE_PADDING_REM = 1;
// --content-width: calc(65 * 0.54 * var(--font-size-base))
const CONTENT_WIDTH_REM = 65 * 0.54 * FONT_SIZE_BASE_REM;
// --container-padding-left, and .container's right padding, which spells the
// same length out as `calc(var(--side-padding) + 1.5em)` against a body-sized
// element. Equal above 30em, which is the only range this threshold lives in.
const CONTAINER_PADDING_REM = SIDE_PADDING_REM + 1.5 * FONT_SIZE_BASE_REM;

// The viewport width query is measured against includes the scrollbar; the
// box the sheet actually lives in — main's content box — does not. Bias the
// threshold this much later so the wing is certainly there before anything is
// placed in it. A wing that exists unused is invisible; content placed in a
// wing that does not yet exist overflows the sheet.
const SCROLLBAR_ALLOWANCE_PX = 24;

const contentWidth = CONTENT_WIDTH_REM * ROOT_PX;
const containerPadding = CONTAINER_PADDING_REM * ROOT_PX;
const sheetMargin = SIDE_PADDING_REM * ROOT_PX;

// The body's text measure, and the module it is divided into.
// (moduleWidth, not module — this is CommonJS and `module` is taken.)
const measure = contentWidth - containerPadding * 2;
const moduleWidth = measure / 3;

// A wing of one module fits when the space between the viewport edge and the
// body's text edge can hold it plus the sheet's own margin:
//
//   (vw - contentWidth) / 2 + containerPadding  >=  module + sheetMargin
//
// solved for vw.
const wingPx = contentWidth + 2 * (moduleWidth + sheetMargin - containerPadding) + SCROLLBAR_ALLOWANCE_PX;

// em rather than px, matching the site's one existing breakpoint in
// media-queries.css — and correctly, since every length in the geometry is a
// rem and only the viewport is not.
const wingEm = wingPx / ROOT_PX;

// THE MASTHEAD'S LINE SWITCH
// ---------------------------------------------------------------------------
// The hero title is fitted by the same solver as a post title (title-fit.js),
// which fills the measure with the name. Two words give two candidates: one
// line of "Ralph Hawkins", or "Ralph" over "Hawkins" — and the second sets 1.7x
// larger, because the longest line is that much shorter.
//
// The solver on its own keeps the name on one line at every width, because
// 6.375em is nearer its 5.5em narrow target than the break's 3.755em. That is
// right for a sentence-length title and wrong for a two-word name: it puts the
// masthead at 35.5px on a 320px phone, smaller than any post title on the same
// screen. So narrow stacks the two words and wide sets them on one line.
//
// **Where they swap is not a choice, it falls out of the ceiling already
// there.** typography.css caps the hero at --font-size-h1's 4.5rem, exactly as
// poster.css caps a four-character title with --poster-size-max so it stays a
// title rather than a mural. The two-line stack hits that ceiling almost at
// once and sits on it; the one-line fit climbs to it as the column widens. At
// the viewport where the one-line fit *reaches* 4.5rem, both branches are the
// same size — so switching there is continuous, and switching anywhere else is
// a visible jump.
//
//   fitOne x measure = HERO_CAP_REM  ->  measure = 458.9px  ->  vw = 559.5px
//
// The fit is read rather than written down, so the day the name or the face
// changes this follows. It comes from src/_data/masthead.js, which is where the
// name itself lives — the alternative was a second copy of the string here,
// which is exactly the drift this file exists to avoid elsewhere.
const masthead = require("../_data/masthead.js");

// Mirrors the hero's font-size ceiling in typography.css.
const HERO_CAP_REM = 4.5;

const heroFitOne = masthead.one.fitWide;
// The measure at which one fitted line reaches the ceiling.
const heroMeasurePx = (HERO_CAP_REM * ROOT_PX) / heroFitOne;
// Same bias as the wing, and for the same reason: the query is measured
// against a viewport that includes the scrollbar and the column is not. Later
// is the safe side here — it holds the two-line branch a little longer, and
// that branch is already at the ceiling, so it cannot run away.
const heroOneLinePx = heroMeasurePx + containerPadding * 2 + SCROLLBAR_ALLOWANCE_PX;
const heroOneLineEm = heroOneLinePx / ROOT_PX;

module.exports = {
  measure,
  moduleWidth,
  wingPx,
  wingEm,
  heroFitOne,
  heroOneLinePx,
  heroOneLineEm,
  // What css-bundle.js substitutes. Two decimal places, the site's rounding
  // convention for computed CSS numbers.
  tokens: {
    "@@POSTER_WING_EM@@": wingEm.toFixed(2),
    "@@HERO_ONE_LINE_EM@@": heroOneLineEm.toFixed(2),
  },
};
