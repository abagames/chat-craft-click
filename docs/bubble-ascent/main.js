// ----- Game Setup -----
const GAME_WIDTH = 400;
const GAME_HEIGHT = 450;

// ----- Game State -----
let score = 0;
let highScore = 0;
let lastScore = 0;
let gameTime = 0;
let difficulty = 1;
let gameOver = true;
let gameStarted = false;
let gameOverCooldown = 0;
let scrollY = 0;
let depth = 0;

// ----- One-Button Input Handler -----
const button = {
  pressed: false,
  justPressed: false,
  justReleased: false,
  prevState: false,

  update() {
    // Calculate state changes
    this.justPressed = this.pressed && !this.prevState;
    this.justReleased = !this.pressed && this.prevState;

    // Store current state for next frame
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

        // Process the item with the callback
        if (callback) {
          callback(item, i);
        }

        // Check if the item should be removed
        if (predicate && predicate(item, i)) {
          this.items.splice(i, 1);
        }
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
  // Calculate half-widths and half-heights for center-based collision
  const halfWidth1 = obj1Width / 2;
  const halfHeight1 = obj1Height / 2;
  const halfWidth2 = obj2Width / 2;
  const halfHeight2 = obj2Height / 2;

  // Calculate boundaries for each object
  const left1 = obj1X - halfWidth1;
  const right1 = obj1X + halfWidth1;
  const top1 = obj1Y - halfHeight1;
  const bottom1 = obj1Y + halfHeight1;

  const left2 = obj2X - halfWidth2;
  const right2 = obj2X + halfWidth2;
  const top2 = obj2Y - halfHeight2;
  const bottom2 = obj2Y + halfHeight2;

  // Check for overlap
  return !(
    right1 < left2 ||
    left1 > right2 ||
    bottom1 < top2 ||
    top1 > bottom2
  );
}

function collideCircles(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

// ----- Helper Functions -----
function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function constrain(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ----- Game Objects -----
let fish; // Player fish
const obstacles = createPool(); // Obstacles (rocks, debris)
const oxygenBubbles = createPool(); // Oxygen bubbles
const effectBubbles = createPool(); // Visual bubble effects
const scoreEffects = createPool(); // Score number effects

// ----- Game Functions -----
function addScore(points) {
  score += points;
}

function endGame() {
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.stop();
  }
  GameAudio.stopBgm();
  GameAudio.playSe("game_over", 1.5); // Play game over sound
  gameOver = true;
  gameStarted = true;
  gameOverCooldown = 30;
  lastScore = score;
  if (score > highScore) {
    highScore = score;
  }

  // Update score displays
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
}

function resetGame() {
  // Reset game state
  score = 0;
  gameTime = 0;
  difficulty = 1;
  gameOver = false;
  scrollY = 0;
  depth = 0;

  // Clear object pools
  obstacles.clear();
  oxygenBubbles.clear();
  effectBubbles.clear();
  scoreEffects.clear();

  // Initialize game objects
  initGame();

  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.start();
  }
  // Play start sound and background music
  GameAudio.playSe("start", 1.2);
  GameAudio.playBgm();

  // Update score displays
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
}

function initGame() {
  // Initialize player fish
  fish = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 200,
    width: 30,
    height: 20,
    vx: 2, // Initial horizontal velocity
    vy: -20,
    gravity: 0.3,
    buoyancy: 0.1, // Positive buoyancy means sinking
    bubblePower: -25.0, // Increased upward force
    bubbleTimer: 0,
    bubbleDelay: 5,
    isPoweredUp: false,
    normalSpeed: 2,
    powerUpSpeed: 5,
    rocksDestroyed: 0, // Counter for rocks destroyed during power-up
    isKnockedBack: false,
    knockbackTimer: 0,
    knockbackDuration: 18, // 18 frames of knockback (about 0.3 seconds)

    resetPowerUp() {
      this.isPoweredUp = false;
      this.rocksDestroyed = 0; // Reset rocks destroyed counter
      // Reset speed but maintain direction
      const direction = this.vx > 0 ? 1 : -1;
      this.vx = this.normalSpeed * direction;

      // Play power down sound
      GameAudio.playSe("power_down", 1.0);
    },

    update() {
      // Handle knockback state
      if (this.isKnockedBack) {
        this.knockbackTimer--;
        if (this.knockbackTimer <= 0) {
          this.isKnockedBack = false;
        }

        // During knockback, fish falls faster
        this.vy += this.gravity * 1.5;

        // Update position during knockback without user control
        this.x += this.vx * 0.5; // Move slower horizontally during knockback
        this.y += this.vy;

        // Check for bottom of screen boundary (game over)
        if (this.y > GAME_HEIGHT + 20) {
          endGame();
          return;
        }

        // Only handle wall collisions during knockback
        if (this.x < this.width / 2) {
          this.x = this.width / 2;
          this.vx = Math.abs(this.vx);
        } else if (this.x > GAME_WIDTH - this.width / 2) {
          this.x = GAME_WIDTH - this.width / 2;
          this.vx = -Math.abs(this.vx);
        }

        return; // Skip normal movement during knockback
      }

      // Normal movement when not knocked back
      // Automatic horizontal movement (fish swims back and forth)
      this.x += this.vx;

      // Reverse direction at screen edges with boundary correction
      if (this.x < this.width / 2) {
        // Hit left wall - correct position and change direction
        this.x = this.width / 2;
        this.vx = Math.abs(this.vx); // Ensure positive velocity (move right)

        // Play flip sound when changing direction
        GameAudio.playSe("flip", 0.8);

        // Deactivate power-up state when hitting wall
        if (this.isPoweredUp) {
          this.resetPowerUp();

          // Add visual effect for power-up loss
          for (let i = 0; i < 8; i++) {
            effectBubbles.add({
              x: this.x,
              y: this.y,
              size: randomRange(4, 8),
              alpha: 220,
              vx: randomRange(-1.5, 1.5),
              vy: randomRange(-1.5, 1.5),
              life: randomRange(15, 25),
            });
          }
        }
      } else if (this.x > GAME_WIDTH - this.width / 2) {
        // Hit right wall - correct position and change direction
        this.x = GAME_WIDTH - this.width / 2;
        this.vx = -Math.abs(this.vx); // Ensure negative velocity (move left)

        // Play flip sound when changing direction
        GameAudio.playSe("flip", 0.8);

        // Deactivate power-up state when hitting wall
        if (this.isPoweredUp) {
          this.resetPowerUp();

          // Add visual effect for power-up loss
          for (let i = 0; i < 8; i++) {
            effectBubbles.add({
              x: this.x,
              y: this.y,
              size: randomRange(4, 8),
              alpha: 220,
              vx: randomRange(-1.5, 1.5),
              vy: randomRange(-1.5, 1.5),
              life: randomRange(15, 25),
            });
          }
        }
      }

      // Fish only changes direction at screen edges - no direction change on button press

      // Apply gravity always (makes fish sink)
      this.vy += this.gravity * difficulty;

      // Apply buoyancy when not pressing (also makes fish sink but slower)
      if (!button.pressed) {
        this.vy += this.buoyancy;
      }

      // Apply upward force when pressing button
      if (button.justPressed) {
        GameAudio.playSe("tap", 0.8);

        // Strong upward force that overcomes gravity
        this.vy += this.bubblePower * difficulty;

        // Create bubble effect
        this.bubbleTimer--;
        if (this.bubbleTimer <= 0) {
          effectBubbles.add({
            x: this.x - 15,
            y: this.y + 5,
            size: randomRange(3, 6),
            alpha: 230,
            vx: randomRange(-0.5, -1.5),
            vy: randomRange(-1, -2),
            life: randomRange(20, 40),
          });

          this.bubbleTimer = this.bubbleDelay;
        }
      }

      // Cap vertical velocity
      this.vy = constrain(this.vy, -6, 6);

      // Update position
      this.y += this.vy;

      // Keep fish on top screen bounds only
      if (this.y < 30) {
        this.y = 30;
        this.vy = 0;
      }

      // Check for game over (falling off bottom of screen)
      if (this.y > GAME_HEIGHT + 20) {
        endGame();
        return;
      }
    },

    draw() {
      push();
      translate(this.x, this.y);

      // Rotate fish based on velocity
      const angle = constrain(this.vy * 0.1, -0.3, 0.3);
      rotate(angle);

      // Determine fish direction based on horizontal movement
      const facingLeft = this.vx < 0;
      const scaleX = facingLeft ? -1 : 1;
      scale(scaleX, 1);

      // Fish body - color changes based on state
      if (this.isKnockedBack) {
        // Flash red when knocked back
        if (frameCount % 6 < 3) {
          fill(255, 80, 80); // Red flash
        } else {
          fill(255, 165, 0); // Normal color
        }
      } else if (this.isPoweredUp) {
        fill(255, 255, 0); // Yellow when powered up
      } else {
        fill(255, 165, 0); // Orange normally
      }
      ellipse(0, 0, this.width, this.height);

      // Tail
      triangle(-15, 0, -25, -10, -25, 10);

      // Eye
      fill(255);
      ellipse(8, -3, 8, 8);
      // Eye changes during knockback
      if (this.isKnockedBack) {
        // X eyes when knocked back
        stroke(0);
        strokeWeight(2);
        line(8 - 2, -3 - 2, 8 + 2, -3 + 2);
        line(8 + 2, -3 - 2, 8 - 2, -3 + 2);
        noStroke();
      } else {
        fill(0);
        ellipse(10, -3, 4, 4);
      }

      // Fins
      if (this.isPoweredUp) {
        fill(255, 215, 0); // Golden fins when powered up
      } else {
        fill(255, 140, 0); // Orange fins normally
      }
      triangle(0, -10, -5, -15, -10, -8);
      triangle(0, 10, -5, 15, -10, 8);

      // Power-up glow effect
      if (this.isPoweredUp) {
        noFill();
        stroke(255, 255, 0, 100);
        strokeWeight(3);
        ellipse(0, 0, this.width + 10, this.height + 10);
        strokeWeight(1);
      }

      // Knockback effect
      if (this.isKnockedBack) {
        noFill();
        stroke(255, 0, 0, 70);
        strokeWeight(3);
        ellipse(0, 0, this.width + 5, this.height + 5);
        strokeWeight(1);
      }

      pop();
    },
  };

  // Initial state without any obstacles

  // Add initial oxygen bubbles
  for (let i = 0; i < 12; i++) {
    addOxygenBubble(randomRange(50, GAME_HEIGHT - 50));
  }
}

function addObstacle(yPos) {
  const obstacleWidth = randomRange(40, 100);
  const obstacleHeight = randomRange(15, 30);

  // Add variation to obstacle speed
  const obstacleSpeed = randomRange(0.5, 2.0);

  // Pre-generate rock shape vertices for consistent drawing
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * (TWO_PI / 6);
    const radius = obstacleWidth / 2;
    const x = Math.cos(angle) * radius * randomRange(0.8, 1.2);
    const y = Math.sin(angle) * radius * randomRange(0.8, 1.2);
    vertices.push({ x, y });
  }

  obstacles.add({
    x: randomRange(0, GAME_WIDTH),
    y: yPos,
    width: obstacleWidth,
    height: obstacleHeight,
    speedMultiplier: obstacleSpeed, // Store individual speed multiplier
    vertices: vertices, // Store pre-generated shape
  });
}

function addOxygenBubble(yPos) {
  // Add variation to bubble size and speed
  const bubbleSize = randomRange(15, 25);
  const bubbleSpeed = randomRange(0.4, 1.8);

  oxygenBubbles.add({
    x: randomRange(50, GAME_WIDTH - 50),
    y: yPos,
    size: bubbleSize,
    vy: randomRange(-0.2, -0.5),
    speedMultiplier: bubbleSpeed, // Store individual speed multiplier
    wobble: randomRange(0, Math.PI * 2),
    wobbleSpeed: randomRange(0.02, 0.05),
  });
}

function updateGame() {
  // Update depth and scroll position
  depth += 0.1 * difficulty;

  // Create scroll effect by moving objects down - increased speed
  const scrollSpeed = 1.5 * difficulty;

  // Update fish
  fish.update();

  // Process obstacles
  obstacles.processAndFilterItems(
    (obstacle) => {
      // Apply scrolling to obstacles with individual speed multiplier
      obstacle.y += scrollSpeed * obstacle.speedMultiplier;

      // Draw obstacle (rock) using pre-generated vertices
      fill(100, 100, 120); // Gray rock color
      noStroke();

      // Rock shape
      beginShape();
      for (let i = 0; i < obstacle.vertices.length; i++) {
        const v = obstacle.vertices[i];
        vertex(obstacle.x + v.x, obstacle.y + v.y);
      }
      endShape(CLOSE);

      // Check collision with fish
      if (fish.isPoweredUp) {
        // Powered-up fish destroys rocks on contact
        if (
          collideBoxes(
            fish.x,
            fish.y,
            fish.width * 0.8,
            fish.height * 0.8,
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
          )
        ) {
          // Mark for destruction
          obstacle.destroyed = true;

          // Play destroy sound
          GameAudio.playSe("destroy", 1.0);

          // Increment rocks destroyed counter and calculate score
          fish.rocksDestroyed++;

          // Add score based on combo counter (1, 2, 3, etc.)
          const pointsEarned = fish.rocksDestroyed;
          addScore(pointsEarned);

          // Create score effect
          scoreEffects.add({
            x: obstacle.x,
            y: obstacle.y,
            value: `+${pointsEarned}`,
            alpha: 255,
            vy: -1.5,
            life: 45,
          });

          // Create explosion effect
          for (let i = 0; i < 12; i++) {
            effectBubbles.add({
              x:
                obstacle.x +
                randomRange(-obstacle.width / 2, obstacle.width / 2),
              y:
                obstacle.y +
                randomRange(-obstacle.height / 2, obstacle.height / 2),
              size: randomRange(5, 10),
              alpha: 255,
              vx: randomRange(-2, 2),
              vy: randomRange(-2, 2),
              life: randomRange(20, 40),
            });
          }
        }
      } else {
        // Check if the fish is already in knockback state
        if (!fish.isKnockedBack) {
          // Normal fish gets knocked back on collision with rocks
          if (
            collideBoxes(
              fish.x,
              fish.y,
              fish.width * 0.8,
              fish.height * 0.8,
              obstacle.x,
              obstacle.y,
              obstacle.width,
              obstacle.height
            )
          ) {
            // Apply knockback effect
            fish.isKnockedBack = true;
            fish.knockbackTimer = fish.knockbackDuration;

            // Play hit sound
            GameAudio.playSe("hit", 1.2);

            // Strong downward impulse
            fish.vy = 6; // Maximum downward velocity

            // Visual feedback for collision
            for (let i = 0; i < 10; i++) {
              effectBubbles.add({
                x: fish.x,
                y: fish.y,
                size: randomRange(4, 8),
                alpha: 255,
                vx: randomRange(-2, 2),
                vy: randomRange(-1, 3), // More bubbles going down
                life: randomRange(10, 20),
              });
            }

            // Add score effect showing the collision
            scoreEffects.add({
              x: fish.x,
              y: fish.y - 15,
              value: "Ouch!",
              alpha: 255,
              vy: -1,
              life: 30,
            });
          }
        }
      }
    },
    (obstacle) => obstacle.y > GAME_HEIGHT + 50 || obstacle.destroyed // Remove obstacles that move off-screen or are destroyed
  );

  // Process oxygen bubbles
  oxygenBubbles.processAndFilterItems(
    (bubble) => {
      // Apply scrolling with individual speed multiplier
      bubble.y += scrollSpeed * bubble.speedMultiplier;

      // Apply wobble movement
      bubble.wobble += bubble.wobbleSpeed;
      bubble.x += Math.sin(bubble.wobble) * 0.5;

      // Apply slight upward drift
      bubble.y += bubble.vy;

      // Draw bubble
      fill(200, 240, 255, 200);
      stroke(255, 255, 255, 100);
      strokeWeight(1);
      ellipse(bubble.x, bubble.y, bubble.size, bubble.size);

      // Highlight
      noStroke();
      fill(255, 255, 255, 150);
      ellipse(
        bubble.x - bubble.size * 0.2,
        bubble.y - bubble.size * 0.2,
        bubble.size * 0.3,
        bubble.size * 0.3
      );

      // Check collision with fish (only if fish is not in knockback state)
      if (
        !fish.isKnockedBack &&
        collideCircles(
          fish.x,
          fish.y,
          fish.width / 2,
          bubble.x,
          bubble.y,
          bubble.size / 2
        )
      ) {
        // No score for collecting bubbles anymore

        // Activate power-up
        fish.isPoweredUp = true;

        // Play power-up sound
        GameAudio.playSe("power_up", 1.0);

        // Speed up the fish
        const direction = fish.vx > 0 ? 1 : -1;
        fish.vx = fish.powerUpSpeed * direction;

        // Mark for removal
        bubble.collected = true;

        // Add visual effect
        for (let i = 0; i < 5; i++) {
          effectBubbles.add({
            x: bubble.x,
            y: bubble.y,
            size: randomRange(2, 5),
            alpha: 200,
            vx: randomRange(-1, 1),
            vy: randomRange(-1, -2),
            life: randomRange(15, 30),
          });
        }
      }
    },
    (bubble) => bubble.collected || bubble.y > GAME_HEIGHT + 50
  );

  // Process effect bubbles
  effectBubbles.processAndFilterItems(
    (bubble) => {
      // Update position
      bubble.x += bubble.vx;
      bubble.y += bubble.vy + scrollSpeed;

      // Update lifetime
      bubble.life--;
      bubble.alpha = (bubble.life / 30) * 255;

      // Draw bubble
      noStroke();
      fill(200, 240, 255, bubble.alpha);
      ellipse(bubble.x, bubble.y, bubble.size, bubble.size);
    },
    (bubble) => bubble.life <= 0
  );

  // Process score effects
  scoreEffects.processAndFilterItems(
    (effect) => {
      // Update position
      effect.y += effect.vy;

      // Update lifetime
      effect.life--;
      effect.alpha = (effect.life / 45) * 255;

      // Make the effect grow slightly at first, then shrink
      const scaleFactor =
        effect.life > 30
          ? map(effect.life, 45, 30, 0.8, 1.2)
          : map(effect.life, 30, 0, 1.2, 1.0);

      // Draw score effect with yellow/gold glow for visibility
      push();
      translate(effect.x, effect.y);
      scale(scaleFactor);

      // Draw glow
      noStroke();
      fill(255, 215, 0, effect.alpha * 0.3);
      textAlign(CENTER);
      textSize(24);
      text(effect.value, 2, 2);

      // Draw text
      fill(255, 255, 255, effect.alpha);
      stroke(255, 200, 0, effect.alpha * 0.7);
      strokeWeight(2);
      text(effect.value, 0, 0);
      pop();
    },
    (effect) => effect.life <= 0
  );

  // Spawn new obstacles - increased generation rate
  if (gameTime % Math.floor(40 / difficulty) === 0) {
    addObstacle(-50);
  }

  // Add chance for extra obstacles
  if (Math.random() < 0.02 * difficulty) {
    addObstacle(-randomRange(20, 100));
  }

  // Spawn new oxygen bubbles - greatly increased generation rate
  if (gameTime % Math.floor(30 / difficulty) === 0) {
    addOxygenBubble(-randomRange(50, 150));
  }

  // Add chance for extra bubbles for higher density
  if (Math.random() < 0.03 * difficulty) {
    addOxygenBubble(-randomRange(20, 100));
  }

  // Draw player fish
  fish.draw();

  // Draw score and depth
  fill(255);
  textAlign(RIGHT);
  textSize(24);
  text(`${Math.floor(score)}`, width - 20, 30);

  // Depth display removed

  // Display power-up status - removed

  // Update game time
  gameTime++;

  // Update difficulty
  if (gameTime % 600 === 0) {
    difficulty += 0.1;
  }
}

// ----- p5.js Core Functions -----
function setup() {
  // Create canvas inside gameContainer
  let canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("gameContainer");

  GameAudio.init(
    {
      bgm: "./audios/bgm.mp3",
      destroy: "./audios/destroy.mp3",
      flip: "./audios/flip.mp3",
      game_over: "./audios/game_over.mp3",
      hit: "./audios/hit.mp3",
      power_down: "./audios/power_down.mp3",
      power_up: "./audios/power_up.mp3",
      start: "./audios/start.mp3",
      tap: "./audios/tap.mp3",
    },
    { bpm: 150, quantize: 0.25 }
  ).then(() => {
    if (typeof GameRecorder != "undefined" && GameRecorder != null) {
      GameRecorder.init(
        canvas.canvas,
        GameAudio.getAudioContext(),
        GameAudio.getAllGainNodes()
      );
    }
  });

  background(0);
  drawGameOver();
}

function draw() {
  // Update input first
  button.update();

  if (!gameOver) {
    // Game background - gradient blue
    background(100, 180, 255);

    // Draw background layers
    drawBackground();

    // Game loop
    updateGame();
  } else {
    // Game over screen
    if (gameOverCooldown === 30) {
      drawGameOver();
    }

    // Check for restart - only after cooldown period
    gameOverCooldown--;
    if (gameOverCooldown <= 0 && button.justPressed) {
      resetGame();
    }
  }
}

function drawBackground() {
  // Create underwater effect

  // Background gradient
  noFill();
  for (let i = 0; i < height; i += 5) {
    const inter = map(i, 0, height, 0, 1);
    const c = lerpColor(color(120, 200, 255), color(0, 50, 100), inter);
    stroke(c);
    line(0, i, width, i);
  }

  // Light rays
  noStroke();
  fill(255, 255, 255, 10);
  for (let i = 0; i < 5; i++) {
    const rayX = (i * width) / 5 + sin(gameTime / 100 + i) * 30;
    const rayWidth = 50 + sin(gameTime / 80 + i * 10) * 20;

    beginShape();
    vertex(rayX - rayWidth / 2, 0);
    vertex(rayX + rayWidth / 2, 0);
    vertex(rayX + rayWidth, height);
    vertex(rayX - rayWidth, height);
    endShape(CLOSE);
  }
}

function drawGameOver() {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  textAlign(CENTER);
  fill(255);
  // Only show game over text if the game has been played
  if (gameStarted) {
    textSize(32);
    text("Game Over", width / 2, height / 2 - 20);
    textSize(24);
    text("Score: " + score, width / 2, height / 2 + 20);
  }
  textSize(20);
  text("Click or tap to start", width / 2, height / 2 + 50);
}

// ----- Input Handling -----
function mousePressed() {
  GameAudio.resumeAudio();
  button.pressed = true;
  return false; // Prevent default
}

function touchStarted() {
  GameAudio.resumeAudio();
  button.pressed = true;
  return false; // Prevent default
}

const gameControlKeys = [32, 87, 65, 83, 68, 37, 38, 39, 40]; // Space, W, A, S, D, Left, Up Right, Down

function keyPressed() {
  GameAudio.resumeAudio();
  button.pressed = true;
  if (gameControlKeys.includes(keyCode)) {
    return false; // preventDefault
  }
  return true;
}

function mouseReleased() {
  button.pressed = false;
  return false; // Prevent default
}

function touchEnded() {
  button.pressed = false;
  return false; // Prevent default
}

function keyReleased() {
  button.pressed = false;
  if (gameControlKeys.includes(keyCode)) {
    return false; // preventDefault
  }
  return true;
}
