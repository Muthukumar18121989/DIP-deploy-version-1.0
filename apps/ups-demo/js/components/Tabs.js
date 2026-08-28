/**
 * Tabs — one visible panel at a time.
 * Follows the tablist pattern: arrow keys move between tabs, Home/End jump to
 * the ends, and each panel is labelled by the tab that controls it.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.Tabs = function Tabs(options) {
    options = options || {};
    var items = options.items || [];
    uid += 1;
    var value = options.value || (items[0] && items[0].id);
    var tabs = [];

    var panel = el('div', { className: 'tabs__panel' });
    var list = el('div', {
      className: 'tabs__list',
      attrs: { role: 'tablist', 'aria-label': options.ariaLabel || 'Sections' }
    });

    function select(next, moveFocus) {
      value = next;
      tabs.forEach(function (tab) {
        var active = tab.dataset.tab === value;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (active && moveFocus) tab.focus();
      });
      var item = items.filter(function (entry) { return entry.id === value; })[0];
      panel.setAttribute('aria-labelledby', 'tab-' + uid + '-' + value);
      DA.dom.clear(panel).appendChild(item ? item.render() : el('div'));
      if (options.onChange) options.onChange(value);
    }

    function onKeydown(event) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      var index = items.findIndex(function (item) { return item.id === value; });

      if (step) {
        event.preventDefault();
        return select(items[(index + step + items.length) % items.length].id, true);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        return select(items[0].id, true);
      }
      if (event.key === 'End') {
        event.preventDefault();
        return select(items[items.length - 1].id, true);
      }
    }

    items.forEach(function (item) {
      var tab = el('button', {
        className: 'tabs__tab',
        text: item.label,
        dataset: { tab: item.id },
        attrs: {
          type: 'button',
          role: 'tab',
          id: 'tab-' + uid + '-' + item.id,
          'aria-selected': 'false',
          'aria-controls': 'tabpanel-' + uid,
          tabindex: -1
        },
        on: {
          click: function () { select(item.id, false); },
          keydown: onKeydown
        }
      });
      tabs.push(tab);
      list.appendChild(tab);
    });

    panel.setAttribute('id', 'tabpanel-' + uid);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('tabindex', '0');

    select(value, false);
    return el('div', { className: 'tabs' }, [list, panel]);
  };
})(window.DA);
