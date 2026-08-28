/**
 * Panel — white content surface with an optional toolbar, body and footer.
 * The toolbar keeps filters on the left and the primary action on the right.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.Panel = function Panel(options) {
    options = options || {};

    var toolbar = options.toolbar
      ? el('div', { className: 'panel__toolbar' }, [
          el('div', { className: 'panel__toolbar-group' }, options.toolbar.filters || []),
          options.toolbar.actions && options.toolbar.actions.length
            ? el('div', { className: 'panel__toolbar-actions' }, options.toolbar.actions)
            : null
        ])
      : null;

    return el('section', {
      className: 'panel' + (options.className ? ' ' + options.className : ''),
      attrs: { 'aria-label': options.ariaLabel || false }
    }, [
      toolbar,
      el('div', { className: 'panel__body' }, options.body || []),
      options.footer || null
    ]);
  };
})(window.DA);
