// The one breakpoint the post poster still needs, computed rather than chosen.
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
const FONT_SIZE_BASE_REM = 1.3;
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

module.exports = {
  measure,
  moduleWidth,
  wingPx,
  wingEm,
  // What css-bundle.js substitutes. Two decimal places, the site's rounding
  // convention for computed CSS numbers.
  tokens: {
    "@@POSTER_WING_EM@@": wingEm.toFixed(2),
  },
};
