/**
 * Modal — dialog over a dimmed backdrop.
 *
 * Traps Tab inside the dialog, closes on Escape or a backdrop click, and hands
 * focus back to whatever the caller nominates on close.
 * `variant: 'drawer'` anchors it to the right edge as a full-height side sheet.
 * `size: 'wide'` widens the dialog; `titleExtras` places chips or metadata
 * beside the title; `titleRule` draws the brand rule beneath it; `accent`
 * draws the brand line along the top edge.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  var uid = 0;

  DA.components.Modal = function Modal(options) {
    options = options || {};
    uid += 1;
    var titleId = 'modal-title-' + uid;
    var previouslyFocused = document.activeElement;

    var closeButton = el('button', {
      className: 'modal__close',
      attrs: { type: 'button', 'aria-label': 'Close dialog' },
      on: { click: close }
    }, [DA.icons.close(18)]);

    var drawer = options.variant === 'drawer';

    var dialog = el('div', {
      className: 'modal__dialog' +
        (drawer ? ' modal__dialog--drawer' : '') +
        (options.size === 'wide' ? ' modal__dialog--wide' : '') +
        (options.accent ? ' modal__dialog--accent' : ''),
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }
    }, [
      el('div', { className: 'modal__header' + (drawer ? ' modal__header--drawer' : '') }, [
        el('div', { className: 'modal__title-row' }, [
          el('h2', {
            className: 'modal__title' + (drawer || options.titleRule ? ' title-rule' : ''),
            text: options.title,
            attrs: { id: titleId }
          })
        ].concat(options.titleExtras || [])),
        closeButton
      ]),
      el('div', { className: 'modal__body' }, [
        typeof options.body === 'string' ? el('p', { text: options.body }) : options.body
      ])
    ]);

    var root = el('div', {
      className: 'modal' + (drawer ? ' modal--drawer' : ''),
      on: {
        click: function (event) { if (event.target === root) close(); },
        keydown: function (event) {
          if (event.key === 'Escape') return close();
          if (event.key !== 'Tab') return;
          var items = Array.prototype.filter.call(
            dialog.querySelectorAll(FOCUSABLE),
            function (node) { return node.offsetParent !== null; }
          );
          if (!items.length) return;
          var first = items[0];
          var last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }, [dialog]);

    function close() {
      if (!root.parentNode) return;
      root.parentNode.removeChild(root);
      if (options.onClose) options.onClose();
      var target = options.returnFocusTo || previouslyFocused;
      if (target && typeof target.focus === 'function') target.focus();
    }

    root.open = function (container) {
      (container || document.body).appendChild(root);
      closeButton.focus();
      return root;
    };
    root.close = close;
    return root;
  };
})(window.DA);
