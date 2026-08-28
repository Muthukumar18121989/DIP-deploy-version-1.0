/**
 * StatusBadge — compact state pill.
 * The tone map keeps one status spelling tied to one colour everywhere.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var TONE_BY_STATUS = {
    'Sourcing Data': 'info',
    'Scenario Setup': 'info',
    'In Progress': 'info',
    'Completed': 'success',
    'Pending Review': 'warning',
    'Error Occurred': 'error',
    'Draft': 'neutral',
    'Current': 'neutral',
    'Analysis In Progress': 'info'
  };

  DA.components.StatusBadge = function StatusBadge(status, options) {
    options = options || {};
    var tone = TONE_BY_STATUS[status] || 'neutral';
    return el('span', {
      className: 'badge badge--' + tone + (options.pill ? ' badge--pill' : ''),
      text: status,
      attrs: { title: status }
    });
  };

  DA.components.StatusBadge.toneFor = function (status) {
    return TONE_BY_STATUS[status] || 'neutral';
  };
})(window.DA);
