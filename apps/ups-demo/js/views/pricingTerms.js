/**
 * Pricing terms — the incentive structure behind a scenario's bid.
 *
 * Four views: Tier Incentives (revenue bands and the rates they unlock),
 * Services (an incentive plan per service), Accessorials, and Modifiers.
 * Modifiers has no reference screen yet.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;

  DA.views = DA.views || {};

  function editableCell(value, options) {
    options = options || {};
    return el('span', { className: 'cell-value' }, [
      el('span', { text: value }),
      options.editable === false
        ? null
        : el('button', {
            className: 'icon-action u-tap-target',
            attrs: { type: 'button', 'aria-label': 'Edit ' + value }
          }, [DA.icons.pencil(13)])
    ]);
  }

  /* ---- Tier Incentives ---------------------------------------------------- */

  function tierIncentivesView() {
    var C = DA.components;
    var tier = DA.data.tierIncentive;

    function bandCells(pick, options) {
      options = options || {};
      return tier.bands.map(function (band) {
        return el('td', {
          className: 'matrix__cell' + (band.target ? ' is-target' : '')
        }, [
          options.plain
            ? el('span', { text: band[pick] })
            : editableCell(band[pick], { editable: !band.locked })
        ]);
      });
    }

    var head = el('thead', {}, [
      el('tr', {}, [el('th', { attrs: { scope: 'col' }, text: '' })].concat(
        tier.bands.map(function (band) {
          return el('th', {
            attrs: { scope: 'col' },
            className: band.target ? 'is-target' : ''
          }, [
            band.target
              ? el('span', { className: 'matrix__target-flag', text: 'Target' })
              : el('span')
          ]);
        })
      ))
    ]);

    var body = el('tbody', {}, [
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: '% Modeled' })]
        .concat(bandCells('modeled', { plain: true }))),
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: 'Low' })]
        .concat(bandCells('low'))),
      el('tr', {}, [el('th', { className: 'matrix__label', attrs: { scope: 'row' }, text: 'High' })]
        .concat(bandCells('high', { plain: true }))),
      el('tr', { className: 'matrix__section' }, [
        el('td', { attrs: { colspan: tier.bands.length + 1 }, text: 'Service Group' })
      ])
    ].concat(tier.serviceGroups.map(function (group) {
      return el('tr', {}, [
        el('th', { className: 'matrix__label', attrs: { scope: 'row' } }, [
          el('span', { text: group.name }),
          el('span', { className: 'matrix__label-sub', text: group.codes + '  ' + group.variant })
        ])
      ].concat(group.rates.map(function (rate, index) {
        var target = tier.bands[index] && tier.bands[index].target;
        return el('td', { className: 'matrix__cell' + (target ? ' is-target' : '') }, [
          editableCell(rate)
        ]);
      })));
    })));

    return el('div', { className: 'card' }, [
      el('div', { className: 'tier-header' }, [
        el('span', { className: 'tier-header__value', text: tier.tier }),
        el('div', { className: 'tier-header__meta' }, tier.meta.map(function (item) {
          return el('div', { className: 'tier-header__item' }, [
            el('span', { className: 'tier-header__label', text: item.label }),
            el('span', { className: 'tier-header__value', text: item.value })
          ]);
        })),
        el('div', { className: 'tier-header__actions' }, [
          C.Button({
            label: 'Tier Options',
            variant: 'link',
            icon: DA.icons.chevronRight(14, ''),
            iconPosition: 'end'
          })
        ])
      ]),
      el('div', { className: 'data-table__viewport scroll-area data-table__viewport--auto' }, [
        el('table', { className: 'matrix' }, [
          el('caption', { className: 'u-visually-hidden', text: tier.tier + ' incentives' }),
          head,
          body
        ])
      ])
    ]);
  }

  /* ---- Services ----------------------------------------------------------- */

  /** The incentive settings for one service: options, method and rate grid. */
  function servicePlan() {
    var C = DA.components;
    var zones = DA.data.rateZones;

    var grid = el('table', { className: 'matrix' }, [
      el('caption', { className: 'u-visually-hidden', text: 'Weight break incentives by zone' }),
      el('thead', {}, [
        el('tr', {}, [
          el('th', {
            className: 'matrix__rowhead',
            attrs: { scope: 'col', colspan: 2, rowspan: 2 },
            text: 'Billable Weight (lbs)'
          }),
          el('th', { attrs: { scope: 'colgroup', colspan: zones.length }, text: 'Domestic' }),
          el('th', { attrs: { scope: 'col', rowspan: 2 }, text: '' })
        ]),
        el('tr', {}, zones.map(function (zone) {
          return el('th', { attrs: { scope: 'col' }, text: zone });
        }))
      ]),
      el('tbody', {}, DA.data.weightBreaks.map(function (band) {
        return el('tr', {}, [
          el('th', { className: 'matrix__rowhead', attrs: { scope: 'row' }, text: band.from }),
          el('td', { className: 'matrix__rowhead', text: band.to })
        ].concat(zones.map(function () {
          return el('td', { className: 'matrix__cell' }, [editableCell(band.rate)]);
        })).concat([
          el('td', {}, [
            el('button', {
              className: 'icon-action icon-action--danger u-tap-target',
              attrs: { type: 'button', 'aria-label': 'Remove weight break ' + band.from }
            }, [DA.icons.trash(14)])
          ])
        ]));
      }))
    ]);

    return el('div', { className: 'plan-detail' }, [
      C.Tabs({
        ariaLabel: 'Freight type',
        value: 'commercial',
        items: [
          { id: 'commercial', label: 'Commercial Frt', render: function () { return el('div'); } },
          { id: 'residence', label: 'Residence Frt', render: function () { return el('div'); } }
        ]
      }),
      el('p', { className: 'plan-detail__label', text: 'Flow Through Options' }),
      el('div', { className: 'checkbox-row' }, DA.data.flowThroughOptions.map(function (option) {
        return C.Checkbox({ checked: true, label: option });
      })),
      C.SegmentedControl({
        ariaLabel: 'Incentive basis',
        value: 'cell',
        items: [
          { value: 'base', label: 'Base/Zone' },
          { value: 'cell', label: 'Cell by Cell/Customs' },
          { value: 'minimum', label: 'Minimum' }
        ]
      }),
      el('div', { className: 'field-row' }, [
        el('span', { className: 'field-row__label', text: 'Incentive Method *' }),
        C.SelectField({
          label: 'Incentive Method',
          hideLabel: true,
          value: 'Weight Break',
          options: DA.data.filterOptions.incentiveMethod.map(function (value) {
            return { value: value, label: value };
          })
        })
      ]),
      el('div', { className: 'card' }, [
        el('p', { className: 'rate-grid__caption', text: 'Zone Reference: Daily' }),
        el('div', { className: 'grid-scroll scroll-area' }, [grid]),
        el('div', { className: 'grid-footer' }, [
          el('a', { className: 'link-with-icon', attrs: { href: '#add-weight-break' } }, [
            DA.icons.plusCircle(18),
            el('span', { text: 'Add weight break' })
          ]),
          el('a', { className: 'link-with-icon', attrs: { href: '#save-changes' } }, [
            DA.icons.save(15),
            el('span', { text: 'Save Changes' })
          ])
        ])
      ])
    ]);
  }

  /**
   * Every service in the tree, flattened, each carrying the region and mode it
   * sits under. The tree is three levels deep but only ever ends in a plan, so
   * the levels above it are grouping rather than navigation.
   */
  function flattenServices(tree) {
    var out = [];
    tree.forEach(function (region) {
      (region.children || []).forEach(function (mode) {
        (mode.children || []).forEach(function (service) {
          out.push({ region: region.label, mode: mode.label, label: service.label });
        });
      });
    });
    return out;
  }

  /**
   * Services listed down the side, the selected plan beside them. Reaching a
   * plan took two clicks through nested accordions, and every open one pushed
   * the rest of the page further down; here any service is one click from any
   * other and the page height does not move.
   */
  function servicesView() {
    var services = flattenServices(DA.data.pricingServiceTree);
    var selected = 0;

    var list = el('nav', {
      className: 'plan-browser__list',
      attrs: { 'aria-label': 'Service incentive plans' }
    });
    var detail = el('div', { className: 'plan-browser__detail' });

    function renderDetail() {
      var service = services[selected];
      DA.dom.clear(detail);
      if (!service) return;
      detail.appendChild(el('h4', { className: 'plan-browser__title', text: service.label }));
      detail.appendChild(servicePlan());
    }

    function renderList() {
      DA.dom.clear(list);
      var region = null;
      var mode = null;
      services.forEach(function (service, index) {
        if (service.region !== region) {
          region = service.region;
          mode = null;
          list.appendChild(el('p', { className: 'plan-browser__group', text: region }));
        }
        if (service.mode !== mode) {
          mode = service.mode;
          list.appendChild(el('p', {
            className: 'plan-browser__group plan-browser__group--mode',
            text: mode
          }));
        }
        list.appendChild(el('button', {
          className: 'plan-browser__item',
          text: service.label,
          attrs: {
            type: 'button',
            'aria-current': index === selected ? 'true' : false
          },
          on: {
            click: function () {
              selected = index;
              renderList();
              renderDetail();
            }
          }
        }));
      });
    }

    renderList();
    renderDetail();

    return el('div', {}, [
      el('div', { className: 'plan-browser__actions' }, [
        el('a', { className: 'link-with-icon', attrs: { href: '#add-plan' } }, [
          DA.icons.plusCircle(18),
          el('span', { text: 'Add Service Incentive Plan' })
        ])
      ]),
      el('div', { className: 'plan-browser' }, [list, detail])
    ]);
  }

  /* ---- Accessorials -------------------------------------------------------- */

  function accessorialsView(numeric) {
    var C = DA.components;

    function labelColumn(key, label, width) {
      return { key: key, label: label, width: width || '190px', className: 'is-rowhead-dark' };
    }

    return el('div', { className: 'card' }, [
      C.DataTable({
        caption: 'Accessorial pricing terms',
        embedded: true,
        headerTone: 'warm',
        tinted: true,
        expandKey: 'detail',
        // Charges the reference breaks out keep their own lines; the rest are
        // split across the services that incurred them.
        getChildren: function (row) {
          return row.children ||
            DA.data.serviceBreakdown(row, 'detail', DA.data.additive.accessorial);
        },
        columns: [
          labelColumn('group', 'Group'),
          labelColumn('detail', 'Detail', '280px'),
          numeric('totalUnits', 'Total Units', { link: true, width: '120px' }),
          numeric('pctTotalVolume', '% Total Volume', { link: true, width: '150px' }),
          numeric('adu', 'ADU', { link: true, width: '110px' }),
          numeric('grossRevenue', 'Gross Revenue', { link: true, width: '150px' }),
          numeric('netRevenue', 'Net Revenue', { link: true, width: '145px' }),
          numeric('discount', 'Discount', { link: true, width: '110px' }),
          numeric('rate', 'Rate', { link: true, width: '110px' })
        ],
        rows: DA.data.pricingAccessorials
      })
    ]);
  }

  /**
   * @param {Object} context  { packet, numeric, filters, emptyView }
   */
  DA.views.PricingTerms = function PricingTerms(context) {
    var C = DA.components;

    return el('div', { className: 'tabs--boxed' }, [
      C.Tabs({
        ariaLabel: 'Pricing term views',
        value: 'tier-incentives',
        items: [
          { id: 'tier-incentives', label: 'Tier Incentives', render: function () {
            return el('div', {}, [context.filters(), tierIncentivesView()]);
          } },
          { id: 'services', label: 'Services', render: function () {
            return el('div', {}, [context.filters(), el('div', { className: 'card' }, [servicesView()])]);
          } },
          { id: 'accessorials', label: 'Accessorials', render: function () {
            return el('div', {}, [context.filters(), accessorialsView(context.numeric)]);
          } },
          { id: 'modifiers', label: 'Modifiers', render: function () {
            return el('div', {}, [context.filters(), context.emptyView('Modifier')()]);
          } }
        ]
      })
    ]);
  };
})(window.DA);
