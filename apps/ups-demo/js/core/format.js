/**
 * Date parsing and display formats shared across the workflow screens.
 * Forms capture MM/DD/YYYY; record summaries display MM-DD-YYYY.
 */
(function (DA) {
  'use strict';

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  /** MM/DD/YYYY or MM-DD-YYYY -> Date, or null when incomplete. */
  function parseDate(text) {
    var match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(String(text || '').trim());
    if (!match) return null;
    var date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Whole weeks covering the window, counting both end dates.
   * Matches the reference: 05/23/2026-08/15/2026 is 13 weeks and
   * 05/17/2025-04/04/2026 is 47 weeks.
   */
  function weeksBetween(from, to) {
    var start = parseDate(from);
    var end = parseDate(to);
    if (!start || !end || end < start) return null;
    return Math.ceil((Math.round((end - start) / 86400000) + 1) / 7);
  }

  function toDashDate(text) {
    return String(text || '').replace(/\//g, '-');
  }

  function formatDate(date) {
    return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + '-' + date.getFullYear();
  }

  /** MM-DD-YYYY or MM/DD/YYYY -> YYYY-MM-DD, the report date format. */
  function toIsoDate(text) {
    var date = parseDate(text);
    if (!date) return String(text || '');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatTimestamp(date) {
    return formatDate(date) + ' ' +
      pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  DA.format = {
    parseDate: parseDate,
    weeksBetween: weeksBetween,
    toDashDate: toDashDate,
    toIsoDate: toIsoDate,
    formatDate: formatDate,
    formatTimestamp: formatTimestamp
  };
})(window.DA);
