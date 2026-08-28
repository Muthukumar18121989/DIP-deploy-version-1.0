/**
 * Avatar — initials in a ringed circle. Acts as the account menu trigger.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.Avatar = function Avatar(options) {
    var name = options.name || '';
    var initials = options.initials || name.slice(0, 2).toUpperCase();

    return el('button', {
      className: 'avatar',
      text: initials,
      attrs: {
        type: 'button',
        'aria-label': 'Account menu' + (name ? ' for ' + name : ''),
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        title: name || initials
      },
      on: options.onClick ? { click: options.onClick } : {}
    });
  };
})(window.DA);
