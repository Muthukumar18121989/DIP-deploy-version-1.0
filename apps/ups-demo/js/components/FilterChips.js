/**
 * FilterChips — the filters currently applied, each removable.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.FilterChips = function FilterChips(options) {
    options = options || {};
    var values = (options.values || []).slice();
    var root = el('div', {
      className: 'filter-chips',
      attrs: { role: 'group', 'aria-label': options.ariaLabel || 'Applied filters' }
    });

    function render() {
      DA.dom.clear(root);
      values.forEach(function (value, index) {
        root.appendChild(
          el('span', { className: 'chip chip--filter' }, [
            el('span', { className: 'chip__label', text: value }),
            el('button', {
              className: 'chip__remove u-tap-target',
              attrs: { type: 'button', 'aria-label': 'Remove ' + value + ' filter' },
              on: {
                click: function () {
                  values.splice(index, 1);
                  render();
                  if (options.onChange) options.onChange(values.slice());
                }
              }
            }, [DA.icons.close(12)])
          ])
        );
      });
    }

    render();
    return root;
  };
})(window.DA);
