// Avoid null !== undefined issues.
function isNull(value) {
  return value == null;
}

class V2App {
  #sections = [];

  constructor(handler) {
    // Always scroll to the top at page reload.
    history.scrollRestoration = 'manual';

    if (handler)
      handler(this);

    return Object.seal(this);
  }

  addSection(s, handler) {
    this.#sections.push(s);

    if (handler)
      handler(s);
  }

  call(action, data) {
    for (const s of this.#sections) {
      if (typeof s[action] !== 'function')
        continue;

      s[action](data);
    }
  }

  registerServiceWorker(worker, handler) {
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

  notifyUpdate(text, handler) {
    V2App.addElementAdjacent(document.querySelector('main'), 'afterbegin', 'section', (section) => {
      V2App.addElement(section, 'hgroup', (hg) => {
        V2App.addElement(hg, 'h2', (e) => {
          e.textContent = 'Update';
        });

        V2App.addElement(hg, 'p', (e) => {
          e.textContent = text;
        });
      });

      new V2AppMenu(section, (menu) => {
        menu.addElement('button', (e) => {
          e.textContent = 'Close';
          e.addEventListener('click', () => {
            section.remove();
          });
        });

        menu.addElement('button', (e) => {
          e.classList.add('primary');
          e.textContent = 'Reload';
          e.addEventListener('click', () => {
            handler();
          });
        });
      });
    });
  }

  static addElement(element, type, handler) {
    const e = document.createElement(type);
    if (handler)
      handler(e);

    element.appendChild(e);
    return e;
  }

  static addElementAdjacent(element, position, type, handler) {
    const e = document.createElement(type);
    if (handler)
      handler(e);

    element.insertAdjacentElement(position, e);
    return e;
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

  // Read # heading marker, split newline character into paragraphs.
  static addMarkup(element, text) {
    for (const line of text.split('\n')) {
      const match = line.match(/^#+/);
      if (match) {
        V2App.addElement(element, 'p', (e) => {
          e.classList.add('title');
          e.textContent = line.slice(match[0].length).trim();
        });

      } else
        V2App.addElement(element, 'p', (e) => {
          e.textContent = line;
        });
    }
  }
}

class V2AppSection {
  id = null;
  canvas = null;

  header = Object.seal({
    element: null,
    icon: null,
    title: null,
    subtitle: null
  });

  constructor(id, icon, title, subtitle) {
    if (!id)
      throw Error('V2AppSection: Missing section identifier.');

    this.title(icon, title, subtitle);
    this.id = id;
    this.canvas = document.createElement('section');
    this.canvas.id = this.id;
  }

  title(icon, title, subtitle) {
    this.header.icon = icon || null;
    this.header.title = title || null;
    this.header.subtitle = subtitle || null;

    if (!this.header.element)
      return;

    this.header.element.replaceChildren();

    if (title) {
      V2App.addElement(this.header.element, 'h2', (e) => {
        if (icon)
          V2App.addElement(e, 'i', (i) => {
            i.classList.add('icon', icon);
          });

        e.append(title);
      });
    }

    if (subtitle) {
      V2App.addElement(this.header.element, 'p', (e) => {
        e.textContent = subtitle;
      });
    }
  }

  addSection() {
    if (this.canvas.parentNode)
      throw Error('V2AppSection: The section #' + this.id + ' is already added.');

    V2App.addElement(this.canvas, 'hgroup', (e) => {
      this.header.element = e;
    });

    if (this.header.title) {
      this.title(this.header.icon, this.header.title, this.header.subtitle);
      this.#addNavigation(this.id, this.header.icon, this.header.title);
    }

    document.querySelector('main').appendChild(this.canvas);
  }

  removeSection() {
    this.#removeNavigation(this.id);
    this.canvas.replaceChildren();
    this.canvas.remove();
  }

  #addNavigation(id, icon, title) {
    if (!title)
      return;

    V2App.addElement(document.querySelector('nav details ul'), 'li', (li) => {
      li.id = 'nav-' + id;

      V2App.addElement(li, 'a', (e) => {
        e.href = '#' + id;

        if (icon)
          V2App.addElement(e, 'i', (i) => {
            i.classList.add('icon', icon);
          });

        e.append(title);
      });
    });
  }

  #removeNavigation(id) {
    const e = document.querySelector('#nav-' + id);
    if (e)
      e.remove();
  }
}

class V2AppNotify {
  #element = null;
  #elementText = null;

  constructor(canvas) {
    V2App.addElement(canvas, 'div', (notify) => {
      this.#element = notify;
      this.#element.style.display = 'none';
      this.#element.classList.add('notify');
    });

    return Object.seal(this);
  }

  clear(text) {
    this.#element.style.display = 'none';
    this.#element.classList.remove('--info', '--warn', '--error');
    this.#element.innerHTML = '';
  }

  info(text) {
    this.clear();
    this.#element.classList.add('--info');
    this.#element.style.display = '';
    this.#element.innerHTML = text;
  }

  warn(text) {
    this.clear();
    this.#element.classList.add('--warn');
    this.#element.style.display = '';
    this.#element.innerHTML = text;
  }

  error(text) {
    this.clear();
    this.#element.classList.add('--error');
    this.#element.style.display = '';
    this.#element.innerHTML = text;
  }
}

class V2AppMenu {
  element = null;

  constructor(element, handler) {
    if (!element)
      throw Error('V2AppMenu: Invalid parent element.');

    V2App.addElement(element, 'menu', (e) => {
      this.element = e;

      if (handler)
        handler(this);
    });

    return Object.seal(this);
  }

  addItem(handler) {
    V2App.addElement(this.element, 'li', (li) => {
      if (handler)
        handler(li);
    });
  }

  addElement(element, handler) {
    this.addItem((li) => {
      V2App.addElement(li, element, (e) => {
        if (handler)
          handler(e);
      });
    });
  }

  remove() {
    this.element.remove();
  }
}

class V2AppTabs {
  current = null;
  element = null;

  #elementsTabs = null;
  #tabs = {};
  #notifiers = [];

  constructor(element, handler) {
    V2App.addElement(element, 'ul', (tabs) => {
      this.element = tabs;

      new V2AppMenu(tabs, (menu) => {
        menu.element.classList.add('bar');
        this.#elementsTabs = menu;
      });
    });

    if (handler)
      handler(this);

    return Object.seal(this);
  }

  addNotifier(handler) {
    this.#notifiers.push(handler);
  }

  add(name, icon, text, handler) {
    this.#tabs[name] = {};

    this.#elementsTabs.addElement('button', (e) => {
      e.addEventListener('click', () => {
        // Do not switch inactive tabs.
        if (!this.current)
          return;

        this.switch(name);
      });

      V2App.addElement(e, 'i', (i) => {
        i.classList.add('icon', icon);
      });
      e.append(text);
      this.#tabs[name].tab = e;
    });

    V2App.addElement(this.element, 'li', (e) => {
      if (handler)
        handler(e);

      e.style.display = 'none';
      this.#tabs[name].canvas = e;
    });
  }

  switch(name) {
    this.current = null;

    for (const id of Object.keys(this.#tabs)) {

      if (id === name) {
        this.#tabs[id].tab.classList.add('info');
        this.#tabs[id].canvas.style.display = '';
        this.current = name;

      } else {
        this.#tabs[id].tab.classList.remove('info');
        this.#tabs[id].canvas.style.display = 'none';
      }
    }

    if (!this.current)
      throw Error("V2AppTabs::switch: unknown tab name: " + name);

    for (const notifier of this.#notifiers)
      notifier(name);
  }
}
