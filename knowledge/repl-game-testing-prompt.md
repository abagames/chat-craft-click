# Data-Driven REPL Testing Framework for One-Button Games

## Purpose
Use the REPL to systematically test and compare multiple game concepts using the provided `one-button-game-test-framework.js`, offering empirical evidence to select the most promising idea before full implementation. This framework enables objective evaluation of core mechanisms, game balance, and player experience across different game ideas.

## Framework Overview
The testing framework provides three main classes:
- **GameSimulator**: Simulates the game environment for testing
- **InputPatternGenerator**: Creates patterns that simulate different player styles
- **GameAnalyzer**: Evaluates game quality based on test results

## Testing Process

### 1. Load the Framework
First, load the testing framework in your REPL using the file system API:

```javascript
// Load the game testing framework from uploaded file
const frameworkContent = await window.fs.readFile('one-button-game-test-framework.js', { encoding: 'utf8' });

// Execute the framework code to make classes available
eval(frameworkContent);

// Access the framework classes through the window object
const GameSimulator = window.GameSimulator;
const InputPatternGenerator = window.InputPatternGenerator;
const GameAnalyzer = window.GameAnalyzer;

console.log("Framework loaded successfully");
```

### 2. Implement Game Prototype
For each game concept, create a simplified implementation:

```javascript
// Game concept: [NAME]
// Description: [BRIEF DESCRIPTION]

// Game initialization function
function initGame1(simulator) {
  // Initialize player object
  simulator.objects.player = {
    x: 50,  // x position
    y: 50,  // y position
    width: 4, // width
    height: 4, // height
    vx: 1,  // x velocity
    vy: 0   // y velocity
  };
  
  // Initialize obstacles array
  simulator.objects.obstacles = [];
  
  // Initialize score
  simulator.score = 0;
  
  // Initialize game state
  simulator.objects.gameState = "playing";
}

// Game update function (core game loop)
function updateGame1(simulator) {
  // Get simulator properties
  const { ticks, input, objects } = simulator;
  const { player, obstacles } = objects;
  
  // Handle player input
  if (input.isJustPressed) {
    // One-button action (e.g., direction reversal)
    player.vx *= -1;
  }
  
  // Update player position
  player.x += player.vx;
  player.y += player.vy;
  
  // Create obstacles
  if (ticks % 60 === 0) {
    // Create a new obstacle
    const newObstacle = {
      x: simulator.randomRange(0, 100),  // x position (random)
      y: 0,                              // y position (top of screen)
      width: 6,                          // width
      height: 6,                         // height
      vy: 1                              // y velocity
    };
    
    // Add to obstacles array
    obstacles.push(newObstacle);
  }
  
  // Update and check obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.y += obs.vy;
    
    // Remove obstacles that go off-screen
    if (obs.y > 100) {
      obstacles.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    if (simulator.collideBoxes(
        player.x, player.y, player.width, player.height,
        obs.x, obs.y, obs.width, obs.height)) {
      simulator.end();
      return;
    }
  }
  
  // Screen wrapping for player
  if (player.x < 0) player.x = 100;
  if (player.x > 100) player.x = 0;
}
```

### 3. Run Comprehensive Evaluation
Evaluate each game concept using the analyzer:

```javascript
// Create simulator instance
const simulator = new GameSimulator();

// Evaluate game concept
const gameResults = GameAnalyzer.evaluateGameComprehensive(
  simulator,
  updateGame1,
  initGame1,
  "GameConcept1"
);

// Output key results
console.log(`Game Rating: ${gameResults.evaluation.rating}`);
console.log(`Total Score: ${gameResults.evaluation.totalScore}/12`);
console.log(`Skill Gap: ${gameResults.playerResults.skillGap.toFixed(2)}x`);
```

### 4. Compare Multiple Game Concepts
Test multiple concepts and compare them:

```javascript
// Define game concept prototypes
const gameConcepts = [
  {
    name: "Concept1",
    init: function(simulator) {
      // Initialize player object
      simulator.objects.player = {
        x: 50,
        y: 50,
        width: 4,
        height: 4,
        vx: 1,
        vy: 0
      };
      
      // Initialize obstacles array
      simulator.objects.obstacles = [];
      
      // Initialize game state
      simulator.objects.gameState = "playing";
    },
    update: function(simulator) {
      const { ticks, input, objects } = simulator;
      const { player, obstacles } = objects;
      
      // Handle player input
      if (input.isJustPressed) {
        player.vx *= -1;
      }
      
      // Update player position
      player.x += player.vx;
      player.y += player.vy;
      
      // Create obstacles
      if (ticks % 60 === 0) {
        obstacles.push({
          x: simulator.randomRange(0, 100),
          y: 0,
          width: 6,
          height: 6,
          vy: 1
        });
      }
      
      // Update and check obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += obs.vy;
        
        if (obs.y > 100) {
          obstacles.splice(i, 1);
          continue;
        }
        
        if (simulator.collideBoxes(
            player.x, player.y, player.width, player.height,
            obs.x, obs.y, obs.width, obs.height)) {
          simulator.end();
          return;
        }
      }
      
      // Screen wrapping for player
      if (player.x < 0) player.x = 100;
      if (player.x > 100) player.x = 0;
    }
  },
  
  {
    name: "Concept2",
    init: function(simulator) {
      // Initialize player object - jumping character
      simulator.objects.player = {
        x: 50,
        y: 80,
        width: 4,
        height: 4,
        vy: 0,
        isJumping: false,
        gravity: 0.2
      };
      
      // Initialize platforms array
      simulator.objects.platforms = [{
        x: 20,
        y: 90,
        width: 60,
        height: 4
      }];
      
      simulator.objects.collectibles = [];
    },
    update: function(simulator) {
      const { ticks, input, objects } = simulator;
      const { player, platforms, collectibles } = objects;
      
      // Handle player input - jump
      if (input.isJustPressed && !player.isJumping) {
        player.vy = -3;
        player.isJumping = true;
      }
      
      // Update gravity and position
      player.vy += player.gravity;
      player.y += player.vy;
      
      // Check platform collisions
      player.isJumping = true;
      for (const platform of platforms) {
        if (player.vy > 0 && 
            simulator.collideBoxes(
              player.x, player.y, player.width, player.height,
              platform.x, platform.y, platform.width, platform.height)) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.isJumping = false;
          break;
        }
      }
      
      // Generate collectibles
      if (ticks % 120 === 0) {
        collectibles.push({
          x: simulator.randomRange(10, 90),
          y: simulator.randomRange(20, 70),
          width: 3,
          height: 3
        });
      }
      
      // Check collectible collisions
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const col = collectibles[i];
        if (simulator.collideBoxes(
            player.x, player.y, player.width, player.height,
            col.x, col.y, col.width, col.height)) {
          collectibles.splice(i, 1);
          simulator.addScore(10);
        }
      }
      
      // Game over if player falls off screen
      if (player.y > 100) {
        simulator.end();
      }
    }
  },
  
  {
    name: "Concept3",
    init: function(simulator) {
      // Rotating shooting game
      simulator.objects.cannon = {
        x: 50,
        y: 80,
        angle: 0,
        rotationSpeed: 0.05
      };
      
      simulator.objects.bullets = [];
      simulator.objects.targets = [];
    },
    update: function(simulator) {
      const { ticks, input, objects } = simulator;
      const { cannon, bullets, targets } = objects;
      
      // Rotate the cannon
      cannon.angle += cannon.rotationSpeed;
      
      // Handle input - fire bullet
      if (input.isJustPressed) {
        bullets.push({
          x: cannon.x,
          y: cannon.y,
          vx: Math.cos(cannon.angle) * 2,
          vy: Math.sin(cannon.angle) * 2,
          width: 2,
          height: 2
        });
      }
      
      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove bullets that go off-screen
        if (simulator.isOffScreen(bullet.x, bullet.y, 10)) {
          bullets.splice(i, 1);
        }
      }
      
      // Generate targets
      if (ticks % 90 === 0) {
        targets.push({
          x: simulator.randomRange(10, 90),
          y: simulator.randomRange(10, 40),
          width: 5,
          height: 5
        });
      }
      
      // Check bullet-target collisions
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = targets.length - 1; j >= 0; j--) {
          const target = targets[j];
          
          if (simulator.collideBoxes(
              bullet.x, bullet.y, bullet.width, bullet.height,
              target.x, target.y, target.width, target.height)) {
            bullets.splice(i, 1);
            targets.splice(j, 1);
            simulator.addScore(5);
            break;
          }
        }
      }
      
      // Game over if screen fills with targets
      if (targets.length >= 10) {
        simulator.end();
      }
    }
  }
];

// Test and collect results from all game concepts
const allResults = [];
for (const concept of gameConcepts) {
  console.log(`Testing ${concept.name}...`);
  const result = GameAnalyzer.evaluateGameComprehensive(
    new GameSimulator(),
    concept.update,
    concept.init,
    concept.name
  );
  allResults.push(result);
}

// Compare all game concepts
const comparison = GameAnalyzer.compareGames(allResults);

// Get the best game concept
console.log(`Best game concept: ${comparison.bestGame.gameName}`);
console.log(`Recommendations for improvement:`);
comparison.bestGame.recommendations.forEach(r => console.log(`- ${r}`));
```

## Key Evaluation Metrics

The framework evaluates games based on these key metrics (up to 3 points each, for a maximum total of 12 points)

1. **Game Duration**: How long gameplay sessions last
2. **Skill Gap**: Ratio between expert and beginner scores
3. **Difficulty Progression**: How well the game balances challenge across skill levels
4. **Monotonous Input Resistance**: Game's vulnerability to button mashing

## Revised Overall Rating System
With the combined metrics (maximum of 12 points):
- 10-12 points: OUTSTANDING
- 8-9 points: EXCELLENT
- 6-7 points: GOOD
- 3-5 points: AVERAGE
- <3 points: NEEDS IMPROVEMENT

## Recommendations for Testing

1. Focus on the core mechanic first - create the simplest possible version that demonstrates the gameplay
2. Keep simulation code minimal and avoid implementing visual elements not needed for testing
3. Test each game concept with exactly the same parameters for fair comparison
4. Prioritize games that score well on skill gap and monotonous input resistance
5. Use the analyzer's recommendations to improve the selected concept before full implementation
