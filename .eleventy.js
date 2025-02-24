const dateFilters = require("./src/_11ty/filters/date-filters.js");

module.exports = function(eleventyConfig) {
  // Add date filters
  Object.keys(dateFilters).forEach(filterName => {
    eleventyConfig.addFilter(filterName, dateFilters[filterName]);
  });

  // config
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
