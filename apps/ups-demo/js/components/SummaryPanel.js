/**
 * SummaryPanel — collapsible record header.
 *
 * Collapsed it shows the identifying fields inline. Expanded it adds the record
 * in labelled sections, each its own grid, so a value long enough to wrap grows
 * only its own row and cannot pull an unrelated section out of line.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.Detail = function Detail(options) {
    return el('p', { className: 'detail' }, [
      el('span', { className: 'detail__label', text: options.label + ':' }),
      ' ',
      el('span', {
        className: 'detail__value',
        text: options.value == null || options.value === '' ? '-' : String(options.value)
      })
    ]);
  };

  /**
   * Stacked label/value, used inside the panel's sections. The label sits above
   * the value rather than beside it, so a long value has the full width of its
   * cell to wrap into instead of the remainder of a shared line.
   */
  function SummaryField(item) {
    return el('p', {
      className: 'summary-field' + (item.wide ? ' summary-field--wide' : '')
    }, [
      el('span', { className: 'summary-field__label', text: item.label }),
      el('span', {
        className: 'summary-field__value',
        text: item.value == null || item.value === '' ? '-' : String(item.value)
      })
    ]);
  }

  DA.components.SummaryPanel = function SummaryPanel(options) {
    options = options || {};
    uid += 1;
    var bodyId = 'summary-panel-' + uid;
    var expanded = options.expanded !== false;

    var body = el('div', {
      className: 'summary-panel__body',
      attrs: { id: bodyId, hidden: !expanded }
    }, (options.sections || []).map(function (section) {
      return el('section', { className: 'summary-panel__section' }, [
        el('h3', { className: 'summary-panel__section-title', text: section.title }),
        el('div', {
          className: 'summary-panel__fields' +
            (section.layout ? ' summary-panel__fields--' + section.layout : '')
        }, (section.fields || []).map(SummaryField))
      ]);
    }));

    var header = el('button', {
      className: 'summary-panel__header',
      attrs: {
        type: 'button',
        'aria-expanded': expanded ? 'true' : 'false',
        'aria-controls': bodyId
      },
      on: {
        click: function () {
          expanded = !expanded;
          header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          body.hidden = !expanded;
        }
      }
    }, [
      DA.icons.chevronRight(16, 'summary-panel__icon'),
      el('span', { className: 'summary-panel__header-items' },
        (options.headline || []).map(function (item) {
          return DA.components.Detail(item);
        })
      )
    ]);

    return el('section', {
      className: 'summary-panel',
      attrs: { 'aria-label': options.ariaLabel || 'Record summary' }
    }, [header, body]);
  };
})(window.DA);
