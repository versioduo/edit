// © Kay Sievers <kay@versioduo.com>, 2019-2023
// SPDX-License-Identifier: Apache-2.0

// MIDI system connection and message handling.
class V2MIDI {
  // MIDI Note Number
  // The octave numbers -2 to 8 are not defined by MIDI itself, it's just what
  // some vendors of instruments and audio workstation software use. The middle
  // C (Number === 60) in this mapping is C3.
  static Note = class {
    static names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

    static getName(note) {
      const octave = Math.trunc(note / 12) - 2;
      return this.names[note % 12] + octave;
    }

    static isBlack(note) {
      return this.names[note % 12].includes('♯');
    }

    static getOctave(note) {
      return Math.trunc(note / 12) - 2;
    }

    static getNote(octave, index = 0) {
      return ((octave + 2) * 12) + index;
    }
  };

  // MIDI Control Change (CC) values.
  static CC = Object.freeze({
    // MSB Controller Data.
    bankSelect: 0,
    modulationWheel: 1,
    breathController: 2,
    controller3: 3,
    footController: 4,
    portamentoTime: 5,
    dataEntry: 6,
    channelVolume: 7,
    balance: 8,
    controller9: 9,
    pan: 10,
    expression: 11,
    effectControl1: 12,
    effectControl2: 13,
    controller14: 14,
    controller15: 15,
    generalPurpose1: 16,
    generalPurpose2: 17,
    generalPurpose3: 18,
    generalPurpose4: 19,

    // LSB for controllers 0 to 31.
    controllerLSB: 32,
    bankSelectLSB: 32,
    modulationWheelLSB: 33,
    breathControllerLSB: 34,
    controller3LSB: 35,
    footControllerLSB: 36,
    portamentoTimeLSB: 37,
    dataEntryLSB: 38,
    channelVolumeLSB: 39,
    balanceLSB: 40,
    controller9LSB: 41,
    panLSB: 42,
    expressionLSB: 43,
    effectControl1LSB: 44,
    effectControl2LSB: 45,
    controller14LSB: 46,
    controller15LSB: 47,
    generalPurpose1LSB: 48,
    generalPurpose2LSB: 49,
    generalPurpose3LSB: 50,
    generalPurpose4LSB: 51,

    // Single-byte Controllers.
    sustainPedal: 64,
    portamento: 65,
    sostenuto: 66,
    softPedal: 67,
    legatoPedal: 68,
    hold2: 69,
    soundController1: 70, // Sound Variation
    soundController2: 71, // Timber / Harmonic Intensity
    soundController3: 72, // Release Time
    soundController4: 73, // Attack Time
    soundController5: 74, // Brightness
    soundController6: 75, // Decay Time
    soundController7: 76, // Vibrato Rate
    soundController8: 77, // Vibrato Depth
    soundController9: 78, // Vibrato Delay
    soundController10: 79,
    generalPurpose5: 80, // Decay
    generalPurpose6: 81, // High Pass Filter Frequency
    generalPurpose7: 82,
    generalPurpose8: 83,
    portamentoControl: 84,
    controller85: 85,
    controller86: 86,
    controller87: 87,
    velocityPrefix: 88,
    controller89: 89,
    controller90: 90,
    effects1: 91, // Reverb Send
    effects2: 92, // Tremolo Depth
    effects3: 93, // Chorus Send
    effects4: 94, // Celeste Depth
    effects5: 95, // Phaser Depth

    // Increment/Decrement and Parameter numbers.
    dataIncrement: 96,
    dataDecrement: 97,
    NRPNLSB: 98,
    NRPNMSB: 99,
    RPNLSB: 100,
    RPNMSB: 101,

    controller102: 102,
    controller103: 103,
    controller104: 104,
    controller105: 105,
    controller106: 106,
    controller107: 107,
    controller108: 108,
    controller109: 109,
    controller110: 110,
    controller111: 111,
    controller112: 112,
    controller113: 113,
    controller114: 114,
    controller115: 115,
    controller116: 116,
    controller117: 117,
    controller118: 118,
    controller119: 119,

    // Channel Mode Message
    allSoundOff: 120,
    resetAllControllers: 121,
    localControl: 122,
    allNotesOff: 123,
    omniModeOff: 124,
    omniModeOn: 125,
    monoModeOn: 126,
    polyModeOn: 127,

    Name: Object.freeze({
      0: 'Bank Select',
      1: 'Modulation',
      2: 'Breath',
      4: 'Foot Control',
      5: 'Portamento Time',
      7: 'Volume',
      8: 'Balance',
      10: 'Pan',
      11: 'Expression',
      12: 'Effect 1',
      13: 'Effect 2',
      16: 'General 1',
      17: 'General 2',
      18: 'General 3',
      19: 'General 4',
      64: 'Sustain Pedal',
      65: 'Portamento',
      66: 'Sostenuto',
      67: 'Soft Pedal',
      68: 'Legato Pedal',
      69: 'Hold 2',
      70: 'Sound 1',
      71: 'Sound 2',
      72: 'Sound 3',
      73: 'Sound 4',
      74: 'Slide',
      75: 'Sound 6',
      76: 'Sound 7',
      77: 'Sound 8',
      78: 'Sound 9',
      79: 'Sound 10',
      80: 'General 5',
      81: 'General 6',
      82: 'General 7',
      83: 'General 8',
      84: 'Portamento Control',
      88: 'Velocity Prefix',
      91: 'Reverb',
      92: 'Tremolo',
      93: 'Chorus',
      94: 'Celeste Depth',
      95: 'Phaser Depth',
      120: 'Sound Off',
      121: 'Reset',
      122: 'Local',
      123: 'Notes Off'
    })
  });

  static GM = Object.freeze({
    Program: Object.freeze({
      // Piano
      acousticGrandPiano: 0,
      brightAcousticPiano: 1,
      electricGrandPiano: 2,
      honkyTonkPiano: 3,
      electricPiano1: 4,
      electricPiano2: 5,
      harpsichord: 6,
      clavi: 7,

      // Chromatic Percussion
      celesta: 8,
      glockenspiel: 9,
      musicBox: 10,
      vibraphone: 11,
      marimba: 12,
      xylophone: 13,
      tubularBells: 14,
      dulcimer: 15,

      // Organ
      drawbarOrgan: 16,
      percussiveOrgan: 17,
      rockOrgan: 18,
      churchOrgan: 19,
      reedOrgan: 20,
      accordion: 21,
      harmonica: 22,
      tangoAccordion: 23,

      //Guitar
      acousticGuitarNylon: 24,
      acousticGuitarSsteel: 25,
      electricGuitarJazz: 26,
      electricGuitarClean: 27,
      electricGuitarMuted: 28,
      overdrivenGuitar: 29,
      distortionGuitar: 30,
      guitarHarmonics: 31,

      // Bass
      acousticBass: 32,
      electricBassFinger: 33,
      electricBassPick: 34,
      fretlessBass: 35,
      slapBass1: 36,
      slapBass2: 37,
      synthBass1: 38,
      synthBass2: 39,

      // Strings
      violin: 40,
      viola: 41,
      cello: 42,
      contrabass: 43,
      tremoloStrings: 44,
      pizzicatoStrings: 45,
      orchestralHarp: 46,

      // Ensemble
      timpani: 47,
      stringEnsemble1: 48,
      stringEnsemble2: 49,
      synthStrings1: 50,
      synthStrings2: 51,
      choirAahs: 52,
      voiceOohs: 53,
      synthVoice: 54,
      orchestraHit: 55,

      // Brass
      trumpet: 56,
      trombone: 57,
      tuba: 58,
      mutedTrumpet: 59,
      frenchHorn: 60,
      brassSection: 61,
      synthBrass1: 62,
      synthBrass2: 63,

      // Reed
      sopranoSax: 64,
      altoSax: 65,
      tenorSax: 66,
      baritoneSax: 67,
      oboe: 68,
      englishHorn: 69,
      bassoon: 70,
      clarinet: 71,

      // Pipe
      piccolo: 72,
      flute: 73,
      recorder: 74,
      panFlute: 75,
      blownBottle: 76,
      shakuhachi: 77,
      whistle: 78,
      ocarina: 79,

      // Synth Lead
      lead1Square: 80,
      lead2Sawtooth: 81,
      lead3Calliope: 82,
      lead4Chiff: 83,
      lead5Charang: 84,
      lead6Voice: 85,
      lead7Ffifths: 86,
      lead8Bass: 87,

      // Synth Pad
      pad1NewAge: 88,
      pad2Warm: 89,
      pad3Polysynth: 90,
      pad4Choir: 91,
      pad5Bowed: 92,
      pad6Metallic: 93,
      pad7Halo: 94,
      pad8Sweep: 95,

      // Synth Effects
      fx1Rain: 96,
      fx2Soundtrack: 97,
      fx3Crystal: 98,
      fx4Atmosphere: 99,
      fx5Brightness: 100,
      fx6Goblins: 101,
      fx7Echoes: 102,
      fx8SciFi: 103,

      // Ethnic Percussive
      sitar: 104,
      banjo: 105,
      shamisen: 106,
      koto: 107,
      kalimba: 108,
      bagPipe: 109,
      fiddle: 110,
      shanai: 111,

      // Percussive
      tinkleBell: 112,
      agogo: 113,
      steelDrums: 114,
      woodblock: 115,
      taikoDrum: 116,
      melodicTom: 117,
      synthDrum: 118,
      reverseCymbal: 119,

      // Sound Effects
      guitarFretNoise: 120,
      breathNoise: 121,
      seashore: 122,
      birdTweet: 123,
      telephoneRing: 124,
      helicopter: 125,
      applause: 126,
      gunshot: 127,

      Name: Object.freeze({
        0: 'Acoustic Grand Piano',
        1: 'Bright Acoustic Piano',
        2: 'Electric Grand Piano',
        3: 'Honky-tonk Piano',
        4: 'Electric Piano 1',
        5: 'Electric Piano 2',
        6: 'Harpsichord',
        7: 'Clavi',
        8: 'Celesta',
        9: 'Glockenspiel',
        10: 'Music Box',
        11: 'Vibraphone',
        12: 'Marimba',
        13: 'Xylophone',
        14: 'Tubular Bells',
        15: 'Dulcimer',
        16: 'Drawbar Organ',
        17: 'Percussive Organ',
        18: 'Rock Organ',
        19: 'Church Organ',
        20: 'Reed Organ',
        21: 'Accordion',
        22: 'Harmonica',
        23: 'Tango Accordion',
        24: 'Acoustic Guitar (nylon',
        25: 'Acoustic Guitar (steel)',
        26: 'Electric Guitar (jazz)',
        27: 'Electric Guitar (clean)',
        28: 'Electric Guitar (muted)',
        29: 'Overdriven Guitar',
        30: 'Distortion Guitar',
        31: 'Guitar harmonics',
        32: 'Acoustic Bass',
        33: 'Electric Bass (finger)',
        34: 'Electric Bass (pick)',
        35: 'Fretless Bass',
        36: 'Slap Bass 1',
        37: 'Slap Bass 2',
        38: 'Synth Bass 1',
        39: 'Synth Bass 2',
        40: 'Violin',
        41: 'Viola',
        42: 'Cello',
        43: 'Contrabass',
        44: 'Tremolo Strings',
        45: 'Pizzicato Strings',
        46: 'Orchestral Harp',
        47: 'Timpani',
        48: 'String Ensemble 1',
        49: 'String Ensemble 2',
        50: 'SynthStrings 1',
        51: 'SynthStrings 2',
        52: 'Choir Aahs',
        53: 'Voice Oohs',
        54: 'Synth Voice',
        55: 'Orchestra Hit',
        56: 'Trumpet',
        57: 'Trombone',
        58: 'Tuba',
        59: 'Muted Trumpet',
        60: 'French Horn',
        61: 'Brass Section',
        62: 'SynthBrass 1',
        63: 'SynthBrass 2',
        64: 'Soprano Sax',
        65: 'Alto Sax',
        66: 'Tenor Sax',
        67: 'Baritone Sax',
        68: 'Oboe',
        69: 'English Horn',
        70: 'Bassoon',
        71: 'Clarinet',
        72: 'Piccolo',
        73: 'Flute',
        74: 'Recorder',
        75: 'Pan Flute',
        76: 'Blown Bottle',
        77: 'Shakuhachi',
        78: 'Whistle',
        79: 'Ocarina',
        80: 'Lead 1 (square)',
        81: 'Lead 2 (sawtooth)',
        82: 'Lead 3 (calliope)',
        83: 'Lead 4 (chiff)',
        84: 'Lead 5 (charang)',
        85: 'Lead 6 (voice)',
        86: 'Lead 7 (fifths)',
        87: 'Lead 8 (bass + lead) ',
        88: 'Pad 1 (new age)',
        89: 'Pad 2 (warm)',
        90: 'Pad 3 (polysynth)',
        91: 'Pad 4 (choir)',
        92: 'Pad 5 (bowed)',
        93: 'Pad 6 (metallic)',
        94: 'Pad 7 (halo)',
        95: 'Pad 8 (sweep)',
        96: 'FX 1 (rain)',
        97: 'FX 2 (soundtrack)',
        98: 'FX 3 (crystal)',
        99: 'FX 4 (atmosphere)',
        100: 'FX 5 (brightness)',
        101: 'FX 6 (goblins)',
        102: 'FX 7 (echoes)',
        103: 'FX 8 (sci-fi)',
        104: 'Sitar',
        105: 'Banjo',
        106: 'Shamisen',
        107: 'Koto',
        108: 'Kalimba',
        109: 'Bag pipe',
        110: 'Fiddle',
        111: 'Shanai',
        112: 'Tinkle Bell',
        113: 'Agogo',
        114: 'Steel Drums',
        115: 'Woodblock',
        116: 'Taiko Drum',
        117: 'Melodic Tom',
        118: 'Synth Drum',
        119: 'Reverse Cymbal',
        120: 'Guitar Fret Noise ',
        121: 'Breath Noise',
        122: 'Seashore',
        123: 'Bird Tweet',
        124: 'Telephone Ring ',
        125: 'Helicopter',
        126: 'Applause',
        127: 'Gunshot'
      })
    }),

    Percussion: Object.freeze({
      highQ: 27,
      slap: 28,
      scratchPush: 29,
      scratchPull: 30,
      sticks: 31,
      squareClick: 32,
      metronomeClick: 33,
      metronomeBell: 34,
      acousticBassDrum: 35,
      bassDrum1: 36,
      sideStick: 37,
      acousticSnare: 38,
      handClap: 39,
      electricSnare: 40,
      lowFloorTom: 41,
      closedHiHat: 42,
      highFloorTom: 43,
      pedalHiHat: 44,
      lowTom: 45,
      openHiHat: 46,
      lowMidTom: 47,
      hiMidTom: 48,
      crashCymbal1: 49,
      highTom: 50,
      rideCymbal1: 51,
      chineseCymbal: 52,
      rideBell: 53,
      tambourine: 54,
      splashCymbal: 55,
      cowbell: 56,
      crashCymbal2: 57,
      vibraslap: 58,
      rideCymbal2: 59,
      hiBongo: 60,
      lowBongo: 61,
      muteHiConga: 62,
      openHiConga: 63,
      lowConga: 64,
      highTimbale: 65,
      lowTimbale: 66,
      highAgogo: 67,
      lowAgogo: 68,
      cabasa: 69,
      maracas: 70,
      shortWhistle: 71,
      longWhistle: 72,
      shortGuiro: 73,
      longGuiro: 74,
      claves: 75,
      hiWoodBlock: 76,
      lowWoodBlock: 77,
      muteCuica: 78,
      openCuica: 79,
      muteTriangle: 80,
      openTriangle: 81,
      shaker: 82,
      jingleBell: 83,
      bellTree: 84,
      castanets: 85,
      muteSurdo: 86,
      openSurdo: 87,

      Name: Object.freeze({
        27: 'HighQ',
        28: 'Slap',
        29: 'Scratch Push',
        30: 'Scratch Pull',
        31: 'Sticks',
        32: 'Square Click',
        33: 'Metronome Click',
        34: 'Metronome Bell',
        35: 'Acoustic Bass Drum',
        36: 'Bass Drum 1',
        37: 'Side Stick',
        38: 'Acoustic Snare',
        39: 'Hand Clap',
        40: 'Electric Snare',
        41: 'Low Floor Tom',
        42: 'Closed HiHat',
        43: 'High Floor Tom',
        44: 'Pedal HiHat',
        45: 'Low Tom',
        46: 'Open HiHat',
        47: 'Low Mid Tom',
        48: 'Hi Mid Tom',
        49: 'Crash Cymbal 1',
        50: 'High Tom',
        51: 'Ride Cymbal1',
        52: 'Chinese Cymbal',
        53: 'Ride Bell',
        54: 'Tambourine',
        55: 'Splash Cymbal',
        56: 'Cowbell',
        57: 'Crash Cymbal 2',
        58: 'Vibraslap',
        59: 'Ride Cymbal 2',
        60: 'Hi Bongo',
        61: 'Low Bongo',
        62: 'Mute Hi Conga',
        63: 'Open Hi Conga',
        64: 'Low Conga',
        65: 'High Timbale',
        66: 'Low Timbale',
        67: 'High Agogo',
        68: 'Low Agogo',
        69: 'Cabasa',
        70: 'Maracas',
        71: 'Short Whistle',
        72: 'Long Whistle',
        73: 'Short Guiro',
        74: 'Long Guiro',
        75: 'Claves',
        76: 'Hi Wood Block',
        77: 'Low Wood Block',
        78: 'Mute Cuica',
        79: 'Open Cuica',
        80: 'Mute Triangle',
        81: 'Open Triangle',
        82: 'Shaker',
        83: 'Jingle Bell',
        84: 'Bell Tree',
        85: 'Castanets',
        86: 'Mute Surdo',
        87: 'Open Surdo'
      })
    })
  });

  // The MIDI wire protocol's status byte definitions.The first byte of a
  // message, the only byte with the 7th bit set. The lower 4 bit are the
  // channel number or the system message type.
  static Status = Object.freeze({
    noteOff: 0x80 | (0 << 4),
    noteOn: 0x80 | (1 << 4),
    aftertouch: 0x80 | (2 << 4),
    controlChange: 0x80 | (3 << 4),
    programChange: 0x80 | (4 << 4),
    aftertouchChannel: 0x80 | (5 << 4),
    pitchBend: 0x80 | (6 << 4),
    system: 0x80 | (7 << 4),

    // The 'system' messages are device global, the channel number
    // indentifies the type of system message.
    systemExclusive: 0x80 | (7 << 4) | 0,
    systemTimeCodeQuarterFrame: 0x80 | (7 << 4) | 1,
    systemSongPosition: 0x80 | (7 << 4) | 2,
    systemSongSelect: 0x80 | (7 << 4) | 3,
    systemTuneRequest: 0x80 | (7 << 4) | 6,
    systemExclusiveEnd: 0x80 | (7 << 4) | 7,
    systemClock: 0x80 | (7 << 4) | 8,
    systemStart: 0x80 | (7 << 4) | 10,
    systemContinue: 0x80 | (7 << 4) | 11,
    systemStop: 0x80 | (7 << 4) | 12,
    systemActiveSensing: 0x80 | (7 << 4) | 14,
    systemReset: 0x80 | (7 << 4) | 15,

    getType: (status) => {
      // Remove channel number.
      if ((status & 0xf0) !== this.Status.system)
        return status & 0xf0;

      // Return 'system' message type.
      return status;
    },

    getChannel: (status) => {
      return status & 0x0f;
    }
  });

  // The WebMIDI system context.
  #system = null;

  // Subscription to device connect/disconnect events.
  #notifiers = Object.seal({
    state: []
  });

  constructor() {
    return Object.seal(this);
  }

  addNotifier(type, handler) {
    this.#notifiers[type].push(handler);
  }

  // Connect to the MIDI subsystem.
  setup(handler) {
    if (!navigator.requestMIDIAccess) {
      handler('This browser does not support WebMIDI');
      return;
    }

    navigator.requestMIDIAccess({
      sysex: true,
      software: false

    }).then((access) => {
      this.#system = access;

      // Subscribe to device connect/disconnect events.
      this.#system.onstatechange = (event) => {
        for (const notifier of this.#notifiers.state)
          notifier(event);
      };
      handler();

      // Emit coldplug events to trigger the enumeration by clients.
      for (const notifier of this.#notifiers.state)
        notifier();

    }, () => {
      handler('Unable to access MIDI devices');
    });
  }

  // Combine input and output ports to a device.
  getDevices(type) {
    let devices = new Map();

    if (!this.#system)
      return devices;

    // Build list of all output ports.
    let outputPorts = new Map();
    for (const port of this.#system.outputs.values())
      outputPorts.set(port.id, port);

    let last = null;
    let instance = 0;

    for (const port of this.#system.inputs.values()) {
      const outputPort = this.#findOutputPort(port);

      // Remove the port we have found from the list, it is part of a pair.
      if (outputPort)
        outputPorts.delete(outputPort.id);

      else if (type === 'both' || type === 'output')
        continue;

      if (port.name === last)
        instance++;

      else
        instance = 0;

      const id = port.id + ':' + (outputPort ? outputPort.id : '');
      devices.set(id, {
        name: port.name,
        instance: instance,
        id: id,
        in: port,
        out: outputPort
      });

      last = port.name;
    }

    if (type === 'both' || type === 'input')
      return devices;

    // Add the remaining output-only ports.
    for (const port of outputPorts.values()) {
      if (port.name === last)
        instance++;

      else
        instance = 0;

      const id = ':' + port.id;
      devices.set(id, {
        name: port.name,
        instance: instance,
        id: id,
        in: null,
        out: port
      });

      last = port.name;
    }

    return devices;
  }

  // The operating systems and WebMIDI does not provide a reliable way to
  // connect the input and output ports of a device. Try to figure it
  // out by their port names and position/index in the device lists.
  #findOutputPort(input) {
    // Iterate the input ports with our name and return our position.
    let inputIdx = 0;
    for (const port of this.#system.inputs.values()) {
      if (port.name !== input.name)
        continue;

      if (port === input)
        break;

      inputIdx++;
    }

    // Search output port with the same name.
    let outputIdx = 0;
    for (const port of this.#system.outputs.values()) {
      let name = port.name;

      // Windows names the ports *MIDIIN* and *MIDIOUT*.
      if (input.name.match(/^MIDIIN[1-9]/))
        name = name.replace(/^MIDIOUT/, 'MIDIIN');

      if (name !== input.name)
        continue;

      // Found the same name at the same position.
      if (outputIdx === inputIdx)
        return port;

      outputIdx++;
    }
  }
}

// Device to hold MIDI ports and send and receives messages.
class V2MIDIDevice {
  input = null;
  output = null;

  #notifiers = Object.seal({
    message: [],
    note: [],
    noteOff: [],
    aftertouch: [],
    controlChange: [],
    aftertouchChannel: [],
    systemExclusive: []
  });

  constructor() {
    return Object.seal(this);
  }

  addNotifier(type, handler) {
    this.#notifiers[type].push(handler);
  }

  // OS-dependendent unique ID of the device.
  getID() {
    return (this.input ? this.input.id : '') + ':' + (this.output ? this.output.id : '');
  }

  getName() {
    if (this.input)
      return this.input.name;

    if (this.output)
      return this.output.name;

    return null;
  }

  disconnect() {
    if (this.input) {
      this.input.onmidimessage = null;
      this.input.close();
      this.input = null;
    }

    if (this.output) {
      this.output.close();
      this.output = null;
    }
  }

  // Incoming message.
  handleMessage(message) {
    for (const notifier of this.#notifiers.message)
      notifier(message.data);

    const type = V2MIDI.Status.getType(message.data[0]);
    const channel = V2MIDI.Status.getChannel(message.data[0]);

    switch (type) {
      case V2MIDI.Status.noteOn: {
        const note = message.data[1];
        const velocity = message.data[2];
        for (const notifier of this.#notifiers.note)
          notifier(channel, note, velocity);
        break;
      }

      case V2MIDI.Status.noteOff: {
        const note = message.data[1];
        const velocity = message.data[2];
        for (const notifier of this.#notifiers.noteOff)
          notifier(channel, note, velocity);
        break;
      }

      case V2MIDI.Status.aftertouch: {
        const note = message.data[1];
        const pressure = message.data[2];
        for (const notifier of this.#notifiers.aftertouch)
          notifier(channel, note, pressure);

        break;
      }

      case V2MIDI.Status.controlChange: {
        const controller = message.data[1];
        const value = message.data[2];
        for (const notifier of this.#notifiers.controlChange)
          notifier(channel, controller, value);
        break;
      }

      case V2MIDI.Status.aftertouchChannel: {
        const value = message.data[1];
        for (const notifier of this.#notifiers.aftertouchChannel)
          notifier(channel, value);
        break;
      }

      case V2MIDI.Status.systemExclusive:
        // 0x7d === MIDI private/research ID.
        if (message.data[1] !== 0x7d)
          return;

        // We are only interested in JSON objects.
        if (message.data[2] !== '{'.charCodeAt() || message.data[message.data.length - 2] !== '}'.charCodeAt())
          return;

        for (const notifier of this.#notifiers.systemExclusive)
          notifier(message.data.slice(2, -1));
        break;
    }
  }

  // Outgoing messages.
  sendMessage(message) {
    if (!this.output)
      return;

    this.output.send(message);
  }

  sendNote(channel, note, velocity) {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.noteOn | channel, note, velocity]);
  }

  sendNoteOff(channel, note, velocity = 64) {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.noteOff | channel, note, velocity]);
  }

  sendControlChange(channel, controller, value = 0) {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.controlChange | channel, controller, value]);
  }

  sendProgramChange(channel, value) {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.programChange | channel, value]);
  }

  sendAftertouchChannel(channel, value) {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.aftertouchChannel | channel, value]);
  }

  sendPitchBend(channel, value) {
    if (!this.output)
      return;

    const bits = value + 8192;
    const msb = (bits >> 7) & 0x7f;
    const lsb = bits & 0x7f;
    this.output.send([V2MIDI.Status.pitchBend | channel, lsb, msb]);
  }

  sendSystemReset() {
    if (!this.output)
      return;

    this.output.send([V2MIDI.Status.systemReset]);
  }

  sendSystemExclusive(message) {
    if (!this.output)
      return;

    // 0x7d === MIDI private/research ID.
    const sysex = [V2MIDI.Status.systemExclusive, 0x7d];

    // Escape unicode characters to fit into a 7 bit byte stream.
    const json = JSON.stringify(message).replace(/[\u007f-\uffff]/g, (c) => {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });

    for (let i = 0; i < json.length; i++)
      sysex.push(json.charCodeAt(i));

    sysex.push(V2MIDI.Status.systemExclusiveEnd);
    this.output.send(sysex);
    return sysex.length;
  }
}
