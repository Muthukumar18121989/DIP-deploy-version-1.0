/**
 * DataTable — the product's one tabular pattern.
 *
 * Renders a real <table> with a sticky header inside a scrollable viewport:
 * wide data scrolls horizontally rather than collapsing into cards, so column
 * alignment and row comparison survive on every screen size.
 *
 * columns: [{ key, label, width, align, className, render(row) -> Node|string }]
 *
 * Rows expand when `getChildren(row)` returns rows: the cell named by
 * `expandKey` grows a disclosure toggle, and the children appear beneath their
 * parent, indented, until it is closed again.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.DataTable = function DataTable(options) {
    var columns = options.columns || [];
    var rows = options.rows || [];

    var colgroup = el(
      'colgroup',
      {},
      columns.map(function (column) {
        return el('col', { style: column.width ? { width: column.width } : {} });
      })
    );

    var head = el('thead', {}, [
      el(
        'tr',
        {},
        columns.map(function (column) {
          var custom = column.renderHeader ? column.renderHeader() : null;
          return el('th', {
            text: custom ? null : column.label,
            attrs: { scope: 'col', 'aria-label': column.ariaLabel || false },
            className: column.headerClassName || ''
          }, custom ? [custom] : null);
        })
      )
    ]);

    var body = el('tbody');
    // Rows flagged `expanded` start open, as the reference screens show them.
    var open = [];
    (function seed(list) {
      (list || []).forEach(function (row) {
        if (row && row.expanded) open.push(row);
        if (row && row.children) seed(row.children);
      });
    })(rows);

    function childrenOf(row) {
      var children = options.getChildren ? options.getChildren(row) : null;
      return children && children.length ? children : null;
    }

    function cell(column, row, depth) {
      var content = column.render ? column.render(row) : row[column.key];
      var isNode = content instanceof Node;
      var children = column.key === options.expandKey ? childrenOf(row) : null;

      if (column.key === options.expandKey) {
        var label = isNode ? content : el('span', { text: content == null ? '' : String(content) });
        var expanded = open.indexOf(row) !== -1;
        var inner = [];

        if (children) {
          inner.push(el('button', {
            className: 'row-toggle u-tap-target',
            attrs: {
              type: 'button',
              'aria-expanded': expanded ? 'true' : 'false',
              'aria-label': (expanded ? 'Collapse ' : 'Expand ') +
                (isNode ? (row[column.key] || 'row') : String(content))
            },
            on: {
              click: function () {
                var at = open.indexOf(row);
                if (at === -1) open.push(row); else open.splice(at, 1);
                render();
              }
            }
          }, [expanded ? DA.icons.chevronDown(14) : DA.icons.chevronRight(14, '')]));
        }
        inner.push(label);

        return el('td', {
          className: (column.className || '') + ' has-expander' +
            (depth ? ' is-child-cell' : ''),
          style: depth ? { 'padding-left': (depth * 20 + 12) + 'px' } : {}
        }, [el('span', { className: 'expand-cell' }, inner)]);
      }

      var plain = content == null ? '' : String(content);
      return el('td', {
        className: column.className || '',
        text: isNode ? null : content,
        // Only a cell that actually holds text carries a tooltip; an empty
        // one was producing an empty tooltip on hover.
        attrs: { title: !isNode && plain ? plain : false }
      }, isNode ? [content] : null);
    }

    function addRow(row, depth) {
      body.appendChild(el('tr', {
        className: (options.rowClassName ? options.rowClassName(row) : '') +
          (depth ? ' is-child-row' : '')
      }, columns.map(function (column) { return cell(column, row, depth); })));

      if (open.indexOf(row) !== -1) {
        (childrenOf(row) || []).forEach(function (child) { addRow(child, depth + 1); });
      }
    }

    function render() {
      DA.dom.clear(body);
      if (rows.length === 0) {
        // Fixed column widths would hold the table at its full scrolling
        // width with nothing in it, pushing the empty state off to the side.
        table.classList.add('data-table--empty');
        if (colgroup.parentNode) table.removeChild(colgroup);
        body.appendChild(
          el('tr', { className: 'is-empty-row' }, [
            el('td', { attrs: { colspan: columns.length }, style: { 'white-space': 'normal' } }, [
              options.emptyState || DA.components.EmptyState({ title: 'No records found' })
            ])
          ])
        );
        return;
      }
      table.classList.remove('data-table--empty');
      if (!colgroup.parentNode) table.insertBefore(colgroup, head);
      rows.forEach(function (row) { addRow(row, 0); });
    }


    var table = el('table', {
      className: 'data-table' +
        (options.embedded ? ' data-table--auto' : '') +
        (options.headerTone ? ' data-table--' + options.headerTone : '') +
        (options.dividers ? ' data-table--dividers' : '') +
        (options.tinted ? ' data-table--tinted' : '')
    }, [
      options.caption
        ? el('caption', { className: 'u-visually-hidden', text: options.caption })
        : null,
      colgroup,
      head,
      body
    ]);

    render();

    return el(
      'div',
      {
        className: 'data-table__viewport scroll-area' +
          (options.embedded ? ' data-table__viewport--auto' : ''),
        attrs: {
          tabindex: '0',
          role: 'region',
          'aria-label': options.caption || 'Data table'
        }
      },
      [table]
    );
  };

  /** Record link cell: identifier + chevron affordance, one hit target. */
  DA.components.RecordLink = function RecordLink(options) {
    return el(
      'a',
      {
        className: 'record-link',
        attrs: {
          href: options.href || '#',
          'aria-label': options.ariaLabel || false
        }
      },
      [
        el('span', { className: 'record-link__label', text: options.label }),
        DA.icons.chevronRight(14)
      ]
    );
  };
})(window.DA);
