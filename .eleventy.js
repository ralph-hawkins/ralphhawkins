const dateFilters = require("./src/_11ty/filters/date-filters.js");

module.exports = function(eleventyConfig) {
  // Add date filters
  Object.keys(dateFilters).forEach(filterName => {
    eleventyConfig.addFilter(filterName, dateFilters[filterName]);
  });

  // Add assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/fonts");

  // Add site data
  eleventyConfig.addGlobalData("site", {
    url: process.env.ELEVENTY_ENV === "production"
      ? "https://ralph-hawkins.github.io/ralphhawkins"
      : ""
  });

  // Config
  return {
    dir: {
      input: "src",
      output: "_site"
    },
    pathPrefix: "/ralphhawkins/",
    templateFormats: ["md", "njk", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
