/**
 * Breadcrumb — the trail back up the record hierarchy. The last item is the
 * current location and is not a link.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.Breadcrumb = function Breadcrumb(options) {
    options = options || {};
    var items = options.items || [];
    var separator = options.separator || '>';

    return el('nav', { className: 'breadcrumb', attrs: { 'aria-label': 'Breadcrumb' } }, [
      el('ol', { className: 'breadcrumb__list' }, items.map(function (item, index) {
        var last = index === items.length - 1;
        return el('li', { className: 'breadcrumb__item' }, [
          last || !item.onClick
            ? el('span', { text: item.label, attrs: { 'aria-current': last ? 'page' : false } })
            : el('a', {
                text: item.label,
                attrs: { href: item.href || '#' },
                on: { click: function (e) { e.preventDefault(); item.onClick(); } }
              }),
          last ? null : el('span', {
            className: 'breadcrumb__separator',
            text: separator,
            attrs: { 'aria-hidden': 'true' }
          })
        ]);
      }))
    ]);
  };
})(window.DA);
