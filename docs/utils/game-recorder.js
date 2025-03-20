/**
 * game-recorder.js
 * A lightweight library for recording game screens with audio support.
 * Captures both canvas visuals and WebAudio output.
 */
(function () {
  // Configuration constants
  const scale = 0.5; // Scale factor for output video resolution
  const recordingFps = 60; // Target framerate for recording
  const mimeType = "video/webm;codecs=vp8,opus"; // Video codec settings
  const type = "video/webm"; // Output file type
  const fileName = "recording.webm"; // Default output filename
  const videoBitsPerSecond = 640000 * scale; // Video bitrate scaled by resolution
  const masterVolume = 0.7; // Master volume for recording

  // Module variables
  let mediaRecorder = null;
  let recordedChunks = [];
  let animationFrameId = null;

  let combinedStream;
  let customBitrate;
  let customFilename;

  /**
   * Start recording the game screen and audio
   * @param {HTMLCanvasElement} canvas - The game canvas to capture
   * @param {AudioContext} audioContext - The audio context used by the game
   * @param {Array<GainNode>} gainNodes - Array of gain nodes to record
   * @param {Object} options - Optional settings for recording
   * @param {string} options.filename - Custom filename for the recording
   * @param {number} options.scale - Custom scale factor for the recording resolution
   * @param {number} options.fps - Custom frames per second
   * @param {number} options.bitrate - Custom video bitrate
   * @param {number} options.volume - Custom master volume
   * @returns {void}
   */
  function init(canvas, audioContext, gainNodes, options = {}) {
    // Apply custom options or use defaults
    const customScale = options.scale || scale;
    const customFps = options.fps || recordingFps;
    const customVolume = options.volume || masterVolume;
    customBitrate = options.bitrate || videoBitsPerSecond;
    customFilename = options.filename || fileName;

    // Create a virtual canvas with higher resolution for better quality recording
    const virtualCanvas = document.createElement("canvas");
    virtualCanvas.width = canvas.width * customScale;
    virtualCanvas.height = canvas.height * customScale;
    const context = virtualCanvas.getContext("2d");

    // Set up the drawing loop to copy and scale up the game canvas
    const drawLoop = () => {
      context.drawImage(
        canvas, // Source canvas
        0,
        0, // Source position
        canvas.width, // Source width
        canvas.height, // Source height
        0,
        0, // Destination position
        virtualCanvas.width, // Destination width
        virtualCanvas.height // Destination height
      );
      animationFrameId = requestAnimationFrame(drawLoop);
    };
    drawLoop();

    // Capture the canvas stream at the specified framerate
    const videoStream = virtualCanvas.captureStream(customFps);

    // Set up audio recording
    const audioDestination = audioContext.createMediaStreamDestination();
    const masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = customVolume;

    // Connect all provided gain nodes to the master gain node
    gainNodes.forEach((gn) => {
      if (gn == null) {
        return;
      }
      gn.connect(masterGainNode);
    });

    // Connect master gain to the media stream destination
    masterGainNode.connect(audioDestination);
    const audioStream = audioDestination.stream;

    // Combine video and audio streams
    combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);
  }

  /**
   * Start the current recording
   * @returns {void}
   */
  function start() {
    // Don't start if already recording
    if (mediaRecorder != null) {
      console.warn("Recording is already in progress");
      return;
    }

    // Create media recorder with the combined stream
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: customBitrate,
    });

    // Reset recorded chunks array
    recordedChunks = [];

    // Set up event handlers
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Create a blob from all recorded chunks
      const blob = new Blob(recordedChunks, { type });

      // Create a download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = customFilename;
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      recordedChunks = [];

      console.log(`Recording saved as ${customFilename}`);
    };

    // Start the recording
    mediaRecorder.start();
    console.log("Recording started");
  }

  /**
   * Stop the current recording
   * @returns {void}
   */
  function stop() {
    if (mediaRecorder != null && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder = null;
      console.log("Recording stopped");
    } else {
      console.warn("No active recording to stop");
    }
  }

  /**
   * Check if recording is currently in progress
   * @returns {boolean} True if recording is active
   */
  function isRecording() {
    return mediaRecorder != null && mediaRecorder.state === "recording";
  }

  // Create namespace object and expose it globally
  window.GameRecorder = {
    init,
    start,
    stop,
    isRecording,
  };
})();
