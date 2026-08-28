/**
 * ChipInput — free-text entries committed to removable chips.
 *
 * Space or Enter commits the current entry; pasting a delimited string commits
 * every value in it. `multiple: false` holds a single entry, which is how the
 * parent/child customer lookup behaves.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  var uid = 0;

  DA.components.ChipInput = function ChipInput(options) {
    options = options || {};
    uid += 1;
    var id = options.id || 'chips-' + uid;
    var multiple = options.multiple !== false;
    var values = (options.values || []).slice();
    var hintId = options.hint ? id + '-hint' : null;

    var area = el('div', { className: 'chip-input__area' });

    var entry = el('input', {
      className: 'chip-input__entry',
      attrs: {
        id: id,
        type: 'text',
        'aria-describedby': hintId || false,
        'aria-required': DA.components.isRequiredLabel(options.label) ? 'true' : false,
        autocomplete: 'off'
      },
      on: {
        focus: function () { syncLabel(true); },
        blur: function () { syncLabel(false); },
        keydown: function (event) {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            commit(entry.value);
          } else if (event.key === 'Backspace' && !entry.value && values.length) {
            remove(values.length - 1);
          }
        },
        paste: function (event) {
          var text = (event.clipboardData || window.clipboardData).getData('text');
          if (!text) return;
          event.preventDefault();
          text.split(/[\s,;]+/).forEach(commit);
        }
      }
    });

    var box = el('div', {
      className:
        'chip-input' +
        (options.multiline ? ' chip-input--multiline chip-input--labelled' : '') +
        (values.length ? ' chip-input--filled' : ''),
      on: {
        // The entry line is 21px inside a 42px box; clicking anywhere in the
        // box now lands in the field, as it does for every other input.
        mousedown: function (event) {
          if (event.target.closest('button') || event.target === entry) return;
          event.preventDefault();
          entry.focus();
        }
      }
    }, [
      el('label', {
        className: 'chip-input__label',
        text: options.label,
        attrs: { for: id }
      }),
      area
    ]);

    var wrapper = el('div', { className: 'form-field' }, [
      el('div', { className: 'field' }, [
        el('div', { className: 'field__control' }, [box]),
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

    function commit(raw) {
      var value = String(raw || '').trim();
      entry.value = '';
      if (!value || values.indexOf(value) !== -1) return render();
      values = multiple ? values.concat(value) : [value];
      render();
      if (options.onChange) options.onChange(values.slice());
    }

    function remove(index) {
      values.splice(index, 1);
      render();
      if (options.onChange) options.onChange(values.slice());
    }

    function render() {
      DA.dom.clear(area);
      values.forEach(function (value, index) {
        area.appendChild(
          el('span', { className: 'chip' }, [
            el('span', { className: 'chip__label', text: value, attrs: { title: value } }),
            el('button', {
              className: 'chip__remove u-tap-target',
              attrs: { type: 'button', 'aria-label': 'Remove ' + value },
              on: { click: function () { remove(index); } }
            }, [DA.icons.closeCircle(16)])
          ])
        );
      });
      // A single-value field is full once it holds a chip: hiding the entry
      // keeps the control one line tall instead of wrapping to a second row.
      if (multiple || !values.length) area.appendChild(entry);
      box.classList.toggle('chip-input--filled', values.length > 0);
      syncLabel(document.activeElement === entry);
    }

    /**
     * The label and the placeholder say the same thing, so only one shows at a
     * time: placeholder while the field is empty and unfocused, floating label
     * once it is focused or holds entries. The multiline variant keeps its
     * label permanently, matching the reference layout.
     */
    function syncLabel(focused) {
      var labelled = options.multiline || focused || values.length > 0;
      box.classList.toggle('chip-input--labelled', labelled);
      entry.placeholder = labelled && !options.multiline ? '' : (values.length ? '' : options.label);
      if (options.multiline) entry.placeholder = '';
    }

    render();

    wrapper.getValues = function () { return values.slice(); };
    return wrapper;
  };
})(window.DA);
