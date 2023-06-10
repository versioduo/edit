// © Kay Sievers <kay@versioduo.com>, 2019-2023
// SPDX-License-Identifier: Apache-2.0

// Avoid null !== undefined issues.
function isNull(value) {
  return value == null;
}

// The main menu/navigation.
class V2Web {
  static setup() {
    // Always scroll to the top at page reload.
    history.scrollRestoration = 'manual';

    this.setupMenu();
  }

  static registerServiceWorker(worker, handler) {
    if (!('serviceWorker' in navigator))
      return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(worker, {
        updateViaCache: 'none'
      })
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker.addEventListener('statechange', () => {
              handler(worker.state, registration.waiting);
            });
          });
        }, () => { });
    });
  }

  static notifyUpdate(text, handler) {
    V2Web.addElementAfter(document.querySelector('.navbar'), 'section', (section) => {
      section.classList.add('has-background-info-light');
      section.classList.add('mb-0');
      section.classList.add('py-2');

      V2Web.addElement(section, 'div', (line) => {
        line.classList.add('container');
        line.classList.add('is-flex');
        line.classList.add('is-justify-content-space-between');
        line.classList.add('is-align-items-center');

        V2Web.addElement(line, 'div', (e) => {
          e.textContent = text;
        });

        V2Web.addButtons(line, (right) => {
          right.classList.add('is-flex');
          right.classList.add('is-justify-content-end');

          V2Web.addButton(right, (e) => {
            e.textContent = 'Close';
            e.addEventListener('click', () => {
              section.remove();
            });
          });

          V2Web.addButton(right, (e) => {
            e.classList.add('is-link');
            e.textContent = 'Update';
            e.addEventListener('click', () => {
              handler();
            });
          });
        });
      });
    });
  }

  static setupMenu() {
    const burger = document.querySelector('.navbar-burger');
    const menu = document.querySelector('.navbar-menu');

    // Hide the burger when the menu is (still) empty.
    if (!document.querySelector('.navbar-start').firstChild)
      burger.style.visibility = 'hidden';

    // Toggle menu with burger.
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-active');
      menu.classList.toggle('is-active');
    });

    window.addEventListener('click', (e) => {
      // Do not act on the burger toggle event.
      if (e.target === burger)
        return;

      if (!burger.classList.contains('is-active'))
        return;

      burger.classList.remove('is-active');
      menu.classList.remove('is-active');
    });
  }

  static addNavigation(id, title, target) {
    const navbar = document.querySelector('.navbar-start');

    if (!navbar.firstChild)
      document.querySelector('.navbar-burger').style.visibility = '';

    this.addElement(navbar, 'a', (e) => {
      e.id = 'navigation-' + id;
      e.classList.add('navbar-item');
      e.href = target;
      e.textContent = title;
    });
  }

  static removeNavigation(id) {
    const e = document.querySelector('#navigation-' + id);
    if (e)
      e.remove();

    if (!document.querySelector('.navbar-start').firstChild)
      document.querySelector('.navbar-burger').style.visibility = 'hidden';
  }

  static addElement(element, type, handler) {
    const e = document.createElement(type);
    if (handler)
      handler(e);

    element.appendChild(e);
  }

  static addElementAfter(element, type, handler) {
    const e = document.createElement(type);
    if (handler)
      handler(e);

    element.insertAdjacentElement('afterend', e);
  }

  static addFileDrop(element, area, attributes, handler) {
    area.addEventListener('dragenter', (event) => {
      for (const attribute of attributes)
        element.classList.add(attribute);

      event.preventDefault();
      event.stopPropagation();
    });

    area.addEventListener('dragleave', (event) => {
      if (event.currentTarget.contains(event.relatedTarget))
        return;

      for (const attribute of attributes)
        element.classList.remove(attribute);

      event.preventDefault();
      event.stopPropagation();
    });

    area.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    area.addEventListener('drop', (event) => {
      for (const attribute of attributes)
        element.classList.remove(attribute);

      event.preventDefault();
      event.stopPropagation();
      if (!event.dataTransfer.items)
        return;

      for (const file of event.dataTransfer.items) {
        if (event.dataTransfer.items[0].kind !== 'file')
          continue;

        if (!handler(file.getAsFile()))
          break;
      }
    });
  }

  static addButtons(element, handler) {
    const e = document.createElement('div');
    e.classList.add('buttons');
    e.classList.add('has-addons');
    if (handler)
      handler(e);

    element.appendChild(e);
  }

  static addButton(element, handler) {
    const e = document.createElement('button');
    e.classList.add('button');
    if (handler)
      handler(e);

    element.appendChild(e);
  }

  // Split newline character into paragraphs, substitute # heading level marker.
  static addMarkup(element, headingBase, text) {
    for (const line of text.split("\n")) {
      const match = line.match(/^#+/);
      if (match) {
        const heading = match[0].length;
        V2Web.addElement(element, 'h' + (headingBase + heading), (e) => {
          e.classList.add('subtitle');
          e.classList.add('mb-2');
          e.textContent = line.slice(heading).trim();
        });

      } else
        V2Web.addElement(element, 'p', (e) => {
          e.classList.add('content');
          e.textContent = line;
        });
    }
  }
}

// Inline element to show a notification with a close button.
class V2WebNotify {
  #element = null;
  #elementText = null;

  constructor(canvas) {
    V2Web.addElement(canvas, 'div', (notify) => {
      this.#element = notify;
      this.#element.style.display = 'none';
      this.#element.classList.add('notification');
      this.#element.classList.add('is-light');

      V2Web.addElement(notify, 'button', (e) => {
        e.classList.add('delete');
        e.addEventListener('click', () => {
          this.clear();
        });
      });

      V2Web.addElement(notify, 'div', (e) => {
        this.#elementText = e;
      });
    });

    return Object.seal(this);
  }

  clear(text) {
    this.#element.style.display = 'none';
    this.#element.classList.remove('is-info');
    this.#element.classList.remove('is-success');
    this.#element.classList.remove('is-warning');
    this.#element.classList.remove('is-danger');
    this.#elementText.innerHTML = '';
  }

  info(text) {
    this.clear();
    this.#element.classList.add('is-info');
    this.#element.style.display = '';
    this.#elementText.innerHTML = text;
  }

  success(text) {
    this.clear();
    this.#element.classList.add('is-success');
    this.#element.style.display = '';
    this.#elementText.innerHTML = text;
  }

  warn(text) {
    this.clear();
    this.#element.classList.add('is-warning');
    this.#element.style.display = '';
    this.#elementText.innerHTML = text;
  }

  error(text) {
    this.clear();
    this.#element.classList.add('is-danger');
    this.#element.style.display = '';
    this.#elementText.innerHTML = text;
  }
}

// Create a row of buttons and input elements.
class V2WebField {
  #element = null;

  constructor(element, handler) {
    V2Web.addElement(element, 'div', (e) => {
      this.#element = e;
      e.classList.add('field');
      e.classList.add('has-addons');
      if (handler)
        handler(this, e);
    });

    return Object.seal(this);
  }

  addElement(element, handler) {
    V2Web.addElement(this.#element, 'p', (p) => {
      p.classList.add('control');

      V2Web.addElement(p, element, (e) => {
        if (handler)
          handler(e, p);
      });
    });
  }

  addButton(handler) {
    this.addElement('button', (e, p) => {
      e.classList.add('button');

      if (handler)
        handler(e, p);
    });
  }

  addInput(type, handler) {
    this.addElement('input', (e, p) => {
      e.classList.add('input');
      e.type = type;

      if (handler)
        handler(e, p);
    });
  }
}

class V2WebTabs {
  current = null;

  #element = null;
  #elementsTabs = null;
  #tabs = {};
  #notifiers = [];

  constructor(element, handler) {
    V2Web.addElement(element, 'div', (tabs) => {
      this.#element = tabs;

      V2Web.addElement(tabs, 'div', (e) => {
        e.classList.add('tabs');
        e.classList.add('is-centered');
        e.classList.add('is-fullwidth');
        e.classList.add('is-boxed');

        V2Web.addElement(e, 'ul', (ul) => {
          this.#elementsTabs = ul;
        });
      });
    });

    if (handler)
      handler(this, this.#element);

    return Object.seal(this);
  }

  addNotifier(handler) {
    this.#notifiers.push(handler);
  }

  addTab(name, text, handler) {
    this.#tabs[name] = {};

    V2Web.addElement(this.#elementsTabs, 'li', (e) => {
      e.addEventListener('click', () => {
        // Do not switch inactive tabs.
        if (!this.current)
          return;

        this.switchTab(name);
      });

      V2Web.addElement(e, 'a', (e) => {
        e.textContent = text;
      });

      this.#tabs[name].tab = e;
    });

    V2Web.addElement(this.#element, 'div', (e) => {
      if (handler)
        handler(e);

      e.style.display = 'none';
      this.#tabs[name].canvas = e;
    });
  }

  switchTab(name) {
    for (const id of Object.keys(this.#tabs)) {
      if (id === name) {
        this.#tabs[id].tab.classList.add('is-active');
        this.#tabs[id].canvas.style.display = '';

      } else {
        this.#tabs[id].tab.classList.remove('is-active');
        this.#tabs[id].canvas.style.display = 'none';
      }
    }

    this.current = name;

    for (const notifier of this.#notifiers)
      notifier(name);
  }

  // Clear the tab's content.
  resetTab(name) {
    const canvas = this.#tabs[name].canvas;
    while (canvas.firstChild)
      canvas.firstChild.remove();
  }

  remove() {
    this.#element.remove();
  }
}

class V2WebModule {
  canvas = null;

  #section = null;
  #id = null;
  #title = null;

  constructor(id, title, subtitle) {
    this.#id = id;
    this.#title = title;

    this.#section = document.createElement('section');
    if (this.#id !== null)
      this.#section.id = id;

    V2Web.addElement(this.#section, 'div', (container) => {
      container.classList.add('container');

      if (title !== null) {
        V2Web.addElement(container, 'h2', (e) => {
          e.classList.add('title');
          e.textContent = title;
        });

        V2Web.addElement(container, 'p', (e) => {
          e.classList.add('subtitle');
          e.textContent = subtitle;
        });
      }

      V2Web.addElement(container, 'div', (e) => {
        this.canvas = e;
      });
    });
  }

  attach() {
    if (this.#section.parentNode)
      return;

    if (this.#id)
      V2Web.addNavigation(this.#id, this.#title, '#' + this.#id);

    document.body.appendChild(this.#section);
  }

  // Clear all content.
  reset() {
    while (this.canvas.firstChild)
      this.canvas.firstChild.remove();
  }

  detach() {
    if (!this.#section.parentNode)
      return;

    if (this.#id)
      V2Web.removeNavigation(this.#id);

    this.#section.remove();
  }

  show() {
    if (this.#id)
      V2Web.addNavigation(this.#id, this.#title, '#' + this.#id);

    this.#section.style.display = '';
  }

  hide() {
    if (this.#id)
      V2Web.removeNavigation(this.#id);

    this.#section.style.display = 'none';
  }
}
