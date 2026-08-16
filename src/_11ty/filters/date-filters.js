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
   * Format a date as dd.MM.yyyy (e.g. 18.07.2026) for the post poster, where
   * the date is set as a compositional element rather than read as a
   * sentence. Zero-padded so every post's date is the same ten characters
   * wide — with tabular-nums that makes it one fixed block, which is what
   * lets it sit on a grid line.
   *
   * This filter existed once before, for the supergraphic, and went with it
   * on 2026-08-12 (git show a3e24ad). Restored rather than reinvented.
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
