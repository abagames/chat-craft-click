const GAME_WIDTH = 400;
const GAME_HEIGHT = 500;
const INGREDIENT_TYPES = [
  { name: "bottomBun", color: "#F5DEB3", height: 10 },
  { name: "patty", color: "#8B4513", height: 15 },
  { name: "cheese", color: "#FFD700", height: 5 },
  { name: "lettuce", color: "#90EE90", height: 8 },
  { name: "tomato", color: "#FF6347", height: 7 },
  { name: "onion", color: "#DDA0DD", height: 5 },
  { name: "topBun", color: "#F5DEB3", height: 12 },
];

let score = 0,
  highScore = 0,
  lastScore = 0,
  gameTime = 0,
  difficulty = 1;
let gameOver = true,
  gameStarted = false,
  gameOverCooldown = 0;
let combo = 0,
  perfectDrops = 0,
  recipeBonus = 0,
  totalRecipeBonus = 0;
let recipesCompleted = 0;
let plate,
  ingredients = [],
  currentIngredient,
  nextIngredient;
let wind = {
  strength: 0,
  direction: 1,
  fixed: true, // Flag to indicate wind doesn't change until ingredient lands
  setRandom(difficultyLevel) {
    // Random wind direction (positive or negative)
    this.direction = Math.random() > 0.5 ? 1 : -1;
    // Random wind strength based on difficulty
    this.strength =
      (Math.random() * 0.8 + 0.2) * difficultyLevel * 0.4 * this.direction;
  },
  update() {
    // Wind doesn't change when fixed is true
    if (!this.fixed) {
      this.strength = sin(frameCount * 0.02) * difficulty * 0.4;
    }
  },
};
let scorePopups = [],
  particles = [];
let burgerTransitionInProgress = false;

// Recipe system
let recipeSystem = {
  currentRecipe: [],
  targetSequence: [],
  recipeCompleted: false,
  validSequences: [
    ["bottomBun", "patty", "cheese", "topBun"],
    ["bottomBun", "patty", "lettuce", "tomato", "topBun"],
    ["bottomBun", "patty", "cheese", "lettuce", "tomato", "onion", "topBun"],
  ],
};

// One-Button Input Handler
const button = {
  pressed: false,
  justPressed: false,
  justReleased: false,
  prevState: false,
  update() {
    this.justPressed = this.pressed && !this.prevState;
    this.justReleased = !this.pressed && this.prevState;
    this.prevState = this.pressed;
  },
};

function initGame() {
  // Create plate
  plate = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 40, width: 100, height: 20 };

  // Reset game state
  ingredients = [];
  scorePopups = [];
  particles = [];
  combo = 0;
  perfectDrops = 0;
  recipeBonus = 0;
  totalRecipeBonus = 0;
  recipesCompleted = 0;

  // Initialize wind
  wind = {
    strength: 0,
    direction: 1,
    fixed: true,
    setRandom(difficultyLevel) {
      // Random wind direction (positive or negative)
      this.direction = Math.random() > 0.5 ? 1 : -1;
      // Random wind strength based on difficulty - increased multiplier for more noticeable effect
      this.strength =
        (Math.random() * 0.8 + 0.4) * difficultyLevel * 1.0 * this.direction;
    },
    update() {
      // Wind doesn't change when fixed is true
      if (!this.fixed) {
        this.strength = sin(frameCount * 0.02) * difficulty * 0.4;
      }
    },
  };

  // Reset transition flag
  burgerTransitionInProgress = false;

  // Initialize recipe system
  recipeSystem.currentRecipe = [];
  recipeSystem.recipeCompleted = false;
  recipeSystem.targetSequence = random(recipeSystem.validSequences);

  // Create the first ingredient (always bottom bun)
  createIngredient("bottomBun");
}

function createIngredient(type) {
  // Set a new random wind each time a new ingredient is created
  wind.setRandom(difficulty);

  if (!type) {
    if (recipeSystem.recipeCompleted) {
      const randomIndex = floor(random(INGREDIENT_TYPES.length));
      type = INGREDIENT_TYPES[randomIndex].name;
    } else {
      const recipePosition = recipeSystem.currentRecipe.length;
      if (recipePosition < recipeSystem.targetSequence.length) {
        type = recipeSystem.targetSequence[recipePosition];
      } else {
        const randomIndex = floor(random(INGREDIENT_TYPES.length));
        type = INGREDIENT_TYPES[randomIndex].name;
      }
    }
  }

  const typeDetails = INGREDIENT_TYPES.find((i) => i.name === type);
  const width = random(70, 90);

  currentIngredient = {
    x: GAME_WIDTH / 2,
    y: 50,
    width: width,
    height: typeDetails.height,
    type: type,
    color: typeDetails.color,
    vx: random(1, 2) * (random() > 0.5 ? 1 : -1),
    vy: 0,
    falling: false,
    rotation: 0,
    wobble: 0,
  };

  const nextType = recipeSystem.recipeCompleted
    ? INGREDIENT_TYPES[floor(random(INGREDIENT_TYPES.length))].name
    : recipeSystem.targetSequence[
        Math.min(
          recipeSystem.currentRecipe.length + 1,
          recipeSystem.targetSequence.length - 1
        )
      ];

  const nextTypeDetails = INGREDIENT_TYPES.find((i) => i.name === nextType);
  nextIngredient = {
    type: nextType,
    color: nextTypeDetails.color,
    width: random(70, 90),
    height: nextTypeDetails.height,
  };
}

function addIngredientToStack(ingredient) {
  ingredients.push({
    x: ingredient.x,
    y: ingredient.y,
    width: ingredient.width,
    height: ingredient.height,
    type: ingredient.type,
    color: ingredient.color,
    rotation: ingredient.rotation,
    wobble: ingredient.wobble,
  });

  if (!recipeSystem.recipeCompleted) {
    recipeSystem.currentRecipe.push(ingredient.type);

    if (
      recipeSystem.currentRecipe.length === recipeSystem.targetSequence.length
    ) {
      let correctIngredients = 0;
      for (let i = 0; i < recipeSystem.targetSequence.length; i++) {
        if (recipeSystem.currentRecipe[i] === recipeSystem.targetSequence[i]) {
          correctIngredients++;
        }
      }

      if (correctIngredients === recipeSystem.targetSequence.length) {
        recipeSystem.recipeCompleted = true;
        recipeBonus = recipeSystem.targetSequence.length * 50;
        totalRecipeBonus += recipeBonus;
        recipesCompleted++;

        addScorePopup(
          ingredient.x,
          ingredient.y - 30,
          `RECIPE! +${recipeBonus}`,
          color(255, 215, 0)
        );

        for (let i = 0; i < 30; i++) {
          addParticle(ingredient.x, ingredient.y, color(255, 215, 0));
        }

        // Force next ingredient to be a top bun to complete the burger
        if (ingredient.type !== "topBun") {
          createIngredient("topBun");
        }
      }
    }
  }
}

function addScorePopup(x, y, text, color) {
  scorePopups.push({ x, y, text, color, opacity: 255, life: 60 });
}

function addParticle(x, y, particleColor) {
  particles.push({
    x,
    y,
    vx: random(-2, 2),
    vy: random(-5, -1),
    size: random(3, 8),
    color: particleColor,
    life: random(30, 60),
  });
}

function calculateDropScore(positionDifference) {
  // Base score based on stack height
  const baseScore = ingredients.length * 10;

  // Position accuracy bonus
  let accuracyMultiplier = 1.0;
  if (positionDifference < 5) {
    accuracyMultiplier = 2.0; // Perfect drop
    perfectDrops++;
    combo++;
  } else if (positionDifference < 15) {
    accuracyMultiplier = 1.5; // Good drop
    combo++;
  } else {
    combo = 0; // Reset combo
  }

  // Combo bonus
  let comboMultiplier = 1.0;
  if (combo >= 3) {
    comboMultiplier = 1.0 + combo * 0.1;
  }

  const totalScore = Math.floor(
    baseScore * accuracyMultiplier * comboMultiplier
  );

  return {
    score: totalScore,
    isPerfect: positionDifference < 5,
    comboMultiplier: comboMultiplier,
  };
}

function updateGame() {
  // Update wind effect
  wind.update();

  // Don't update ingredient movement if we're in transition to a new burger
  const skipIngredientUpdate = burgerTransitionInProgress && !currentIngredient;

  // Only update the current ingredient if not in transition
  if (!skipIngredientUpdate && currentIngredient) {
    if (!currentIngredient.falling) {
      // Move horizontally
      currentIngredient.x += currentIngredient.vx;

      // Bounce off edges
      if (
        currentIngredient.x < currentIngredient.width / 2 ||
        currentIngredient.x > GAME_WIDTH - currentIngredient.width / 2
      ) {
        currentIngredient.vx *= -1;
      }

      // Add slight wobble effect
      currentIngredient.wobble = sin(frameCount * 0.1) * 2;

      // Button press - drop the ingredient
      if (button.justPressed) {
        currentIngredient.falling = true;
        currentIngredient.vy = 1; // Initial velocity
        GameAudio.playSe("itemFalling", 0.7);
      }
    } else {
      // Apply physics
      currentIngredient.vy += 0.2; // Gravity
      currentIngredient.y += currentIngredient.vy;
      currentIngredient.x += wind.strength * 1.5; // Wind effect - increased multiplier

      // Check for landing
      let landed = false;
      let landingY = 0;
      let landingObject = null;
      let positionDifference = 100;

      // Check landing on plate (if no ingredients)
      if (ingredients.length === 0) {
        if (
          currentIngredient.y + currentIngredient.height / 2 >=
          plate.y - plate.height / 2
        ) {
          // Check if within plate horizontally
          if (
            currentIngredient.x + currentIngredient.width / 2 >
              plate.x - plate.width / 2 &&
            currentIngredient.x - currentIngredient.width / 2 <
              plate.x + plate.width / 2
          ) {
            landed = true;
            landingY =
              plate.y - plate.height / 2 - currentIngredient.height / 2;
            landingObject = plate;
            positionDifference = abs(currentIngredient.x - plate.x);
          }
        }
      } else {
        // Check landing on top ingredient
        const topIngredient = ingredients[ingredients.length - 1];
        if (
          currentIngredient.y + currentIngredient.height / 2 >=
          topIngredient.y - topIngredient.height / 2
        ) {
          // Check if within top ingredient horizontally
          if (
            currentIngredient.x + currentIngredient.width / 2 >
              topIngredient.x - topIngredient.width / 2 &&
            currentIngredient.x - currentIngredient.width / 2 <
              topIngredient.x + topIngredient.width / 2
          ) {
            landed = true;
            landingY =
              topIngredient.y -
              topIngredient.height -
              currentIngredient.height / 2;
            landingObject = topIngredient;
            positionDifference = abs(currentIngredient.x - topIngredient.x);
          }
        }
      }

      // Handle successful landing
      if (landed) {
        // Position the ingredient
        currentIngredient.y = landingY;

        // Add slight tilt based on position difference
        currentIngredient.rotation =
          map(positionDifference, 0, landingObject.width / 2, 0, 0.1) *
          (currentIngredient.x < landingObject.x ? -1 : 1);

        // Calculate score
        const scoreResult = calculateDropScore(positionDifference);
        addScore(scoreResult.score);

        if (scoreResult.isPerfect) {
          GameAudio.playSe("perfectDrop", 1.0);
        } else {
          GameAudio.playSe("drop", 0.8);
        }

        // Add to recipe and stack
        addIngredientToStack(currentIngredient);

        // Display score popup based on landing quality
        let popupColor = color(255);
        let popupText = `+${scoreResult.score}`;

        if (scoreResult.isPerfect) {
          popupColor = color(255, 215, 0);
          popupText = `PERFECT! +${scoreResult.score}`;
          for (let i = 0; i < 15; i++) {
            addParticle(
              currentIngredient.x,
              currentIngredient.y,
              color(255, 215, 0)
            );
          }
        } else if (scoreResult.comboMultiplier > 1.0) {
          popupColor = color(100, 255, 100);
          popupText = `COMBO x${combo}! +${scoreResult.score}`;
        }

        addScorePopup(
          currentIngredient.x,
          currentIngredient.y - 20,
          popupText,
          popupColor
        );

        // Check if we just placed the top bun on a completed recipe
        if (
          currentIngredient.type === "topBun" &&
          recipeSystem.recipeCompleted &&
          !burgerTransitionInProgress
        ) {
          // Set flag to prevent multiple transitions
          burgerTransitionInProgress = true;

          GameAudio.playSe("burgerComplete", 1.5);

          // Celebrate the completed burger
          addScorePopup(
            currentIngredient.x,
            currentIngredient.y - 40,
            "BURGER COMPLETE!",
            color(255, 215, 0)
          );

          for (let i = 0; i < 40; i++) {
            addParticle(
              currentIngredient.x,
              currentIngredient.y,
              color(255, 165, 0)
            );
          }

          // Temporarily store the coordinates for the next message
          const completeX = currentIngredient.x;
          const completeY = currentIngredient.y;

          // Prevent creating more ingredients until we reset
          currentIngredient = null;

          // After a short delay, remove this burger and start a new one
          setTimeout(() => {
            // Give a completion bonus
            const burgerCompletionBonus = 100;
            score += burgerCompletionBonus;

            // Clear current ingredients (burger is served!)
            ingredients = [];

            // Reset recipe for the next burger
            recipeSystem.currentRecipe = [];
            recipeSystem.recipeCompleted = false;
            recipeSystem.targetSequence = random(recipeSystem.validSequences);

            // Show a single message
            addScorePopup(
              GAME_WIDTH / 2,
              GAME_HEIGHT / 2,
              "NEW BURGER! +" + burgerCompletionBonus,
              color(255, 215, 0)
            );

            // Create a new bottom bun after showing the message
            setTimeout(() => {
              createIngredient("bottomBun");
              // Reset transition flag
              burgerTransitionInProgress = false;
            }, 500);
          }, 1500);
        } else if (!burgerTransitionInProgress) {
          // Only create next ingredient if not in transition
          createIngredient();
        }

        // Increase difficulty as stack grows
        if (ingredients.length % 5 === 0) {
          difficulty += 0.2;
          // Only modify vx if currentIngredient exists
          if (currentIngredient && !burgerTransitionInProgress) {
            currentIngredient.vx *= 1.1;
          }
        }
      }

      // Check for off-screen
      if (currentIngredient && currentIngredient.y > GAME_HEIGHT) {
        endGame();
      }
    }
  }

  // Always update these animations, even during transitions

  // Update stack stability
  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];

    // Add slight wobble for visual effect
    ingredient.wobble = sin(frameCount * 0.05 + i * 0.2) * 1.5;

    // Check stack stability (simplified)
    if (i > 0) {
      const ingredientBelow = ingredients[i - 1];
      const positionDifference = abs(ingredient.x - ingredientBelow.x);

      // If an ingredient is too far off from the one below, game over
      if (positionDifference > ingredientBelow.width / 2) {
        for (let j = 0; j < 20; j++) {
          addParticle(ingredient.x, ingredient.y, color(255));
        }
        endGame();
        break;
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravity
    particle.life--;

    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Update score popups
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const popup = scorePopups[i];
    popup.y -= 1;
    popup.opacity -= 255 / popup.life;
    popup.life--;

    if (popup.life <= 0) {
      scorePopups.splice(i, 1);
    }
  }

  // Update game time
  gameTime++;
}

function addScore(points) {
  score += points;
}

function endGame() {
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.stop();
  }
  GameAudio.stopBgm();
  GameAudio.playSe("gameOver", 1.0);

  gameOver = true;
  gameStarted = true;
  gameOverCooldown = 30;
  lastScore = score;

  // Add recipe bonus
  if (totalRecipeBonus > 0) {
    score += totalRecipeBonus;
  }

  // Add perfect drop bonus
  const perfectBonus = perfectDrops * 25;
  if (perfectBonus > 0) {
    score += perfectBonus;
  }

  if (score > highScore) highScore = score;
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
}

function resetGame() {
  score = 0;
  gameTime = 0;
  difficulty = 1;
  gameOver = false;
  initGame();

  // Start recording if GameRecorder is available
  if (typeof GameRecorder != "undefined" && GameRecorder != null) {
    GameRecorder.start();
  }
  GameAudio.playBgm();

  document.getElementById("highScore").textContent = highScore;
  document.getElementById("lastScore").textContent = lastScore;
}

function setup() {
  let canvas = createCanvas(GAME_WIDTH, GAME_HEIGHT);
  canvas.parent("gameContainer");

  GameAudio.init(
    {
      bgm: "./audios/bgm.mp3",
      drop: "./audios/drop.mp3",
      perfectDrop: "./audios/perfectDrop.mp3",
      burgerComplete: "./audios/burgerComplete.mp3",
      gameOver: "./audios/gameOver.mp3",
      itemFalling: "./audios/itemFalling.mp3",
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

  gameOver = true;
  initGame();
}

function draw() {
  background(100, 180, 255);

  // Update button state
  button.update();

  if (!gameOver) {
    updateGame();

    // Draw plate
    fill(240);
    stroke(200);
    strokeWeight(2);
    rectMode(CENTER);
    rect(plate.x, plate.y, plate.width, plate.height, 5);

    // Draw stacked ingredients
    for (const ingredient of ingredients) {
      drawBurgerIngredient(ingredient);
    }

    // Draw current ingredient
    if (currentIngredient) {
      drawBurgerIngredient(currentIngredient);
    }

    // Draw particles
    for (const particle of particles) {
      fill(
        particle.color.levels[0],
        particle.color.levels[1],
        particle.color.levels[2],
        map(particle.life, 0, 60, 0, 255)
      );
      noStroke();
      ellipse(particle.x, particle.y, particle.size);
    }

    // Draw score popups
    for (const popup of scorePopups) {
      textAlign(CENTER);
      textSize(16);
      fill(
        popup.color.levels[0],
        popup.color.levels[1],
        popup.color.levels[2],
        popup.opacity
      );
      stroke(0, popup.opacity * 0.7);
      strokeWeight(2);
      text(popup.text, popup.x, popup.y);
    }

    // Draw UI
    fill(255);
    textAlign(LEFT);
    textSize(24);
    text(`Score: ${score}`, 10, 30);

    // Draw wind indicator
    const windStrength = Math.abs(wind.strength);
    const windDirection = wind.strength > 0 ? 1 : -1; // 1 for right, -1 for left
    fill(255);
    textSize(14);
    text("Wind:", 10, 120); // Back to original x-position

    // Draw wind strength as an arrow
    const arrowBaseX = 90; // Keep this position
    const arrowBaseY = 120;
    const maxArrowLength = 50;
    const arrowLength = Math.min(maxArrowLength, windStrength * 20);
    const windColor = color(173, 216, 230); // Lighter blue color

    // Arrow line
    stroke(windColor);
    strokeWeight(3);
    if (windDirection > 0) {
      // Right arrow
      line(arrowBaseX, arrowBaseY, arrowBaseX + arrowLength, arrowBaseY);
      line(
        arrowBaseX + arrowLength,
        arrowBaseY,
        arrowBaseX + arrowLength - 8,
        arrowBaseY - 5
      );
      line(
        arrowBaseX + arrowLength,
        arrowBaseY,
        arrowBaseX + arrowLength - 8,
        arrowBaseY + 5
      );
    } else {
      // Left arrow
      line(arrowBaseX, arrowBaseY, arrowBaseX - arrowLength, arrowBaseY);
      line(
        arrowBaseX - arrowLength,
        arrowBaseY,
        arrowBaseX - arrowLength + 8,
        arrowBaseY - 5
      );
      line(
        arrowBaseX - arrowLength,
        arrowBaseY,
        arrowBaseX - arrowLength + 8,
        arrowBaseY + 5
      );
    }
    noStroke();

    // Draw next ingredient preview
    if (nextIngredient) {
      fill(255);
      textSize(14);
      text("Next:", 10, 60);

      push();
      translate(50, 70);
      fill(nextIngredient.color);
      stroke(0);
      strokeWeight(1);
      rectMode(CENTER);
      rect(0, 0, nextIngredient.width / 3, nextIngredient.height, 3);
      pop();
    }

    // Draw recipe status
    textAlign(RIGHT);
    textSize(14);
    fill(255);
    text("Recipe:", width - 20, 20);

    // Draw recipe slots
    const startX = width - 30;
    const slotSize = 15;
    const targetSequence = recipeSystem.targetSequence;

    for (let i = 0; i < targetSequence.length; i++) {
      const x = startX - i * (slotSize + 5);
      const y = 40;

      const targetType = targetSequence[targetSequence.length - 1 - i];
      const currentType =
        recipeSystem.currentRecipe.length > targetSequence.length - 1 - i
          ? recipeSystem.currentRecipe[targetSequence.length - 1 - i]
          : null;

      stroke(100);
      strokeWeight(1);
      fill(50);
      rect(x, y, slotSize, slotSize);

      if (currentType) {
        const typeDetails = INGREDIENT_TYPES.find(
          (t) => t.name === currentType
        );
        fill(
          currentType === targetType ? typeDetails.color : color(100, 100, 100)
        );
        rect(x, y, slotSize - 4, slotSize - 4);
      }
    }

    if (recipeSystem.recipeCompleted) {
      fill(255, 215, 0);
      text("COMPLETE!", width - 20, 70);
    }
  } else {
    // Draw stacked ingredients
    for (const ingredient of ingredients) {
      drawBurgerIngredient(ingredient);
    }

    // Draw plate
    fill(240);
    stroke(200);
    strokeWeight(2);
    rectMode(CENTER);
    rect(plate.x, plate.y, plate.width, plate.height, 5);

    // Game over overlay
    fill(0, 0, 0, 150);
    rectMode(CORNER);
    rect(0, 0, width, height);

    textAlign(CENTER);
    fill(255);

    if (gameStarted) {
      textSize(32);
      text("Game Over", width / 2, height / 2 - 60);

      textSize(24);
      text("Score: " + score, width / 2, height / 2 - 20);

      if (totalRecipeBonus > 0) {
        textSize(18);
        fill(255, 215, 0);
        text("Recipe Bonus: +" + totalRecipeBonus, width / 2, height / 2 + 10);

        textSize(16);
        text(
          "Recipes Completed: " + recipesCompleted,
          width / 2,
          height / 2 + 35
        );
      }

      if (perfectDrops > 0) {
        textSize(18);
        fill(100, 255, 100);
        const yPosition =
          totalRecipeBonus > 0 ? height / 2 + 60 : height / 2 + 40;
        text(
          "Perfect Drops: " + perfectDrops + " (+" + perfectDrops * 25 + ")",
          width / 2,
          yPosition
        );
      }
    } else {
      textSize(24);
      text("Welcome to Burger Stack!", width / 2, height / 2 - 40);

      textSize(18);
      text("Stack ingredients to build your burger.", width / 2, height / 2);
      text("Complete recipes for bonus points!", width / 2, height / 2 + 30);
    }

    textSize(20);
    fill(255);
    text(
      "Click or tap to " + (gameStarted ? "restart" : "start"),
      width / 2,
      height / 2 + 80
    );

    gameOverCooldown--;
    if (gameOverCooldown <= 0 && button.justPressed) {
      resetGame();
    }
  }
}

function drawBurgerIngredient(ingredient) {
  push();
  translate(ingredient.x, ingredient.y);
  rotate(ingredient.rotation + ingredient.wobble * 0.02);

  fill(ingredient.color);
  stroke(0);
  strokeWeight(2);

  if (ingredient.type === "bottomBun" || ingredient.type === "topBun") {
    // Bun with a curved top
    rectMode(CENTER);
    rect(0, 0, ingredient.width, ingredient.height, 10, 10, 0, 0);
  } else if (ingredient.type === "patty") {
    // Meat patty
    rectMode(CENTER);
    rect(0, 0, ingredient.width, ingredient.height, 5);
    // Add texture
    stroke(100, 50, 0, 150);
    strokeWeight(1);
    for (let i = -ingredient.width / 2 + 5; i < ingredient.width / 2; i += 10) {
      line(i, -ingredient.height / 2 + 2, i + 5, ingredient.height / 2 - 2);
    }
  } else if (ingredient.type === "cheese") {
    // Cheese
    beginShape();
    vertex(-ingredient.width / 2, -ingredient.height / 2);
    vertex(ingredient.width / 2, -ingredient.height / 2);
    vertex(ingredient.width / 2 + 10, ingredient.height / 2);
    vertex(-ingredient.width / 2 - 10, ingredient.height / 2);
    endShape(CLOSE);
  } else if (ingredient.type === "lettuce") {
    // Lettuce
    beginShape();
    for (let i = 0; i < 20; i++) {
      const x = map(
        i,
        0,
        19,
        -ingredient.width / 2 - 5,
        ingredient.width / 2 + 5
      );
      const y =
        i % 2 === 0 ? -ingredient.height / 2 : -ingredient.height / 2 + 4;
      vertex(x, y);
    }
    for (let i = 0; i < 20; i++) {
      const x = map(
        i,
        0,
        19,
        ingredient.width / 2 + 5,
        -ingredient.width / 2 - 5
      );
      const y = i % 2 === 0 ? ingredient.height / 2 : ingredient.height / 2 - 4;
      vertex(x, y);
    }
    endShape(CLOSE);
  } else if (ingredient.type === "tomato") {
    // Tomato
    ellipseMode(CENTER);
    ellipse(0, 0, ingredient.width, ingredient.height);
  } else if (ingredient.type === "onion") {
    // Onion
    rectMode(CENTER);
    rect(0, 0, ingredient.width, ingredient.height, 5);
    stroke(200, 150, 200);
    noFill();
    for (let i = 0; i < 3; i++) {
      ellipse(0, 0, ingredient.width * 0.8 - i * 10, ingredient.height * 0.6);
    }
  } else {
    // Default
    rectMode(CENTER);
    rect(0, 0, ingredient.width, ingredient.height, 5);
  }

  pop();
}

function mousePressed() {
  GameAudio.resumeAudio();
  button.pressed = true;
  return false;
}
function touchStarted() {
  GameAudio.resumeAudio();
  button.pressed = true;
  return false;
}
function keyPressed() {
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
function keyReleased() {
  button.pressed = false;
  return false;
}
