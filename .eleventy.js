const dateFilters = require("./src/_11ty/filters/date-filters.js");

module.exports = function(eleventyConfig) {
  // Add date filters
  Object.keys(dateFilters).forEach(filterName => {
    eleventyConfig.addFilter(filterName, dateFilters[filterName]);
  });

  // Add collection for weeknotes grouped by year and month
  eleventyConfig.addCollection("weeknotesByDate", function(collectionApi) {
    const posts = collectionApi.getFilteredByTag("weeknotes").reverse();
    const grouped = {};

    posts.forEach(post => {
      const year = post.date.getFullYear();
      const month = post.date.toLocaleString('en-GB', { month: 'long' });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];

      grouped[year][month].push(post);
    });

    // Convert to sorted structure for consistent ordering
    const sortedGrouped = {};
    const years = Object.keys(grouped).sort((a, b) => b - a); // Sort years descending

    years.forEach(year => {
      sortedGrouped[year] = {};
      const months = Object.keys(grouped[year]);
      // Sort months by date rather than alphabetically
      months.sort((a, b) => {
        const dateA = new Date(`${a} 1, ${year}`);
        const dateB = new Date(`${b} 1, ${year}`);
        return dateB - dateA; // Descending order
      });

      months.forEach(month => {
        sortedGrouped[year][month] = grouped[year][month];
      });
    });

    return sortedGrouped;
  });

  // Add collection for gallery items (newest first)
  eleventyConfig.addCollection("gallery", function(collectionApi) {
    return collectionApi.getFilteredByTag("gallery").sort((a, b) => {
      return b.date - a.date; // Sort by date, newest first
    });
  });

  // Add assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/images");

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
