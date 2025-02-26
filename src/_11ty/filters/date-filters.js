const { DateTime } = require("luxon");

/**
 * Format dates for display in templates
 */
module.exports = {
  /**
   * Format a date as dd/mm/yyyy
   * @param {Date} date - The date to format
   * @return {string} The formatted date string
   */
  shortDateFormat: function(date) {
    return DateTime.fromJSDate(date).toFormat("dd‑MM‑yyyy");
  },

  /**
   * Format a date as d LLLL yyyy (e.g. 1 January 2023)
   * @param {Date} date - The date to format
   * @return {string} The formatted date string
   */
  dateFormat: function(date) {
    return DateTime.fromJSDate(date).toFormat("d LLLL yyyy");
  }
};
