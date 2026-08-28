/**
 * Alert — contextual banner with a leading severity bar.
 * tone: 'info' (default) | 'success' | 'error'
 * plain: drops the leading severity bar, for guidance rather than status.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.Alert = function Alert(options) {
    options = options || {};
    var tone = options.tone || 'info';

    return el('div', {
      className: 'alert alert--' + tone + (options.plain ? ' alert--plain' : ''),
      attrs: { role: tone === 'error' ? 'alert' : 'status' }
    }, [
      el('span', { className: 'alert__icon' }, [DA.icons.info(18)]),
      el('span', { text: options.message })
    ]);
  };
})(window.DA);
