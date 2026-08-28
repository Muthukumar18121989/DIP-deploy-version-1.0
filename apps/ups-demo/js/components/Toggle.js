/**
 * Toggle — labelled switch. Rendered as a real button with `aria-checked`
 * so it announces its state and responds to Space/Enter.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.Toggle = function Toggle(options) {
    options = options || {};
    var checked = Boolean(options.checked);

    var control = el('button', {
      className: 'toggle',
      attrs: {
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': options.ariaLabel || options.label
      },
      on: {
        click: function () {
          checked = !checked;
          control.setAttribute('aria-checked', checked ? 'true' : 'false');
          if (options.onChange) options.onChange(checked);
        }
      }
    });

    var row = el('div', { className: 'toggle-row' }, [
      options.label ? el('span', { text: options.label }) : null,
      control,
      options.valueLabel ? el('span', { text: options.valueLabel }) : null
    ]);

    row.control = control;
    return row;
  };
})(window.DA);
