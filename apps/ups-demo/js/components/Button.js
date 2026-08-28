/**
 * Button — variants: primary (brand gold), secondary, ghost, link.
 * `shape: 'pill'` fully rounds it; `iconPosition: 'end'` puts the icon after
 * the label, which is how the workflow's forward action is drawn.
 * Usage: DA.components.Button({ label: 'New Analyzer Packet', variant: 'primary' })
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;

  DA.components = DA.components || {};

  DA.components.Button = function Button(options) {
    options = options || {};
    var variant = options.variant || 'secondary';
    var className =
      'button button--' + variant +
      (options.shape === 'pill' ? ' button--pill' : '') +
      (options.className ? ' ' + options.className : '');

    return el(
      'button',
      {
        className: className,
        attrs: {
          type: options.type || 'button',
          disabled: options.disabled || false,
          'aria-label': options.ariaLabel || false
        },
        on: options.onClick ? { click: options.onClick } : {}
      },
      options.iconPosition === 'end'
        ? [el('span', { text: options.label }), options.icon || null]
        : [options.icon || null, el('span', { text: options.label })]
    );
  };

  /** Icon-only button. `ariaLabel` is required — the icon carries no text. */
  DA.components.IconButton = function IconButton(options) {
    return el(
      'button',
      {
        className: 'icon-button' + (options.className ? ' ' + options.className : ''),
        attrs: { type: 'button', 'aria-label': options.ariaLabel, title: options.ariaLabel },
        on: options.onClick ? { click: options.onClick } : {}
      },
      [options.icon]
    );
  };
})(window.DA);
