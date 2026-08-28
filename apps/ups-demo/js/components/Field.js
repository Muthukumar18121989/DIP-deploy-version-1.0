/**
 * Field — outlined text input with a floating label.
 *
 * The placeholder carries the label text while the field is empty, and the
 * label rises to the border once it holds a value, so a filled field is never
 * left unlabelled. `help` adds the circled question mark beside the control;
 * `hint` adds guidance text underneath.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;
  function nextId(prefix) {
    uid += 1;
    return prefix + '-' + uid;
  }

  DA.components.HelpButton = function HelpButton(text) {
    return el('button', {
      className: 'help-button u-tap-target',
      attrs: { type: 'button', 'aria-label': text, title: text }
    }, [DA.icons.help()]);
  };

  /**
   * A trailing asterisk in the label is the product's required marker. Shared
   * on `DA.components` so every control that takes a label applies one rule —
   * ChipInput carries required fields too.
   */
  function isRequired(label) {
    return typeof label === 'string' && /\*\s*$/.test(label.replace(/\(.*\)\s*$/, ''));
  }

  DA.components.isRequiredLabel = isRequired;

  DA.components.Field = function Field(options) {
    options = options || {};
    var id = options.id || nextId('field');
    var hintId = options.hint ? id + '-hint' : null;

    var input = el(options.multiline ? 'textarea' : 'input', {
      className: 'field__input' + (options.multiline ? ' field__input--multiline' : ''),
      attrs: {
        id: id,
        type: options.multiline ? false : (options.type || 'text'),
        rows: options.multiline ? (options.rows || 2) : false,
        placeholder: options.label,
        readonly: options.readOnly || false,
        'aria-required': isRequired(options.label) ? 'true' : false,
        'aria-describedby': hintId || false
      },
      on: options.onInput ? { input: options.onInput } : {}
    });
    input.value = options.value || '';

    var wrapper = el('div', { className: 'form-field' }, [
      el('div', { className: 'field' }, [
        el('div', { className: 'field__control' }, [
          input,
          el('label', {
            className: options.hideLabel ? 'u-visually-hidden' : 'field__label',
            text: options.label,
            attrs: { for: id }
          })
        ]),
        options.help ? DA.components.HelpButton(options.help) : null
      ]),
      options.hint
        ? el('p', {
            className: 'field__hint' + (options.hintAlign === 'end' ? ' field__hint--end' : ''),
            text: options.hint,
            attrs: { id: hintId }
          })
        : null
    ]);

    wrapper.input = input;
    return wrapper;
  };

  /**
   * SelectField — same outline treatment, native <select> underneath so the
   * platform picker and keyboard behaviour come for free.
   */
  DA.components.SelectField = function SelectField(options) {
    options = options || {};
    var id = options.id || nextId('select');

    var select = el(
      'select',
      {
        className: 'field__input',
        attrs: {
          id: id,
          'aria-required': isRequired(options.label) ? 'true' : false
        },
        on: options.onChange ? { change: options.onChange } : {}
      },
      (options.options || []).map(function (option) {
        return el('option', {
          text: option.label,
          attrs: {
            value: option.value,
            selected: String(option.value) === String(options.value)
          }
        });
      })
    );

    var chevron = DA.icons.chevronDown(18, 'select-field__chevron');

    var wrapper = el('div', { className: 'form-field' }, [
      el('div', {
        className: 'field select-field' + (options.hideLabel ? ' select-field--bare' : '')
      }, [
        el('div', { className: 'field__control' }, [
          select,
          el('label', {
            className: options.hideLabel ? 'u-visually-hidden' : 'field__label',
            text: options.label,
            attrs: { for: id }
          }),
          chevron
        ]),
        options.help ? DA.components.HelpButton(options.help) : null
      ])
    ]);

    wrapper.select = select;
    return wrapper;
  };
})(window.DA);
