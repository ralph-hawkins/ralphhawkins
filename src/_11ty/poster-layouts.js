// Where the four things on a poster sit.
//
// The poster is a modular grid — 3/5/7/9 columns by four rows, every line on a
// baseline — and these layouts are what stops all 54 posts looking the same on
// it. Twelve of them across six families: a title of one, two, or three-plus
// lines, with or without a standfirst.
//
// Every placement is a grid line name. There is no arithmetic and no offset,
// so an item cannot land off the row or column grid however the table is
// edited — the worst a mistake can do is put something in the wrong cell,
// which the overlap check below then catches.
//
// **Nothing overlaps.** Layering was built here on 2026-08-16 and taken out
// the same day: every item had a z-index and an opaque mask, so a layer
// knocked out the one beneath it — the week number laid over the title, the
// date buried under it, letters losing their bowls behind something in front.
// What survives of it is the invariant below, which now asserts the opposite
// of what it used to.
//
// The table renders to CSS at build time (see css()) and is substituted into
// poster.css as @@POSTER_LAYOUTS_NARROW@@ / @@POSTER_LAYOUTS_WIDE@@. That is
// deliberate: emitting placements inline on every poster would cost real bytes
// on every page, where one shared block of rules plus a ten-byte class name
// costs almost nothing.
const { slugHash } = require("./slug-hash.js");

// The four items, in DOM order. `key` is the layout table's name for each and
// `sel` the class the CSS rule targets.
const ITEMS = [
  { key: "title", sel: ".poster__title" },
  { key: "standfirst", sel: ".poster__standfirst" },
  { key: "index", sel: ".poster__index" },
  { key: "date", sel: ".poster__date" },
];

// One spec per item: the columns it takes on a wide sheet, the columns on a
// narrow one, the rows, and whether it hangs from the top of its rows or sits
// on the bottom.
//
// align is start or end and never center — block heights are whole numbers of
// baselines and row lines are baseline multiples, so both of those keep a
// block on the grid where centring lands it half a baseline off.
const L = (wide, narrow, rows, align = "start") => ({ wide, narrow, rows, align });

// The title sits on the bottom line of its rows in every layout, so it is
// spelt once here rather than twelve times below.
const T = (wide, narrow, rows) => L(wide, narrow, rows, "end");

// A named layout: which family it belongs to, and a spec for each of the three
// placed items. The standfirst is placed the same way for every layout — see
// STANDFIRST below.
function layout(name, { family, title, index, date }) {
  return { name, family, items: { title, index, date } };
}

// Column shorthands, so a layout reads as a composition rather than a list of
// line names. Wide sheets have wings; narrow ones do not, and an item placed
// at sheet-start there would sit in a zero-width column.
//
// The two metadata items always take LEFT+RIGHTISH or LEFTISH+RIGHT, because
// those are the pairs whose columns do not meet on either sheet. LEFTISH and
// RIGHTISH look like a pair and are not: on a narrow sheet they are
// body-start/body-3 and body-2/body-end, which share a column.
const FULL_W = ["body-start", "sheet-end"];
const FULL_N = ["body-start", "sheet-end"];
const LEFT_W = ["sheet-start", "body-start"];
const LEFT_N = ["body-start", "body-2"];
const LEFTISH_W = ["sheet-start", "body-2"];
const LEFTISH_N = ["body-start", "body-3"];
const RIGHT_W = ["body-end", "sheet-end"];
const RIGHT_N = ["body-3", "body-end"];
const RIGHTISH_W = ["body-2", "sheet-end"];
const RIGHTISH_N = ["body-2", "body-end"];
const MID_W = ["body-3", "sheet-end"];
const MID_N = ["body-start", "body-end"];

// A title with no standfirst beneath it takes the last row as well.
const TALL = ["r2", "r5"];
const SHORT = ["r2", "r4"];
const HEAD = ["r1", "r2"];
const FOOT = ["r4", "r5"];

const LAYOUTS = [
  // ---- one-line title, no standfirst -------------------------------------
  layout("a1", {
    family: "1-plain",
    title: T(FULL_W, FULL_N, TALL),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(RIGHTISH_W, RIGHTISH_N, HEAD),
  }),
  // The date drops to the foot, which a two-row title leaves free.
  layout("a2", {
    family: "1-plain",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(MID_W, MID_N, FOOT, "end"),
  }),

  // ---- one-line title, standfirst ----------------------------------------
  layout("b1", {
    family: "1-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(RIGHTISH_W, RIGHTISH_N, HEAD),
  }),
  layout("b2", {
    family: "1-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(RIGHT_W, RIGHT_N, HEAD),
  }),

  // ---- two-line title ----------------------------------------------------
  layout("c1", {
    family: "2-plain",
    title: T(FULL_W, FULL_N, TALL),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(RIGHT_W, RIGHT_N, HEAD),
  }),
  layout("c2", {
    family: "2-plain",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(MID_W, MID_N, FOOT, "end"),
  }),
  layout("d1", {
    family: "2-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(RIGHTISH_W, RIGHTISH_N, HEAD),
  }),
  layout("d2", {
    family: "2-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(RIGHT_W, RIGHT_N, HEAD),
  }),

  // ---- three lines or more -----------------------------------------------
  // The title fills the field, so the metadata keeps to the head strip.
  layout("e1", {
    family: "3-plain",
    title: T(FULL_W, FULL_N, TALL),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(RIGHTISH_W, RIGHTISH_N, HEAD),
  }),
  layout("e2", {
    family: "3-plain",
    title: T(FULL_W, FULL_N, TALL),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(RIGHT_W, RIGHT_N, HEAD),
  }),
  layout("f1", {
    family: "3-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFT_W, LEFT_N, HEAD),
    date: L(RIGHTISH_W, RIGHTISH_N, HEAD),
  }),
  layout("f2", {
    family: "3-note",
    title: T(FULL_W, FULL_N, SHORT),
    index: L(LEFTISH_W, LEFTISH_N, HEAD),
    date: L(RIGHT_W, RIGHT_N, HEAD),
  }),
];

// The standfirst is placed by family rather than per layout, because there is
// only one thing to decide and repeating it twelve times would be twelve
// chances to get it wrong.
//
// It crosses at least two columns everywhere. The whole measure on a portrait
// sheet is three; on a wide one it was the left wing alone, which is a single
// module at 1440 — a 45-character description in a 211px column is five lines
// of a two-line thought. Running it from the sheet's left edge to body-2 gives
// it the wing plus one body column: two modules at 1440, three at 1920, and
// never fewer than two. It still starts on the sheet's own left line, so the
// composition keeps its left anchor.
const STANDFIRST = L(["sheet-start", "body-2"], ["body-start", "body-end"], FOOT);

const BY_NAME = new Map(LAYOUTS.map((l) => [l.name, l]));

// "r2" / "r5" -> 3. The row line names are the only arithmetic in this file,
// and it is this.
const rowIndex = (name) => Number(name.slice(1));
const rowSpan = (spec) => rowIndex(spec.rows[1]) - rowIndex(spec.rows[0]);

// Family from the content — the two facts that are true of a post — and the
// variant from the slug, so two posts that look alike to the family rule still
// differ. Same hash the colour uses: stable for the life of a post, and adding
// an earlier post never reshuffles a later one.
function family(lines, hasStandfirst) {
  const band = lines <= 1 ? "1" : lines === 2 ? "2" : "3";
  return `${band}-${hasStandfirst ? "note" : "plain"}`;
}

function pick(slug, lines, hasStandfirst, override) {
  if (typeof override === "string" && BY_NAME.has(override)) return BY_NAME.get(override);
  if (override && typeof override === "object" && BY_NAME.has(override.layout)) {
    return BY_NAME.get(override.layout);
  }
  const pool = LAYOUTS.filter((l) => l.family === family(lines, hasStandfirst));
  if (pool.length === 0) throw new Error(`poster-layouts: no layout for family ${family(lines, hasStandfirst)}`);
  return pool[slugHash(slug) % pool.length];
}

// NOTHING OVERLAPS
// ---------------------------------------------------------------------------
// With no masks, an overlap is an overprint — two lots of ink in one place,
// which reads as a mistake rather than a composition. So the invariant is
// simply that no two cells meet, on either sheet, and the build stops if they
// do.
//
// Cells, not ink, and that limit is worth stating: the metadata is
// shrink-wrapped to its own text and can run past its cell, so cells that meet
// prove an overprint while cells that clear do not prove there is none. The CDP
// harness measures painted rects and is what actually settles it.
const COL_ORDER = ["sheet-start", "body-start", "body-2", "body-3", "body-end", "sheet-end"];
const colIndex = (name) => {
  const i = COL_ORDER.indexOf(name);
  if (i < 0) throw new Error(`poster-layouts: unknown column line "${name}"`);
  return i;
};

const overlap1D = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));

function cell(spec, where) {
  return {
    x: [colIndex(spec[where][0]), colIndex(spec[where][1])],
    y: [rowIndex(spec.rows[0]), rowIndex(spec.rows[1])],
  };
}

// A "-plain" family has no standfirst in the DOM at all, so its last row is
// free and its title takes it. Checking a standfirst that will never exist
// reported every plain layout as overlapping.
const hasStandfirst = (l) => l.family.endsWith("-note");

function validate() {
  for (const l of LAYOUTS) {
    const specs = { ...l.items };
    if (hasStandfirst(l)) specs.standfirst = STANDFIRST;
    const keys = Object.keys(specs).filter((k) => specs[k]);
    for (const where of ["narrow", "wide"]) {
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          const a = cell(specs[keys[i]], where);
          const b = cell(specs[keys[j]], where);
          if (overlap1D(a.x, b.x) * overlap1D(a.y, b.y) > 0) {
            throw new Error(
              `poster-layouts: ${l.name} (${where}) overlaps ${keys[i]} and ${keys[j]} — nothing on the sheet may overprint`
            );
          }
        }
      }
    }
  }
  return LAYOUTS.length;
}

// The rules, rendered once and shared by every post. Only what differs per
// layout is emitted — the type lives in poster.css, and these place it.
function rules(where) {
  const out = [];
  for (const l of LAYOUTS) {
    // --poster-span is how many rows the title may use for its size, and it is
    // simply how many its own placement takes. It used to be a :has() rule
    // guessing from whether a standfirst existed; now the layout that decided
    // the rows decides the budget too, so the two cannot disagree.
    out.push(`.poster--${l.name} { --poster-span: ${rowSpan(l.items.title)}; }`);
    for (const { key, sel } of ITEMS) {
      // Placing a standfirst a plain layout can never have would be dead CSS
      // on every page that uses it.
      if (key === "standfirst" && !hasStandfirst(l)) continue;
      const spec = key === "standfirst" ? STANDFIRST : l.items[key];
      if (!spec) continue;
      const cols = spec[where];
      out.push(
        `.poster--${l.name} ${sel} {` +
          ` grid-column: ${cols[0]} / ${cols[1]};` +
          ` grid-row: ${spec.rows[0]} / ${spec.rows[1]};` +
          ` align-self: ${spec.align};` +
          ` }`
      );
    }
  }
  return out.join("\n");
}

function css(where) {
  return rules(where);
}

// What the template asks for.
function posterLayout(slug, lines, description, override) {
  const chosen = pick(slug, lines, Boolean(description), override);
  return { name: chosen.name, layout: chosen };
}

module.exports = {
  LAYOUTS, ITEMS, STANDFIRST, pick, family, css, rowSpan, posterLayout,
  validate, BY_NAME,
  // Both tokens css-bundle.js substitutes into poster.css.
  tokens: {
    "@@POSTER_LAYOUTS_NARROW@@": css("narrow"),
    "@@POSTER_LAYOUTS_WIDE@@": css("wide"),
  },
};
