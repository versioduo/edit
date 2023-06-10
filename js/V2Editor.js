// © Kay Sievers <kay@versioduo.com>, 2019-2022
// SPDX-License-Identifier: Apache-2.0

class V2Editor extends V2WebModule {
  #bannerNotify = null;
  #save = null;
  #fileName = null;
  #info = null;
  #infoElement = null;
  #midiFile = null;
  #tracks = [];

  constructor() {
    super();
    this.attach();

    this.#bannerNotify = new V2WebNotify(this.canvas);

    new V2WebField(this.canvas, (field) => {
      field.addButton((e) => {
        e.textContent = 'Load';
        e.addEventListener('click', () => {
          this.reset();
          this.#openFile();
        });

        V2Web.addFileDrop(e, this.canvas, ['is-focused', 'is-link', 'is-light'], (file) => {
          this.reset();
          this.#readFile(file);
        });
      });

      field.addButton((e) => {
        this.#save = e;
        e.classList.add('is-link');
        e.textContent = 'Save';
        e.addEventListener('click', () => {
          this.#saveFile();
        });
      });
    });

    this.#save.disabled = true;

    V2Web.addElement(this.canvas, 'div', (e) => {
      this.#info = e;
      e.classList.add('is-flex');
      e.classList.add('is-justify-content-end');
      e.innerHTML = '<a href=' + document.querySelector('link[rel="source"]').href +
        ' target="software">' + document.querySelector('meta[name="name"]').content +
        '</a>, version ' + Number(document.querySelector('meta[name="version"]').content);
    });

    return Object.seal(this);
  }

  show() {
    V2Web.addElement(this.canvas, 'div', (container) => {
      if (this.#info)
        this.#info.remove();

      this.#info = container;
      container.classList.add('table-container');

      V2Web.addElement(container, 'table', (table) => {
        table.classList.add('table');
        table.classList.add('is-fullwidth');
        table.classList.add('is-striped');
        table.classList.add('is-narrow');

        V2Web.addElement(table, 'tbody', (e) => {
          this.#infoElement = e;
        });
      });

      const addInfo = (name, value) => {
        V2Web.addElement(this.#infoElement, 'tr', (row) => {
          V2Web.addElement(row, 'td', (e) => {
            e.textContent = name;
          });

          V2Web.addElement(row, 'td', (e) => {
            e.textContent = value;
          });
        });
      }
    });

    const addDetail = (name, value) => {
      V2Web.addElement(this.#infoElement, 'tr', (row) => {
        V2Web.addElement(row, 'td', (e) => {
          e.textContent = name;
        });

        V2Web.addElement(row, 'td', (e) => {
          e.textContent = value;
        });
      });
    }

    addDetail('File', this.#fileName);
    const minutes = Math.trunc(this.#midiFile.runtimeSec / 60);
    const seconds = Math.trunc(this.#midiFile.runtimeSec % 60);
    addDetail('Runtime', minutes + ':' + (seconds < 10 ? '0' : '') + seconds);
    addDetail('Format Version', this.#midiFile.format + 1);
    addDetail('Tracks', this.#midiFile.tracks.length);

    for (const [i, track] of this.#midiFile.tracks.entries())
      this.#tracks.push(new V2EditorTrack(this, this.#midiFile, i));

    this.#save.disabled = false;
  }

  reset() {
    this.#save.disabled = true;
    this.#bannerNotify.clear();

    if (this.#info)
      this.#info.remove();

    for (const track of this.#tracks)
      track.detach();
    this.#tracks = [];
  }

  #addFile(buffer) {
    this.#midiFile = new V2MIDIFile();
    const error = this.#midiFile.loadBuffer(buffer);
    if (error) {
      this.#bannerNotify.error('Unable to parse the MIDI file: <i>' + error + '</i>');
      return;
    }

    this.show();
  }

  #readFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      this.#fileName = file.name;
      this.#addFile(reader.result);
    };

    reader.readAsArrayBuffer(file);
  }

  #openFile() {
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.mid,.midi';
    file.style.display = 'none';

    file.addEventListener('change', () => {
      this.#readFile(file.files[0]);
    }, false);

    file.click();
  }

  #saveFile() {
    if (!this.#midiFile)
      return;

    const buffer = this.#midiFile.getBuffer();
    if (!buffer)
      return;

    const bytes = new Uint8Array(buffer);
    const url = URL.createObjectURL(new Blob([bytes], {
      type: 'audio/midi'
    }));

    // Temporarily create an anchor and download the file as URI.
    const a = document.createElement('a');
    a.href = url;
    a.download = this.#fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
