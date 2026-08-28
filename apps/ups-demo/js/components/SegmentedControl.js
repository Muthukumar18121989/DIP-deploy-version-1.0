/**
 * SegmentedControl — mutually exclusive scope switch rendered as a pill group.
 * Exposed as a radiogroup so arrow keys and screen readers behave as expected.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.SegmentedControl = function SegmentedControl(options) {
    var items = options.items || [];
    var value = options.value != null ? options.value : (items[0] && items[0].value);
    var buttons = [];

    var group = el('div', {
      className: 'segmented',
      attrs: { role: 'radiogroup', 'aria-label': options.ariaLabel || 'View scope' }
    });

    function setValue(next, moveFocus) {
      value = next;
      buttons.forEach(function (button) {
        var selected = button.dataset.value === String(value);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
        button.tabIndex = selected ? 0 : -1;
        if (selected && moveFocus) button.focus();
      });
      if (options.onChange) options.onChange(value);
    }

    function onKeydown(event) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      var index = items.findIndex(function (item) { return String(item.value) === String(value); });
      var next = items[(index + step + items.length) % items.length];
      setValue(next.value, true);
    }

    items.forEach(function (item) {
      var selected = String(item.value) === String(value);
      buttons.push(
        el('button', {
          className: 'segmented__option',
          text: item.label,
          dataset: { value: item.value },
          attrs: {
            type: 'button',
            role: 'radio',
            'aria-checked': selected ? 'true' : 'false',
            tabindex: selected ? 0 : -1
          },
          on: {
            click: function () { setValue(item.value, false); },
            keydown: onKeydown
          }
        })
      );
    });

    DA.dom.append(group, buttons);
    return group;
  };
})(window.DA);
