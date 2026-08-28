/**
 * FileDropzone / FileItem — file selection by drop or browse, and the
 * confirmation row for a file that has been attached.
 */
(function (DA) {
  'use strict';

  var el = DA.dom.el;
  DA.components = DA.components || {};

  DA.components.FileDropzone = function FileDropzone(options) {
    options = options || {};

    var input = el('input', {
      className: 'u-visually-hidden',
      attrs: { type: 'file', accept: options.accept || '', 'aria-hidden': 'true', tabindex: '-1' },
      on: {
        change: function (event) {
          var selected = event.target.files && event.target.files[0];
          if (selected && options.onFile) options.onFile(selected);
          event.target.value = '';
        }
      }
    });

    var browse = el('button', {
      className: 'dropzone__browse',
      text: 'Choose a file',
      attrs: { type: 'button' },
      on: { click: function () { input.click(); } }
    });

    var zone = el('div', {
      className: 'dropzone',
      on: {
        dragover: function (event) {
          event.preventDefault();
          zone.classList.add('dropzone--active');
        },
        dragleave: function () { zone.classList.remove('dropzone--active'); },
        drop: function (event) {
          event.preventDefault();
          zone.classList.remove('dropzone--active');
          var dropped = event.dataTransfer && event.dataTransfer.files[0];
          if (dropped && options.onFile) options.onFile(dropped);
        }
      }
    }, [
      el('span', { className: 'dropzone__icon' }, [DA.icons.upload()]),
      el('p', { className: 'dropzone__prompt' }, ['Drag and drop file or ', browse]),
      el('p', { className: 'dropzone__meta', text: 'Supported File Type : ' + (options.fileType || 'CSV') }),
      input
    ]);

    return zone;
  };

  DA.components.FileItem = function FileItem(options) {
    options = options || {};
    return el('div', { className: 'file-item' }, [
      el('span', { className: 'file-item__icon' }, [DA.icons.file()]),
      el('span', { className: 'file-item__name', text: options.name, attrs: { title: options.name } }),
      el('span', {
        className: 'file-item__status',
        attrs: { role: 'img', 'aria-label': 'Upload complete' }
      }, [DA.icons.checkCircle(18)]),
      el('button', {
        className: 'file-item__remove',
        attrs: { type: 'button', 'aria-label': 'Remove ' + options.name },
        on: options.onRemove ? { click: options.onRemove } : {}
      }, [DA.icons.close(16)])
    ]);
  };
})(window.DA);
