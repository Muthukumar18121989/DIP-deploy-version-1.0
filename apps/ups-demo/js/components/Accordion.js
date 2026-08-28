/**
 * Accordion — one collapsible section. The trigger owns `aria-expanded` and
 * points at the panel it controls.
 *
 * Pass `content` for a panel that is ready up front, or `renderContent` for one
 * built the first time it opens — which keeps a deep tree of collapsed panels
 * from building every branch nobody has looked at.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.Accordion = function Accordion(options) {
    options = options || {};
    uid += 1;
    var panelId = 'accordion-panel-' + uid;
    var triggerId = 'accordion-trigger-' + uid;
    var expanded = Boolean(options.expanded);

    var built = false;

    function fill() {
      if (built || !options.renderContent) return;
      built = true;
      DA.dom.append(panel, options.renderContent());
    }

    var panel = el('div', {
      className: 'accordion__panel',
      attrs: { id: panelId, role: 'region', 'aria-labelledby': triggerId, hidden: !expanded }
    }, options.content || []);

    if (expanded) fill();

    var trigger = el('button', {
      className: 'accordion__trigger',
      attrs: {
        type: 'button',
        id: triggerId,
        'aria-expanded': expanded ? 'true' : 'false',
        'aria-controls': panelId
      },
      on: {
        click: function () {
          expanded = !expanded;
          if (expanded) fill();
          trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          panel.hidden = !expanded;
        }
      }
    }, [
      DA.icons.chevronRight(16, 'accordion__icon'),
      el('span', { text: options.title })
    ]);

    return el('div', {
      className: 'accordion' + (options.className ? ' ' + options.className : '')
    }, [trigger, panel]);
  };
})(window.DA);
