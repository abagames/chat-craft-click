# Data-Driven One-Button Game Development Prompt for p5.js

## Purpose

Develop a reproducible, high-quality one-button mini-game using the p5.js framework. The final product should be easy to
play, original, and properly implemented with complete game code.

## Design Guide Reference

- Use `game-design-guide.md` as a reference resource throughout this development process
- Refer to the relevant sections of the guide at each phase to ensure consistent and principled game design
- The design guide provides comprehensive frameworks and principles that complement this development process
- Each development process must output explicit documentation of which elements from the `game-design-guide.md` were utilized.

## Development Process Overview

1. **Idea Generation Phase**: Generate multiple game concepts from a theme
2. **Prototype Testing Phase**: Create simplified implementations and evaluate using REPL
3. **Concept Selection Phase**: Choose the best-performing concept based on test results
4. **Implementation Phase**: Develop the selected concept into a complete game using p5.js template
5. **Feedback and Refinement Phase**: Gather user feedback and make final adjustments

## Idea Generation Phase Instructions

Create innovative game ideas while documenting the idea generation process using the following methods.

### Theme Exploration

- Develop game concepts based on provided themes or generate your own unique theme combinations
- Consider unexpected theme pairings (e.g., "ancient mythology + household appliances")
- Extract core elements from abstract themes and transform them into concrete game mechanics
- Explore themes through different emotional lenses (excitement, tension, mystery, satisfaction)
- Reference the Design Guide's Section 2 "Recommended Game Design Principles" to ensure adherence to fundamental design principles
- Utilize Design Guide's Section 3 "One-Button Interaction Patterns" to explore diverse interaction possibilities

### Diverse Concept Generation

- Create 5 distinctly different game concepts with unique core mechanics
- Ensure diversity across the following dimensions:
  - **Button Interaction Types**: Press, hold, release, rhythmic patterns, timing-based actions
  - **Physical Principles**: Gravity, momentum, elasticity, magnetism, fluid dynamics
  - **Game Environments**: Varied spaces with different constraints and properties
  - **Movement Patterns**: Linear, orbital, oscillating, expanding/contracting, teleporting
  - **Player Objectives**: Collecting, avoiding, aligning, destroying, reaching
- Draw inspiration from multiple categories in the Design Guide without duplicating mechanisms
- Apply different creative thinking techniques for each concept (substitution, combination, adaptation, etc.)
- Leverage the Design Guide's Section 5 "Idea Generation Methods" to stimulate diverse creative approaches

### Randomized Elements Integration

- Incorporate at least 3 of these randomized element categories into your concepts:
  - **Visual Representations**: Geometric shapes with meaningful transformations
  - **Time Manipulation**: Speed changes, pausing, reversal, rhythmic patterns
  - **Spatial Relationships**: Attraction, repulsion, orbiting, mirroring, reflection
  - **State Changes**: Object transformation based on conditions or player actions
  - **Natural Phenomena**: Abstract representations of waves, growth, erosion, etc.
  - **Psychological Elements**: Expectation vs. surprise, pattern recognition, optical illusions

### Constraint Exploration

- Apply varied constraints across your concepts to drive creativity:
  - **Resource Limitations**: Limited jumps, energy, time, space
  - **Conditional Mechanics**: Actions that only work under specific circumstances
  - **Environmental Challenges**: Changing landscapes, hazards, boundaries
  - **Progression Systems**: How difficulty and complexity evolve during play
  - **Risk-Reward Structures**: Varied approaches to balancing challenge and payoff

### Inspiration Sources

- Draw from diverse sources to spark unique mechanics:
  - Classic games from different eras (arcade, early console, mobile)
  - Physical world phenomena and scientific principles
  - Everyday activities abstracted into game mechanics
  - Natural world behaviors (animal movements, plant growth, weather patterns)
  - Human sensory experiences and perceptual effects
- Avoid relying on the same inspiration source for multiple concepts

### Documentation Structure

For each concept, document:

1. **Core Mechanic**: The fundamental interaction driven by the one-button control
2. **Player Goal**: Clear objective that drives gameplay
3. **Challenge Elements**: What creates difficulty and engagement
4. **Scoring System**: How player performance is measured
5. **One-Button Pattern**: Specific implementation of button interaction
6. **Unique Appeal**: What makes this concept distinctive and engaging
7. **Risk-Reward Dynamic**: How the player balances safety against potential gains

## Prototype Testing Phase Instructions

Document the game rules and details of game objects corresponding to each concept, and test the game concepts using REPL (analysis tool).

1. **Create a Concise Set of Game Rules**

   - Focus on:
     - **Game Environment**: Define the playing field, boundaries, and overall structure
     - **Core Mechanics**: Explain the fundamental rules governing gameplay
     - **Player Interaction**: Detail exactly how the one-button control affects gameplay
     - **Challenge**: Specify what makes the game challenging and how difficulty increases
   - Output game rules that correspond to each concept
   - Follow Design Guide's Section 2 principles to maintain clarity and simplicity in rule design

2. **Detail the Game Objects**

   - Limit to a maximum of 3 types of objects for simplicity
   - For each object, specify:
     - **Properties**: Position, size, velocity, etc.
     - **Initial State**: Where objects start and in what condition
     - **Shape**: Use simple geometric shapes (circle, rectangle, etc.)
     - **Behavior**: Movement patterns, interactions with other objects
     - **One-Button Controls**: How button input affects this object (if applicable)
     - **Collision Events**: What happens when objects collide
     - **Spawning Rules**: When and where new instances appear
     - **Scrolling**: How objects move with screen scrolling (if applicable)
   - Output the details of the game objects corresponding to each concept
   - Reference Design Guide's Section 6 "Game Mechanics Classification" when detailing object behaviors and interactions

3. **Implementation and testing of prototypes using REPL**
   - Use a REPL simulation environment that emulates basic game functionality
   - Follow the detailed testing instructions in `repl-game-testing-prompt.md`
   - Use the testing framework provided in `one-button-game-test-framework.js`
   - For each game concept, create a minimal implementation that reproduces its core mechanics in a REPL simulation environment
   - Include essential game objects, basic physics, and scoring rules
   - Conduct tests using the REPL simulation environment and output the test results for each concept

## Concept Selection Phase Instructions

1. **Comparative Analysis**

   - Apply the Design Guide's Section 7 "One-Button Game Design Evaluation" criteria to objectively assess each concept
   - In addition to the test results of the REPL, evaluate the novelty of each concept on a scale of 0-5 points
   - Create a comparison table with metrics for all tested concepts
   - Calculate a final evaluation score based on standardized criteria from the testing phase

2. **Objective Selection**
   - Select a game that has both a high evaluation score and is innovative
   - Identify strengths and weaknesses of selected concept

## Implementation Phase Instructions

Before entering the Implementation Phase, ask the user if it's okay to begin the implementation.

**CRITICAL REQUIREMENT**: The HTML file MUST be 777 lines or fewer to function properly as an Artifact that can be previewed as a website. This is a hard technical limitation that cannot be overridden. Implement according to the following guidelines. Before implementation, estimate the code size of the HTML file, and if it appears to exceed the limit, simplify visual effects or non-essential features.

- Remove ALL empty lines in the final code
- Use minimal comments - only include what's absolutely necessary
- Use code minification techniques without sacrificing readability

1. **Setting Up the p5.js Template**

   - Use the provided `p5js-game-template.html` as your starting point
   - Understand the template's structure:
     - Input handling system with `button` object tracking pressed/released states
     - Object pools for managing game entities
     - Collision detection utilities
     - Core game loop with setup and draw functions
   - Retain the template's structure while implementing your game concept

2. **Complete Game Object Definition**

   - Define all game objects with appropriate properties in the template
   - Use the object pool pattern from the template for collections of entities
   - Implement proper initialization functions
   - Follow Design Guide's Section 2.3 "Simple Shapes and Visuals" to maintain visual simplicity

3. **Core Mechanism Implementation**

   - Implement the one-button control mechanism using the template's input handler
   - Ensure smooth and responsive controls
   - Implement full physics and collision systems using the provided utility functions
   - Adhere strictly to Design Guide's Section 2 "Recommended Game Design Principles" when implementing core mechanics

4. **Game State Management**

   - Use the template's game state management system
   - Implement proper game over detection and handling
   - Add score tracking and display
   - Implement difficulty progression as gameplay advances
   - Clean up off-screen objects to prevent memory leaks
   - Follow Design Guide's Section 2.5 "Implicit Visual Feedback" to provide non-textual visual feedback

5. **Implementation Completion**
   - Verify all game mechanics are working as intended
   - Ensure the gameplay matches the concept selected during the Concept Selection Phase
   - Prepare the complete game for user feedback

## Feedback and Refinement Phase Instructions

1. **User Feedback Collection**

   - Present the implemented game to users
   - Provide clear instructions on how to play the game
   - Structure feedback questions based on Design Guide's Section 7 evaluation criteria for systematic assessment

2. **Feedback Analysis**

   - Once user feedback is received, analyze it systematically
   - Categorize feedback into:
     - Control improvements
     - Difficulty adjustments
     - Visual clarity enhancements
     - Core mechanic refinements
   - Prioritize changes based on impact and implementation complexity
   - Reference Design Guide's Section 7 to identify specific areas for improvement

3. **Final Refinements**
   - Implement user feedback-based improvements
   - Pay special attention to improvements related to Sections 7.3 "Visual Design & Simplicity" and 7.4 "Scoring & Motivation" from the Design Guide
