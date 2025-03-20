/**
 * One-Button Game Testing Framework
 *
 * A data-driven approach to evaluate one-button game designs
 * through automated input pattern simulation and metrics analysis.
 */

// ===== Game Simulator =====

/**
 * Core game simulator that emulates core game functionality
 * for testing purposes.
 */
class GameSimulator {
  /**
   * Initialize a new game simulator
   */
  constructor() {
    // Basic game variables
    this.ticks = 0;
    this.score = 0;
    this.difficulty = 1;

    // Input simulation
    this.input = {
      isPressed: false,
      isJustPressed: false,
      isJustReleased: false,
    }

    // Game objects container
    this.objects = {};

    // Game state tracking
    this.isGameOver = false;
    this.events = [];
  }

  /**
   * Initialize or reset the game state
   * @param {Function} gameInitFunction Game-specific initialization function
   */
  initGame(gameInitFunction) {
    this.ticks = 0;
    this.score = 0;
    this.difficulty = 1;
    this.isGameOver = false;
    this.events = [];

    // Reset input state
    this.input.isPressed = false;
    this.input.isJustPressed = false;
    this.input.isJustReleased = false;

    // Clear game objects
    this.objects = {};

    // Run game-specific initialization
    if (gameInitFunction) {
      gameInitFunction(this);
    }
  }

  /**
   * Update input state based on button status
   * @param {boolean} isButtonPressed Whether the button is currently pressed
   */
  updateInput(isButtonPressed) {
    const wasPressed = this.input.isPressed;
    this.input.isPressed = isButtonPressed;
    this.input.isJustPressed = isButtonPressed && !wasPressed;
    this.input.isJustReleased = !isButtonPressed && wasPressed;
  }

  /**
   * Add points to the score
   * @param {number} points Points to add
   * @param {number} x X-coordinate of score event (optional)
   * @param {number} y Y-coordinate of score event (optional)
   */
  addScore(points, x, y) {
    this.score += points;
    this.events.push({
      type: "score",
      points,
      position: { x, y },
      tick: this.ticks,
    });
  }

  /**
   * Object pool for game entities
   * @returns {Object} Object pool with add, processAndFilterItems, and clear methods
   */
  createPool() {
    return {
      items: [],
      
      // Add new items to the pool
      add(item) {
        this.items.push(item);
        return item; // For chaining
      },
      
      // Process all items with a callback and remove those where predicate returns true
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
      
      // Clear all items
      clear() {
        this.items = [];
      }
    };
  }

  // ----- Collision Detection Utilities -----

  /**
   * Rectangle-Rectangle collision (using top-left coordinates)
   */
  collideRects(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && 
           x1 + w1 > x2 && 
           y1 < y2 + h2 && 
           y1 + h1 > y2;
  }
  
  /**
   * Box-Box collision (using center coordinates)
   */
  collideBoxes(obj1X, obj1Y, obj1Width, obj1Height, obj2X, obj2Y, obj2Width, obj2Height) {
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
    return !(right1 < left2 || 
             left1 > right2 || 
             bottom1 < top2 || 
             top1 > bottom2);
  }
  
  /**
   * Circle-Circle collision
   */
  collideCircles(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
  }
  
  /**
   * Rectangle-Circle collision
   */
  collideRectCircle(rx, ry, rw, rh, cx, cy, cr) {
    // Find closest point on rectangle to circle
    const closestX = this.constrain(cx, rx, rx + rw);
    const closestY = this.constrain(cy, ry, ry + rh);
    
    // Check if closest point is inside circle
    const dx = closestX - cx;
    const dy = closestY - cy;
    return (dx * dx + dy * dy) < (cr * cr);
  }
  
  /**
   * Point-Rectangle collision
   */
  collidePointRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
  
  /**
   * Point-Circle collision
   */
  collidePointCircle(px, py, cx, cy, cr) {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) < (cr * cr);
  }
  
  /**
   * Line-Line collision
   */
  collideLines(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate determinant
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // If uA and uB are between 0-1, there is a collision
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
  }

  // ----- Helper Functions -----

  /**
   * Random function in range
   */
  randomRange(min, max) {
    return min + Math.random() * (max - min);
  }
  
  /**
   * Random integer in range (inclusive)
   */
  randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }
  
  /**
   * Check if an object is off-screen
   */
  isOffScreen(x, y, margin = 0) {
    return x < -margin || x > 100 + margin || 
           y < -margin || y > 100 + margin;
  }
  
  /**
   * Constrain a value between a minimum and maximum
   */
  constrain(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * End the current game
   */
  end() {
    this.isGameOver = true;
    this.events.push({
      type: "gameOver",
      score: this.score,
      tick: this.ticks,
    });
  }

  /**
   * Simulate a complete game with a specific update function
   * @param {Function} updateFunction Game-specific update function
   * @param {number} maxTicks Maximum ticks to simulate (60 ticks = 1 second)
   * @param {Array} inputPattern Array of input actions to simulate
   * @returns {Object} Game results
   */
  simulateGame(updateFunction, maxTicks = 3600, inputPattern = []) {
    let patternIndex = 0;
    let actionTicks = 0;
    let buttonPressed = false;

    // Run game until game over or max ticks reached
    while (!this.isGameOver && this.ticks < maxTicks) {
      // Process input pattern if provided
      if (inputPattern.length > 0) {
        if (patternIndex < inputPattern.length) {
          const action = inputPattern[patternIndex];

          if (actionTicks >= action.duration) {
            // Move to next action
            patternIndex++;
            actionTicks = 0;

            if (patternIndex < inputPattern.length) {
              buttonPressed = inputPattern[patternIndex].type === "hold";
            }
          } else {
            buttonPressed = action.type === "hold";
            actionTicks++;
          }
        }
      }

      // Update input state
      this.updateInput(buttonPressed);

      // Run game update
      updateFunction(this);

      // Update game time
      this.ticks++;

      // Update difficulty (increases every 60 * 60 ticks = 1 minute)
      this.difficulty = 1 + Math.floor(this.ticks / (60 * 60));
    }

    // Return game results
    return {
      score: this.score,
      ticks: this.ticks,
      duration: this.ticks / 60, // in seconds
      events: this.events,
      reason: this.events.find((e) => e.type === "gameOver"),
    };
  }
}

// ===== Input Pattern Generator =====

/**
 * Generates realistic input patterns to simulate different player types
 * and monotonous inputs for vulnerability testing
 */
class InputPatternGenerator {
  /**
   * Generate a pattern simulating a very unskilled beginner player
   * - Very slow reactions
   * - Highly inconsistent timing
   * - Frequent missed inputs
   * - Long pauses between actions
   *
   * @param {number} cycles Number of action cycles to generate
   * @returns {Array} Array of input actions
   */
  static generateBeginnerPattern(cycles = 20) {
    const pattern = [];

    for (let i = 0; i < cycles; i++) {
      // Very long wait times (60-120 frames = 1-2 seconds)
      const waitTime = Math.floor(Math.random() * 60) + 60;
      pattern.push({ type: "release", duration: waitTime });

      // Highly variable hold durations (1-15 frames)
      const holdTime = Math.floor(Math.random() * 15) + 1;
      pattern.push({ type: "hold", duration: holdTime });

      // 35% chance to completely miss an input and have a long pause
      if (Math.random() < 0.35) {
        const missedTime = Math.floor(Math.random() * 90) + 30;
        pattern.push({ type: "release", duration: missedTime });
      }

      // 25% chance of accidental double tap (very fast press and release)
      if (Math.random() < 0.25) {
        pattern.push({ type: "hold", duration: 2 });
        pattern.push({ type: "release", duration: 3 });
      }
    }

    return pattern;
  }

  /**
   * Generate a pattern simulating an expert player
   * - Optimal timing
   * - Minimal mistakes
   * - Consistent actions
   *
   * @param {number} cycles Number of action cycles to generate
   * @returns {Array} Array of input actions
   */
  static generateExpertPattern(cycles = 20) {
    const pattern = [];

    // Optimal values (these would be game-specific in real implementation)
    const optimalWaitTime = 25;
    const optimalHoldTime = 6;

    for (let i = 0; i < cycles; i++) {
      // Small variations from optimal timing (-3 to +3 frames)
      const waitVariation = Math.floor(Math.random() * 7) - 3;
      pattern.push({
        type: "release",
        duration: optimalWaitTime + waitVariation,
      });

      // Very consistent hold durations (-1 to +1 frames)
      const holdVariation = Math.floor(Math.random() * 3) - 1;
      pattern.push({ type: "hold", duration: optimalHoldTime + holdVariation });
    }

    return pattern;
  }

  /**
   * Generate a pattern with no button presses
   * @param {number} duration Total duration
   * @returns {Array} Array with single release action
   */
  static generateNoInputPattern(duration = 600) {
    return [{ type: "release", duration: duration }];
  }

  /**
   * Generate a pattern with constant button holding
   * @param {number} duration Total duration
   * @returns {Array} Array with single hold action
   */
  static generateHoldOnlyPattern(duration = 600) {
    return [{ type: "hold", duration: duration }];
  }

  /**
   * Generate a pattern with regular button mashing
   * @param {number} pressDuration Duration of each press
   * @param {number} releaseDuration Duration between presses
   * @param {number} cycles Number of press-release cycles
   * @returns {Array} Array of alternating hold and release actions
   */
  static generateSpamPattern(
    pressDuration = 3,
    releaseDuration = 3,
    cycles = 100
  ) {
    const pattern = [];

    for (let i = 0; i < cycles; i++) {
      pattern.push({ type: "hold", duration: pressDuration });
      pattern.push({ type: "release", duration: releaseDuration });
    }

    return pattern;
  }
}

// ===== Game Analyzer =====

/**
 * Analyzes game test results to evaluate game quality
 */
class GameAnalyzer {
  /**
   * Test a game against monotonous input patterns to find vulnerabilities
   * @param {GameSimulator} game Game simulator instance
   * @param {Function} updateFunction Game update function
   * @param {Function} initFunction Game initialization function
   * @returns {Object} Analysis results
   */
  static testMonotonousPatterns(game, updateFunction, initFunction) {
    // Define monotonous patterns to test
    const monotonousPatterns = [
      {
        name: "NoInput",
        pattern: InputPatternGenerator.generateNoInputPattern(600),
      },
      {
        name: "HoldOnly",
        pattern: InputPatternGenerator.generateHoldOnlyPattern(600),
      },
      {
        name: "RegularSpam",
        pattern: InputPatternGenerator.generateSpamPattern(3, 3, 100),
      },
    ];

    // Test each pattern
    const results = {};
    monotonousPatterns.forEach((pattern) => {
      game.initGame(initFunction);
      const result = game.simulateGame(updateFunction, 3600, pattern.pattern);

      results[pattern.name] = {
        survivalTime: result.duration,
        score: result.score,
        isVulnerable: result.duration > 10 || result.duration < 1,
        pattern: pattern.name,
      };
    });

    // Analyze vulnerability level
    const vulnerabilities = Object.values(results).filter(
      (r) => r.isVulnerable
    );
    const isHighlyVulnerable = vulnerabilities.length >= 2; // Highly vulnerable if 2+ patterns work
    const isModeratelyVulnerable = vulnerabilities.length > 0; // Moderately vulnerable if any pattern works

    return {
      patternResults: results,
      vulnerablePatterns: vulnerabilities.map((v) => v.pattern),
      isHighlyVulnerable,
      isModeratelyVulnerable,
      vulnerabilityScore: isHighlyVulnerable
        ? 0
        : isModeratelyVulnerable
        ? 1
        : 3,
    };
  }

  /**
   * Compare game performance across different player skill levels
   * @param {GameSimulator} game Game simulator instance
   * @param {Function} updateFunction Game update function
   * @param {Function} initFunction Game initialization function
   * @returns {Object} Comparison results
   */
  static comparePlayerPatterns(game, updateFunction, initFunction) {
    // Define player types to test (removed Intermediate)
    const playerPatterns = [
      {
        name: "Beginner",
        pattern: InputPatternGenerator.generateBeginnerPattern(),
      },
      {
        name: "Expert",
        pattern: InputPatternGenerator.generateExpertPattern(),
      },
    ];

    // Test each player type
    const results = {};

    playerPatterns.forEach((player) => {
      let totalScore = 0;
      let totalDuration = 0;
      let allScoreEvents = [];
      const runs = 3; // Run multiple times for more reliable results

      for (let i = 0; i < runs; i++) {
        game.initGame(initFunction);
        const result = game.simulateGame(updateFunction, 3600, player.pattern);
        totalScore += result.score;
        totalDuration += result.duration;

        // Collect score events
        if (result.events) {
          const scoreEvents = result.events.filter((e) => e.type === "score");
          allScoreEvents = allScoreEvents.concat(scoreEvents);
        }
      }

      results[player.name] = {
        averageScore: totalScore / runs,
        averageDuration: totalDuration / runs,
        scoreEvents: allScoreEvents,
      };
    });

    // Calculate skill gap (ratio of expert to beginner score)
    const skillGap =
      results.Expert.averageScore / Math.max(1, results.Beginner.averageScore);

    return {
      playerResults: results,
      skillGap,
    };
  }

  /**
   * Evaluate game quality based on test results
   * @param {Object} playerResults Results from comparePlayerPatterns
   * @param {Object} monotonousResults Results from testMonotonousPatterns
   * @returns {Object} Game evaluation
   */
  static evaluateGame(playerResults, monotonousResults) {
    const evaluation = {
      // Game duration score (more granular scale)
      durationScore: (() => {
        const expertDuration =
          playerResults.playerResults.Expert.averageDuration;
        if (expertDuration >= 30) return 3; // 30+ seconds is excellent
        else if (expertDuration >= 20) return 2; // 20-30 seconds is good
        else if (expertDuration >= 15) return 1; // 15-20 seconds is average
        else if (expertDuration >= 10)
          return 0; // 10-15 seconds is below average
        else if (expertDuration >= 5) return -1; // 5-10 seconds is poor
        else if (expertDuration >= 2) return -2; // 2-5 seconds is very poor
        else return -3;
      })(),
      // Skill gap score (more granular scale)
      skillGapScore: (() => {
        const skillGap = playerResults.skillGap;
        if (skillGap >= 3.0)
          return 3; // 3.0x+ is excellent (increased from 2.0x)
        else if (skillGap >= 2.0)
          return 2; // 2.0-3.0x is good (increased from 1.5-2.0x)
        else if (skillGap >= 1.5) return 1; // 1.5-2.0x is average
        else return 0; // <1.5x is poor (increased from 1.2x)
      })(),

      // Calculate difficulty progression score
      difficultyScore: (() => {
        // Get player results for different skill levels
        const beginnerResult = playerResults.playerResults.Beginner;
        const expertResult = playerResults.playerResults.Expert;

        // Score progression over time
        const expertScorePerSecond =
          expertResult.averageScore / Math.max(1, expertResult.averageDuration);
        const beginnerScorePerSecond =
          beginnerResult.averageScore /
          Math.max(1, beginnerResult.averageDuration);
        const scoreProgressionRatio =
          expertScorePerSecond / Math.max(1, beginnerScorePerSecond);

        // Analyze score consistency (if data available)
        let scoreConsistency = 1.0; // Default to neutral
        if (expertResult.scoreEvents && expertResult.scoreEvents.length > 5) {
          // Calculate the consistency of score changes over time
          const scoreRates = [];
          for (let i = 1; i < expertResult.scoreEvents.length; i++) {
            const timeDiff =
              expertResult.scoreEvents[i].tick -
              expertResult.scoreEvents[i - 1].tick;
            if (timeDiff > 0) {
              scoreRates.push(expertResult.scoreEvents[i].points / timeDiff);
            }
          }

          // Calculate standard deviation of score rates
          if (scoreRates.length > 0) {
            const avgRate =
              scoreRates.reduce((sum, rate) => sum + rate, 0) /
              scoreRates.length;
            const variance =
              scoreRates.reduce(
                (sum, rate) => sum + Math.pow(rate - avgRate, 2),
                0
              ) / scoreRates.length;
            const stdDev = Math.sqrt(variance);

            // Lower standard deviation means more consistent scoring
            scoreConsistency = 1.0 - Math.min(1.0, stdDev / avgRate);
          }
        }

        // Calculate final difficulty score (0-3 scale)
        let diffScore = 0;

        // Good starting difficulty - beginners should last at least 8 seconds (reduced from 10)
        if (beginnerResult.averageDuration >= 8) {
          diffScore += 1;
        }

        // Good skill progression - experts should do significantly better
        if (scoreProgressionRatio >= 1.5) {
          // Increased from 1.3
          diffScore += 1;
        }

        // Good consistency in challenge
        if (scoreConsistency >= 0.7) {
          diffScore += 1;
        }

        return diffScore;
      })(),

      // Monotonous input resistance score
      monotonousInputScore: monotonousResults.vulnerabilityScore,

      // Total score and evaluation lists
      totalScore: 0,
      strengths: [],
      weaknesses: [],
    };

    // Add strengths and weaknesses based on scores

    // Game duration evaluation
    if (evaluation.durationScore >= 2) {
      evaluation.strengths.push(
        "Excellent game duration - provides extended satisfying gameplay"
      );
    } else if (evaluation.durationScore === 1) {
      evaluation.strengths.push(
        "Good game duration - satisfying length for players"
      );
    } else {
      evaluation.weaknesses.push(
        "Short game duration - difficulty needs rebalancing"
      );
    }

    // Skill gap evaluation
    if (evaluation.skillGapScore >= 2) {
      evaluation.strengths.push(
        "Excellent skill gap - significant rewards for player improvement"
      );
    } else if (evaluation.skillGapScore === 1) {
      evaluation.strengths.push("Good skill gap - rewards player improvement");
    } else {
      evaluation.weaknesses.push(
        "Small skill gap - player skill differences don't significantly impact results"
      );
    }

    // Difficulty progression evaluation
    if (evaluation.difficultyScore >= 2) {
      evaluation.strengths.push(
        "Excellent difficulty progression - fair and challenging for all skill levels"
      );
    } else if (evaluation.difficultyScore === 1) {
      evaluation.strengths.push(
        "Good difficulty progression - generally balanced for different skill levels"
      );
    } else {
      evaluation.weaknesses.push(
        "Poor difficulty progression - game is too easy or too hard too quickly"
      );
    }

    // Monotonous input evaluation
    if (evaluation.monotonousInputScore === 3) {
      evaluation.strengths.push(
        "Game is resistant to monotonous input patterns"
      );
    } else if (monotonousResults.isModeratelyVulnerable) {
      evaluation.weaknesses.push(
        "Game is vulnerable to monotonous input patterns"
      );
      monotonousResults.vulnerablePatterns.forEach((pattern) => {
        evaluation.weaknesses.push(
          `Player can survive by using the ${pattern} pattern`
        );
      });
    }

    // Calculate total score
    evaluation.totalScore =
      Math.max(0, evaluation.durationScore) +
      evaluation.skillGapScore +
      evaluation.difficultyScore +
      evaluation.monotonousInputScore;

    // Determine overall rating based on revised scale (maximum 12 points)
    if (evaluation.totalScore >= 10) {
      evaluation.rating = "OUTSTANDING";
    } else if (evaluation.totalScore >= 8) {
      evaluation.rating = "EXCELLENT";
    } else if (evaluation.totalScore >= 6) {
      evaluation.rating = "GOOD";
    } else if (evaluation.totalScore >= 3) {
      evaluation.rating = "AVERAGE";
    } else {
      evaluation.rating = "NEEDS IMPROVEMENT";
    }

    return evaluation;
  }

  /**
   * Generate improvement recommendations based on evaluation
   * @param {Object} evaluation Game evaluation results
   * @returns {Array} List of recommendations
   */
  static generateRecommendations(evaluation) {
    const recommendations = [];

    // Recommendations for short game duration
    if (evaluation.durationScore < 2) {
      recommendations.push(
        "Lower initial difficulty to extend gameplay duration"
      );
      recommendations.push("Make difficulty curve more gradual");
      recommendations.push(
        "Add mechanics that reward skilled play without ending the game too quickly"
      );
    }

    // Recommendations for small skill gap
    if (evaluation.skillGapScore < 2) {
      recommendations.push(
        "Add bonus elements that reward advanced techniques"
      );
      recommendations.push("Introduce risk-reward choices for expert players");
      recommendations.push(
        "Create opportunities for score multipliers that require precise timing"
      );
    }

    // Recommendations for difficulty progression
    if (evaluation.difficultyScore < 2) {
      recommendations.push(
        "Ensure game is playable for at least 8 seconds by beginners"
      );
      recommendations.push(
        "Create a smoother difficulty curve with gradual increases"
      );
      recommendations.push(
        "Add consistent scoring opportunities throughout gameplay"
      );
    }

    // Recommendations for monotonous input vulnerability
    if (evaluation.monotonousInputScore < 2) {
      recommendations.push("Add penalties for monotonous input patterns");
      recommendations.push("Strengthen difficulty escalation over time");
      recommendations.push(
        "Add mechanics that require rhythmic or varied player actions"
      );
      recommendations.push(
        "Ensure button mashing doesn't provide an advantage"
      );
    }

    return recommendations;
  }

  /**
   * Run a complete game evaluation and generate a detailed report
   * @param {GameSimulator} game Game simulator instance
   * @param {Function} updateFunction Game update function
   * @param {Function} initFunction Game initialization function
   * @param {string} gameName Name of the game
   * @returns {Object} Comprehensive evaluation report
   */
  static evaluateGameComprehensive(
    game,
    updateFunction,
    initFunction,
    gameName
  ) {
    console.log(`===== Testing Game: ${gameName} =====`);

    // Test monotonous input patterns
    console.log("\nMonotonous Input Test:");
    const monotonousResults = this.testMonotonousPatterns(
      game,
      updateFunction,
      initFunction
    );

    console.log(
      "Monotonous Pattern Vulnerability:",
      monotonousResults.isHighlyVulnerable
        ? "High"
        : monotonousResults.isModeratelyVulnerable
        ? "Moderate"
        : "Low"
    );

    Object.entries(monotonousResults.patternResults).forEach(
      ([pattern, result]) => {
        console.log(
          `- ${pattern}: ${result.survivalTime.toFixed(1)}s, Score: ${
            result.score
          }`
        );
      }
    );

    // Test player skill patterns
    console.log("\nPlayer Skill Test:");
    const playerResults = this.comparePlayerPatterns(
      game,
      updateFunction,
      initFunction
    );

    Object.entries(playerResults.playerResults).forEach(([player, result]) => {
      console.log(
        `- ${player}: ${result.averageDuration.toFixed(
          1
        )}s, Score: ${result.averageScore.toFixed(1)}`
      );
    });

    console.log(`Skill Gap: ${playerResults.skillGap.toFixed(2)}x`);

    // Evaluate game quality
    const evaluation = this.evaluateGame(playerResults, monotonousResults);

    console.log("\nEvaluation Results:");
    console.log(
      `- Overall Rating: ${evaluation.totalScore}/12 points (${evaluation.rating})`
    );
    console.log(`- Game Duration: ${evaluation.durationScore}/3 points`);
    console.log(`- Skill Gap: ${evaluation.skillGapScore}/3 points`);
    console.log(
      `- Difficulty Progression: ${evaluation.difficultyScore}/3 points`
    );
    console.log(
      `- Monotonous Input Resistance: ${evaluation.monotonousInputScore}/3 points`
    );

    console.log("\nStrengths:");
    evaluation.strengths.forEach((s) => console.log(`- ${s}`));

    console.log("\nWeaknesses:");
    evaluation.weaknesses.forEach((w) => console.log(`- ${w}`));

    // Generate improvement recommendations
    const recommendations = this.generateRecommendations(evaluation);

    console.log("\nImprovement Recommendations:");
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    // Return comprehensive results
    return {
      gameName,
      monotonousResults,
      playerResults,
      evaluation,
      recommendations,
    };
  }

  /**
   * Compare multiple games to identify the best design
   * @param {Array} gameResults Array of results from evaluateGameComprehensive
   * @returns {Object} Comparative analysis
   */
  static compareGames(gameResults) {
    console.log("\n===== Game Comparison =====");
    console.log(
      "| Game Name | Rating | Score | Skill Gap | Avg Play Time | Monotonous Input |"
    );
    console.log(
      "|-----------|--------|-------|-----------|---------------|------------------|"
    );

    gameResults.forEach((result) => {
      const { gameName, evaluation, playerResults } = result;
      const expertTime =
        playerResults.playerResults.Expert.averageDuration.toFixed(1);

      console.log(
        `| ${gameName.padEnd(10)} | ${evaluation.rating.padEnd(6)} | ${
          evaluation.totalScore
        }/12 | ${playerResults.skillGap.toFixed(2)}x | ${expertTime}s | ${
          evaluation.monotonousInputScore
        }/3 |`
      );
    });

    // Find best game design
    const bestGame = gameResults.reduce(
      (best, current) =>
        current.evaluation.totalScore > best.evaluation.totalScore
          ? current
          : best,
      gameResults[0]
    );

    console.log(`\nBest Game Design: ${bestGame.gameName}`);
    console.log("Reasons:");
    bestGame.evaluation.strengths.forEach((s) => console.log(`- ${s}`));

    return {
      games: gameResults,
      bestGame,
    };
  }
}

// Export the classes to the global window object
window.GameSimulator = GameSimulator;
window.InputPatternGenerator = InputPatternGenerator;
window.GameAnalyzer = GameAnalyzer;