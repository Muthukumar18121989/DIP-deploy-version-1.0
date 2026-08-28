/**
 * Minimal DOM helpers shared by every component.
 * Components are plain factory functions that return real DOM nodes, so the
 * markup stays semantic and framework-free.
 */
window.DA = window.DA || {};

(function (DA) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Create an element.
   * @param {string} tag
   * @param {Object} [props]  className | text | html | attrs | dataset | on | style
   * @param {Array}  [children]
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};

    if (props.className) node.className = props.className;
    if (props.text != null) node.textContent = String(props.text);
    if (props.html != null) node.innerHTML = props.html;

    Object.keys(props.attrs || {}).forEach(function (name) {
      var value = props.attrs[name];
      if (value === false || value == null) return;
      node.setAttribute(name, value === true ? '' : String(value));
    });

    Object.keys(props.dataset || {}).forEach(function (name) {
      node.dataset[name] = String(props.dataset[name]);
    });

    Object.keys(props.style || {}).forEach(function (name) {
      node.style.setProperty(name, props.style[name]);
    });

    Object.keys(props.on || {}).forEach(function (type) {
      node.addEventListener(type, props.on[type]);
    });

    append(node, children);
    return node;
  }

  /** Append a child, an array of children, or a string of text. */
  function append(parent, children) {
    if (children == null) return parent;
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child == null || child === false) return;
      parent.appendChild(
        typeof child === 'string' ? document.createTextNode(child) : child
      );
    });
    return parent;
  }

  /** Build an inline SVG icon from a path/markup string. */
  function svg(markup, options) {
    options = options || {};
    var size = options.size || 20;
    var node = document.createElementNS(SVG_NS, 'svg');
    node.setAttribute('viewBox', options.viewBox || '0 0 24 24');
    node.setAttribute('width', size);
    node.setAttribute('height', size);
    node.setAttribute('fill', options.fill || 'none');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    if (options.className) node.setAttribute('class', options.className);
    node.innerHTML = markup;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  DA.dom = { el: el, append: append, svg: svg, clear: clear };
})(window.DA);
