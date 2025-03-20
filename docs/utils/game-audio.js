/**
 * game-audio.js
 * A WebAudio-based library for handling game audio with BGM and sound effects.
 * Features beat-synchronized and quantized sound effects with volume control.
 */
(function () {
  // Private module variables
  let audioContext = null;
  let audioBuffers = new Map();
  let bgmSource = null;
  let bgmGainNode = null;
  let seGainNodes = new Map();
  let activeSeNodes = new Map();
  let bgmKey = null;
  let bpm = null;
  let quantize = null;
  let bgmStartTime = 0;
  let isInitialized = false;
  let bgmDuration = 0;
  let loopCount = 0;
  let loopCheckInterval = null;

  /**
   * Load and decode an audio file
   * @param {string} key - The identifier for the audio file
   * @param {string} url - The URL of the audio file
   * @returns {Promise<void>}
   */
  async function loadAudio(key, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.set(key, audioBuffer);
    } catch (error) {
      console.error(`Error loading audio file ${url}:`, error);
      throw error;
    }
  }

  /**
   * Calculate the duration of one beat in seconds
   * @returns {number} Beat duration in seconds
   */
  function getBeatDuration() {
    if (!bpm) return 0;
    return 60 / bpm;
  }

  /**
   * Calculate the next quantized time based on the current time
   * @param {number} requestTime - The time when the sound was requested
   * @returns {number} The next quantized time in seconds
   */
  function getQuantizedTime(requestTime) {
    if (!bpm || !quantize || !bgmStartTime) return requestTime;

    const beatDuration = getBeatDuration();
    const elapsedTime = requestTime - bgmStartTime;
    const beatsElapsed = elapsedTime / beatDuration;
    const quantizationDivision = 1 / quantize;

    // Find the next quantized time point
    const nextQuantizedBeat =
      Math.ceil(beatsElapsed * quantizationDivision) / quantizationDivision;
    const nextQuantizedTime = bgmStartTime + nextQuantizedBeat * beatDuration;

    return nextQuantizedTime;
  }

  /**
   * Convert volume value (1 = 100%) to GainNode value
   * @param {number} volume - User-specified volume (e.g., 0.5 = 50%, 2 = 200%)
   * @returns {number} GainNode gain value
   */
  function volumeToGain(volume) {
    return volume * 0.1;
  }

  /**
   * Initialize the audio system and load audio files
   * @param {Object} audioFiles - Object mapping keys to audio file URLs
   * @param {Object} options - Configuration options
   * @param {number} [options.bpm] - Beats per minute for BGM tempo
   * @param {number} [options.quantize] - Beat division for quantizing sound effects (e.g., 0.25)
   * @returns {Promise<void>}
   */
  async function init(audioFiles, options = {}) {
    // Create AudioContext (suspended by default in some browsers)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        audioContext.suspend();
      } else {
        audioContext.resume();
      }
    });

    // Set optional parameters
    bpm = options.bpm || null;
    quantize = options.quantize || null;

    // Create GainNode for BGM
    bgmGainNode = audioContext.createGain();
    bgmGainNode.gain.value = 0.1; // Default value
    bgmGainNode.connect(audioContext.destination);

    // Log quantization settings if provided
    if (bpm && quantize) {
      const beatDuration = 60 / bpm;
      const quantizeGridMs = beatDuration * quantize * 1000;
      console.log(
        `Audio quantization enabled: BPM=${bpm}, grid=${quantize} (${quantizeGridMs.toFixed(
          2
        )}ms intervals)`
      );
    }

    // Load all audio files
    const loadPromises = [];
    for (const [key, url] of Object.entries(audioFiles)) {
      loadPromises.push(loadAudio(key, url));

      // Create GainNode for each SE in advance
      if (key !== "bgm") {
        // For keys other than BGM
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.1; // Default value
        gainNode.connect(audioContext.destination);
        seGainNodes.set(key, gainNode);
      }
    }

    try {
      await Promise.all(loadPromises);
      isInitialized = true;
      console.log("All audio files loaded successfully");
    } catch (error) {
      console.error("Error loading audio files:", error);
      throw error;
    }
  }

  /**
   * Resume the audio context (must be called after user interaction)
   * @returns {Promise<void>}
   */
  async function resumeAudio() {
    if (!audioContext) {
      console.warn("Audio context not initialized");
      return;
    }

    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
        console.log("AudioContext resumed successfully");
      } catch (error) {
        console.error("Failed to resume AudioContext:", error);
        throw error;
      }
    }
  }

  /**
   * Play background music on loop
   * @param {string} key - The identifier for the BGM audio file (defaults to "bgm")
   * @param {number} volume - Volume level (1 = 100%, default volume)
   */
  function playBgm(key = "bgm", volume = 1) {
    if (!isInitialized) {
      console.warn("Audio system not initialized");
      return;
    }

    if (!audioBuffers.has(key)) {
      console.warn(`BGM with key "${key}" not found`);
      return;
    }

    // Clear any existing loop check interval
    if (loopCheckInterval) {
      clearInterval(loopCheckInterval);
      loopCheckInterval = null;
    }

    // Stop current BGM if playing
    if (bgmSource) {
      bgmSource.stop();
      bgmSource = null;
    }

    // Reset loop counter
    loopCount = 0;

    // Set GainNode value
    bgmGainNode.gain.value = volumeToGain(volume);

    // Create and configure a new source
    bgmSource = audioContext.createBufferSource();
    bgmSource.buffer = audioBuffers.get(key);
    bgmSource.loop = true;
    bgmSource.connect(bgmGainNode);

    // Store BGM duration for loop detection
    bgmDuration = bgmSource.buffer.duration;

    // Start playback and record start time
    bgmSource.start();
    bgmStartTime = audioContext.currentTime;
    bgmKey = key;

    // Set up loop detection interval (checking every 1000ms)
    loopCheckInterval = setInterval(() => {
      // Calculate how much time has passed since BGM started
      const elapsedTime = audioContext.currentTime - bgmStartTime;

      // Calculate expected loop count based on elapsed time and BGM duration
      const expectedLoops = Math.floor(elapsedTime / bgmDuration);

      // If we've entered a new loop cycle
      if (expectedLoops > loopCount) {
        // Update loop counter
        const newLoops = expectedLoops - loopCount;
        loopCount = expectedLoops;

        // Recalculate bgmStartTime to correct for any timing drift
        // This ensures quantization remains accurate across loop boundaries
        bgmStartTime = bgmStartTime + bgmDuration * newLoops;
      }
    }, 1000);
  }

  /**
   * Play a sound effect, with optional quantization to the BGM
   * @param {string} key - The identifier for the SE audio file
   * @param {number} volume - Volume level (1 = 100%, default volume)
   */
  function playSe(key, volume = 1) {
    if (!isInitialized) {
      console.warn("Audio system not initialized");
      return;
    }

    if (!audioBuffers.has(key)) {
      console.warn(`Sound effect with key "${key}" not found`);
      return;
    }

    // Don't play if the same SE key is already playing
    if (activeSeNodes.has(key)) {
      activeSeNodes.get(key).stop();
    }

    // Get GainNode for the key (create if it doesn't exist)
    let gainNode = seGainNodes.get(key);
    if (!gainNode) {
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      seGainNodes.set(key, gainNode);
    }

    // Set the specified volume
    gainNode.gain.value = volumeToGain(volume);

    // Create and configure a new source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers.get(key);
    source.connect(gainNode);

    // Determine when to play the sound
    const currentTime = audioContext.currentTime;
    let startTime = currentTime;

    // Apply quantization if enabled and BGM is playing
    if (quantize && bpm && bgmSource) {
      startTime = getQuantizedTime(currentTime);
    }

    // Track this sound effect
    activeSeNodes.set(key, source);

    // Clean up after playback completes
    source.onended = () => {
      activeSeNodes.delete(key);
    };

    // Start playback
    source.start(startTime);
  }

  /**
   * Change the volume of a currently playing BGM
   * @param {number} volume - Volume level (1 = 100%, default volume)
   */
  function setBgmVolume(volume = 1) {
    if (!isInitialized || !bgmGainNode) {
      console.warn("Audio system not initialized or no BGM playing");
      return;
    }

    bgmGainNode.gain.value = volumeToGain(volume);
    console.log(`Changed BGM volume to ${volume}`);
  }

  /**
   * Set the default volume for a specific sound effect
   * @param {string} key - The identifier for the SE audio file
   * @param {number} volume - Volume level (1 = 100%, default volume)
   */
  function setSeVolume(key, volume = 1) {
    if (!isInitialized) {
      console.warn("Audio system not initialized");
      return;
    }

    if (!seGainNodes.has(key)) {
      console.warn(`Sound effect with key "${key}" not found`);
      return;
    }

    const gainNode = seGainNodes.get(key);
    gainNode.gain.value = volumeToGain(volume);
    console.log(`Set default volume for SE: ${key} to ${volume}`);
  }

  /**
   * Stop the background music
   */
  function stopBgm() {
    if (!isInitialized || !bgmSource) {
      return;
    }

    bgmSource.stop();
    bgmSource = null;

    if (loopCheckInterval) {
      clearInterval(loopCheckInterval);
      loopCheckInterval = null;
    }
  }

  /**
   * Stop a specific sound effect
   * @param {string} key - The identifier for the SE to stop
   */
  function stopSe(key) {
    if (!isInitialized) {
      return;
    }

    if (activeSeNodes.has(key)) {
      const source = activeSeNodes.get(key);
      source.stop();
      activeSeNodes.delete(key);
      console.log(`Stopped SE: ${key}`);
    }
  }

  /**
   * Stop all sound effects
   */
  function stopAllSe() {
    if (!isInitialized) {
      return;
    }

    for (const [key, source] of activeSeNodes.entries()) {
      source.stop();
      console.log(`Stopped SE: ${key}`);
    }

    activeSeNodes.clear();
  }

  /**
   * Get information about the current audio state
   * @returns {Object} Object containing information about the current audio state
   */
  function getAudioState() {
    const activeSounds = [];
    for (const key of activeSeNodes.keys()) {
      activeSounds.push(key);
    }

    return {
      initialized: isInitialized,
      currentBgm: bgmKey,
      bgmPlaying: bgmSource !== null,
      bpm: bpm,
      activeSoundEffects: activeSounds,
      audioContextState: audioContext ? audioContext.state : "not created",
    };
  }

  /**
   * Get all gainNodes currently connected to the destination
   * @returns {Array} Array of GainNodes
   */
  function getAllGainNodes() {
    if (!isInitialized || !audioContext) {
      console.warn("Audio system not initialized");
      return [];
    }
    const nodes = [bgmGainNode];
    for (const [key, gainNode] of seGainNodes.entries()) {
      nodes.push(gainNode);
    }
    return nodes;
  }

  /**
   * Get the AudioContext instance
   * @returns {AudioContext}
   */
  function getAudioContext() {
    return audioContext;
  }

  // Create namespace object and expose it globally
  window.GameAudio = {
    init,
    resumeAudio,
    playBgm,
    playSe,
    setBgmVolume,
    setSeVolume,
    stopBgm,
    stopSe,
    stopAllSe,
    getAudioState,
    getAllGainNodes,
    getAudioContext,
  };
})();
