/**
 * Dropdown — a trigger that opens a panel beneath it.
 *
 * Closes on Escape or a click outside, and returns focus to the trigger. The
 * caller owns the panel's contents, so this handles only the popover mechanics.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.Dropdown = function Dropdown(options) {
    options = options || {};
    uid += 1;
    var panelId = 'dropdown-panel-' + uid;
    var open = false;

    var panel = el('div', {
      className: 'dropdown__panel',
      attrs: { id: panelId, hidden: true }
    }, options.content || []);

    var trigger = el('button', {
      className: 'dropdown__trigger' + (options.triggerClassName ? ' ' + options.triggerClassName : ''),
      attrs: {
        type: 'button',
        'aria-haspopup': 'true',
        'aria-expanded': 'false',
        'aria-controls': panelId
      },
      on: { click: function () { toggle(!open); } }
    }, [
      el('span', { className: 'dropdown__label', text: options.label }),
      DA.icons.chevronDown(18, 'dropdown__chevron')
    ]);

    var root = el('div', {
      className: 'dropdown',
      on: {
        keydown: function (event) {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            toggle(false);
            trigger.focus();
          }
        }
      }
    }, [trigger, panel]);

    function onDocumentClick(event) {
      if (!root.contains(event.target)) toggle(false);
    }

    function toggle(next) {
      open = next;
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      root.classList.toggle('dropdown--open', open);
      if (open) {
        document.addEventListener('click', onDocumentClick, true);
      } else {
        document.removeEventListener('click', onDocumentClick, true);
      }
    }

    root.close = function () {
      toggle(false);
      trigger.focus();
    };
    return root;
  };
})(window.DA);
