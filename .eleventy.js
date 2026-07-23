const path = require("path");
const dateFilters = require("./src/_11ty/filters/date-filters.js");
const { imageSize } = require("./src/_11ty/filters/image-size.js");
const { inlineImports } = require("./src/_11ty/css-bundle.js");

module.exports = function(eleventyConfig) {
  // Add date filters
  Object.keys(dateFilters).forEach(filterName => {
    eleventyConfig.addFilter(filterName, dateFilters[filterName]);
  });

  // Reads intrinsic width/height from an image file so templates can reserve
  // layout space and avoid CLS.
  eleventyConfig.addFilter("imageSize", imageSize);

  // Same slug→hue seed the OG images use, so a post's live blob colours match
  // its share card (random-gradients.js reads this off <html data-blob-hue>).
  eleventyConfig.addFilter("blobHue", require("./src/_11ty/og-images.js").hueFromSlug);

  // Per-post SVG favicon in the same seeded colours, as a data URI.
  eleventyConfig.addFilter("blobFavicon", require("./src/_11ty/og-images.js").faviconDataUri);

  // Browser-chrome theme colour: 20% tint of the post's blob hue.
  eleventyConfig.addFilter("blobThemeColor", require("./src/_11ty/og-images.js").themeColor);

  // Markdown footnotes ([^1] syntax). The caption override drops the default
  // [n] brackets so the reference is a bare superscript digit — see footnote
  // styles in components.css.
  eleventyConfig.amendLibrary("md", (md) => {
    md.use(require("markdown-it-footnote"));
    md.renderer.rules.footnote_caption = (tokens, idx) => {
      let n = String(tokens[idx].meta.id + 1);
      if (tokens[idx].meta.subId > 0) n += `:${tokens[idx].meta.subId}`;
      return n;
    };
    md.renderer.rules.footnote_block_open = () =>
      '<hr class="footnotes-sep">\n' +
      '<section class="footnotes">\n' +
      '<h3>Foot notes</h3>\n' +
      '<ol class="footnotes-list">\n';
  });

  // Add collection for public weeknotes only
  // Excludes any weeknotes with preview: true in front matter
  // Use this collection for navigation, footer lists, and homepage redirects
  eleventyConfig.addCollection("publicWeeknotes", function(collectionApi) {
    return collectionApi.getFilteredByTag("weeknotes")
      .filter(post => !post.data.preview);
  });

  // Add collection for weeknotes grouped by year and month
  // Only includes public weeknotes (preview posts are filtered out)
  eleventyConfig.addCollection("weeknotesByDate", function(collectionApi) {
    const posts = collectionApi.getFilteredByTag("weeknotes")
      .filter(post => !post.data.preview) // Exclude preview posts
      .reverse();

    // Group by numeric year and month (0–11) so ordering is plain number
    // sorting; the month's display name is formatted only at the end, never
    // parsed back from a string.
    const grouped = {};
    posts.forEach(post => {
      const year = post.date.getFullYear();
      const month = post.date.getMonth();

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];

      grouped[year][month].push(post);
    });

    // Convert to array structure to preserve descending order
    // (JS objects iterate integer-like keys in ascending order)
    return Object.keys(grouped)
      .sort((a, b) => b - a) // Sort years descending
      .map(year => ({
        year,
        months: Object.keys(grouped[year])
          .sort((a, b) => b - a) // Sort months descending
          .map(month => ({
            month: new Date(year, month).toLocaleString('en-GB', { month: 'long' }),
            posts: grouped[year][month]
          }))
      }));
  });

  // Add collection for gallery items (newest first)
  eleventyConfig.addCollection("gallery", function(collectionApi) {
    return collectionApi.getFilteredByTag("gallery").sort((a, b) => {
      return b.date - a.date; // Sort by date, newest first
    });
  });

  // Navigation filters for prev/next post links
  eleventyConfig.addFilter("getPrevPost", function(collection, page) {
    const index = collection.findIndex(post => post.url === page.url);
    return index > 0 ? collection[index - 1] : null;
  });

  eleventyConfig.addFilter("getNextPost", function(collection, page) {
    const index = collection.findIndex(post => post.url === page.url);
    return index >= 0 && index < collection.length - 1 ? collection[index + 1] : null;
  });

  // Sequential number of a post within a collection (oldest = 1)
  eleventyConfig.addFilter("getPostNumber", function(collection, page) {
    const index = collection.findIndex(post => post.url === page.url);
    return index >= 0 ? index + 1 : null;
  });

  // Bundle CSS: main.css has its @import chain inlined at build time and is
  // written to /css/main.css as a single file; every other .css file is a
  // partial of that bundle, so it compiles to nothing on its own (returning
  // undefined tells Eleventy to skip it). Registering .css as a template
  // format also makes the dev server watch the partials for changes.
  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: function (inputContent, inputPath) {
      if (path.basename(inputPath) !== "main.css") return;
      return () => inlineImports(inputPath);
    }
  });

  // Generate Open Graph images for week notes and the homepage after each
  // build. Writes to _site/images/og/; head-common.njk points at these when a
  // page has no explicit image in front matter.
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const { generateOgImages } = require("./src/_11ty/og-images.js");
    const count = await generateOgImages(path.join(dir.output, "images", "og"));
    if (count > 0) console.log(`[og-images] rendered ${count} image(s)`);
  });

  // Add assets
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/CNAME");

  // Add site data
  eleventyConfig.addGlobalData("site", {
    url: "https://ralphhawkins.co.uk"
  });

  // Config
  return {
    dir: {
      input: "src",
      output: "_site"
    },
    pathPrefix: "/", // Custom domain uses root path
    templateFormats: ["md", "njk", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
