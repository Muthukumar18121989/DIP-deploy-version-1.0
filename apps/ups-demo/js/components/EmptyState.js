/**
 * EmptyState — shown in place of table rows when a filter returns nothing.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.EmptyState = function EmptyState(options) {
    options = options || {};
    var icon = DA.icons.inbox();
    icon.setAttribute('class', 'empty-state__icon');

    return el('div', { className: 'empty-state' }, [
      icon,
      el('p', { className: 'empty-state__title', text: options.title || 'Nothing to show' }),
      options.description
        ? el('p', { className: 'empty-state__description', text: options.description })
        : null
    ]);
  };
})(window.DA);
