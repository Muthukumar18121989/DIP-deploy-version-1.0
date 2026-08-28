/**
 * Icon set — stroke icons on a 24px grid so weight stays consistent.
 * Every icon is decorative; accessible names live on the control that owns it.
 */
(function (DA) {
  'use strict';

  var svg = DA.dom.svg;
  var STROKE =
    'fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round"';

  function bell(size) {
    return svg(
      '<path ' + STROKE + ' d="M18 8.5a6 6 0 1 0-12 0c0 5.2-1.5 6.8-2 7.5h16c-.5-.7-2-2.3-2-7.5Z"/>' +
      '<path ' + STROKE + ' d="M10 19a2.2 2.2 0 0 0 4 0"/>',
      { size: size || 22 }
    );
  }

  function search(size) {
    return svg(
      '<circle ' + STROKE + ' cx="11" cy="11" r="6.25"/>' +
      '<path ' + STROKE + ' d="m16 16 4 4"/>',
      { size: size || 18 }
    );
  }

  function chevronRight(size, className) {
    return svg('<path ' + STROKE + ' d="m9.5 5.5 6.5 6.5-6.5 6.5"/>', {
      size: size || 14,
      className: className || 'record-link__chevron'
    });
  }

  function chevronLeft(size, className) {
    return svg('<path ' + STROKE + ' d="M14.5 5.5 8 12l6.5 6.5"/>', {
      size: size || 14,
      className: className || ''
    });
  }

  function chevronDown(size, className) {
    return svg('<path ' + STROKE + ' d="m5.5 9 6.5 6.5L18.5 9"/>', {
      size: size || 18,
      className: className || ''
    });
  }

  function chevronUp(size, className) {
    return svg('<path ' + STROKE + ' d="M5.5 15 12 8.5 18.5 15"/>', {
      size: size || 18,
      className: className || ''
    });
  }

  function help(size) {
    return svg(
      '<circle ' + STROKE + ' cx="12" cy="12" r="8.5"/>' +
      '<path ' + STROKE + ' d="M9.7 9.4a2.35 2.35 0 1 1 2.9 2.65v1.4"/>' +
      '<circle cx="12.6" cy="16.4" r="0.95" fill="currentColor"/>',
      { size: size || 16 }
    );
  }

  function close(size) {
    return svg('<path ' + STROKE + ' d="m7 7 10 10M17 7 7 17"/>', { size: size || 14 });
  }

  function closeCircle(size) {
    return svg(
      '<circle ' + STROKE + ' cx="12" cy="12" r="8.5"/>' +
      '<path ' + STROKE + ' d="m9.2 9.2 5.6 5.6m0-5.6-5.6 5.6"/>',
      { size: size || 16 }
    );
  }

  function checkCircle(size) {
    return svg(
      '<circle cx="12" cy="12" r="9" fill="currentColor"/>' +
      '<path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" d="m8 12.2 2.7 2.7L16 9.6"/>',
      { size: size || 18 }
    );
  }

  function upload(size) {
    return svg(
      '<path ' + STROKE + ' d="M12 16V5.5m0 0L8.2 9.3M12 5.5l3.8 3.8"/>' +
      '<path ' + STROKE + ' d="M4.5 15v2.5A1.5 1.5 0 0 0 6 19h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
      { size: size || 22 }
    );
  }

  function download(size) {
    return svg(
      '<path ' + STROKE + ' d="M12 4.5v10m0 0-3.8-3.8M12 14.5l3.8-3.8"/>' +
      '<path ' + STROKE + ' d="M4.5 16v2A1.5 1.5 0 0 0 6 19.5h12A1.5 1.5 0 0 0 19.5 18v-2"/>',
      { size: size || 18 }
    );
  }

  function info(size) {
    return svg(
      '<circle cx="12" cy="12" r="9" fill="currentColor"/>' +
      '<path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" ' +
      'd="M12 11v5.2"/>' +
      '<circle cx="12" cy="7.9" r="1.05" fill="#fff"/>',
      { size: size || 18 }
    );
  }

  function check(size) {
    return svg(
      '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
      'stroke-linejoin="round" d="m6 12.4 4 4 8-8.8"/>',
      { size: size || 16 }
    );
  }

  function box(size) {
    return svg(
      '<path ' + STROKE + ' d="M20.5 8.2v7.6a1.5 1.5 0 0 1-.78 1.32l-6.98 3.83a1.5 1.5 0 0 1-1.48 0l-6.98-3.83A1.5 1.5 0 0 1 3.5 15.8V8.2a1.5 1.5 0 0 1 .78-1.32l6.98-3.83a1.5 1.5 0 0 1 1.48 0l6.98 3.83A1.5 1.5 0 0 1 20.5 8.2Z"/>' +
      '<path ' + STROKE + ' d="m3.8 7.4 8.2 4.5 8.2-4.5M12 20.8v-8.9"/>',
      { size: size || 26 }
    );
  }

  function boxOff(size) {
    return svg(
      '<path ' + STROKE + ' d="M20.5 8.2v7.6a1.5 1.5 0 0 1-.78 1.32l-6.98 3.83a1.5 1.5 0 0 1-1.48 0l-6.98-3.83A1.5 1.5 0 0 1 3.5 15.8V8.2a1.5 1.5 0 0 1 .78-1.32l6.98-3.83a1.5 1.5 0 0 1 1.48 0l6.98 3.83A1.5 1.5 0 0 1 20.5 8.2Z"/>' +
      '<path ' + STROKE + ' d="m3.8 7.4 8.2 4.5 8.2-4.5M12 20.8v-8.9"/>' +
      '<path ' + STROKE + ' d="m3 3 18 18"/>',
      { size: size || 26 }
    );
  }

  function pencil(size) {
    return svg(
      '<path ' + STROKE + ' d="M4.5 19.5h3.2l9-9a2.26 2.26 0 0 0-3.2-3.2l-9 9Z"/>' +
      '<path ' + STROKE + ' d="m13.7 8.1 2.2 2.2"/>',
      { size: size || 13 }
    );
  }

  function trash(size) {
    return svg(
      '<path ' + STROKE + ' d="M4.8 6.5h14.4M9.5 6.5V4.8h5v1.7M6.6 6.5l.8 12.1a1.2 1.2 0 0 0 1.2 1.1h6.8a1.2 1.2 0 0 0 1.2-1.1l.8-12.1"/>',
      { size: size || 14 }
    );
  }

  function save(size) {
    return svg(
      '<path ' + STROKE + ' d="M5.5 4.5h10.2L19.5 8.3v11.2H5.5Z"/>' +
      '<path ' + STROKE + ' d="M8.5 4.5v5h7M8.5 19.5v-5h7v5"/>',
      { size: size || 15 }
    );
  }

  function refresh(size) {
    return svg(
      '<path ' + STROKE + ' d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/>' +
      '<path ' + STROKE + ' d="M19.8 4.2v4.3h-4.3"/>',
      { size: size || 15 }
    );
  }

  function filter(size) {
    return svg('<path ' + STROKE + ' d="M4.5 5.5h15l-5.9 6.8v5.4l-3.2 1.8v-7.2Z"/>', {
      size: size || 16
    });
  }

  function settings(size) {
    return svg(
      '<circle ' + STROKE + ' cx="12" cy="12" r="2.9"/>' +
      '<path ' + STROKE + ' d="M19.1 14.2a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 1 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.14a1.8 1.8 0 1 1-3.6 0v-.07a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 1 1-2.55-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9h-.14a1.8 1.8 0 1 1 0-3.6h.07a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.05-.05a1.8 1.8 0 1 1 2.55-2.55l.05.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37v-.14a1.8 1.8 0 1 1 3.6 0v.07a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.14a1.8 1.8 0 1 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9Z"/>',
      { size: size || 14 }
    );
  }

  function plusCircle(size) {
    return svg(
      '<circle ' + STROKE + ' cx="12" cy="12" r="8.5"/>' +
      '<path ' + STROKE + ' d="M12 8.4v7.2M8.4 12h7.2"/>',
      { size: size || 18 }
    );
  }

  function file(size) {
    return svg(
      '<path ' + STROKE + ' d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z"/>' +
      '<path ' + STROKE + ' d="M13.5 3.5v5h5"/>',
      { size: size || 16 }
    );
  }

  function plus(size) {
    return svg('<path ' + STROKE + ' d="M12 5.5v13M5.5 12h13"/>', { size: size || 16 });
  }

  function inbox(size) {
    return svg(
      '<path ' + STROKE + ' d="M3.5 13.5h4l1.5 2.5h6l1.5-2.5h4"/>' +
      '<path ' + STROKE + ' d="M5.6 4.5h12.8l2.1 9v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-5Z"/>',
      { size: size || 40 }
    );
  }

  /**
   * UPS shield mark — simplified in-code placeholder.
   * Swap for the official brand asset before any external release.
   */
  function upsShield() {
    var node = DA.dom.svg('', { viewBox: '0 0 52 60', size: 0 });
    node.setAttribute('width', '52');
    node.setAttribute('height', '60');
    node.innerHTML =
      '<path d="M8.5 3.5h35a6 6 0 0 1 6 6v23.9c0 12.2-9.4 19.9-23.5 24.2C11.9 53.3 2.5 45.6 2.5 33.4V9.5a6 6 0 0 1 6-6Z" ' +
      'fill="var(--color-brand-shield)"/>' +
      '<path d="M13.5 15.5c3.6-4.4 8-6.6 12.5-6.6s8.9 2.2 12.5 6.6" fill="none" ' +
      'stroke="var(--color-brand-brown)" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M26 8.9c-1.9 0-3.1 1.3-3.1 2.7 0 1.5 1.3 2.5 3.1 2.5s3.1-1 3.1-2.5c0-1.4-1.2-2.7-3.1-2.7Z" ' +
      'fill="var(--color-brand-brown)"/>' +
      '<text x="26" y="42.5" text-anchor="middle" fill="var(--color-brand-brown)" ' +
      'font-family="var(--font-family-base)" font-size="20" font-weight="700" ' +
      'letter-spacing="-0.5">ups</text>';
    return node;
  }

  DA.icons = {
    bell: bell,
    search: search,
    chevronRight: chevronRight,
    chevronLeft: chevronLeft,
    chevronDown: chevronDown,
    chevronUp: chevronUp,
    help: help,
    close: close,
    closeCircle: closeCircle,
    checkCircle: checkCircle,
    upload: upload,
    download: download,
    info: info,
    check: check,
    pencil: pencil,
    trash: trash,
    save: save,
    refresh: refresh,
    filter: filter,
    box: box,
    boxOff: boxOff,
    settings: settings,
    plusCircle: plusCircle,
    file: file,
    plus: plus,
    inbox: inbox,
    upsShield: upsShield
  };
})(window.DA);
