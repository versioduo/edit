// Avoid null !== undefined issues.
function isNull(value) {
  return value == null;
}

class V2App {
  nav = null;
  url = Object.seal({
    connect: null,
    debug: null
  });
  main = null;
  #sections = [];

  constructor(handler) {
    this.nav = document.querySelector('nav details ul');
    if (!this.nav)
      throw Error('V2App: Cannot find <nav>.');

    const url = new URL(window.location);
    this.url.connect = url.searchParams.get('connect');
    if (this.url.connect) {
      // Remove the command, it is only used for the first connection.
      url.searchParams.delete('connect');
      window.history.pushState({}, '', url);
    }
    this.url.debug = url.searchParams.get('debug');

    history.scrollRestoration = 'manual';

    // Intercept hash navigation to switch tabs.
    navigation.addEventListener("navigate", (e) => {
      const target = new URL(e.destination.url).hash;
      if (!target)
        return;

      const id = document.getElementById(target.substr(1));
      if (!id || id.nodeName !== 'BUTTON')
        return;

      id.click();
    });

    if (handler)
      handler(this);
  }

  addSection(section, args, handler) {
    const s = new section(this, ...(args || []));

    if (handler)
      handler(s);

    this.#sections.push(s);
    return s;
  }

  callSections(action, ...args) {
    for (const s of this.#sections) {
      if (typeof s[action] !== 'function')
        continue;

      s[action](...args);
    }
  }

  preserveScrollPosition(handler) {
    const behaviour = document.querySelector('html').style.scrollBehavior;
    document.querySelector('html').style.scrollBehavior = 'auto';
    const position = window.scrollY;

    handler();

    window.scrollTo(0, position);
    document.querySelector('html').style.scrollBehavior = behaviour;
  }

  serviceWorker(file) {
    this.#registerServiceWorker(file, (state, worker) => {
      // There is no worker during the intial setup.
      if (!navigator.serviceWorker.controller)
        return;

      switch (state) {
        case 'installed':
          // A new version was installed into the cache and a new worker is waiting to take control.
          V2App.addElementAdjacent(document.querySelector('body'), 'afterbegin', 'header', (header) => {
            V2App.addElement(header, 'hgroup', (hg) => {
              V2App.addElement(hg, 'h2', (e) => {
                V2App.addElement(e, 'i', (i) => {
                  i.classList.add('icon', '--rotate');
                });
                e.append('Update');
              });

              V2App.addElement(hg, 'p', (e) => {
                e.textContent = 'A fresh version is available';
              });
            });

            new V2AppMenu(header, (menu) => {
              menu.addElement('button', (e) => {
                e.textContent = 'Close';
                e.addEventListener('click', () => {
                  header.remove();
                });
              });

              menu.addElement('button', (e) => {
                e.classList.add('primary');
                e.textContent = 'Reload';
                e.addEventListener('click', () => {
                  worker.postMessage({
                    type: 'skipWaiting'
                  });
                });
              });
            });
          });
          break;

        case 'activated':
          // A new worker took control over the page.
          location.reload();
          break;
      }
    });
  }

  #registerServiceWorker(worker, handler) {
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
  app = null;
  id = null;
  nav = Object.seal({
    entry: null,
    entries: null
  });
  canvas = null;

  header = Object.seal({
    icon: null,
    title: null,
    subtitle: null
  });

  constructor(app, id, icon, title, subtitle) {
    if (!app || typeof app !== 'object')
      throw Error('V2AppSection: Missing app.');

    if (!id)
      throw Error('V2AppSection: Missing section identifier.');

    this.app = app;
    this.id = id;
    this.header.icon = icon || null;
    this.header.title = title || null;
    this.header.subtitle = subtitle || null;
    this.canvas = document.createElement('section');
    this.canvas.id = this.id;
  }

  addSection() {
    if (this.canvas.parentNode)
      throw Error('V2AppSection: The section #' + this.id + ' is already added.');

    if (this.header.title) {
      V2App.addElement(this.canvas, 'hgroup', (hg) => {
        V2App.addElement(hg, 'h2', (e) => {
          V2App.addElement(e, 'i', (i) => {
            i.classList.add('icon', this.header.icon);
          });

          e.append(this.header.title);
        });

        if (this.header.subtitle) {
          V2App.addElement(hg, 'p', (e) => {
            e.textContent = this.header.subtitle;
          });
        }
      });

      V2App.addElement(this.app.nav, 'li', (li) => {
        this.nav.entry = li;

        V2App.addElement(li, 'a', (e) => {
          e.href = '#' + this.id;

          if (this.header.icon)
            V2App.addElement(e, 'i', (i) => {
              i.classList.add('icon', this.header.icon);
            });

          e.append(this.header.title);
        });

        V2App.addElement(li, 'ul', (e) => {
          this.nav.entries = e;
        });
      });
    }

    document.querySelector('main').appendChild(this.canvas);
  }

  removeSection() {
    this.nav.entry?.remove();
    this.canvas.replaceChildren();
    this.canvas.remove();
  }

  addNavigation(title, id) {
    V2App.addElement(this.nav.entries, 'a', (e) => {
      e.href = '#' + id;
      e.append(title);
    });
  }
}

class V2AppNotify {
  element = null;

  constructor(canvas) {
    Object.seal(this);

    V2App.addElement(canvas, 'div', (e) => {
      this.element = e;
      this.element.classList.add('notify');
    });
  }

  clear() {
    this.element.replaceChildren();
  }

  info(text) {
    this.element.replaceChildren();
    V2App.addElement(this.element, 'p', (e) => {
      e.classList.add('--info');
      e.innerHTML = text;
    });
  }

  warn(text) {
    this.element.replaceChildren();
    V2App.addElement(this.element, 'p', (e) => {
      e.classList.add('--warn');
      e.innerHTML = text;
    });
  }

  error(text) {
    this.element.replaceChildren();
    V2App.addElement(this.element, 'p', (e) => {
      e.classList.add('--error');
      e.innerHTML = text;
    });
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

    Object.seal(this);
  }

  addItem(handler) {
    return V2App.addElement(this.element, 'li', (li) => {
      if (handler)
        handler(li);
    });
  }

  addElement(element, handler) {
    return V2App.addElement(this.addItem(), element, (e) => {
      if (handler)
        handler(e);
    });
  }

  remove() {
    this.element.remove();
  }
}

class V2AppTabs {
  element = null;
  menu = null;
  tabs = {};
  current = null;

  #notifiers = [];

  constructor(element, id, handler) {
    new V2AppMenu(element, (menu) => {
      menu.element.classList.add('bar');
      this.menu = menu;
      this.menu.element.id = id + '.tabs';
    });

    V2App.addElement(element, 'ul', (tabs) => {
      this.element = tabs;
    });

    if (handler)
      handler(this);

    Object.seal(this);
  }

  addNotifier(handler) {
    this.#notifiers.push(handler);
  }

  add(name, icon, text, handler) {
    this.tabs[name] = Object.seal({
      text: text,
      id: this.menu.element.id + '.' + name,
      tab: null,
      canvas: null
    });

    this.menu.addElement('button', (e) => {
      this.tabs[name].tab = e;
      e.id = this.tabs[name].id;

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
    });

    V2App.addElement(this.element, 'li', (e) => {
      if (handler)
        handler(e);

      e.style.display = 'none';
      this.tabs[name].canvas = e;
    });
  }

  switch(name) {
    if (this.current === name)
      return;

    this.current = null;

    for (const id of Object.keys(this.tabs)) {
      if (id === name) {
        this.tabs[id].tab.classList.add('info');
        this.tabs[id].canvas.style.display = '';
        this.current = name;

      } else {
        this.tabs[id].tab.classList.remove('info');
        this.tabs[id].canvas.style.display = 'none';
      }
    }

    if (!this.current)
      throw Error("V2AppTabs::switch: unknown tab name: " + name);

    for (const notifier of this.#notifiers)
      notifier(name);
  }
}
