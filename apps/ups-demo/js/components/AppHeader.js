/**
 * AppHeader — product bar shared by every screen:
 * brand mark + product name on the left, account utilities on the right.
 * `backLink` adds a return path beneath the product name, for screens opened
 * outside the main workflow.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  var icons = DA.icons;
  DA.components = DA.components || {};

  DA.components.AppHeader = function AppHeader(options) {
    options = options || {};
    var user = options.user || {};

    var logo = icons.upsShield();
    logo.setAttribute('class', 'app-header__logo');
    logo.setAttribute('role', 'img');
    logo.setAttribute('aria-label', 'UPS');
    logo.removeAttribute('aria-hidden');

    return el('header', { className: 'app-header', attrs: { role: 'banner' } }, [
      el('div', { className: 'app-header__brand' }, [
        logo,
        el('div', { className: 'app-header__titles' }, [
          el('h1', { className: 'app-header__title', text: options.productName || 'Digital Analyzer' }),
          options.backLink
            ? el('a', {
                className: 'app-header__back',
                attrs: { href: '#' },
                on: {
                  click: function (event) {
                    event.preventDefault();
                    options.backLink.onClick();
                  }
                }
              }, [DA.icons.chevronLeft(12), el('span', { text: options.backLink.label })])
            : null
        ])
      ]),
      el('div', { className: 'app-header__actions' }, [
        DA.components.IconButton({ icon: icons.bell(), ariaLabel: 'Notifications' }),
        DA.components.Avatar({ name: user.name, initials: user.initials })
      ])
    ]);
  };
})(window.DA);
