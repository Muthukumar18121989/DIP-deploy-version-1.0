/**
 * Shipping profile source data — opened from a shipping profile link in a
 * scenario's bid table.
 *
 * Shows the source data behind one bid's shipping profile, split into Services
 * and Accessorial views with account/service filters over each.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;

  DA.dialogs = DA.dialogs || {};

  /** Each filter opens onto the choices recorded for it, defaulting to All. */
  function filterSelect(label) {
    var key = label.toLowerCase();
    var values = DA.data.filterOptions[key] ||
      ['All'].concat(DA.data.filterOptions.accountSuffix);
    return DA.components.SelectField({
      label: label,
      value: 'All',
      options: values.map(function (value) { return { value: value, label: value }; })
    });
  }

  /**
   * One tab's body: its filters over a table of matching source rows.
   * Both tabs share a shape — the first column is named for the tab, and the
   * Accessorial view adds an accessorial filter.
   */
  function sourceView(options) {
    var C = DA.components;

    return el('div', {}, [
      el('div', { className: 'filter-grid' },
        ['Account', 'Service'].concat(options.extraFilter || []).map(filterSelect)
      ),
      el('div', { className: 'card' }, [
        C.DataTable({
          caption: options.label + ' source data',
          embedded: true,
          headerTone: 'warm',
          columns: [
            { key: 'name', label: options.label },
            { key: 'adu', label: 'ADU', width: '30%' },
            { key: 'volume', label: '% Total Volume', width: '30%' }
          ],
          rows: options.rows || [],
          emptyState: el('p', { className: 'table-empty', text: 'No data available.' })
        })
      ])
    ]);
  }

  /**
   * @param {Object} bid       the bid row whose profile was clicked
   * @param {Object} scenario  the scenario the bid belongs to
   * @param {Object} packet    the analyzer packet, for the report window
   */
  DA.dialogs.ShippingProfileDialog = function ShippingProfileDialog(bid, scenario, packet) {
    var C = DA.components;
    var format = DA.format;

    function meta(label, value) {
      return el('span', { className: 'meta-item' }, [
        el('span', { text: label + ':' }),
        el('span', { className: 'meta-item__value', text: String(value) })
      ]);
    }

    var body = el('div', {}, [
      el('div', { className: 'dialog-toolbar' }, [
        C.Button({
          label: 'Download Source Data',
          variant: 'quiet-link',
          icon: DA.icons.download(16)
        }),
        C.HelpButton('Downloads the source data behind this shipping profile.')
      ]),
      el('div', { className: 'card' }, [
        el('div', { className: 'card__body' }, [
          el('div', { className: 'dialog-report' }, [
            el('div', { className: 'dialog-report__group' }, [
              C.Detail({ label: 'Reference Source', value: bid.bidNumber })
            ]),
            el('div', { className: 'dialog-report__group' }, [
              C.Detail({ label: 'Report From', value: format.toIsoDate(packet.from) }),
              C.Detail({ label: 'Report To', value: format.toIsoDate(packet.to) })
            ])
          ]),
          C.Tabs({
            ariaLabel: 'Source data views',
            value: 'accessorial',
            items: [
              {
                id: 'services',
                label: 'Services',
                render: function () {
                  return sourceView({ label: 'Service', rows: bid.serviceSource });
                }
              },
              {
                id: 'accessorial',
                label: 'Accessorial',
                render: function () {
                  return sourceView({
                    label: 'Accessorial',
                    extraFilter: ['Accessorial'],
                    rows: bid.accessorialSource
                  });
                }
              }
            ]
          })
        ])
      ])
    ]);

    return C.Modal({
      size: 'wide',
      titleRule: true,
      title: bid.bidName,
      titleExtras: [
        el('span', { className: 'badge badge--success', text: 'Shipping Profile' }),
        el('span', { className: 'meta-divider' }),
        meta('Scenario Name', scenario.name),
        el('span', { className: 'meta-divider' }),
        meta('Scenario Number', scenario.number)
      ],
      body: body
    });
  };
})(window.DA);
