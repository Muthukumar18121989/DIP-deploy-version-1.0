/**
 * Analyzer Packets — landing screen after sign-in.
 *
 * Composition mirrors the reference screen exactly:
 *   toolbar (scope switch + search .......... primary action)
 *   table   (9 columns, sticky header, scrolling viewport)
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var C = DA.components;

  var SCOPE = { MINE: 'mine', ALL: 'all' };

  var COLUMNS = [
    {
      key: 'packetId',
      label: 'Analyzer Packet ID',
      width: '150px',
      render: function (row) {
        return C.RecordLink({
          label: row.packetId,
          href: '#packet-' + row.packetId,
          ariaLabel: 'Open analyzer packet ' + row.packetId
        });
      }
    },
    { key: 'customerName', label: 'Customer Name', width: '155px' },
    { key: 'customerNumber', label: 'Customer Number', width: '135px', className: 'is-numeric is-muted' },
    { key: 'owner', label: 'Owner', width: '150px' },
    {
      key: 'status',
      label: 'Status',
      width: '175px',
      render: function (row) { return C.StatusBadge(row.status); }
    },
    { key: 'createdDate', label: 'Created Date', width: '105px', className: 'is-numeric' },
    { key: 'lastModifiedDate', label: 'Last Modified Date', width: '140px', className: 'is-numeric' },
    { key: 'scenarios', label: 'Scenarios', width: '90px', className: 'is-numeric' },
    { key: 'customerHierarchy', label: 'Customer Hierarchy', width: '145px' }
  ];

  function matchesQuery(row, query) {
    if (!query) return true;
    var needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [row.packetId, row.customerName, row.owner].some(function (field) {
      return String(field).toLowerCase().indexOf(needle) !== -1;
    });
  }

  function emptyStateFor(state) {
    if (state.query) {
      return C.EmptyState({
        title: 'No analyzer packets match your search',
        description:
          'No packet ID, customer name, or owner matches "' + state.query + '". ' +
          'Check the spelling or clear the search to see all packets.'
      });
    }
    return C.EmptyState({
      title: 'You do not own any analyzer packets yet',
      description:
        'Packets you create appear here. Switch to All Analyzers to see packets owned ' +
        'by everyone, or start a new analyzer packet.'
    });
  }

  DA.pages = DA.pages || {};

  DA.pages.AnalyzerPacketsPage = function AnalyzerPacketsPage(options) {
    options = options || {};
    var allRows = options.rows || [];
    var currentUser = options.currentUser || {};

    var state = { scope: SCOPE.ALL, query: '' };

    var tableMount = el('div', { className: 'panel__table-mount' });

    // Screen-reader-only announcement: filtering changes the row count without
    // any visual chrome, so it is announced instead of adding a counter bar.
    var liveRegion = el('p', {
      className: 'u-visually-hidden',
      attrs: { role: 'status', 'aria-live': 'polite' }
    });

    function visibleRows() {
      return allRows.filter(function (row) {
        var inScope = state.scope === SCOPE.ALL || row.owner === currentUser.name;
        return inScope && matchesQuery(row, state.query);
      });
    }

    function render() {
      var rows = visibleRows();

      DA.dom.clear(tableMount).appendChild(
        C.DataTable({
          caption: 'Analyzer packets',
          columns: COLUMNS,
          rows: rows,
          emptyState: emptyStateFor(state)
        })
      );

      liveRegion.textContent =
        rows.length === allRows.length
          ? rows.length + ' analyzer packets shown.'
          : rows.length + ' of ' + allRows.length + ' analyzer packets shown.';
    }

    var scopeSwitch = C.SegmentedControl({
      ariaLabel: 'Analyzer packet scope',
      value: state.scope,
      items: [
        { value: SCOPE.MINE, label: 'My Analyzers' },
        { value: SCOPE.ALL, label: 'All Analyzers' }
      ],
      onChange: function (value) {
        state.scope = value;
        render();
      }
    });

    var search = C.SearchField({
      id: 'analyzer-packet-search',
      label: 'Search analyzer packets',
      placeholder: 'Search by Packet ID, Customer Name, or Owner',
      onSearch: function (value) {
        state.query = value;
        render();
      }
    });

    var newPacketButton = C.Button({
      label: 'New Analyzer Packet',
      variant: 'primary',
      onClick: function () { if (options.onNewPacket) options.onNewPacket(); }
    });

    var panel = C.Panel({
      className: 'page__panel',
      ariaLabel: 'Analyzer packets',
      toolbar: {
        filters: [scopeSwitch, search],
        actions: [newPacketButton]
      },
      body: [tableMount]
    });

    render();

    return el('main', { className: 'page', attrs: { id: 'main-content' } }, [
      el('h2', { className: 'u-visually-hidden', text: 'Analyzer Packets' }),
      liveRegion,
      panel
    ]);
  };
})(window.DA);
