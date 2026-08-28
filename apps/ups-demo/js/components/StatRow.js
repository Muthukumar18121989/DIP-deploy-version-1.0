/**
 * StatRow — a row of counts summarising the records below it.
 * Each tile carries an icon, the number, and a labelled help affordance.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.StatRow = function StatRow(options) {
    options = options || {};

    return el('div', {
      className: 'stat-row',
      attrs: { role: 'group', 'aria-label': options.ariaLabel || 'Summary counts' }
    }, (options.items || []).map(function (item) {
      return el('div', { className: 'stat' }, [
        el('span', { className: 'stat__icon' }, [item.icon]),
        el('p', { className: 'stat__value', text: String(item.value) }),
        el('p', { className: 'stat__label' }, [
          el('span', { text: item.label }),
          item.help ? DA.components.HelpButton(item.help) : null
        ])
      ]);
    }));
  };
})(window.DA);
