/**
 * Customer Details — step one of the New Analyzer Packet workflow.
 *
 * Reached from "New Analyzer Packet" on the packet list. Captures the customer
 * the packet is built for, the shipping profile window, and an optional
 * customer PLD file.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var C = DA.components;
  var format = DA.format;

  var HIERARCHY_OPTIONS = [
    { value: 'Parent', label: 'Parent' },
    { value: 'Child', label: 'Child' }
  ];

  DA.pages = DA.pages || {};

  DA.pages.CustomerDetailsPage = function CustomerDetailsPage(options) {
    options = options || {};

    var state = {
      hierarchy: 'Parent',
      from: '05/23/2026',
      to: '08/15/2026',
      pldFile: null
    };

    /* ---- Customer ------------------------------------------------------- */

    var hierarchyField = C.SelectField({
      label: 'Customer Hierarchy*',
      value: state.hierarchy,
      options: HIERARCHY_OPTIONS,
      onChange: function (event) {
        state.hierarchy = event.target.value;
        renderCustomerLookup();
      }
    });

    var customerLookupSlot = el('div', { className: 'form-field' });
    var customerLookup;

    function renderCustomerLookup() {
      customerLookup = C.ChipInput({
        label: 'Enter ' + state.hierarchy + '*',
        multiple: false
      });
      DA.dom.clear(customerLookupSlot).appendChild(customerLookup);
    }

    /* ---- Shipping profile ----------------------------------------------- */

    var duration = el('p', { className: 'field__hint' });

    function renderDuration() {
      var weeks = format.weeksBetween(state.from, state.to);
      duration.textContent = weeks == null
        ? 'Duration : —'
        : 'Duration : ' + weeks + ' Week' + (weeks === 1 ? '' : 's');
    }

    var fromField = C.Field({
      label: 'Shipping Profile From*',
      value: state.from,
      onInput: function (event) { state.from = event.target.value; renderDuration(); }
    });

    var toField = C.Field({
      label: 'Shipping Profile To*',
      value: state.to,
      onInput: function (event) { state.to = event.target.value; renderDuration(); }
    });

    renderDuration();

    /* ---- Optional customer PLD ------------------------------------------ */

    var attachmentSlot = el('div');

    function renderAttachment() {
      DA.dom.clear(attachmentSlot);
      if (!state.pldFile) return;

      attachmentSlot.appendChild(
        el('div', { className: 'attachment' }, [
          el('p', { className: 'attachment__title', text: 'Attached File' }),
          C.FileItem({
            name: state.pldFile,
            onRemove: function () { state.pldFile = null; renderAttachment(); }
          }),
          C.Field({ label: 'Add Duration* (In Weeks)', value: '13', type: 'text' }),
          C.Toggle({ label: 'Annualize :', valueLabel: 'Yes', checked: true })
        ])
      );
    }

    var pldSection = C.Accordion({
      title: 'Upload Optional Customer PLD',
      content: [
        C.FileDropzone({
          accept: '.csv,text/csv',
          fileType: 'CSV',
          onFile: function (selected) {
            state.pldFile = selected.name;
            renderAttachment();
          }
        }),
        attachmentSlot
      ]
    });

    /* ---- Remaining fields ------------------------------------------------ */

    var pqrField = C.Field({
      label: 'Enter PQR to link to packet (optional)',
      help: 'A PQR links an existing pricing quote request to this packet.'
    });

    var oppField = C.ChipInput({
      label: 'Enter OPP(s) to link to packet (optional)',
      multiline: true,
      help: 'Link one or more opportunity records to this packet.',
      hint: 'Use space bar or enter key to save each entry. Otherwise, paste multiple.',
      hintAlign: 'end'
    });

    var referenceField = C.Field({ label: 'Customer Reference Number*' });
    var customerNameField = C.Field({
      label: 'Customer Name*',
      help: 'The customer name is taken from the selected account.'
    });
    var descriptionField = C.Field({ label: 'Analyzer Packet Description*' });

    /** What the user captured, ready for the next step. */
    function collect() {
      return {
        hierarchy: state.hierarchy,
        customerLookup: customerLookup.getValues()[0] || '',
        pqr: pqrField.input.value,
        opps: oppField.getValues(),
        referenceNumber: referenceField.input.value,
        customerName: customerNameField.input.value,
        description: descriptionField.input.value,
        from: state.from,
        to: state.to,
        pldFile: state.pldFile
      };
    }

    /* ---- Composition ----------------------------------------------------- */

    renderCustomerLookup();

    var card = el('section', { className: 'form-card', attrs: { 'aria-labelledby': 'customer-details-title' } }, [
      el('h2', {
        className: 'form-card__title title-rule',
        text: 'Customer Details',
        attrs: { id: 'customer-details-title' }
      }),
      el('div', { className: 'form-grid' }, [
        hierarchyField,
        customerLookupSlot,
        pqrField,
        oppField,
        el('div', { className: 'form-grid__full' }, [referenceField]),
        el('div', { className: 'form-grid__full' }, [customerNameField]),
        el('div', { className: 'form-grid__full' }, [descriptionField]),
        fromField,
        toField,
        el('div', { className: 'form-grid__full' }, [duration])
      ]),
      el('hr', { className: 'form-divider' }),
      C.Toggle({ label: 'Annualize :', valueLabel: 'Yes', checked: true }),
      el('div', { style: { 'margin-top': 'var(--space-5)' } }, [pldSection])
    ]);

    var actions = el('div', { className: 'page-actions' }, [
      C.Button({
        label: 'Back',
        variant: 'link',
        icon: DA.icons.chevronLeft(14),
        onClick: function () { if (options.onBack) options.onBack(); }
      }),
      C.Button({
        label: 'Source Data',
        variant: 'primary',
        shape: 'pill',
        icon: DA.icons.chevronRight(14, ''),
        iconPosition: 'end',
        onClick: function () { if (options.onSourceData) options.onSourceData(collect()); }
      })
    ]);

    return el('main', { className: 'page', attrs: { id: 'main-content' } }, [card, actions]);
  };
})(window.DA);
