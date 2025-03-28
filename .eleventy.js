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
  eleventyConfig.addPassthroughCopy("src/images"); // Add this line for images

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
