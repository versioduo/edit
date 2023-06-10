// © Kay Sievers <kay@versioduo.com>, 2019-2022
// SPDX-License-Identifier: Apache-2.0

class V2EditorTrack extends V2WebModule {
  #midiFile = null;
  #midiTrack = null;
  #index = null;

  #tabs = null;
  #track = Object.seal({
    element: null
  });
  #details = Object.seal({
    element: null,
    table: null
  });
  #events = Object.seal({
    element: null,
    table: null
  });

  constructor(editor, midiFile, index) {
    super('track' + (index + 1), index + 1);
    this.attach();

    this.#midiFile = midiFile;
    this.#midiTrack = this.#midiFile.tracks[index];
    this.#index = index;

    if (this.#index > 0 && this.#midiFile.tracks.length > 2) {
      V2Web.addButtons(this.canvas, (buttons) => {
        V2Web.addButton(buttons, (e) => {
          e.textContent = 'Delete';
          e.addEventListener('click', () => {
            this.#midiFile.deleteTrack(this.#index);
            editor.reset();
            editor.show();
          });
        });
      });
    }

    new V2WebTabs(this.canvas, (tabs) => {
      this.#tabs = tabs;

      tabs.addTab('track', 'Track', (e) => {
        this.#track.element = e;
      });

      tabs.addTab('details', 'Details', (e) => {
        this.#details.element = e;
      });

      tabs.addTab('events', 'Events', (e) => {
        this.#events.element = e;
      });
    });

    this.#tabs.switchTab('track');

    this.#addTrack();
    this.#addDetails();
    this.#addEvents();

    return Object.seal(this);
  }

  #addTrack() {
    new V2WebField(this.#track.element, (field) => {
      field.addButton((e) => {
        e.classList.add('width-label');
        e.classList.add('has-background-grey-lighter');
        e.classList.add('inactive');
        e.textContent = 'Title';
        e.tabIndex = -1;
      });

      field.addInput('text', (e, p) => {
        p.classList.add('is-expanded');
        e.value = this.#midiTrack.getTag('title');
        e.addEventListener('change', () => {
          if (e.value === '')
            this.#midiTrack.deleteTag('title');

          else
            this.#midiTrack.setTag('title', e.value);
          this.#refresh();
        });
      });
    });

    if (this.#index === 0) {
      new V2WebField(this.#track.element, (field) => {
        field.addButton((e) => {
          e.classList.add('width-label');
          e.classList.add('has-background-grey-lighter');
          e.classList.add('inactive');
          e.textContent = 'Copyright';
          e.tabIndex = -1;
        });

        field.addInput('text', (e, p) => {
          p.classList.add('is-expanded');
          e.value = this.#midiTrack.getTag('copyright');
          e.addEventListener('change', () => {
            this.#midiTrack.setTag('copyright', e.value);
            this.#refresh();
          });
        });
      });
    }

    if (this.#index > 0 || this.#midiFile.format === 0) {
      new V2WebField(this.#track.element, (field) => {
        field.addButton((e) => {
          e.classList.add('width-label');
          e.classList.add('has-background-grey-lighter');
          e.classList.add('inactive');
          e.textContent = 'Program';
          e.tabIndex = -1;
        });

        field.addElement('span', (e) => {
          e.classList.add('select');

          V2Web.addElement(e, 'select', (select) => {
            select.addEventListener('change', () => {
              if (select.value === '')
                this.#midiTrack.deleteProgram(select.value);

              else
                this.#midiTrack.setProgram(select.value);
              this.#refresh();
            });

            const program = this.#midiTrack.getProgram();

            // No or delete program change.
            V2Web.addElement(select, 'option', (e) => {
              e.textContent = '';
              e.value = '';
            });

            for (const [index, name] of Object.entries(V2MIDI.GM.Program.Name)) {
              const i = Number(index);

              V2Web.addElement(select, 'option', (e) => {
                e.textContent = (i + 1) + ' – ' + name;
                e.value = Number(i);
                if (program !== null && program === i)
                  e.selected = true;
              });
            }
          });
        });
      });

      new V2WebField(this.#track.element, (field) => {
        field.addButton((e) => {
          e.classList.add('width-label');
          e.classList.add('has-background-grey-lighter');
          e.classList.add('inactive');
          e.textContent = 'Device';
          e.tabIndex = -1;
        });

        field.addInput('text', (e, p) => {
          p.classList.add('is-expanded');
          e.value = this.#midiTrack.getTag('deviceName');
          e.addEventListener('change', () => {
            if (e.value === '')
              this.#midiTrack.deleteTag('deviceName');

            else
              this.#midiTrack.setTag('deviceName', e.value);
            this.#refresh();
          });
        });
      });
    }
  }

  #addDetails() {
    V2Web.addElement(this.#details.element, 'div', (container) => {
      container.classList.add('table-container');

      V2Web.addElement(container, 'table', (table) => {
        table.classList.add('table');
        table.classList.add('is-fullwidth');
        table.classList.add('is-striped');
        table.classList.add('is-narrow');

        V2Web.addElement(table, 'tbody', (e) => {
          this.#details.table = e;
        });
      });
    });

    const addDetail = (name, value) => {
      V2Web.addElement(this.#details.table, 'tr', (row) => {
        V2Web.addElement(row, 'td', (e) => {
          e.textContent = name;
        });

        V2Web.addElement(row, 'td', (e) => {
          e.textContent = value;
        });
      });
    }

    let events = Object.seal({
      all: 0,

      meta: Object.seal({
        all: 0,
        sequence: 0,
        text: 0,
        copyright: 0,
        title: 0,
        instrument: 0,
        lyric: 0,
        marker: 0,
        cuePoint: 0,
        programName: 0,
        deviceName: 0,
        channel: 0,
        port: 0,
        endOfTrack: 0,
        tempo: 0,
        smtpeOffset: 0,
        timeSignature: 0,
        keySignature: 0,
        sequencer: 0
      }),

      midi: Object.seal({
        all: 0,
        noteOn: 0,
        noteOff: 0,
        aftertouch: 0,
        controlChange: 0,
        programChange: 0,
        aftertouchChannel: 0,
        pitchBend: 0
      }),

      system: Object.seal({
        exclusive: 0,
        escape: 0
      })
    });

    for (const event of this.#midiTrack.events) {
      events.all++;

      if (event.meta !== null) {
        events.meta.all++

        switch (event.meta) {
          case V2MIDIFile.Meta.sequence:
            events.meta.sequence++;
            break;

          case V2MIDIFile.Meta.text:
            events.meta.text++;
            break;

          case V2MIDIFile.Meta.copyright:
            events.meta.copyright++;
            break;

          case V2MIDIFile.Meta.title:
            events.meta.title++;
            break;

          case V2MIDIFile.Meta.instrument:
            events.meta.instrument++;
            break;

          case V2MIDIFile.Meta.lyric:
            events.meta.lyric++;
            break;

          case V2MIDIFile.Meta.marker:
            events.meta.marker++;
            break;

          case V2MIDIFile.Meta.cuePoint:
            events.meta.cuePoint++;
            break;

          case V2MIDIFile.Meta.programName:
            events.meta.programName++;
            break;

          case V2MIDIFile.Meta.deviceName:
            events.meta.deviceName++;
            break;

          case V2MIDIFile.Meta.channel:
            events.meta.channel++;
            break;

          case V2MIDIFile.Meta.port:
            events.meta.port++;
            break;

          case V2MIDIFile.Meta.endOfTrack:
            events.meta.endOfTrack++;
            break;

          case V2MIDIFile.Meta.tempo:
            events.meta.tempo++;
            break;

          case V2MIDIFile.Meta.smtpeOffset:
            events.meta.smtpeOffset++;
            break;

          case V2MIDIFile.Meta.timeSignature:
            events.meta.timeSignature++;
            break;

          case V2MIDIFile.Meta.keySignature:
            events.meta.keySignature++;
            break;

          case V2MIDIFile.Meta.sequencer:
            events.meta.sequencer++;
            break;
        }

      } else if (event.status !== null) {
        events.midi.all++

        switch (V2MIDI.Status.getType(event.status)) {
          case V2MIDI.Status.noteOn:
            events.midi.noteOn++;
            break;

          case V2MIDI.Status.noteOff:
            events.midi.noteOff++;
            break;

          case V2MIDI.Status.aftertouch:
            events.midi.aftertouch++;
            break;

          case V2MIDI.Status.controlChange:
            events.midi.controlChange++;
            break;

          case V2MIDI.Status.programChange:
            events.midi.programChange++;
            break;

          case V2MIDI.Status.aftertouchChannel:
            events.midi.aftertouchChannel++;
            break;

          case V2MIDI.Status.pitchBend:
            events.midi.pitchBend++;
            break;
        }

      } else if (event.systemExclusive !== null) {
        switch (event.systemExclusive) {
          case 0xf0:
            events.system.exclusive++;
            break;

          case 0xf7:
            events.system.escape++;
            break;
        }
      }
    }

    addDetail('Events', events.all);
    addDetail('Meta Events', events.meta.all);
    if (events.midi.all > 0)
      addDetail('MIDI Events', events.midi.all);

    if (events.meta.sequence > 0)
      addDetail('Sequence', events.meta.sequence);

    if (events.meta.text > 0)
      addDetail('Text', events.meta.text);

    if (events.meta.copyright > 0)
      addDetail('Copyright', events.meta.copyright);

    if (events.meta.title > 0)
      addDetail('Title', events.meta.title);

    if (events.meta.instrument > 0)
      addDetail('Instrument', events.meta.instrument);

    if (events.meta.lyric > 0)
      addDetail('Lyric', events.meta.lyric);

    if (events.meta.marker > 0)
      addDetail('Marker', events.meta.marker);

    if (events.meta.cuePoint > 0)
      addDetail('Cue Point', events.meta.cuePoint);

    if (events.meta.programName > 0)
      addDetail('Program Name', events.meta.programName);

    if (events.meta.deviceName > 0)
      addDetail('Device', events.meta.deviceName);

    if (events.meta.channel > 0)
      addDetail('MIDI Channel', events.meta.channel);

    if (events.meta.port)
      addDetail('MIDI Port', events.meta.port);

    if (events.meta.endOfTrack > 0)
      addDetail('End of Track', events.meta.endOfTrack);

    if (events.meta.tempo > 0)
      addDetail('Tempo', events.meta.tempo);

    if (events.meta.smtpeOffset > 0)
      addDetail('SMTPE Offset', events.meta.smtpeOffset);

    if (events.meta.timeSignature)
      addDetail('Time Signature', events.meta.timeSignature);

    if (events.meta.keySignature > 0)
      addDetail('Key Signature', events.meta.keySignature);

    if (events.meta.sequencer > 0)
      addDetail('Sequencer', events.meta.sequencer);

    if (events.midi.noteOn > 0)
      addDetail('Note On', events.midi.noteOn);

    if (events.midi.noteOff > 0)
      addDetail('Note Off', events.midi.noteOff);

    if (events.midi.aftertouch > 0)
      addDetail('Aftertouch', events.midi.aftertouch);

    if (events.midi.controlChange > 0)
      addDetail('Control Change', events.midi.controlChange);

    if (events.midi.programChange > 0)
      addDetail('Program Change', events.midi.programChange);

    if (events.midi.aftertouchChannel > 0)
      addDetail('Aftertouch Channel', events.midi.aftertouchChannel);

    if (events.midi.pitchBend > 0)
      addDetail('Pitch Bend', events.midi.pitchBend);

    if (events.system.exclusive > 0)
      addDetail('System Exclusive', events.system.exclusive);

    if (events.system.escape > 0)
      addDetail('System Escape', events.system.escape);
  }

  #addEvents() {
    V2Web.addElement(this.#events.element, 'div', (container) => {
      container.classList.add('table-container');

      V2Web.addElement(container, 'table', (table) => {
        table.classList.add('table');
        table.classList.add('is-fullwidth');
        table.classList.add('is-striped');
        table.classList.add('is-narrow');

        V2Web.addElement(table, 'tbody', (e) => {
          this.#events.table = e;
        });
      });
    });

    const addEvent = (event, number, remove, name, data, title = '') => {
      V2Web.addElement(this.#events.table, 'tr', (row) => {
        V2Web.addElement(row, 'th', (e) => {
          e.textContent = number + 1;
        });

        V2Web.addElement(row, 'td', (button) => {
          V2Web.addElement(button, 'button', (e) => {
            e.classList.add('delete');
            e.classList.add('centered');

            if (remove && event.delta === 0) {
              e.addEventListener('click', () => {
                this.#midiTrack.deleteEvent(number);
                this.#refresh();
              });

            } else
              e.classList.add('is-invisible');
          });
        });

        V2Web.addElement(row, 'td', (e) => {
          e.textContent = name;
        });

        V2Web.addElement(row, 'td', (e) => {
          if (event.delta > 0)
            e.textContent = (event.delta / this.#midiFile.division).toFixed(2);
        });

        V2Web.addElement(row, 'td', (e) => {
          e.textContent = data;
        });
      });
    }

    for (const [number, event] of this.#midiTrack.events.entries()) {
      if (event.meta !== null) {
        switch (event.meta) {
          case V2MIDIFile.Meta.sequence:
            addEvent(event, number, true, 'Sequence', event.data);
            break;

          case V2MIDIFile.Meta.text:
            addEvent(event, number, true, 'Text', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.copyright:
            addEvent(event, number, true, 'Copyright', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.title:
            addEvent(event, number, true, 'Title', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.instrument:
            addEvent(event, number, true, 'Title', event.data);
            break;

          case V2MIDIFile.Meta.lyric:
            addEvent(event, number, true, 'Lyric', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.marker:
            addEvent(event, number, true, 'Marker', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.cuePoint:
            addEvent(event, number, true, 'Cue Point', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.programName:
            addEvent(event, number, true, 'Program Name', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.deviceName:
            addEvent(event, number, true, 'Device Name', new TextDecoder().decode(event.data));
            break;

          case V2MIDIFile.Meta.channel:
            addEvent(event, number, true, 'MIDI Channel', event.data);
            break;

          case V2MIDIFile.Meta.port:
            addEvent(event, number, true, 'MIDI Port', event.data);
            break;

          case V2MIDIFile.Meta.endOfTrack:
            addEvent(event, number, false, 'End Of Track', event.data);
            break;

          case V2MIDIFile.Meta.tempo:
            addEvent(event, number, false, 'Tempo', (1000000 / event.getTempoUsec() * 60).toFixed(1));
            break;

          case V2MIDIFile.Meta.smtpeOffset:
            addEvent(event, number, true, 'SMTPE Offset', event.getSMPTE());
            break;

          case V2MIDIFile.Meta.timeSignature:
            addEvent(event, number, true, 'Time Signature', event.getTimeSignature() + ' – ' + event.getTimeSignatureTicks());
            break;

          case V2MIDIFile.Meta.keySignature:
            addEvent(event, number, true, 'Key Signature', event.getKeySignature());
            break;

          case V2MIDIFile.Meta.sequencer:
            addEvent(event, number, true, 'Sequencer');
            break;
        }

      } else if (event.status !== null) {
        switch (V2MIDI.Status.getType(event.status)) {
          case V2MIDI.Status.noteOn:
            addEvent(event, number, false, 'Note On', event.data[0] + ' ' + event.data[1]);
            break;

          case V2MIDI.Status.noteOff:
            addEvent(event, number, false, 'Note Off', event.data[0] + ' ' + event.data[1]);
            break;

          case V2MIDI.Status.aftertouch:
            addEvent(event, number, true, 'Aftertouch', event.data);
            break;

          case V2MIDI.Status.controlChange:
            addEvent(event, number, true, 'Control Change', event.data[0] + ' ' + event.data[1], V2MIDI.CC.Name[event.data[0]]);
            break;

          case V2MIDI.Status.programChange:
            addEvent(event, number, true, 'Program Change', event.data);
            break;

          case V2MIDI.Status.aftertouchChannel:
            addEvent(event, number, true, 'Aftertouch Channel', event.data);
            break;

          case V2MIDI.Status.pitchBend:
            addEvent(event, number, true, 'Pitch Bend', event.data);
            break;
        }

      } else if (event.systemExclusive !== null) {
        switch (event.systemExclusive) {
          case V2MIDI.Status.systemExclusive:
            addEvent(event, number, true, 'System Exclusive', [event.systemExclusive, ...event.data]);
            break;

          case V2MIDI.Status.systemExclusiveEnd:
            addEvent(event, number, true, 'Escaped Data', [event.systemExclusive, ...event.data]);
            break;
        }
      }
    }
  }

  #refresh() {
    this.#tabs.resetTab('track');
    this.#addTrack();

    this.#tabs.resetTab('details');
    this.#addDetails();

    this.#tabs.resetTab('events');
    this.#addEvents();
  }
}
