// ----- Game Setup -----
const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;

// ----- Game State -----
let score = 0;
let highScore = 0;
let lastScore = 0;
let gameTime = 0;
let difficulty = 1;
let gameOver = true;
let gameStarted = false;
let gameOverCooldown = 30;
let multiplier = 1;
let lastMineral = 0;
let difficultyIncreaseRate = 0.05;
let obstacleData = { tick: 0, streamIndex: -1, minSpacing: 120 };
let missedMinerals = 0;

// ----- One-Button Input Handler -----
const button = {
  pressed: false,
  justPressed: false,
  justReleased: false,
  prevState: false,
  pressTime: 0,
  update() {
    this.justPressed = this.pressed && !this.prevState;
    this.justReleased = !this.pressed && this.prevState;
    this.pressTime = this.pressed ? this.pressTime + 1 : 0;
    this.prevState = this.pressed;
  },
};

// ----- Object Pool -----
function createPool() {
  return {
    items: [],
    add(item) {
      this.items.push(item);
      return item;
    },
    processAndFilterItems(callback, predicate) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        if (callback) callback(item, i);
        if (predicate && predicate(item, i)) this.items.splice(i, 1);
      }
    },
    clear() {
      this.items = [];
    },
  };
}

// ----- Collision Detection -----
function collideBoxes(
  obj1X,
  obj1Y,
  obj1Width,
  obj1Height,
  obj2X,
  obj2Y,
  obj2Width,
  obj2Height
) {
  const halfWidth1 = obj1Width / 2,
    halfHeight1 = obj1Height / 2;
  const halfWidth2 = obj2Width / 2,
    halfHeight2 = obj2Height / 2;
  const left1 = obj1X - halfWidth1,
    right1 = obj1X + halfWidth1;
  const top1 = obj1Y - halfHeight1,
    bottom1 = obj1Y + halfHeight1;
  const left2 = obj2X - halfWidth2,
    right2 = obj2X + halfWidth2;
  const top2 = obj2Y - halfHeight2,
    bottom2 = obj2Y + halfHeight2;
  return !(
    right1 < left2 ||
    left1 > right2 ||
    bottom1 < top2 ||
    top1 > bottom2
  );
}

function collideCircles(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy) < r1 + r2;
}

// ----- Helper Functions -----
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// ----- Game Object Pools -----
const players = createPool();
const lavaStreams = createPool();
const obstacles = createPool();
const minerals = createPool();
const effects = createPool();
const backgrounds = createPool();

// ----- Game Functions -----
function addScore(points, x = null, y = null) {
  score += points;
  if (x !== null && y !== null) {
    effects.add({
      x: x,
      y: y,
      text: "+" + points,
      alpha: 255,
      life: 30,
      vy: -2,
    });
  }
}

function endGame() {
  // Stop game recording if GameRecorder is available
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.stop();
  }

  // Stop BGM and play game over sound
  GameAudio.stopBgm();
  GameAudio.playSe("gameOver", 1.0);

  gameOver = true;
  gameStarted = true;
  gameOverCooldown = 30;
  lastScore = score;
  if (score > highScore) highScore = score;
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
  effects.add({
    x: width / 2,
    y: height / 2,
    size: 5,
    alpha: 255,
    growth: 10,
    life: 30,
    color: color(255, 0, 0),
  });
}

function resetGame() {
  score = 0;
  gameTime = 0;
  difficulty = 1;
  multiplier = 1;
  missedMinerals = 0;
  lastMineral = 0;
  difficultyIncreaseRate = 0.05;
  gameOver = false;
  players.clear();
  lavaStreams.clear();
  obstacles.clear();
  minerals.clear();
  effects.clear();
  backgrounds.clear();
  initGame();
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;

  // Start BGM
  GameAudio.playBgm();

  // Start recording if GameRecorder is available
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.start();
  }
}

// ----- Game Implementation -----
function createLavaStreams() {
  const streamCount = 4;
  const streamHeight = 15;
  const spacing = (height - 50) / streamCount;
  for (let i = 0; i < streamCount; i++) {
    const y = 50 + i * spacing;
    lavaStreams.add({
      y: y,
      height: streamHeight,
      speed: 0.5 + i * 0.2,
      baseY: y,
      amplitude: randomRange(3, 7),
      frequency: randomRange(0.02, 0.04),
      offset: randomRange(0, Math.PI * 2),
    });
  }
}

function createBackgroundElements() {
  // Background
  backgrounds.add({
    name: "background",
    update() {},
    draw() {
      const topColor = color(40, 10, 10);
      const bottomColor = color(10, 0, 0);
      for (let y = 0; y < height; y++) {
        const inter = map(y, 0, height, 0, 1);
        const c = lerpColor(topColor, bottomColor, inter);
        stroke(c);
        line(0, y, width, y);
      }
    },
  });

  // Volcano
  const volcanoCenterX = width * 0.5;
  const volcanoBaseY = height + 20;
  const volcanoWidth = width * 1.2;
  const volcanoHeight = height * 0.7;
  backgrounds.add({
    name: "volcano",
    centerX: volcanoCenterX,
    baseY: volcanoBaseY,
    width: volcanoWidth,
    height: volcanoHeight,
    draw() {
      noStroke();
      fill(70, 30, 20);
      beginShape();
      vertex(this.centerX - this.width / 2, this.baseY);
      vertex(this.centerX - this.width * 0.25, this.baseY - this.height * 0.9);
      vertex(this.centerX, this.baseY - this.height);
      vertex(this.centerX + this.width * 0.3, this.baseY - this.height * 0.85);
      vertex(this.centerX + this.width / 2, this.baseY);
      endShape(CLOSE);
      fill(50, 20, 10);
      beginShape();
      vertex(this.centerX - this.width * 0.35, this.baseY);
      vertex(this.centerX - this.width * 0.15, this.baseY - this.height * 0.7);
      vertex(this.centerX + this.width * 0.2, this.baseY - this.height * 0.65);
      vertex(this.centerX + this.width * 0.35, this.baseY);
      endShape(CLOSE);
    },
  });
}

function initGame() {
  createBackgroundElements();
  createLavaStreams();

  obstacleData = { tick: 0, streamIndex: -1, minSpacing: 120 };

  players.add({
    x: 50,
    y: lavaStreams.items[lavaStreams.items.length - 1].y - 12,
    width: 20,
    height: 10,
    vy: 0,
    gravity: 0.25,
    jumpStrength: -8,
    onLava: true,
    passThroughMode: false,
    currentStream: lavaStreams.items.length - 1,

    update() {
      // Jump when button is just pressed while on lava
      if (button.justPressed && this.onLava) {
        this.vy = this.jumpStrength;
        this.onLava = false;
        this.passThroughMode = false;

        // Play jump sound
        GameAudio.playSe("jump", 1.0);

        effects.add({
          x: this.x,
          y: this.y + this.height / 2,
          size: 20,
          alpha: 200,
          growth: 2,
          life: 10,
          color: color(255, 100, 0, 150),
        });
      }

      // Enable pass-through mode when button is held
      if (button.pressed) {
        // Accelerate downward when button is held
        this.vy += this.gravity * 1.5;
        this.passThroughMode = true;

        // Add falling effect
        if (frameCount % 5 === 0) {
          effects.add({
            x: this.x + randomRange(-this.width / 4, this.width / 4),
            y: this.y - this.height / 2,
            size: 8,
            alpha: 150,
            growth: 0.5,
            life: 15,
            color: color(255, 50, 0, 100),
          });
        }
      } else {
        // Normal gravity when button is not held
        this.vy += this.gravity;
        this.passThroughMode = false;
      }

      // Apply acceleration damping
      this.vy *= 0.99;
      this.y += this.vy;

      // Screen wrap for vertical position
      if (this.y > height + this.height) {
        this.y = -this.height;
      } else if (this.y < -this.height) {
        this.y = height + this.height;
      }

      this.onLava = false;
      for (let i = 0; i < lavaStreams.items.length; i++) {
        const stream = lavaStreams.items[i];
        if (
          !this.passThroughMode &&
          this.vy > 0 &&
          this.y + this.height / 2 > stream.y &&
          this.y + this.height / 2 < stream.y + stream.height
        ) {
          this.y = stream.y - this.height / 2;
          this.vy = 0;
          this.onLava = true;
          this.currentStream = i;
          if (!this.wasOnLava) {
            // Play landing sound when landing on lava
            GameAudio.playSe("land", 0.8);

            effects.add({
              x: this.x,
              y: this.y + this.height / 2,
              size: 15,
              alpha: 200,
              growth: 1.5,
              life: 8,
              color: color(255, 150, 0, 150),
            });
          }
          break;
        }
      }
      this.wasOnLava = this.onLava;
    },

    draw() {
      // Glow effect for visibility
      noStroke();
      fill(255, 220, 180, 70);
      ellipse(this.x, this.y, this.width * 1.5, this.height * 1.5);

      // Main board body
      fill(230, 120, 40);
      rect(
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height,
        5
      );

      // Player character
      fill(250, 200, 100);
      rect(
        this.x - this.width * 0.3,
        this.y - this.height * 0.7,
        this.width * 0.6,
        this.height * 0.5,
        2
      );

      // Eyes
      fill(50, 30, 10);
      ellipse(this.x - this.width * 0.1, this.y - this.height * 0.5, 4, 4);
      ellipse(this.x + this.width * 0.1, this.y - this.height * 0.5, 4, 4);

      if (this.onLava) {
        // Lava splash effect
        for (let i = -2; i <= 2; i++) {
          const offsetX = i * 5;
          fill(255, 200, 0, 150);
          ellipse(this.x + offsetX, this.y + this.height / 2, 10, 5);
        }
      }

      // Outline for visibility
      stroke(255, 255, 200);
      strokeWeight(2);
      noFill();
      rect(
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height,
        5
      );
      noStroke();
    },
  });
}

function updateGame() {
  const player = players.items[0];

  // Update and draw backgrounds
  backgrounds.processAndFilterItems((bg) => {
    if (bg.update) bg.update();
    bg.draw();
  });

  // Update and draw lava streams
  lavaStreams.processAndFilterItems((stream, index) => {
    stream.y =
      stream.baseY +
      Math.sin(gameTime * stream.frequency + stream.offset) * stream.amplitude;
    const lavaColor1 = color(255, 80, 0);
    const lavaColor2 = color(255, 150, 0);

    for (let x = 0; x < width; x += 20) {
      const waveHeight = 5 * Math.sin((x + gameTime * stream.speed) * 0.05);
      const streamY = stream.y + waveHeight;
      fill(lerpColor(lavaColor1, lavaColor2, noise(x * 0.01, gameTime * 0.01)));
      noStroke();
      beginShape();
      vertex(x, streamY);
      vertex(x + 20, streamY + Math.sin((x + 20) * 0.1) * 3);
      vertex(x + 20, streamY + stream.height);
      vertex(x, streamY + stream.height);
      endShape(CLOSE);
    }
  });

  // Generate obstacles
  const timeSinceLastObstacle = gameTime - obstacleData.tick;
  if (
    timeSinceLastObstacle > obstacleData.minSpacing &&
    gameTime > 120 &&
    random() < 0.1 * difficulty
  ) {
    // Find available streams
    const availableStreams = [];
    for (let i = 0; i < lavaStreams.items.length; i++) {
      if (i !== obstacleData.streamIndex) {
        availableStreams.push(i);
      }
    }

    // Select a random stream
    const streamIndex =
      availableStreams[Math.floor(random() * availableStreams.length)];
    const stream = lavaStreams.items[streamIndex];

    // Create the obstacle
    const obsHeight = randomRange(20, 35);
    const obsWidth = randomRange(15, 30);
    obstacles.add({
      x: width + obsWidth / 2,
      y: stream.y - obsHeight / 2,
      width: obsWidth,
      height: obsHeight,
      speed: 1 + difficulty * 0.3,
      streamIndex: streamIndex,
      points: [],
    });

    obstacleData.tick = gameTime;
    obstacleData.streamIndex = streamIndex;
    obstacleData.minSpacing = Math.max(60, 120 - difficulty * 10);
  }

  // Update and draw obstacles
  obstacles.processAndFilterItems(
    (obstacle) => {
      if (!obstacle.points.length) {
        const detail = 8;
        for (let i = 0; i < detail; i++) {
          obstacle.points.push({
            x: randomRange(-obstacle.width / 2 + 2, obstacle.width / 2 - 2),
            y: randomRange(-obstacle.height / 2 + 2, obstacle.height / 2 - 2),
            size: randomRange(3, 7),
          });
        }
      }

      obstacle.x -= obstacle.speed;
      const stream = lavaStreams.items[obstacle.streamIndex];
      obstacle.y = stream.y - obstacle.height / 2;

      // Draw obstacle
      noStroke();
      fill(255, 50, 30, 40);
      ellipse(
        obstacle.x,
        obstacle.y,
        obstacle.width * 1.2,
        obstacle.height * 1.2
      );

      fill(150, 60, 40);
      rect(
        obstacle.x - obstacle.width / 2,
        obstacle.y - obstacle.height / 2,
        obstacle.width,
        obstacle.height,
        2
      );

      // Collision detection
      if (
        collideBoxes(
          player.x,
          player.y,
          player.width * 0.8,
          player.height * 0.8,
          obstacle.x,
          obstacle.y,
          obstacle.width * 0.9,
          obstacle.height * 0.9
        )
      ) {
        endGame();
        return;
      }
    },
    (obstacle) => obstacle.x < -obstacle.width
  );

  // Generate minerals
  if (gameTime - lastMineral > 60 && random() < 0.01 * difficulty) {
    const streamIndex = randomInt(0, lavaStreams.items.length - 1);
    const stream = lavaStreams.items[streamIndex];
    const size = randomRange(12, 18);
    minerals.add({
      x: width + size / 2,
      y: stream.y - size / 2,
      size: size,
      speed: 1 + difficulty * 0.2,
      streamIndex: streamIndex,
      rotation: 0,
      rotSpeed: randomRange(-0.05, 0.05),
      value: Math.max(
        5,
        Math.floor(10 * (1 - streamIndex / lavaStreams.items.length))
      ),
      points: [],
      collected: false,
      missed: false,
    });
    lastMineral = gameTime;
  }

  // Update and draw minerals
  minerals.processAndFilterItems(
    (mineral) => {
      if (!mineral.points.length) {
        const sides = randomInt(5, 7);
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * TWO_PI;
          const radius = (mineral.size / 2) * randomRange(0.8, 1);
          mineral.points.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          });
        }
      }

      mineral.x -= mineral.speed;
      const stream = lavaStreams.items[mineral.streamIndex];
      mineral.y = stream.y - mineral.size / 2;
      mineral.rotation += mineral.rotSpeed;

      push();
      translate(mineral.x, mineral.y);
      rotate(mineral.rotation);
      fill(200, 150, 50);
      stroke(255, 200, 100);
      strokeWeight(2);
      beginShape();
      for (const point of mineral.points) {
        vertex(point.x, point.y);
      }
      endShape(CLOSE);
      pop();

      if (
        collideCircles(
          player.x,
          player.y,
          player.width / 2,
          mineral.x,
          mineral.y,
          (mineral.size / 2) * 0.8
        )
      ) {
        // Play mineral collect sound
        GameAudio.playSe("collectMineral", 0.8 + multiplier * 0.05);

        // Increase multiplier when collecting minerals
        multiplier = Math.min(9, multiplier + 1);

        const points = mineral.value * multiplier;
        addScore(points, mineral.x, mineral.y - 15);

        effects.add({
          x: mineral.x,
          y: mineral.y,
          size: mineral.size * 1.5,
          alpha: 200,
          growth: 3,
          life: 20,
          color: color(255, 220, 100, 150),
        });

        // Show multiplier text without exclamation mark
        effects.add({
          x: mineral.x,
          y: mineral.y - 30,
          text: `x${multiplier}`,
          alpha: 255,
          life: 45,
          vy: -1,
          size: 18,
        });

        mineral.collected = true;
      }

      // Check if mineral is leaving the screen without being collected
      if (mineral.x < -mineral.size && !mineral.collected && !mineral.missed) {
        mineral.missed = true;
        missedMinerals++;

        // Play missed mineral sound
        GameAudio.playSe("missMineral", 3.0);

        // Reduce multiplier every time a mineral is missed
        if (multiplier > 1) {
          multiplier = Math.max(1, multiplier - 1);

          // Show multiplier reduction effect
          effects.add({
            x: 50,
            y: 50,
            text: `x${multiplier}`,
            alpha: 255,
            life: 45,
            vy: -1,
            size: 18,
            color: color(255, 100, 100),
          });
        }
      }
    },
    (mineral) => mineral.x < -mineral.size || mineral.collected
  );

  // Update and draw effects
  effects.processAndFilterItems(
    (effect) => {
      if (effect.growth) {
        effect.size += effect.growth;
        effect.alpha -= 255 / effect.life;
        effect.life--;
        noStroke();
        const currentColor = effect.color;
        currentColor.setAlpha(effect.alpha);
        fill(currentColor);
        ellipse(effect.x, effect.y, effect.size);
      } else if (effect.text) {
        effect.alpha -= 255 / effect.life;
        effect.y += effect.vy || 0;
        effect.life--;
        if (effect.color) {
          fill(
            effect.color.levels[0],
            effect.color.levels[1],
            effect.color.levels[2],
            effect.alpha
          );
        } else {
          fill(255, 255, 255, effect.alpha);
        }
        textAlign(CENTER);
        textSize(effect.size || 14);
        text(effect.text, effect.x, effect.y);
      }
    },
    (effect) => effect.life <= 0
  );

  // Update and draw player
  players.processAndFilterItems((player) => {
    player.update();
    player.draw();
  });

  // Update game state
  gameTime++;
  if (gameTime % 600 === 0) {
    difficulty += difficultyIncreaseRate;
  }

  // Draw HUD
  fill(255);
  textAlign(RIGHT);
  textSize(20);
  text(`${score}`, width - 20, 30);

  // Show multiplier
  fill(255, 220, 100);
  textAlign(LEFT);
  textSize(16);
  text(`x${multiplier}`, 20, 30);
}

function drawGameOver() {
  backgrounds.processAndFilterItems((bg) => {
    if (bg.name === "volcano") bg.draw();
  });
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  textAlign(CENTER);
  fill(255, 100, 0);
  if (gameStarted) {
    textSize(32);
    text("GAME OVER", width / 2, height / 2 - 20);
    textSize(24);
    fill(255, 200, 100);
    text("Score: " + score, width / 2, height / 2 + 20);
  } else {
    textSize(32);
    text("LAVA SURFING", width / 2, height / 2 - 40);
    textSize(18);
    fill(255, 200, 100);
    text("Surf on lava streams & collect minerals", width / 2, height / 2);
    text(
      "Jump to go up, hold to dive through lava",
      width / 2,
      height / 2 + 25
    );
  }
  textSize(20);
  fill(255);
  text("Click or tap to start", width / 2, height / 2 + 85);
}

// ----- P5.js Setup & Loop -----
function setup() {
  let canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("gameContainer");
  background(20, 0, 0);

  // Initialize audio system
  GameAudio.init(
    {
      bgm: "./audios/bgm.mp3",
      jump: "./audios/jump.mp3",
      land: "./audios/land.mp3",
      collectMineral: "./audios/collectMineral.mp3",
      missMineral: "./audios/missMineral.mp3",
      gameOver: "./audios/gameOver.mp3",
    },
    { bpm: 120, quantize: 0.25 }
  ).then(() => {
    // Initialize GameRecorder if available
    if (typeof GameRecorder != "undefined" && GameRecorder != null) {
      GameRecorder.init(
        canvas.canvas,
        GameAudio.getAudioContext(),
        GameAudio.getAllGainNodes()
      );
    }
  });

  drawGameOver();
}

function draw() {
  button.update();
  if (!gameOver) {
    backgrounds.processAndFilterItems((bg) => {
      if (bg.name === "background") bg.draw();
    });
    updateGame();
  } else {
    if (gameOverCooldown === 30) {
      drawGameOver();
    }
    gameOverCooldown--;
    if (gameOverCooldown <= 0 && button.justPressed) {
      resetGame();
    }
  }
}

// ----- Input Handling -----
function mousePressed() {
  // Resume audio context if suspended
  GameAudio.resumeAudio();
  button.pressed = true;
  return false;
}
function touchStarted() {
  // Resume audio context if suspended
  GameAudio.resumeAudio();
  button.pressed = true;
  return false;
}
function mouseReleased() {
  button.pressed = false;
  return false;
}
function touchEnded() {
  button.pressed = false;
  return false;
}

const gameControlKeys = [32, 87, 65, 83, 68, 37, 38, 39, 40];
function keyPressed() {
  // Resume audio context if suspended
  GameAudio.resumeAudio();
  button.pressed = true;
  if (gameControlKeys.includes(keyCode)) {
    return false;
  }
  return true;
}

function keyReleased() {
  button.pressed = false;
  if (gameControlKeys.includes(keyCode)) {
    return false;
  }
  return true;
}
