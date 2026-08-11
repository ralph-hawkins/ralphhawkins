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
   * Format a date as dd.MM.yyyy (e.g. 18.07.2026) for the post supergraphic,
   * pinned to UK time like the rest so a build run abroad can't shift the day.
   * Ten glyphs, all fixed-width under the tabular figures the supergraphic
   * sets — so every post's date line measures the same, which is what
   * --supergraphic-line-ratio depends on. Changing the format changes that
   * ratio; remeasure it if you do.
   * @param {Date} date - The date to format
   * @return {string} The formatted date string
   */
  dateNumeric: function(date) {
    return DateTime.fromJSDate(date)
      .setZone("Europe/London")
      .toFormat("dd.MM.yyyy");
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
