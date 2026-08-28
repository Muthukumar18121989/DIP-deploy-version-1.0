/**
 * Analyzer Packet — the report built from the packet's scenarios.
 *
 * Reached from "Proceed to Analyzer Packet". The comparison selector chooses
 * which scenarios the report covers; the tabs below split it into Summary,
 * Rate Charts, Shipping Profiles, Pricing terms and Other terms.
 *
 * Summary and Shipping Profiles > Cost/Service are documented by reference
 * screens; the remaining tabs render the product's empty table state.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var C = DA.components;

  DA.pages = DA.pages || {};

  /** Right-aligned numeric column; `link` makes the figure a drill-down. */
  function numeric(key, label, options) {
    options = options || {};
    return {
      key: key,
      label: label,
      width: options.width || '110px',
      className: 'is-numeric is-end',
      headerClassName: 'is-end',
      render: options.link
        ? function (row) {
            return el('a', {
              text: row[key] == null ? '-' : row[key],
              attrs: { href: '#detail', 'aria-label': label + ' ' + row[key] }
            });
          }
        : function (row) { return row[key] == null ? '-' : row[key]; }
    };
  }

  function emptyView(label) {
    return function () {
      return el('div', { className: 'card' }, [
        C.DataTable({
          caption: label,
          embedded: true,
          headerTone: 'warm',
          columns: [{ key: 'name', label: label }],
          rows: [],
          emptyState: el('p', { className: 'table-empty', text: 'No data available.' })
        })
      ]);
    };
  }

  DA.pages.AnalyzerPacketPage = function AnalyzerPacketPage(options) {
    options = options || {};
    var packet = options.packet || {};
    var customer = packet.customerName || '-';
    var scenarios = packet.scenarios || [];

    function withCustomer(text) {
      return String(text).replace('{customer}', customer);
    }

    function asOptions(values) {
      return values.map(function (value) { return { value: value, label: value }; });
    }

    /** The customer's accounts, as the bid and account pickers list them. */
    function accountOptions() {
      return DA.data.filterOptions.accountSuffix.map(function (suffix) {
        return { value: customer + ' ' + suffix, label: customer + ' ' + suffix };
      });
    }

    /* ---- Comparison selector --------------------------------------------- */

    // The baseline scenario is always part of a comparison; the rest are opt-in.
    var chosen = scenarios.slice(0, 1).map(function (scenario) { return scenario.name; });
    var pending = chosen.slice();
    var comparisonBand = el('section', { className: 'panel panel--auto' });

    var comparisonSelector = C.Dropdown({
      label: 'Comparison View',
      content: [
        el('div', {}, scenarios.map(function (scenario) {
          return el('div', { className: 'dropdown__option' }, [
            C.Checkbox({
              checked: pending.indexOf(scenario.name) !== -1,
              label: scenario.name,
              onChange: function (checked) {
                var at = pending.indexOf(scenario.name);
                if (checked && at === -1) pending.push(scenario.name);
                if (!checked && at !== -1) pending.splice(at, 1);
              }
            })
          ]);
        })),
        el('div', { className: 'dropdown__footer' }, [
          C.Button({
            label: 'Apply',
            variant: 'outline',
            shape: 'pill',
            onClick: function () {
              chosen = pending.slice();
              renderComparisonBand();
              comparisonSelector.close();
            }
          })
        ])
      ]
    });

    /* ---- Scenario impact -------------------------------------------------- */

    var METRIC_LABELS = {
      adv: 'ADV',
      baseFrtDisc: 'Base Frt Disc',
      totalDisc: 'Total Disc',
      rpp: 'RPP',
      revenue: 'Revenue',
      or: 'OR',
      profit: 'Profit'
    };

    // Revenue and profit are the outcomes the comparison exists to answer;
    // the rest describe how the scenario got there.
    var OUTCOME_KEYS = ['revenue', 'profit'];
    var OPERATIONAL_KEYS = ['adv', 'baseFrtDisc', 'totalDisc', 'rpp', 'or'];

    /** The scenarios currently in the comparison, baseline first. */
    function pickedScenarios() {
      return scenarios.filter(function (scenario) {
        return chosen.indexOf(scenario.name) !== -1;
      });
    }

    /**
     * The change in one metric between two scenarios. A recorded difference is
     * used where there is one; otherwise it is derived from the figures shown,
     * which can land a unit off where those are rounded for display.
     */
    function delta(baselineName, scenarioName, key) {
      var figures = DA.data.scenarioFigures;
      var from = (figures[baselineName] || {})[key];
      var to = (figures[scenarioName] || {})[key];
      var recorded = DA.data.scenarioDifferences[baselineName + '|' + scenarioName];
      var text = recorded && recorded[key] != null
        ? recorded[key]
        : DA.figures.difference(from, to);
      return { text: text, value: DA.figures.toNumber(text), shape: DA.figures.shapeOf(from) };
    }

    /**
     * A signed change. A figure already carrying a percent is a change in
     * percentage points, not a percentage of itself, so it is labelled `pp`.
     */
    function deltaLabel(change) {
      if (change.value == null) return '-';
      var body = String(change.text).replace(/^-/, '');
      if (change.shape.percent) body = body.replace('%', ' pp');
      return (change.value > 0 ? '+' : change.value < 0 ? '-' : '') + body;
    }

    /** Neutral by design: the business meaning of a fall is not ours to assert. */
    function arrow(change) {
      if (change.value == null || change.value === 0) return '';
      return change.value > 0 ? '↑' : '↓';
    }

    /**
     * Proportional bars, one per scenario, scaled to the largest figure in the
     * metric. The stretch between a scenario and the baseline is drawn as its
     * own segment, so a change worth a couple of percent still reads as a
     * distinct tip rather than disappearing into an identical-looking bar.
     * The bars restate figures printed beside them, so they are hidden from
     * assistive technology rather than duplicated into it.
     */
    function outcomeBars(picked, key) {
      var figures = DA.data.scenarioFigures;
      var numbers = picked.map(function (s) {
        return DA.figures.toNumber((figures[s.name] || {})[key]);
      });
      var largest = Math.max.apply(null, numbers.map(function (n) { return n == null ? 0 : n; }));
      if (!largest) return null;

      var basePct = (numbers[0] == null ? 0 : numbers[0]) / largest * 100;

      return el('div', { className: 'impact__bars', attrs: { 'aria-hidden': 'true' } },
        picked.map(function (scenario, index) {
          var pct = (numbers[index] == null ? 0 : numbers[index]) / largest * 100;
          var start = Math.min(pct, basePct);
          var end = Math.max(pct, basePct);
          return el('div', { className: 'impact__bar-row' }, [
            el('span', { className: 'impact__bar-name', text: scenario.name }),
            el('span', { className: 'impact__bar' }, [
              el('span', { className: 'impact__bar-fill', style: { width: start + '%' } }),
              index === 0 ? null : el('span', {
                className: 'impact__bar-delta',
                style: { left: start + '%', width: (end - start) + '%' }
              })
            ])
          ]);
        })
      );
    }

    function outcomeCard(picked, key) {
      var figures = DA.data.scenarioFigures;
      var baseline = picked[0];
      var others = picked.slice(1);

      var values = [el('span', {
        className: 'impact__value',
        text: (figures[baseline.name] || {})[key] || '-'
      })];
      others.forEach(function (scenario) {
        values.push(el('span', { className: 'impact__to', text: '→' }));
        values.push(el('span', {
          className: 'impact__value',
          text: (figures[scenario.name] || {})[key] || '-'
        }));
      });

      return el('div', { className: 'impact__outcome' }, [
        el('h3', { className: 'impact__label', text: METRIC_LABELS[key] }),
        el('p', { className: 'impact__values' }, values),
        others.length
          ? el('div', { className: 'impact__changes' }, others.map(function (scenario) {
              var change = delta(baseline.name, scenario.name, key);
              var from = DA.figures.toNumber((figures[baseline.name] || {})[key]);
              var share = from && change.value != null
                ? ' (' + (change.value > 0 ? '+' : '') + (change.value / from * 100).toFixed(1) + '%)'
                : '';
              return el('p', { className: 'impact__change' }, [
                el('span', { className: 'impact__arrow', text: arrow(change) }),
                el('span', { text: deltaLabel(change) }),
                el('span', { className: 'impact__share', text: share })
              ]);
            }))
          : null,
        outcomeBars(picked, key)
      ]);
    }

    function metricCell(picked, key) {
      var figures = DA.data.scenarioFigures;
      var baseline = picked[0];

      return el('div', { className: 'impact__metric' }, [
        el('p', { className: 'impact__metric-label', text: METRIC_LABELS[key] }),
        el('p', {
          className: 'impact__metric-value',
          text: (figures[baseline.name] || {})[key] || '-'
        })
      ].concat(picked.slice(1).map(function (scenario) {
        var change = delta(baseline.name, scenario.name, key);
        return el('p', { className: 'impact__metric-step' }, [
          el('span', { className: 'impact__to', text: '→' }),
          el('span', {
            className: 'impact__metric-value',
            text: (figures[scenario.name] || {})[key] || '-'
          }),
          el('span', { className: 'impact__arrow', text: arrow(change) }),
          el('span', { className: 'impact__metric-change', text: deltaLabel(change) })
        ]);
      })));
    }

    function renderComparisonBand() {
      var picked = pickedScenarios();
      DA.dom.clear(comparisonBand);
      comparisonBand.setAttribute('aria-label', 'Scenario comparison');

      if (!picked.length) {
        comparisonBand.appendChild(
          C.EmptyState({
            title: 'No scenario selected',
            description: 'Choose a scenario from Comparison View to compare figures.'
          })
        );
        return;
      }

      comparisonBand.appendChild(
        el('div', { className: 'impact' }, [
          el('div', { className: 'impact__outcomes' },
            OUTCOME_KEYS.map(function (key) { return outcomeCard(picked, key); })),
          el('div', { className: 'impact__metrics' },
            OPERATIONAL_KEYS.map(function (key) { return metricCell(picked, key); }))
        ])
      );
    }

    renderComparisonBand();

    /* ---- Summary tab ------------------------------------------------------ */

    function summaryColumns() {
      return [
        {
          key: 'label',
          label: 'Cost Basis: FA',
          width: '150px',
          className: 'is-rowhead',
          render: function (row) { return withCustomer(row.label); }
        },
        numeric('adv', 'ADV', { width: '110px' }),
        numeric('baseFrt', 'Base Frt', { width: '105px' }),
        numeric('totalDisc', 'Total Disc', { width: '110px' }),
        numeric('rpp', 'RPP', { width: '110px' }),
        numeric('annRev', 'Ann Rev', { width: '140px' })
      ];
    }

    function summaryView() {
      var trees = DA.data.packetSummaryTrees;

      return el('div', { className: 'comparison-grid' },
        scenarios.map(function (scenario) {
          var rows = trees[scenario.name] || trees.Current;
          return C.Accordion({
            title: scenario.name,
            expanded: true,
            className: 'accordion--filled',
            content: [
              C.DataTable({
                caption: scenario.name + ' summary',
                embedded: true,
                headerTone: 'warm',
                expandKey: 'label',
                getChildren: function (row) { return row.children; },
                columns: summaryColumns(),
                rows: rows
              })
            ]
          });
        })
      );
    }

    /* ---- Shipping Profiles tab -------------------------------------------- */

    function profileFilters() {
      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Scenario',
              value: scenarios[0] && scenarios[0].name,
              options: scenarios.map(function (scenario) {
                return { value: scenario.name, label: scenario.name };
              })
            })
          ]),
          el('span', { className: 'view-filters__divider' }),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Account',
              hideLabel: true,
              value: customer + ' MAIN',
              options: accountOptions()
            })
          ]),
          C.Button({ label: 'Filters', variant: 'ghost', icon: DA.icons.filter(16) })
        ])
      ]);
    }

    /** The lane keys every shipping profile view opens with. */
    /**
     * Ground Saver is coded as ground: it is a ground movement, and giving it
     * a third tone would spend colour on a distinction the reader does not
     * need to make at a glance.
     */
    function modeTone(mode) {
      return String(mode).indexOf('AIR') !== -1 ? 'air' : 'ground';
    }

    /**
     * Movement, mode and core service read as one lane identifier. Movement
     * stays neutral -- N, I and E are single characters and the letter itself
     * separates them, so colour is spent only on mode, where a glance saves
     * work.
     */
    function laneKey(row) {
      return el('span', { className: 'lane-key' }, [
        el('span', { className: 'badge lane-key__movement', text: row.movement }),
        el('span', { className: 'lane-key__sep', text: '-' }),
        el('span', {
          className: 'badge lane-key__mode lane-key__mode--' + modeTone(row.mode),
          text: row.mode
        }),
        el('span', { className: 'lane-key__sep', text: '-' }),
        el('span', { className: 'lane-key__service', text: row.service })
      ]);
    }

    /** The encoding, stated once above the table rather than guessed at. */
    function laneLegend() {
      return el('div', { className: 'table-legend' }, [
        el('div', { className: 'table-legend__group' }, [
          el('span', { className: 'table-legend__label', text: 'Movement' }),
          el('span', { className: 'badge lane-key__movement', text: 'N' }),
          el('span', { className: 'badge lane-key__movement', text: 'I' }),
          el('span', { className: 'badge lane-key__movement', text: 'E' })
        ]),
        el('div', { className: 'table-legend__group' }, [
          el('span', { className: 'table-legend__label', text: 'Mode' }),
          el('span', { className: 'badge lane-key__mode lane-key__mode--air', text: 'AIR' }),
          el('span', { className: 'badge lane-key__mode lane-key__mode--ground', text: 'GROUND' })
        ])
      ]);
    }

    function profileKeyColumns() {
      return [
        {
          key: 'service',
          label: 'Core Service',
          width: '300px',
          className: 'is-rowhead',
          render: laneKey
        },
        numeric('zone', 'Zone', { width: '85px' }),
        numeric('lane', 'Lane', { width: '85px' })
      ];
    }

    function profileTable(options) {
      return el('div', {}, [
        profileFilters(),
        el('div', { className: 'card' }, [
          laneLegend(),
          C.DataTable({
            caption: options.caption,
            embedded: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'service',
            // A lane opens onto the zones it shipped in.
            getChildren: function (row) {
              if (row.zone !== '-') return null;
              return DA.data.zoneBreakdown(row, 'service', DA.data.additive[options.additive]);
            },
            columns: profileKeyColumns().concat(options.columns),
            rows: options.rows
          })
        ])
      ]);
    }

    /** Filter row for the pricing term views. */
    function pricingFilters() {
      return el('div', { className: 'card' }, [
        el('div', { className: 'view-filters' }, [
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Scenario',
              value: scenarios[scenarios.length - 1] && scenarios[scenarios.length - 1].name,
              options: scenarios.map(function (scenario) {
                return { value: scenario.name, label: scenario.name };
              })
            })
          ]),
          el('div', { className: 'view-filters__field' }, [
            C.SelectField({
              label: 'Choose Bid',
              value: customer + ' MAIN',
              options: accountOptions()
            })
          ]),
          C.Button({
            label: 'Reset',
            variant: 'ghost',
            icon: DA.icons.refresh(15),
            iconPosition: 'end'
          }),
          el('span', { className: 'view-filters__divider' }),
          C.Button({
            label: 'Define Bid Structure',
            variant: 'ghost',
            icon: DA.icons.chevronRight(14, ''),
            iconPosition: 'end'
          })
        ])
      ]);
    }

    function costView() {
      return profileTable({
        caption: 'Shipping profile cost',
        additive: 'cost',
        rows: DA.data.shippingProfileCost,
        columns: [
          numeric('volume', 'Volume', { link: true, width: '110px' }),
          numeric('adv', 'ADV', { link: true, width: '100px' }),
          numeric('pps', 'PPS', { link: true, width: '80px' }),
          numeric('weightPiece', 'Weight/ Piece', { link: true, width: '120px' }),
          numeric('avgCube', 'Avg Cube', { link: true, width: '105px' }),
          numeric('avgCubeFactor', 'Avg Cube Factor', { link: true, width: '145px' }),
          numeric('puDens', 'PU Dens', { link: true, width: '105px' }),
          numeric('dlDens', 'DL Dens', { link: true, width: '105px' }),
          numeric('pu', 'PU', { link: true, width: '90px' }),
          numeric('ls', 'LS', { link: true, width: '90px' }),
          numeric('cs', 'CS', { link: true, width: '90px' }),
          numeric('ar', 'AR', { link: true, width: '90px' }),
          numeric('jf', 'JF', { link: true, width: '95px' }),
          numeric('gf', 'GF', { link: true, width: '90px' }),
          numeric('br', 'BR', { link: true, width: '90px' }),
          numeric('pd', 'PD', { link: true, width: '90px' }),
          numeric('dl', 'DL', { link: true, width: '90px' }),
          numeric('no', 'NO', { link: true, width: '90px' }),
          numeric('oth', 'OTH', { link: true, width: '95px' }),
          numeric('totalFreightCost', 'Total Freight Cost', { link: true, width: '160px' }),
          numeric('costAdj', 'Cost Adj', { width: '105px' }),
          numeric('newCost', 'New Cost', { link: true, width: '115px' })
        ]
      });
    }

    function zoneView() {
      return profileTable({
        caption: 'Shipping profile zones',
        additive: 'zone',
        rows: DA.data.shippingProfileZone,
        columns: [
          numeric('volume', 'Volume', { link: true, width: '110px' }),
          numeric('adv', 'ADV', { link: true, width: '100px' }),
          numeric('pps', 'PPS', { link: true, width: '80px' }),
          numeric('weightPiece', 'Weight/Piece', { link: true, width: '125px' }),
          numeric('freightGrossSpent', 'Freight Gross Spent', { link: true, width: '175px' }),
          numeric('freightDiscount', 'Freight Discount (%)', { link: true, width: '175px' }),
          numeric('freightRpp', 'Freight RPP', { link: true, width: '125px' }),
          numeric('freightNetSpent', 'Freight Net Spent', { link: true, width: '165px' }),
          numeric('freightProfit', 'Freight Profit ($)', { link: true, width: '160px' }),
          numeric('freightOr', 'Freight OR', { link: true, width: '120px' })
        ]
      });
    }

    function accessorialView() {
      function labelColumn(key, label, width) {
        return { key: key, label: label, width: width || '135px', className: 'is-rowhead-dark' };
      }

      return el('div', {}, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Accessorial charges',
            embedded: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'detail',
            getChildren: function (row) { return row.children; },
            columns: [
              labelColumn('type', 'Accessorial Type'),
              labelColumn('group', 'Group'),
              labelColumn('detail', 'Detail', '235px'),
              numeric('totalUnits', 'Total Units', { link: true, width: '120px' }),
              numeric('pctTotalVolume', '% Total Volume', { link: true, width: '150px' }),
              numeric('adu', 'ADU', { link: true, width: '110px' }),
              numeric('grossRevenue', 'Gross Revenue', { link: true, width: '150px' }),
              numeric('netRevenue', 'Net Revenue', { link: true, width: '145px' }),
              numeric('discount', 'Discount', { link: true, width: '110px' })
            ],
            rows: DA.data.shippingProfileAccessorial
          })
        ])
      ]);
    }

    function serviceView() {
      return el('div', {}, [
        profileFilters(),
        el('div', { className: 'card' }, [
          C.DataTable({
            caption: 'Shipping profile services',
            embedded: true,
            headerTone: 'warm',
            tinted: true,
            expandKey: 'service',
            getChildren: function (row) {
              return DA.data.zoneBreakdown(row, 'service', DA.data.additive.service);
            },
            columns: [
              { key: 'service', label: 'Core Service', width: '250px', className: 'is-rowhead' },
              numeric('volume', 'Volume', { link: true, width: '95px' }),
              numeric('adv', 'ADV', { link: true, width: '80px' }),
              numeric('avgZone', 'Avg Zone', { link: true, width: '100px' }),
              numeric('billableWt', 'Billable Wt', { link: true, width: '105px' }),
              numeric('pps', 'PPS', { link: true, width: '80px' }),
              numeric('baseGrossRev', 'Base Gross Rev', { link: true, width: '135px' }),
              numeric('baseNetRev', 'Base Net Rev', { link: true, width: '125px' }),
              numeric('disc', 'Disc', { width: '85px' }),
              numeric('baseRpp', 'Base RPP', { link: true, width: '105px' }),
              numeric('baseProfit', 'Base Profit', { link: true, width: '110px' }),
              numeric('baseOr', 'Base OR', { width: '95px' })
            ],
            rows: DA.data.packetServices
          })
        ])
      ]);
    }

    function shippingProfilesView() {
      return el('div', { className: 'tabs--boxed' }, [
        C.Tabs({
          ariaLabel: 'Shipping profile views',
          value: 'cost',
          items: [
            { id: 'cost', label: 'Cost', render: costView },
            { id: 'zone', label: 'Zone', render: zoneView },
            { id: 'weight', label: 'Weight', render: emptyView('Weight') },
            { id: 'account', label: 'Account', render: emptyView('Account') },
            { id: 'accessorial', label: 'Accessorial', render: accessorialView },
            { id: 'service', label: 'Service', render: serviceView }
          ]
        })
      ]);
    }

    /* ---- Composition ------------------------------------------------------ */

    var page = el('main', { className: 'page', attrs: { id: 'main-content' } }, [
      C.Breadcrumb({
        separator: '/',
        items: [
          { label: 'My Analyzers', onClick: options.onExit },
          { label: 'Packet' }
        ]
      }),
      el('div', { className: 'record-header' }, [
        el('h2', {
          className: 'record-header__title title-rule title-rule--full',
          text: customer
        }),
        el('div', { className: 'record-header__meta' }, [
          el('span', { className: 'badge badge--success', text: packet.industry || '-' }),
          el('span', { text: 'Sub Industry : ' + (packet.subIndustry || '-') }),
          el('span', { className: 'meta-divider' }),
          el('span', { text: packet.referenceNumber || '-' }),
          el('span', { className: 'meta-divider' }),
          el('span', { text: 'Analyzer Packet: ' + (packet.packetId || '-') })
        ])
      ]),
      el('div', { className: 'page-back' }, [
        C.Button({
          label: 'Back to Scenarios',
          variant: 'link',
          icon: DA.icons.chevronLeft(14),
          onClick: function () { if (options.onBack) options.onBack(); }
        })
      ]),
      el('div', { className: 'report-filters' }, [
        el('div', { className: 'report-filters__field' }, [comparisonSelector]),
        el('div', { className: 'report-filters__field' }, [
          C.SelectField({ label: 'Revenue Basis', value: 'All', options: asOptions(DA.data.filterOptions.revenueBasis) })
        ]),
        el('div', { className: 'report-filters__field' }, [
          C.SelectField({
            label: 'Cost Basis',
            value: 'Fully Allocated Cost',
            options: asOptions(DA.data.filterOptions.costBasis)
          })
        ]),
        el('div', { className: 'report-filters__actions' }, [
          C.Button({
            label: 'Reset',
            variant: 'outline',
            shape: 'pill',
            icon: DA.icons.refresh(15),
            iconPosition: 'end'
          })
        ])
      ]),
      comparisonBand,
      el('div', { className: 'tabs--page' }, [
        C.Tabs({
          ariaLabel: 'Report sections',
          value: 'summary',
          items: [
            { id: 'summary', label: 'Summary', render: function () {
              return el('section', { className: 'panel panel--auto' }, [summaryView()]);
            } },
            { id: 'rate-charts', label: 'Rate Charts', render: emptyView('Rate Chart') },
            { id: 'shipping-profiles', label: 'Shipping Profiles', render: function () {
              return el('section', { className: 'panel panel--auto' }, [
                el('div', { className: 'panel__content' }, [shippingProfilesView()])
              ]);
            } },
            { id: 'pricing-terms', label: 'Pricing terms', render: function () {
              return el('section', { className: 'panel panel--auto' }, [
                el('div', { className: 'panel__content' }, [
                  DA.views.PricingTerms({
                    packet: packet,
                    numeric: numeric,
                    filters: pricingFilters,
                    emptyView: emptyView
                  })
                ])
              ]);
            } },
            { id: 'other-terms', label: 'Other terms', render: emptyView('Other Term') }
          ]
        })
      ])
    ]);

    return page;
  };
})(window.DA);
