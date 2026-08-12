const { DateTime } = require("luxon");

/**
 * Format dates for display in templates
 */
module.exports = {
  /**
   * Format a date as d LLLL yyyy (e.g. 1 January 2023)
   * @param {Date} date - The date to format
   * @return {string} The formatted date string
   */
  dateFormat: function(date) {
    return DateTime.fromJSDate(date)
      .setZone("Europe/London")
      .toFormat("d LLLL yyyy");
  },

  /**
   * Format a date with its time as HH:mm, d LLLL yyyy (e.g. 20:48, 18 July
   * 2026), pinned to UK time so commits made abroad still read consistently.
   * @param {Date} date - The date to format
   * @return {string} The formatted date-time string
   */
  dateTimeFormat: function(date) {
    return DateTime.fromJSDate(date)
      .setZone("Europe/London")
      .toFormat("HH:mm, d LLLL yyyy");
  },

  /**
   * Format a date as ISO 8601 for structured data
   * @param {Date} date - The date to format
   * @return {string} The ISO formatted date string
   */
  isoDate: function(date) {
    return DateTime.fromJSDate(date).toISO();
  }
};
