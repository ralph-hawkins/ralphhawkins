const { DateTime } = require("luxon");

module.exports = {
  dateFormat: function(date) {
    return DateTime.fromJSDate(date).toFormat("d LLLL yyyy");
  }
};
