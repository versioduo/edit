// © Kay Sievers <kay@versioduo.com>, 2019-2023
// SPDX-License-Identifier: Apache-2.0

class V2MIDIFileEvent {
  meta = null;
  status = null;
  systemExclusive = null;
  data = null;
  delta = 0;
  tick = 0;

  constructor() {
    return Object.seal(this);
  }

  getTempoUsec() {
    // 24 bit integer, the number of microseconds per quarter note.
    return (this.data[0] << 16) | (this.data[1] << 8) | this.data[0];
  }

  getSMPTE() {
    const hours = this.data[0];
    const minutes = this.data[1];
    const seconds = this.data[2];
    const frames = this.data[3] + (this.data[4] / 100);
    return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds + ' ' + frames.toFixed(2);
  }

  getTimeSignature() {
    return this.data[0] + ' / ' + Math.pow(2, this.data[1]);
  }

  getTimeSignatureTicks() {
    const midiTicks = this.data[2]; // Ticks per quarter note.
    const quarter = this.data[3] / 8; // Number of notated 32nd-notes of a quarter-note.
    return midiTicks + ' Ticks / ' + (quarter !== 1 ? quarter + ' ' : '') + 'Quarter';
  }

  getKeySignature() {
    const major = this.data[1] === 0;
    const index = new Int8Array(this.data)[0];
    if (major) {
      const keys = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
      return keys[index + 7] + ' Major';

    } else {
      const keys = ['A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯'];
      return keys[index + 7] + ' Minor';
    }
  }
}

class V2MIDIFileTrack {
  #buffer = null;
  #events = [];
  #tickMax = 0;

  constructor() {
    Object.defineProperty(this, 'events', {
      get() {
        return this.#events;
      }
    });

    Object.defineProperty(this, 'tickMax', {
      get() {
        return this.#tickMax;
      }
    });

    return Object.seal(this);
  }

  parse(buffer) {
    this.#buffer = buffer;
    let cursor = 0;
    let end = false;

    const parseMeta = (event) => {
      event.meta = this.#getByte(cursor);
      cursor++;

      const [size, sizeLength] = decodeNumber(cursor);
      cursor += sizeLength;
      event.data = new Uint8Array(this.#buffer, cursor, size);
      cursor += size;

      if (event.meta === V2MIDIFile.Meta.endOfTrack)
        end = true;
    };

    // Variable-length quantity.
    const decodeNumber = (start) => {
      // Count the bytes with the 'more bytes' bit set.
      const getLength = (bytes) => {
        return bytes.findIndex((b) => {
          return b < 128;
        }) + 1;
      };

      // Concatenate the 7 bit values.
      const getValue = (bytes) => {
        return bytes.reduce((n, byte) => {
          return (n << 7) + (byte & 0x7f);
        }, 0);
      };

      const bytes = new Uint8Array(this.#buffer.slice(start));
      const length = getLength(bytes);
      const value = getValue(bytes.slice(0, length));
      return [value, length];
    };

    // 0xf0: System Exclusive. The leading 0xf0 is not part of data.
    // 0xf7: System Exclusive fragment/continuation, or escaped raw data.
    const parseSystemExclusive = (event) => {
      event.systemExclusive = this.#getByte(cursor);
      cursor++;

      const [size, sizeLength] = decodeNumber(cursor);
      cursor += sizeLength;
      event.data = new Uint8Array(this.#buffer, cursor, size);
      cursor += size;
    };

    let lastStatus = null;

    const parseMIDIMessage = (event) => {
      if (this.#getByte(cursor) < 0x80) {
        event.status = lastStatus;

      } else {
        event.status = this.#getByte(cursor);
        lastStatus = event.status;
        cursor++;
      }

      switch (V2MIDI.Status.getType(event.status)) {
        case V2MIDI.Status.noteOn:
        case V2MIDI.Status.noteOff:
        case V2MIDI.Status.aftertouch:
        case V2MIDI.Status.controlChange:
        case V2MIDI.Status.pitchBend:
        case V2MIDI.Status.systemSongPosition:
          event.data = new Uint8Array(this.#buffer, cursor, 2);
          cursor += 2;
          break;

        case V2MIDI.Status.programChange:
        case V2MIDI.Status.aftertouchChannel:
        case V2MIDI.Status.systemTimeCodeQuarterFrame:
        case V2MIDI.Status.systemSongSelect:
          event.data = new Uint8Array(this.#buffer, cursor, 1);
          cursor++;
          break;
      }

      // Replace velocity 0 with noteOff event.
      if (V2MIDI.Status.getType(event.status) === V2MIDI.Status.noteOn && event.data[1] === 0) {
        event.status = V2MIDI.Status.noteOff;
        event.data[1] = 64;
      }
    };

    while (cursor < this.#buffer.byteLength) {
      const [delta, deltaLength] = decodeNumber(cursor);
      cursor += deltaLength;
      this.#tickMax += delta;

      const event = new V2MIDIFileEvent();
      event.delta = delta;
      event.tick = this.#tickMax;

      switch (this.#getByte(cursor)) {
        case 0xff:
          cursor++;
          parseMeta(event);
          break;

        case 0xf0:
        case 0xf7:
          parseSystemExclusive(event);
          break;

        default:
          parseMIDIMessage(event);
          break;
      }

      this.#events.push(event);
    }

    if (!end || cursor !== this.#buffer.byteLength)
      return 'Missing end of track marker';

    return null;
  }

  deleteEvent(index) {
    this.#events.splice(index, 1);
  }

  hasMIDIMessages() {
    for (const event of this.#events)
      if (event.status)
        return true;

    return false;
  }

  getTag(type) {
    for (const event of this.#events) {
      if (event.meta !== V2MIDIFile.Meta[type] || event.data[0] === 0)
        continue;

      try {
        return new TextDecoder('utf-8', {
          fatal: true
        }).decode(event.data);

      } catch (error) {
        return new TextDecoder('iso-8859-1').decode(event.data);
      }
    }

    return null;
  }

  setTag(type, text) {
    let event = this.#events.find((e) => {
      return e.meta === V2MIDIFile.Meta[type];
    });

    // Update existing event.
    if (event) {
      event.data = new TextEncoder().encode(text);
      return;
    }

    // Insert new event at the start.
    event = new V2MIDIFileEvent();
    event.meta = V2MIDIFile.Meta[type];
    event.data = new TextEncoder().encode(text);
    this.#events.splice(0, 0, event);
  }

  deleteTag(type) {
    const index = this.#events.findIndex((e) => {
      return e.meta === V2MIDIFile.Meta[type];
    });

    if (index < 0)
      return;

    if (this.#events[index].delta > 0)
      return;

    this.deleteEvent(index);
  }

  getProgram() {
    for (const event of this.#events)
      if (V2MIDI.Status.getType(event.status) === V2MIDI.Status.programChange)
        return event.data[0];

    return null;
  }

  setProgram(number) {
    let event = this.#events.find((e) => {
      return V2MIDI.Status.getType(e.status) === V2MIDI.Status.programChange;
    });

    // Update existing event.
    if (event) {
      event.data[0] = number;
      return;
    }

    // Insert new event at the start.
    event = new V2MIDIFileEvent();
    event.status = V2MIDI.Status.programChange;
    event.data = new Uint8Array([number]);
    this.#events.splice(0, 0, event);
  }

  deleteProgram() {
    const index = this.#events.findIndex((e) => {
      return V2MIDI.Status.getType(e.status) === V2MIDI.Status.programChange;
    });

    if (index < 0)
      return;

    if (this.#events[index].delta > 0)
      return;

    this.deleteEvent(index);
  }

  #getByte(start) {
    return new DataView(this.#buffer).getUint8(start);
  }

  writeBuffer(view) {
    // Variable-length quantity.
    const encodeNumber = (number) => {
      const bytes = [number & 0x7f];
      for (let i = number >> 7; i > 0; i >>= 7)
        bytes.unshift(0x80 + (i & 0x7f));

      return bytes;
    };
    let cursor = 0;

    for (const c of new TextEncoder().encode('MTrk'))
      view.setUint8(cursor++, c);

    // Length.
    cursor += 4;

    for (const event of this.#events) {
      for (const byte of encodeNumber(event.delta))
        view.setUint8(cursor++, byte);

      if (event.meta !== null) {
        view.setUint8(cursor++, 0xff);
        view.setUint8(cursor++, event.meta);

        // Length of Data.
        for (const byte of encodeNumber(event.data.length))
          view.setUint8(cursor++, byte);

        for (const byte of event.data)
          view.setUint8(cursor++, byte);

      } else if (event.status !== null) {
        view.setUint8(cursor++, event.status);
        for (const byte of event.data)
          view.setUint8(cursor++, byte);

      } else if (event.systemExclusive !== null) {
        view.setUint8(cursor++, event.systemExclusive);

        // Length of Data.
        for (const byte of encodeNumber(event.data.length))
          view.setUint8(cursor++, byte);

        for (const byte of event.data)
          view.setUint8(cursor++, byte);
      }
    }

    view.setUint32(4, cursor - 8);
    return cursor;
  }
}

class V2MIDIFile {
  static Meta = Object.freeze({
    sequence: 0x00,
    text: 0x01,
    copyright: 0x02,
    title: 0x03,
    instrument: 0x04,
    lyric: 0x05,
    marker: 0x06,
    cuePoint: 0x07,
    programName: 0x08,
    deviceName: 0x09,
    channel: 0x20,
    port: 0x21,
    endOfTrack: 0x2f,
    tempo: 0x51,
    smpteOffset: 0x54,
    timeSignature: 0x58,
    keySignature: 0x59,
    sequencer: 0x7f
  });

  #buffer = null;
  #tracks = [];
  #format = 0;
  #tracksCount = 0;
  #division = 0;
  #tickMax = 0;
  #tempi = null;
  #runtimeSec = 0;

  constructor() {
    Object.defineProperty(this, 'tracks', {
      get() {
        return this.#tracks;
      }
    });
    Object.defineProperty(this, 'format', {
      get() {
        return this.#format;
      }
    });
    Object.defineProperty(this, 'division', {
      get() {
        return this.#division;
      }
    });
    Object.defineProperty(this, 'tickMax', {
      get() {
        return this.#tickMax;
      }
    });
    Object.defineProperty(this, 'tempi', {
      get() {
        return this.#tempi;
      }
    });
    Object.defineProperty(this, 'runtimeSec', {
      get() {
        return this.#runtimeSec;
      }
    });

    return Object.seal(this);
  }

  loadBuffer(buffer) {
    this.#buffer = buffer;
    let cursor = 0;

    const isHeader = (signature) => {
      const bytes = new Uint8Array(this.#buffer.slice(cursor, cursor + 4));
      return String.fromCharCode(...bytes) === signature;
    };

    if (!isHeader('MThd'))
      return 'Missing file header';
    cursor += 4;

    const length = new DataView(this.#buffer, cursor).getInt32();
    if (length !== 6)
      return 'Wrong file header size';
    cursor += 4;

    // 0: single multi-channel track
    // 1: one or more simultaneous tracks/outputs
    // 2: one or more sequentially independent single-track patterns
    this.#format = new DataView(this.#buffer, cursor).getUint16();
    if (this.#format > 1)
      return 'Unsupported file format';
    cursor += 2;

    this.#tracksCount = new DataView(this.#buffer, cursor).getUint16();
    if (this.#tracksCount < 1)
      return 'Missing track information';
    cursor += 2;

    // > 0: ticks per quarter-note
    // < 0: SMPTE, ticks per frame
    this.#division = new DataView(this.#buffer, cursor).getInt16();
    if (this.#division < 0)
      return 'Unsupport time format';
    cursor += 2;

    this.#tracks = [];
    let ticks = 0;
    while (cursor < this.#buffer.byteLength) {
      if (!isHeader('MTrk'))
        return 'Missing track header marker';
      cursor += 4;

      const length = new DataView(this.#buffer, cursor).getUint32();
      cursor += 4;

      const track = new V2MIDIFileTrack();
      const error = track.parse(this.#buffer.slice(cursor, cursor + length));
      if (error)
        return error;
      cursor += length;

      this.#tracks.push(track);
    }

    if (this.#tracks.length !== this.#tracksCount)
      return 'Inconsistent track count';

    // Get the maximum number of ticks from all tracks.
    this.#tickMax = this.#tracks.reduce((ticks, track) => {
      return ticks > track.tickMax ? ticks : track.tickMax;
    }, 0);

    // Build a list of tempo changes.
    this.#tempi = [];
    for (const event of this.#tracks[0].events) {
      if (event.meta !== V2MIDIFile.Meta.tempo)
        continue;

      const tempo = Object.seal({
        start: event.tick,
        beatUsec: event.getTempoUsec()
      });

      this.#tempi.push(tempo);
    }

    this.#runtimeSec = this.getTickSec(this.#tickMax);
    return null;
  }

  getTickSec(tick) {
    let currentTick = 0;
    let currentBeatUsec = 1000000 / (120 / 60);
    let seconds = 0;

    const addSeconds = (ticks) => {
      seconds += (ticks / this.#division) * (currentBeatUsec / 1000000);
    };

    for (const tempo of this.tempi) {
      if (tempo.start > tick)
        break;

      // Add all ticks from the previous record (or the default).
      addSeconds(tempo.start - currentTick);
      currentTick = tempo.start;
      currentBeatUsec = tempo.beatUsec;
    }

    addSeconds(tick - currentTick);
    return seconds;
  }

  deleteTrack(index) {
    this.#tracks.splice(index, 1);
    this.#tracksCount--;
  }

  getBuffer() {
    // The size of the loaded file.
    let size = this.#buffer.byteLength;

    // Reserve the space to resolve running state events.
    size += this.#tracks.reduce((count, track) => {
      return count += track.events.length;
    }, 0);

    // Reserve space to add strings.
    size += this.#tracksCount * 3 * 128;

    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let cursor = 0;

    for (const c of new TextEncoder().encode('MThd'))
      view.setUint8(cursor++, c);

    // Length.
    view.setUint32(cursor, 6);
    cursor += 4;

    view.setUint16(cursor, this.#format);
    cursor += 2;

    view.setUint16(cursor, this.#tracksCount);
    cursor += 2;

    view.setUint16(cursor, this.#division);
    cursor += 2;

    for (const track of this.#tracks)
      cursor += track.writeBuffer(new DataView(buffer, cursor));

    return buffer.slice(0, cursor);
  }
}

class V2MIDIFilePlayer extends V2MIDIFile {
  #notifiers = Object.seal({
    event: [],
    position: [],
    stop: []
  });

  #timer = null;
  #audio = null;
  #lastSec = 0;
  #progressSec = 0;
  #tickDurationUsec = 0;
  #tracksLast = null;
  #tick = 0;

  constructor() {
    super();
    return Object.seal(this);
  }

  addNotifier(type, handler) {
    this.#notifiers[type].push(handler);
  }

  loadBuffer(buffer) {
    const error = super.loadBuffer(buffer);
    if (error)
      return error;

    for (const notifier of this.#notifiers.position)
      notifier(0, this.runtimeSec);
  }

  isPlaying() {
    return this.#timer !== null;
  }

  play(handler) {
    if (this.isPlaying())
      return;

    if (this.#tick === 0) {
      this.#tracksLast = [];
      for (const i of this.tracks.keys())
        this.#tracksLast[i] = 0;

      // The default tempo, if no tempo events are in track 0.
      this.#setTempoBPM(120);

      // Start our timer.
      this.#audio = new AudioContext();
    }

    // We update the current tick and emit events once per millisecond.
    this.#lastSec = this.#audio.currentTime;
    this.#timer = setInterval(this.#timerHandler.bind(this), 1);
  }

  pause() {
    if (!this.isPlaying())
      return;

    clearInterval(this.#timer);
    this.#timer = null;
  }

  stop() {
    if (!this.isPlaying())
      return;

    clearInterval(this.#timer);
    this.#timer = null;
    this.#audio = null;
    this.#tick = 0;
    this.#progressSec = 0;

    for (const notifier of this.#notifiers.stop)
      notifier();

    for (const notifier of this.#notifiers.position)
      notifier(0, this.runtimeSec);
  }

  #getTickSec(tick) {
    let currentTick = 0;
    let currentBeatUsec = 1000000 / (120 / 60);
    let seconds = 0;

    const addSeconds = (ticks) => {
      seconds += (ticks / this.division) * (currentBeatUsec / 1000000);
    };

    for (const tempo of this.tempi) {
      if (tempo.start > tick)
        break;

      // Add all ticks from the previous record (or the default).
      addSeconds(tempo.start - currentTick);
      currentTick = tempo.start;
      currentBeatUsec = tempo.beatUsec;
    }

    addSeconds(tick - currentTick);
    return seconds;
  }

  #setTempoBPM(bpm) {
    this.#setTempoUsec((60 * 1000000) / bpm);
  }

  #setTempoUsec(usec) {
    this.#tickDurationUsec = usec / this.division;
  }

  #timerHandler() {
    // Time since the last run.
    const nowSec = this.#audio.currentTime;
    const passedUsec = (nowSec - this.#lastSec) * 1000000;
    this.#lastSec = nowSec;

    // Add the number of ticks which have passed since the last run.
    this.#tick += passedUsec / this.#tickDurationUsec;

    if (this.#tick >= this.tickMax) {
      this.stop();
      return;
    }

    for (const [i, track] of this.tracks.entries()) {
      const event = track.events[this.#tracksLast[i]];
      if (!event)
        continue;

      if (event.tick > this.#tick)
        continue;

      this.#tracksLast[i]++;

      // Update the current tempo.
      if (event.meta === V2MIDIFile.Meta.tempo)
        this.#setTempoUsec(event.getTempoUsec());

      for (const notifier of this.#notifiers.event)
        notifier(i, event);
    }

    // Send a progress notification once a second.
    if (nowSec - this.#progressSec > 1) {
      this.#progressSec = nowSec;

      for (const notifier of this.#notifiers.position)
        notifier(this.#getTickSec(this.#tick), this.runtimeSec);
    }
  }
}
