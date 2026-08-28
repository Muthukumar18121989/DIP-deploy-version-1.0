/**
 * Comparing two scenarios means subtracting figures that are stored as display
 * strings. These helpers read a value out of its formatting and put the result
 * back into the same shape, so a difference looks like the figures above it.
 */
(function (DA) {
  'use strict';

  function toNumber(text) {
    var value = parseFloat(String(text == null ? '' : text).replace(/[^0-9.-]/g, ''));
    return isNaN(value) ? null : value;
  }

  /** The formatting of a value: currency, percent, decimals, grouping. */
  function shapeOf(text) {
    var raw = String(text == null ? '' : text);
    var digits = raw.replace(/[^0-9.]/g, '').split('.');
    return {
      currency: raw.indexOf('$') !== -1,
      percent: raw.indexOf('%') !== -1,
      decimals: (digits[1] || '').length,
      grouped: /\d,\d/.test(raw)
    };
  }

  function group(text) {
    var parts = text.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function format(value, shape) {
    if (value == null) return '-';
    var sign = value < 0 ? '-' : '';
    var body = Math.abs(value).toFixed(shape.decimals);
    if (shape.grouped) body = group(body);
    if (shape.currency) return sign + '$ ' + body;
    return sign + body + (shape.percent ? '%' : '');
  }

  /** b - a, rendered in a's formatting. */
  function difference(a, b) {
    var left = toNumber(a);
    var right = toNumber(b);
    if (left == null || right == null) return '-';
    return format(right - left, shapeOf(a));
  }

  DA.figures = {
    toNumber: toNumber,
    shapeOf: shapeOf,
    format: format,
    difference: difference
  };
})(window.DA);
