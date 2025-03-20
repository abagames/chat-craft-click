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
let gameOverCooldown = 0;
let comboCount = 0;
let scoreMultiplier = 1; // Multiplier for consecutive jumps
let fuelAmount = 100;
let landingCooldown = 0;

// Color palette
const colors = {
  background: [10, 5, 30],
  player: [0, 255, 220],
  planet: [150, 100, 255],
  orbit: [100, 100, 240, 80],
  trajectory: [200, 200, 255, 150],
  fuel: [0, 200, 150],
  stars: [255, 255, 255],
};

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

// ----- Vector Class -----
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    if (v instanceof Vector) {
      this.x += v.x;
      this.y += v.y;
    } else {
      this.x += v;
      this.y += v;
    }
    return this;
  }

  sub(v) {
    if (v instanceof Vector) {
      this.x -= v.x;
      this.y -= v.y;
    } else {
      this.x -= v;
      this.y -= v;
    }
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) {
      this.div(m);
    }
    return this;
  }

  setMag(n) {
    return this.normalize().mult(n);
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  static dist(v1, v2) {
    return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
  }
}

// ----- Collision Detection Utilities -----
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

function constrain(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ----- Game Object Pools -----
const planets = createPool();
const particles = createPool();
const stars = createPool();

// ----- Player Object -----
let player = {
  pos: new Vector(0, 0),
  vel: new Vector(0, 0),
  radius: 5,
  color: colors.player,
  isOrbiting: true,
  orbitPlanet: null,
  orbitAngle: 0,
  orbitSpeed: 0.05, // Increased from 0.03 to 0.05
  orbitRadius: 0,
  trail: [],
  maxTrailLength: 15,

  update() {
    if (this.isOrbiting) {
      // Update orbit position
      this.orbitAngle += this.orbitSpeed;

      // Position is relative to the planet
      const orbitX =
        this.orbitPlanet.pos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const orbitY =
        this.orbitPlanet.pos.y + Math.sin(this.orbitAngle) * this.orbitRadius;

      this.pos.x = orbitX;
      this.pos.y = orbitY;

      // Check if this is the central planet (initial planet)
      const isCentralPlanet = this.orbitPlanet === planets.items[0];

      if (isCentralPlanet) {
        // Gradually decrease fuel when orbiting the central planet
        fuelAmount = Math.max(0, fuelAmount - 0.05); // Reduced from 0.1 to 0.05
      } else {
        // Gradually refill fuel while orbiting other planets
        if (fuelAmount < 100) {
          fuelAmount = Math.min(100, fuelAmount + 0.4);
        }
      }

      // Reset velocity for prediction line
      this.vel.x = Math.cos(this.orbitAngle + Math.PI / 2) * 3;
      this.vel.y = Math.sin(this.orbitAngle + Math.PI / 2) * 3;

      // Landing cooldown to prevent accidental double jumps
      if (landingCooldown > 0) {
        landingCooldown--;
      }
    } else {
      // Free flight movement
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      // Add position to trail
      if (frameCount % 3 === 0) {
        this.trail.push(this.pos.copy());
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
      }

      // Check if player is off-screen
      if (
        this.pos.x < -10 ||
        this.pos.x > width + 10 ||
        this.pos.y < -10 ||
        this.pos.y > height + 10
      ) {
        endGame();
      }
    }
  },

  draw() {
    // Draw trail when not orbiting
    if (!this.isOrbiting && this.trail.length > 0) {
      noFill();
      stroke(
        colors.trajectory[0],
        colors.trajectory[1],
        colors.trajectory[2],
        colors.trajectory[3]
      );
      strokeWeight(2);
      beginShape();
      for (let i = 0; i < this.trail.length; i++) {
        const pos = this.trail[i];
        vertex(pos.x, pos.y);
      }
      endShape();
    }

    // Draw player
    fill(this.color[0], this.color[1], this.color[2]);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.radius * 2);

    // Draw trajectory prediction line when orbiting
    if (this.isOrbiting && fuelAmount > 20) {
      drawTrajectory(this.pos.x, this.pos.y, this.vel.x, this.vel.y);
    }
  },

  launch() {
    if (this.isOrbiting && fuelAmount >= 20 && landingCooldown === 0) {
      this.isOrbiting = false;

      // Use fuel
      fuelAmount -= 20;

      // Play launch sound
      GameAudio.playSe("launch", 1.0);

      // Create launch particles
      createLaunchParticles(this.pos.x, this.pos.y);

      // Add bonus score based on current orbit distance
      const distBonus = Math.floor(this.orbitRadius / 5);
      if (distBonus > 0) {
        addScore(distBonus);
        createScoreParticle(this.pos.x, this.pos.y, "+" + distBonus);
      }

      // Clear trail
      this.trail = [];
    }
  },
};

// Check fuel status - game over if no fuel
function checkFuelStatus() {
  if (fuelAmount <= 0) {
    // Create "Out of Fuel" effect
    createOutOfFuelEffect();
    endGame();
  }
}

function createOutOfFuelEffect() {
  for (let i = 0; i < 30; i++) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(0.5, 2);
    const distance = randomRange(0, 15);

    particles.add({
      pos: new Vector(
        player.pos.x + Math.cos(angle) * distance,
        player.pos.y + Math.sin(angle) * distance
      ),
      vel: new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed),
      radius: randomRange(1, 3),
      color: [255, 100, 0], // Orange for fuel depletion
      alpha: 255,
      life: randomRange(30, 60),
    });
  }
}

// ----- Game Functions -----
function addScore(points) {
  // Apply multiplier
  const finalPoints = points * scoreMultiplier;
  score += Math.floor(finalPoints);

  // Play score multiplier sound if multiplier is greater than 1
  if (scoreMultiplier > 1) {
    GameAudio.playSe("scoreMultiplier", 0.8 + scoreMultiplier * 0.1);
  }
}

function endGame() {
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.stop();
  }
  GameAudio.stopBgm();
  GameAudio.playSe("gameOver", 1.5); // Play game over sound

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
  comboCount = 0;
  scoreMultiplier = 1;
  fuelAmount = 100;
  landingCooldown = 0;

  // Reset fuel warning flags
  window.fuelWarningFlag = false;
  window.fuelRecoveredFlag = true;

  // Clear object pools
  planets.clear();
  particles.clear();
  stars.clear();

  // Initialize game
  initGame();

  GameAudio.playBgm();
  // Start recording if GameRecorder is available
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.start();
  }

  // Update score displays
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
}

function initGame() {
  // Create background stars
  for (let i = 0; i < 100; i++) {
    stars.add({
      x: randomRange(0, width),
      y: randomRange(0, height),
      size: randomRange(1, 3),
      alpha: randomRange(150, 255),
    });
  }

  // Create initial planet (central planet)
  const initialPlanet = planets.add({
    pos: new Vector(width / 2, height / 2),
    radius: 25,
    orbitRadius: 45,
    color: [100, 150, 255], // Different color for central planet
    velocity: new Vector(0, 0), // Start with no movement
    isCentral: true, // Mark as central planet
  });

  // Set player to orbit the initial planet
  player.pos = new Vector(width / 2, height / 2 - 30);
  player.orbitPlanet = initialPlanet;
  player.orbitRadius = 45;
  player.orbitAngle = 0;
  player.isOrbiting = true;
  player.trail = [];

  // Start with only the central planet
  // Moving planets will spawn naturally during gameplay
}

function addRandomPlanet() {
  // Determine spawn position
  let pos;
  let velocity;

  // Decide from which edge to spawn the planet
  const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left

  switch (edge) {
    case 0: // Top
      pos = new Vector(randomRange(50, width - 50), -30);
      velocity = new Vector(
        randomRange(-0.5, 0.5),
        randomRange(0.5, 1.0) * difficulty
      );
      break;
    case 1: // Right
      pos = new Vector(width + 30, randomRange(50, height - 50));
      velocity = new Vector(
        randomRange(-1.0, -0.5) * difficulty,
        randomRange(-0.5, 0.5)
      );
      break;
    case 2: // Bottom
      pos = new Vector(randomRange(50, width - 50), height + 30);
      velocity = new Vector(
        randomRange(-0.5, 0.5),
        randomRange(-1.0, -0.5) * difficulty
      );
      break;
    case 3: // Left
      pos = new Vector(-30, randomRange(50, height - 50));
      velocity = new Vector(
        randomRange(0.5, 1.0) * difficulty,
        randomRange(-0.5, 0.5)
      );
      break;
  }

  // Ensure velocity magnitude is reasonable (not too fast or too slow)
  if (velocity.mag() < 0.5) {
    velocity.setMag(0.5);
  } else if (velocity.mag() > 2.0 * difficulty) {
    velocity.setMag(2.0 * difficulty);
  }

  // Random planet size (smaller = higher points but harder to land)
  const planetRadius = randomRange(20, 30);

  // Determine orbit radius (larger for larger planets)
  const orbitRadius = planetRadius * 2 + 5;

  // Play planet appear sound
  GameAudio.playSe("planetAppear", 0.8);

  // Add the planet
  planets.add({
    pos: pos,
    radius: planetRadius,
    orbitRadius: orbitRadius,
    color: colors.planet,
    velocity: velocity,
    isCentral: false,
  });
}

function createLaunchParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(0.5, 2);

    particles.add({
      pos: new Vector(x, y),
      vel: new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed),
      radius: randomRange(1, 3),
      color: colors.player,
      alpha: 255,
      life: randomRange(10, 30),
    });
  }
}

function createLandingParticles(x, y, planetColor) {
  for (let i = 0; i < 15; i++) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(0.5, 3);

    particles.add({
      pos: new Vector(x, y),
      vel: new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed),
      radius: randomRange(1, 4),
      color: planetColor,
      alpha: 255,
      life: randomRange(15, 40),
    });
  }
}

function createScoreParticle(x, y, text) {
  particles.add({
    pos: new Vector(x, y),
    vel: new Vector(0, -1),
    text: text,
    alpha: 255,
    life: 60,
  });
}

function drawTrajectory(x, y, vx, vy) {
  // Draw a dotted line showing predicted trajectory
  stroke(
    colors.trajectory[0],
    colors.trajectory[1],
    colors.trajectory[2],
    colors.trajectory[3]
  );
  strokeWeight(1);
  noFill();

  let prevX = x;
  let prevY = y;
  let currX = x;
  let currY = y;
  let currVx = vx;
  let currVy = vy;

  beginShape();
  for (let i = 0; i < 60; i += 2) {
    // Update position
    currX += currVx;
    currY += currVy;

    // Draw point
    if (i % 6 === 0) {
      vertex(currX, currY);
    }

    // Check if point is off screen
    if (currX < 0 || currX > width || currY < 0 || currY > height) {
      break;
    }
  }
  endShape();
}

// ----- p5.js Core Functions -----
function setup() {
  // Create canvas inside gameContainer
  let canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("gameContainer");

  // Initialize audio system
  GameAudio.init(
    {
      bgm: "./audios/bgm.mp3",
      launch: "./audios/launch.mp3",
      land: "./audios/land.mp3",
      fuelLow: "./audios/fuelLow.mp3",
      scoreMultiplier: "./audios/scoreMultiplier.mp3",
      planetAppear: "./audios/planetAppear.mp3",
      gameOver: "./audios/gameOver.mp3",
    },
    { bpm: 120, quantize: 0.25 }
  ).then(() => {
    if (typeof GameRecorder != "undefined" && GameRecorder != null) {
      GameRecorder.init(
        canvas.canvas,
        GameAudio.getAudioContext(),
        GameAudio.getAllGainNodes()
      );
    }
  });

  // Set initial state
  gameOver = true;

  // Draw initial game over screen
  background(colors.background);
  drawGameOver();
}

function draw() {
  // Update input
  button.update();

  if (!gameOver) {
    // Game background
    background(colors.background);

    // Update stars
    stars.processAndFilterItems((star) => {
      // Just draw stars, they're static
      fill(colors.stars[0], colors.stars[1], colors.stars[2], star.alpha);
      noStroke();
      ellipse(star.x, star.y, star.size);
    });

    // Check fuel status
    checkFuelStatus();

    // Handle player input
    if (button.justPressed) {
      // Launch player if orbiting
      player.launch();
    }

    // Update player
    player.update();

    // Process planets
    planets.processAndFilterItems(
      (planet) => {
        // Update planet position based on its velocity
        planet.pos.x += planet.velocity.x;
        planet.pos.y += planet.velocity.y;

        // Draw orbit path if player is orbiting this planet
        if (player.isOrbiting && player.orbitPlanet === planet) {
          noFill();
          stroke(
            colors.orbit[0],
            colors.orbit[1],
            colors.orbit[2],
            colors.orbit[3]
          );
          strokeWeight(1);
          ellipse(planet.pos.x, planet.pos.y, planet.orbitRadius * 2);
        }

        // Draw planet
        fill(planet.color[0], planet.color[1], planet.color[2]);
        noStroke();
        ellipse(planet.pos.x, planet.pos.y, planet.radius * 2);

        // Check collision with player if not orbiting
        if (!player.isOrbiting) {
          const distance = Vector.dist(player.pos, planet.pos);

          // Check if player is close enough to orbit
          if (distance < planet.radius + player.radius) {
            // Player has landed on a planet!
            player.isOrbiting = true;
            player.orbitPlanet = planet;
            player.orbitRadius = planet.orbitRadius;

            // Initialize orbit angle based on approach direction
            const dx = player.pos.x - planet.pos.x;
            const dy = player.pos.y - planet.pos.y;
            player.orbitAngle = Math.atan2(dy, dx);

            // Play landing sound
            GameAudio.playSe("land", 1.0);

            // Add landing particles
            createLandingParticles(player.pos.x, player.pos.y, planet.color);

            // Add score based on planet properties
            let pointsGained = 10;

            // Smaller planets are worth more
            pointsGained += Math.floor(20 / planet.radius);

            // Handle multiplier based on planet type
            if (planet.isCentral) {
              // Reset multiplier when landing on central planet
              scoreMultiplier = 1;
              comboCount = 0;
            } else {
              // Increase multiplier for consecutive landings on moving planets
              comboCount++;
              scoreMultiplier = Math.min(5, comboCount); // Cap at 5x
            }

            // Apply score
            addScore(pointsGained);

            // Show score particle with multiplier
            if (scoreMultiplier > 1) {
              createScoreParticle(
                player.pos.x,
                player.pos.y - 15,
                "+" + pointsGained + " x" + scoreMultiplier
              );
            } else {
              createScoreParticle(
                player.pos.x,
                player.pos.y - 15,
                "+" + pointsGained
              );
            }

            // Prevent immediate re-launch
            landingCooldown = 10;
          }
        }
      },
      (planet) => {
        // Remove planets that have moved off screen (with margin)
        const margin = 50;
        if (
          planet.pos.x < -margin ||
          planet.pos.x > width + margin ||
          planet.pos.y < -margin ||
          planet.pos.y > height + margin
        ) {
          // If player was orbiting this planet, game over
          if (player.isOrbiting && player.orbitPlanet === planet) {
            endGame();
            return true;
          }

          return true;
        }
        return false;
      }
    );

    // Process particles
    particles.processAndFilterItems(
      (particle) => {
        // Update particle position
        particle.pos.x += particle.vel.x;
        particle.pos.y += particle.vel.y;

        // Fade out
        particle.alpha -= 255 / particle.life;

        if (particle.text) {
          // Draw text particle
          fill(255, 255, 255, particle.alpha);
          textAlign(CENTER);
          textSize(12);
          text(particle.text, particle.pos.x, particle.pos.y);
        } else {
          // Draw regular particle
          fill(
            particle.color[0],
            particle.color[1],
            particle.color[2],
            particle.alpha
          );
          noStroke();
          ellipse(particle.pos.x, particle.pos.y, particle.radius * 2);
        }

        // Decrease life
        particle.life--;
      },
      (particle) => particle.life <= 0
    );

    // Draw player last (on top)
    player.draw();

    // Draw fuel bar
    drawFuelBar();

    // Draw score
    fill(255);
    textAlign(LEFT);
    textSize(16);
    text("Score: " + score, 10, 20);

    // Draw multiplier if > 1
    if (scoreMultiplier > 1) {
      textAlign(LEFT);
      textSize(14);
      fill(255, 200, 0); // Gold color for multiplier
      text("Multiplier: x" + scoreMultiplier, 10, 45);
    }

    // Add a flag to track fuel warning state
    if (!window.fuelWarningFlag) {
      window.fuelWarningFlag = false;
      window.fuelRecoveredFlag = true;
    }

    // Warning text when on central planet with low fuel
    if (player.isOrbiting && player.orbitPlanet.isCentral && fuelAmount < 30) {
      textAlign(CENTER);
      textSize(14);
      fill(255, 0, 0, 128 + Math.sin(frameCount * 0.2) * 127);
      text("Low Fuel! Jump to another planet!", width / 2, 30);

      // Play low fuel warning sound once when fuel becomes low (under 30%)
      if (
        fuelAmount < 30 &&
        !window.fuelWarningFlag &&
        window.fuelRecoveredFlag
      ) {
        GameAudio.playSe("fuelLow", 1.0);
        window.fuelWarningFlag = true;
        window.fuelRecoveredFlag = false;
      }
    } else if (fuelAmount >= 30) {
      // Reset warning flag when fuel recovers above 30%
      window.fuelWarningFlag = false;
      window.fuelRecoveredFlag = true;
    }

    // Show moving planet multiplier tip when on central planet
    if (
      player.isOrbiting &&
      player.orbitPlanet.isCentral &&
      gameTime < 300 &&
      planets.items.length > 1
    ) {
      textAlign(CENTER);
      textSize(14);
      fill(255, 200, 0, 200);
      text(
        "Tip: Jump to moving planets for score multipliers",
        width / 2,
        height - 40
      );
    }

    // Create new planets as needed
    // Spawn first moving planet after a short delay
    if (gameTime === 120) {
      addRandomPlanet();
    }

    // Then continue spawning planets at regular intervals
    if (planets.items.length < 5 && frameCount % 60 === 0 && gameTime > 120) {
      addRandomPlanet();
    }

    // Increase game time and difficulty
    gameTime++;
    if (gameTime % 600 === 0) {
      difficulty += 0.1;
    }
  } else {
    // Only redraw the game over screen if it's the first frame after game over
    if (gameOverCooldown === 30) {
      drawGameOver();
    }

    // Check for restart
    gameOverCooldown--;
    if (gameOverCooldown <= 0 && button.justPressed) {
      resetGame();
    }
  }
}

function drawFuelBar() {
  // Draw fuel bar in bottom left
  const barWidth = 100;
  const barHeight = 10;
  const x = 10;
  const y = height - barHeight - 10;

  // Bar background
  fill(50);
  noStroke();
  rect(x, y, barWidth, barHeight);

  // Fuel color changes as it gets lower
  let fuelColor;
  if (fuelAmount > 60) {
    fuelColor = [0, 200, 150]; // Normal color when fuel is high
  } else if (fuelAmount > 30) {
    fuelColor = [230, 180, 0]; // Yellow/orange when medium
  } else {
    fuelColor = [230, 60, 60]; // Red when low
  }

  // Fuel amount
  fill(
    fuelColor[0],
    fuelColor[1],
    fuelColor[2],
    fuelAmount > 20 ? 255 : 128 + Math.sin(frameCount * 0.2) * 127
  );
  rect(x, y, barWidth * (fuelAmount / 100), barHeight);

  // Label
  fill(255);
  textAlign(LEFT);
  textSize(10);
  text("FUEL", x, y - 2);
}

function drawGameOver() {
  // Semi-transparent overlay
  background(colors.background[0], colors.background[1], colors.background[2]);
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER);
  textSize(28);

  if (gameStarted) {
    // Game over text
    text("GAME OVER", width / 2, height / 2 - 30);

    // If game over was due to fuel depletion
    if (fuelAmount <= 0) {
      textSize(20);
      text("Out of Fuel!", width / 2, height / 2 + 10);
      textSize(16);
      text("Score: " + score, width / 2, height / 2 + 40);
    } else {
      textSize(20);
      text("Score: " + score, width / 2, height / 2 + 10);
    }
  } else {
    // First time instructions
    text("ORBIT JUMPER", width / 2, height / 2 - 80);
    textSize(16);
    text("Jump from planet to planet", width / 2, height / 2 - 40);
    text(
      "Center planet drains fuel - don't stay too long!",
      width / 2,
      height / 2 - 10
    );
    text("Chain jumps for higher multipliers", width / 2, height / 2 + 20);
  }

  // Show restart prompt after cooldown
  if (gameOverCooldown <= 0 || !gameStarted) {
    fill(colors.player);
    textSize(18);
    text("Click or tap to start", width / 2, height / 2 + 110);
  }
}

// ----- Input Handling -----
function mousePressed() {
  GameAudio.resumeAudio(); // Resume audio context if suspended
  button.pressed = true;
  return false; // Prevent default
}

function touchStarted() {
  GameAudio.resumeAudio(); // Resume audio context if suspended
  button.pressed = true;
  return false; // Prevent default
}

const gameControlKeys = [32, 87, 65, 83, 68, 37, 38, 39, 40]; // Space, W, A, S, D, Arrow keys

function keyPressed() {
  GameAudio.resumeAudio(); // Resume audio context if suspended
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
