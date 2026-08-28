/**
 * ScenarioBlock — one scenario on the Create Scenarios screen: its heading,
 * summary row, and the bid table the row expands to reveal.
 *
 * The baseline scenario copied from sourcing is read-only. Scenarios the user
 * creates are editable, which adds account association, linked shipping
 * profiles, bid simulation and a save action.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.ScenarioBlock = function ScenarioBlock(scenario, context) {
    var C = DA.components;
    context = context || {};
    uid += 1;
    var panelId = 'scenario-panel-' + uid;
    var card = el('div', { className: 'scenario__card' });

    var hintButton = null;

    var toggle = el('button', {
      className: 'scenario__toggle u-tap-target',
      attrs: { type: 'button', 'aria-controls': panelId },
      on: {
        click: function () {
          scenario.expanded = !scenario.expanded;
          renderCard();
          var next = scenario.expanded ? toggle : hintButton;
          if (next) next.focus();
        }
      }
    });

    /* ---- Bid table ------------------------------------------------------- */

    function bidColumns() {
      var columns = [
        {
          key: 'select',
          label: 'Select',
          width: '48px',
          className: 'is-select',
          headerClassName: 'is-select',
          renderHeader: function () {
            var all = scenario.bids.every(function (bid) {
              return !bid.selectable || bid.selected;
            });
            return C.Checkbox({
              checked: all,
              ariaLabel: 'Select all bids in ' + scenario.title,
              onChange: function (checked) {
                scenario.bids.forEach(function (bid) {
                  if (bid.selectable) bid.selected = checked;
                });
                renderCard();
              }
            });
          },
          render: function (bid) {
            if (!bid.selectable) return el('span');
            return C.Checkbox({
              checked: bid.selected,
              ariaLabel: 'Include bid ' + bid.bidNumber,
              onChange: function (checked) { bid.selected = checked; }
            });
          }
        },
        { key: 'bidNumber', label: 'Bid Number', width: '125px' },
        // Bid Name is left unsized so it absorbs the remaining width.
        { key: 'bidName', label: 'Bid Name' },
        {
          key: 'shippingProfile',
          label: 'Shipping Profile',
          width: '175px',
          className: scenario.editable ? '' : 'is-muted',
          render: scenario.editable
            ? function (bid) {
                return el('a', {
                  text: bid.shippingProfile,
                  attrs: { href: '#profile-' + bid.shippingProfile },
                  on: {
                    click: function (event) {
                      event.preventDefault();
                      DA.dialogs.ShippingProfileDialog(bid, scenario, context.packet || {})
                        .open();
                    }
                  }
                });
              }
            : null
        },
        { key: 'construct', label: 'Construct', width: '110px' }
      ];

      if (scenario.editable) {
        columns.push({
          key: 'accountAssociation',
          label: 'Account Association',
          width: '190px',
          render: function (bid) {
            if (!bid.selectable) return el('span');
            return el('a', {
              className: 'link-with-icon',
              attrs: {
                href: '#accounts-' + bid.bidNumber,
                'aria-label': 'Accounts associated with bid ' + bid.bidNumber
              },
              on: {
                click: function (event) {
                  event.preventDefault();
                  if (context.onOpenAccounts) context.onOpenAccounts(bid, scenario);
                }
              }
            }, [el('span', { text: 'Accounts' }), DA.icons.settings(14)]);
          }
        });
      }

      return columns;
    }

    /* ---- Card ------------------------------------------------------------ */

    function summaryCells() {
      return [
        el('div', { className: 'scenario__cell scenario__cell--key' }, [
          el('span', { className: 'scenario__cell-label', text: scenario.name })
        ]),
        el('div', { className: 'scenario__cell scenario__cell--date' }, [
          el('span', { className: 'scenario__cell-label', text: 'Created Date' }),
          el('span', { className: 'scenario__cell-value', text: scenario.createdDate })
        ]),
        el('div', { className: 'scenario__cell scenario__cell--date scenario__cell--last' }, [
          el('span', { className: 'scenario__cell-label', text: 'Last Modified' }),
          el('span', { className: 'scenario__cell-value', text: scenario.lastModified })
        ]),
        el('div', { className: 'scenario__status' }, [
          C.StatusBadge(scenario.status, { pill: true }),
          scenario.editable
            ? el('button', {
                className: 'scenario__status-menu u-tap-target',
                attrs: { type: 'button', 'aria-label': 'Analysis status details' }
              }, [DA.icons.chevronDown(14)])
            : null
        ])
      ];
    }

    function renderCard() {
      var open = Boolean(scenario.expanded);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label',
        (open ? 'Collapse bid details for ' : 'Expand to find bid details for ') + scenario.title);
      DA.dom.clear(toggle).appendChild(
        open ? DA.icons.chevronUp(16) : DA.icons.chevronDown(16)
      );

      var row = el(
        'div',
        { className: 'scenario__row' + (open ? '' : ' scenario__row--indented') },
        (open ? [toggle] : []).concat(summaryCells()).concat(
          open
            ? [el('div', { className: 'scenario__update' }, [
                C.Button({
                  label: 'Update Description',
                  variant: 'link',
                  icon: DA.icons.chevronRight(14, ''),
                  iconPosition: 'end'
                })
              ])]
            : []
        )
      );

      DA.dom.clear(card);
      card.appendChild(row);

      // The shipping profile description runs long in practice, so it takes a
      // line of its own beneath the cells instead of a fixed-width column that
      // truncated it. It carries the row's bottom rule, since it is now the
      // last thing in the header block.
      card.appendChild(
        el('div', {
          className: 'scenario__description' + (open ? '' : ' scenario__description--indented')
        }, [
          el('span', { className: 'scenario__cell-label', text: scenario.description })
        ])
      );

      if (!open) {
        hintButton = el('button', {
          className: 'scenario__hint u-tap-target',
          attrs: {
            type: 'button',
            'aria-expanded': 'false',
            'aria-controls': panelId
          },
          on: { click: function () { toggle.click(); } }
        }, [
          DA.icons.chevronDown(16),
          el('span', { text: 'Expand To Find Bid Details' })
        ]);

        card.appendChild(el('div', { className: 'scenario__hint-row' }, [hintButton]));
        return;
      }

      card.appendChild(
        el('div', { className: 'scenario__panel', attrs: { id: panelId } }, [
          C.DataTable({
            caption: 'Bids sourced for ' + scenario.title,
            embedded: true,
            headerTone: 'warm',
            columns: bidColumns(),
            rows: scenario.bids
          }),
          scenario.editable
            ? el('div', { className: 'simulate-row' }, [
                el('a', {
                  className: 'link-with-icon',
                  attrs: { href: '#simulate-' + scenario.title }
                }, [DA.icons.plusCircle(18), el('span', { text: 'Simulate New Bid' })])
              ])
            : null
        ])
      );

      if (scenario.editable) {
        card.appendChild(
          el('div', { className: 'scenario__footer' }, [
            C.Button({ label: 'Save', variant: 'outline', shape: 'pill' })
          ])
        );
      }
    }

    renderCard();

    return el('section', {
      className: 'scenario',
      attrs: { 'aria-label': scenario.title }
    }, [
      el('div', { className: 'scenario__header' }, [
        C.Checkbox({
          checked: scenario.included !== false,
          ariaLabel: 'Include ' + scenario.title,
          onChange: function (checked) { scenario.included = checked; }
        }),
        el('h3', { className: 'scenario__name', text: scenario.title }),
        el('div', { className: 'scenario__header-actions' }, [
          C.Button({
            label: 'Download Scenario Summary',
            variant: 'quiet-link',
            icon: DA.icons.download(18)
          }),
          C.HelpButton('Downloads a summary of this scenario.')
        ])
      ]),
      card
    ]);
  };
})(window.DA);
