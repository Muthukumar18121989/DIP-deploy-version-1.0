/**
 * Checkbox — native input with a styled box, so keyboard and form semantics
 * are untouched.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.Checkbox = function Checkbox(options) {
    options = options || {};
    uid += 1;
    var id = options.id || 'checkbox-' + uid;

    var input = el('input', {
      className: 'checkbox__input',
      attrs: {
        id: id,
        type: 'checkbox',
        checked: Boolean(options.checked),
        'aria-label': options.ariaLabel || false
      },
      on: options.onChange ? { change: function (e) { options.onChange(e.target.checked); } } : {}
    });

    return el('span', { className: 'checkbox' }, [
      el('span', { style: { position: 'relative', display: 'inline-flex' } }, [
        input,
        el('span', { className: 'checkbox__box', attrs: { 'aria-hidden': 'true' } }, [DA.icons.check(16)])
      ]),
      options.label ? el('label', { text: options.label, attrs: { for: id } }) : null
    ]);
  };
})(window.DA);
