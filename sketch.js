// ============================================================
// DODGEM ARENA
// include GAME FEEL + SOUND
// p5.js + p5.sound + Matter.js
// ============================================================
//
// PHASE 1:
//
//   • application states
//   • animated start screen
//   • mode-selection screen
//   • reusable pseudo-3D buttons
//   • mouse + keyboard menu interaction
//
// PHASE 2:
//
//   • 3 → 2 → 1 → GO! countdown
//   • pause / resume system
//   • keyboard indicators
//   • gameplay HUD
//   • game-mode indicator
//   • pause overlay
//
// PHASE 3:
//
//   • directional collision particles
//   • collision-dependent screen shake
//   • player speedometer
//   • improved dual-wheel motion trails
//   • stronger collision feedback
//   • synthesised sound effects
//
// SOUND SYSTEM:
//
//   • no external MP3/WAV files are required
//   • countdown tones are generated using p5.sound
//   • GO uses a higher confirmation tone
//   • car-to-car collisions generate impact sounds
//   • car-to-wall collisions generate a different impact sound
//   • collision volume depends on impact strength
//
// FIXES RETAINED:
//
//   FIX 1:
//   Speedometer remains repositioned so that it does not
//   overlap the MENU button.
//
//   FIX 2:
//   ENTER detection remains robust through keyPressed()
//   plus the keyReleased() fallback.
//
// ============================================================



// ============================================================
// 1. MATTER.JS ALIASES
// ============================================================

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;



// ============================================================
// 2. GAME STATES
// ============================================================

const STATE_START = "start";
const STATE_MODE_SELECT = "modeSelect";
const STATE_COUNTDOWN = "countdown";
const STATE_PLAYING = "playing";
const STATE_PAUSED = "paused";

let gameState = STATE_START;



// ============================================================
// 3. COUNTDOWN SETTINGS
// ============================================================

const COUNTDOWN_STAGE_DURATION = 1000;
const COUNTDOWN_TOTAL_DURATION = 4000;

let countdownStartTime = 0;

// Stores the last countdown stage whose sound was played.
// This prevents the same tone from being triggered every frame.
let lastCountdownSoundStage = -1;



// ============================================================
// 4. GLOBAL GAME OBJECTS
// ============================================================

let engine;
let world;

let arena;
let playerCar;

let opponentCars = [];

let impactFlashes = [];
let barrierPulses = [];
let collisionParticles = [];

let insertionArmed = false;



// ============================================================
// 5. PHASE 3 GAME-FEEL SETTINGS
// ============================================================

let screenShake;

const MAX_COLLISION_PARTICLES = 180;

// Matter.js velocity is converted into an arcade-style
// display value rather than a physical km/h measurement.
const SPEEDOMETER_MULTIPLIER = 12;



// ============================================================
// 6. PHASE 3 SOUND SYSTEM
// ============================================================
//
// Audio is synthesised at runtime.
//
// This means the project does not depend upon external sound
// files or file paths.
//
// A browser normally requires a user interaction before audio
// can begin. Calling userStartAudio() from mouse/key handlers
// unlocks the p5.sound AudioContext.
//
// ============================================================

let soundSystem;



// ============================================================
// 7. USER INTERFACE OBJECTS
// ============================================================

let playButton;

let practiceButton;
let randomButton;
let advancedButton;

let backButton;
let menuButton;

let resumeButton;
let restartButton;
let pauseMenuButton;

let gameHUD;



// ============================================================
// 8. GAME MODE SETTINGS
// ============================================================

const MODE_PRACTICE = 1;
const MODE_RANDOM = 2;
const MODE_ADVANCED = 3;

let currentMode = MODE_PRACTICE;

const OPPONENT_COUNT = 4;



// ============================================================
// 9. ARENA SETTINGS
// ============================================================

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 700;

const START_ZONE_LABEL_OFFSET_X = 45;
const PRACTICE_CAR_OFFSET_X = 150;



// ============================================================
// 10. PLAYER MOVEMENT SETTINGS
// ============================================================

const PLAYER_ENGINE_FORCE = 0.00045;
const PLAYER_REVERSE_FORCE = 0.00032;

const PLAYER_STEER_SPEED = 0.045;

const PLAYER_MAX_FORWARD_SPEED = 8;
const PLAYER_MAX_REVERSE_SPEED = 4;



// ============================================================
// 11. CAR TYPE SETTINGS
// ============================================================

const STANDARD_CAR = {
  name: "Standard",
  density: 0.002,
  engineForce: 0.00032,
  maxSpeed: 5.5
};


const SLOW_CAR = {
  name: "Slow",
  density: 0.003,
  engineForce: 0.00022,
  maxSpeed: 3.8
};



// ============================================================
// 12. OPPONENT SETTINGS
// ============================================================

const OPPONENT_STEER_SPEED = 0.020;

const OPPONENT_TARGET_RADIUS = 90;

const TARGET_TIMER_MIN = 120;
const TARGET_TIMER_MAX = 300;

const OPPONENT_COLLISION_COOLDOWN = 35;



// ============================================================
// 13. OPPONENT COLOURS
// ============================================================

let opponentColours;



// ============================================================
// 14. P5.JS SETUP
// ============================================================

function setup() {

  createCanvas(1600, 900);


  // ----------------------------------------------------------
  // Matter.js physics engine
  // ----------------------------------------------------------

  engine = Engine.create();

  world = engine.world;

  // This is a top-down simulation, therefore gravitational
  // acceleration is disabled.
  engine.gravity.x = 0;
  engine.gravity.y = 0;


  // ----------------------------------------------------------
  // Arena
  // ----------------------------------------------------------

  arena = new Arena(
    width / 2,
    height / 2,
    ARENA_WIDTH,
    ARENA_HEIGHT
  );


  // ----------------------------------------------------------
  // Opponent colours
  // ----------------------------------------------------------

  opponentColours = [
    color(225, 70, 70),
    color(245, 155, 55),
    color(70, 190, 100),
    color(170, 90, 220)
  ];


  // ----------------------------------------------------------
  // Player
  // ----------------------------------------------------------

  const spawn = arena.getPlayerSpawn();


  playerCar = new Car(
    spawn.x,
    spawn.y,
    spawn.angle,
    color(40, 130, 240),
    STANDARD_CAR,
    "C1"
  );


  // Prepare Practice Mode behind the start screen.
  setupMode(MODE_PRACTICE);


  // ----------------------------------------------------------
  // User interface
  // ----------------------------------------------------------

  createInterface();


  // ----------------------------------------------------------
  // HUD
  // ----------------------------------------------------------

  gameHUD = new GameHUD();


  // ----------------------------------------------------------
  // Screen shake
  // ----------------------------------------------------------

  screenShake = new ScreenShake();


  // ----------------------------------------------------------
  // Phase 3 sound system
  // ----------------------------------------------------------

  soundSystem = new GameSoundSystem();


  // ----------------------------------------------------------
  // Collision events
  // ----------------------------------------------------------

  setupCollisionEvents();
}



// ============================================================
// 15. CREATE USER INTERFACE
// ============================================================

function createInterface() {

  playButton = new UIButton(
    width / 2,
    570,
    300,
    78,
    "PLAY"
  );


  practiceButton = new UIButton(
    width / 2 - 360,
    535,
    300,
    90,
    "PRACTICE"
  );


  randomButton = new UIButton(
    width / 2,
    535,
    300,
    90,
    "RANDOM"
  );


  advancedButton = new UIButton(
    width / 2 + 360,
    535,
    300,
    90,
    "ADVANCED"
  );


  backButton = new UIButton(
    145,
    80,
    190,
    58,
    "BACK"
  );


  // MENU remains at the far-right side of the HUD.
  menuButton = new UIButton(
    1510,
    37,
    140,
    46,
    "MENU"
  );


  resumeButton = new UIButton(
    width / 2,
    475,
    280,
    62,
    "RESUME"
  );


  restartButton = new UIButton(
    width / 2,
    555,
    280,
    62,
    "RESTART"
  );


  pauseMenuButton = new UIButton(
    width / 2,
    635,
    280,
    62,
    "MAIN MENU"
  );
}



// ============================================================
// 16. MAIN DRAW LOOP
// ============================================================

function draw() {

  if (gameState === STATE_START) {

    drawStartScreen();

  } else if (gameState === STATE_MODE_SELECT) {

    drawModeSelectionScreen();

  } else if (gameState === STATE_COUNTDOWN) {

    drawCountdown();

  } else if (gameState === STATE_PLAYING) {

    drawGame();

  } else if (gameState === STATE_PAUSED) {

    drawPausedGame();
  }
}



// ============================================================
// 17. START SCREEN
// ============================================================

function drawStartScreen() {

  drawMenuBackground();


  // Decorative border.
  push();

  noFill();

  stroke(255, 255, 255, 20);
  strokeWeight(2);

  rectMode(CENTER);

  rect(
    width / 2,
    height / 2,
    1320,
    700,
    30
  );

  pop();


  // Animated decorative cars.
  drawMenuCar(
    250 + sin(frameCount * 0.015) * 80,
    250,
    -0.35,
    color(225, 70, 70),
    "C2"
  );


  drawMenuCar(
    1350 + cos(frameCount * 0.013) * 70,
    650,
    0.45,
    color(70, 190, 100),
    "C4"
  );


  drawMenuCar(
    1280,
    220 + sin(frameCount * 0.018) * 50,
    -1.0,
    color(170, 90, 220),
    "C5"
  );


  // Main title.
  push();

  textAlign(CENTER, CENTER);
  noStroke();


  fill(120, 190, 255);
  textStyle(BOLD);
  textSize(22);

  text(
    "p5.js + Matter.js",
    width / 2,
    245
  );


  fill(255);
  textSize(92);

  text(
    "DODGEM",
    width / 2,
    340
  );


  fill(255, 190, 60);
  textSize(92);

  text(
    "ARENA",
    width / 2,
    430
  );


  fill(200);
  textStyle(NORMAL);
  textSize(20);

  text(
    "Physics • Driving • Autonomous Opponents",
    width / 2,
    495
  );

  pop();


  playButton.draw();


  push();

  textAlign(CENTER, CENTER);
  noStroke();

  fill(170);

  textSize(16);

  text(
    "Click PLAY or press ENTER",
    width / 2,
    655
  );

  pop();
}



// ============================================================
// 18. MODE-SELECTION SCREEN
// ============================================================

function drawModeSelectionScreen() {

  drawMenuBackground();


  push();

  textAlign(CENTER, CENTER);
  noStroke();

  fill(255);
  textStyle(BOLD);
  textSize(52);

  text(
    "SELECT GAME MODE",
    width / 2,
    130
  );


  fill(170);
  textStyle(NORMAL);
  textSize(18);

  text(
    "Choose how the opponent cars should behave",
    width / 2,
    185
  );

  pop();


  drawModeCard(
    width / 2 - 360,
    355,
    "01",
    "PRACTICE",
    "Learn the controls",
    "Opponents remain parked",
    color(70, 150, 240),
    practiceButton.isHovered()
  );


  drawModeCard(
    width / 2,
    355,
    "02",
    "RANDOM",
    "Moving opponents",
    "Cars continuously drive forward",
    color(245, 155, 55),
    randomButton.isHovered()
  );


  drawModeCard(
    width / 2 + 360,
    355,
    "03",
    "ADVANCED",
    "Autonomous navigation",
    "Cars steer toward changing targets",
    color(170, 90, 220),
    advancedButton.isHovered()
  );


  practiceButton.draw();
  randomButton.draw();
  advancedButton.draw();

  backButton.draw();


  push();

  noStroke();

  fill(170);

  textAlign(CENTER, CENTER);
  textSize(16);

  text(
    "Keyboard: 1 = Practice     2 = Random     3 = Advanced     ESC = Back",
    width / 2,
    720
  );

  pop();
}



// ============================================================
// 19. MODE CARD
// ============================================================

function drawModeCard(
  x,
  y,
  number,
  title,
  subtitle,
  description,
  accentColour,
  hovered
) {

  push();

  rectMode(CENTER);


  if (hovered) {

    noStroke();

    fill(
      red(accentColour),
      green(accentColour),
      blue(accentColour),
      35
    );

    rect(
      x,
      y,
      330,
      310,
      25
    );
  }


  // Shadow.
  noStroke();

  fill(0, 0, 0, 80);

  rect(
    x + 8,
    y + 10,
    310,
    285,
    22
  );


  // Card.
  fill(
    hovered
      ? 48
      : 42
  );

  stroke(
    hovered
      ? accentColour
      : color(75)
  );

  strokeWeight(
    hovered
      ? 4
      : 2
  );

  rect(
    x,
    y,
    310,
    285,
    22
  );


  // Mode number.
  noStroke();

  fill(accentColour);

  textAlign(CENTER, CENTER);

  textStyle(BOLD);
  textSize(46);

  text(
    number,
    x,
    y - 88
  );


  // Mode title.
  fill(255);

  textSize(27);

  text(
    title,
    x,
    y - 25
  );


  textStyle(NORMAL);

  fill(210);
  textSize(17);

  text(
    subtitle,
    x,
    y + 25
  );


  fill(150);
  textSize(14);

  text(
    description,
    x,
    y + 58
  );

  pop();
}



// ============================================================
// 20. MENU BACKGROUND
// ============================================================

function drawMenuBackground() {

  background(22, 24, 29);


  push();

  stroke(255, 255, 255, 10);
  strokeWeight(1);


  const spacing = 50;

  const offsetX =
    (frameCount * 0.15) %
    spacing;


  for (
    let x = -spacing;
    x < width + spacing;
    x += spacing
  ) {

    line(
      x + offsetX,
      0,
      x + offsetX,
      height
    );
  }


  for (
    let y = 0;
    y < height;
    y += spacing
  ) {

    line(
      0,
      y,
      width,
      y
    );
  }

  pop();
}



// ============================================================
// 21. DECORATIVE MENU CAR
// ============================================================

function drawMenuCar(
  x,
  y,
  angle,
  bodyColour,
  label
) {

  push();

  translate(x, y);
  rotate(angle);

  rectMode(CENTER);


  // Shadow.
  noStroke();

  fill(0, 0, 0, 80);

  rect(
    7,
    8,
    75,
    118,
    22
  );


  // Wheels.
  fill(20);

  rect(-35, -30, 12, 30, 5);
  rect(35, -30, 12, 30, 5);
  rect(-35, 30, 12, 30, 5);
  rect(35, 30, 12, 30, 5);


  // Bumper.
  fill(35);

  rect(
    0,
    0,
    75,
    118,
    24
  );


  // Body.
  fill(bodyColour);

  stroke(15);
  strokeWeight(3);

  rect(
    0,
    0,
    64,
    108,
    20
  );


  // Windscreen.
  noStroke();

  fill(45, 55, 65);

  rect(
    0,
    -28,
    38,
    26,
    8
  );


  // Headlights.
  fill(255, 235, 120);

  circle(-17, -45, 8);
  circle(17, -45, 8);


  // Identifier.
  fill(255);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(20);

  text(
    label,
    0,
    14
  );

  pop();
}



// ============================================================
// 22. START A GAME MODE
// ============================================================

function startGameMode(mode) {

  setupMode(mode);

  beginCountdown();
}



// ============================================================
// 23. BEGIN COUNTDOWN
// ============================================================

function beginCountdown() {

  insertionArmed = false;

  countdownStartTime = millis();

  // Reset the sound-stage tracker whenever a new countdown
  // begins. This guarantees that "3" receives its tone.
  lastCountdownSoundStage = -1;

  gameState = STATE_COUNTDOWN;
}



// ============================================================
// 24. COUNTDOWN SCREEN + SOUND
// ============================================================

function drawCountdown() {

  drawFrozenGameScene();


  // Dark translucent overlay.
  push();

  noStroke();

  fill(0, 0, 0, 105);

  rect(
    0,
    0,
    width,
    height
  );

  pop();


  const elapsed =
    millis() -
    countdownStartTime;


  let countdownText;

  // Numerical stage:
  //
  // 0 -> 3
  // 1 -> 2
  // 2 -> 1
  // 3 -> GO
  //
  // Keeping this explicit allows the visual countdown and
  // sound system to remain synchronised.
  let countdownStage;


  if (
    elapsed <
    COUNTDOWN_STAGE_DURATION
  ) {

    countdownText = "3";
    countdownStage = 0;

  } else if (
    elapsed <
    COUNTDOWN_STAGE_DURATION * 2
  ) {

    countdownText = "2";
    countdownStage = 1;

  } else if (
    elapsed <
    COUNTDOWN_STAGE_DURATION * 3
  ) {

    countdownText = "1";
    countdownStage = 2;

  } else if (
    elapsed <
    COUNTDOWN_TOTAL_DURATION
  ) {

    countdownText = "GO!";
    countdownStage = 3;

  } else {

    gameState = STATE_PLAYING;

    return;
  }


  // ----------------------------------------------------------
  // Countdown sound trigger
  // ----------------------------------------------------------
  //
  // draw() executes many times per second.
  //
  // Therefore the tone must NOT simply be played whenever the
  // current text is "3", "2", etc. Doing so would repeatedly
  // restart the sound on every frame.
  //
  // Instead, sound is generated only when the stage changes.
  // ----------------------------------------------------------

  if (
    countdownStage !==
    lastCountdownSoundStage
  ) {

    if (soundSystem) {

      if (
        countdownStage === 3
      ) {

        soundSystem.playGo();

      } else {

        soundSystem.playCountdownBeep();
      }
    }


    lastCountdownSoundStage =
      countdownStage;
  }


  const stageTime =
    elapsed %
    COUNTDOWN_STAGE_DURATION;


  const progress =
    constrain(
      stageTime /
      COUNTDOWN_STAGE_DURATION,
      0,
      1
    );


  const scaleAmount =
    lerp(
      1.35,
      1.0,
      progress
    );


  const alpha =
    map(
      progress,
      0,
      1,
      255,
      190
    );


  push();

  textAlign(CENTER, CENTER);
  noStroke();


  fill(255, 255, 255, 190);

  textStyle(BOLD);
  textSize(22);

  text(
    getModeName(),
    width / 2,
    height / 2 - 135
  );


  translate(
    width / 2,
    height / 2
  );


  scale(scaleAmount);


  if (
    countdownText === "GO!"
  ) {

    fill(
      255,
      190,
      60,
      alpha
    );

    textSize(105);

  } else {

    fill(
      255,
      255,
      255,
      alpha
    );

    textSize(130);
  }


  text(
    countdownText,
    0,
    0
  );

  pop();


  push();

  noStroke();

  fill(210);

  textAlign(CENTER, CENTER);

  textStyle(NORMAL);
  textSize(17);

  text(
    "Get ready...",
    width / 2,
    height / 2 + 115
  );

  pop();
}



// ============================================================
// 25. ACTIVE GAMEPLAY
// ============================================================

function drawGame() {

  background(35);


  // ----------------------------------------------------------
  // Physics simulation
  // ----------------------------------------------------------

  Engine.update(engine);


  // ----------------------------------------------------------
  // Update player
  // ----------------------------------------------------------

  playerCar.update();
  playerCar.updateTrail();


  // ----------------------------------------------------------
  // Update opponents
  // ----------------------------------------------------------

  for (
    const opponent
    of opponentCars
  ) {

    opponent.update();

    opponent.updateTrail();
  }


  // ----------------------------------------------------------
  // Update effects
  // ----------------------------------------------------------

  updateImpactFlashes();

  updateBarrierPulses();

  updateCollisionParticles();

  screenShake.update();


  // ----------------------------------------------------------
  // WORLD LAYER
  //
  // Screen shake affects only this layer.
  // ----------------------------------------------------------

  push();


  const shakeOffset =
    screenShake.getOffset();


  translate(
    shakeOffset.x,
    shakeOffset.y
  );


  drawGameWorld();


  pop();


  // ----------------------------------------------------------
  // STABLE HUD LAYER
  // ----------------------------------------------------------

  gameHUD.draw();

  menuButton.draw();
}



// ============================================================
// 26. DRAW GAME WORLD
// ============================================================

function drawGameWorld() {

  arena.draw();


  // Trails first so that cars appear above them.
  playerCar.drawTrail();


  for (
    const opponent
    of opponentCars
  ) {

    opponent.drawTrail();
  }


  // Cars.
  playerCar.draw();


  for (
    const opponent
    of opponentCars
  ) {

    opponent.draw();
  }


  // Collision effects.
  drawImpactFlashes();

  drawBarrierPulses();

  drawCollisionParticles();
}



// ============================================================
// 27. FROZEN GAME SCENE
// ============================================================

function drawFrozenGameScene() {

  background(35);

  drawGameWorld();

  gameHUD.draw();
}



// ============================================================
// 28. PAUSED GAME
// ============================================================

function drawPausedGame() {

  drawFrozenGameScene();


  // Dark overlay.
  push();

  noStroke();

  fill(10, 12, 16, 190);

  rect(
    0,
    0,
    width,
    height
  );

  pop();


  // Pause panel.
  push();

  rectMode(CENTER);


  // Shadow.
  noStroke();

  fill(0, 0, 0, 110);

  rect(
    width / 2 + 10,
    height / 2 + 12,
    440,
    470,
    28
  );


  // Panel.
  fill(27, 30, 36);

  stroke(85);
  strokeWeight(2);

  rect(
    width / 2,
    height / 2,
    440,
    470,
    28
  );


  // Heading.
  noStroke();

  fill(255);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(50);

  text(
    "PAUSED",
    width / 2,
    285
  );


  // Mode.
  fill(getModeAccentColour());

  textSize(19);

  text(
    getModeName(),
    width / 2,
    335
  );


  // Hint.
  fill(165);

  textStyle(NORMAL);
  textSize(15);

  text(
    "Press P or ESC to resume",
    width / 2,
    380
  );

  pop();


  resumeButton.draw();
  restartButton.draw();
  pauseMenuButton.draw();
}



// ============================================================
// 29. PAUSE / RESUME
// ============================================================

function pauseGame() {

  if (
    gameState !== STATE_PLAYING
  ) {

    return;
  }


  gameState = STATE_PAUSED;
}


function resumeGame() {

  if (
    gameState !== STATE_PAUSED
  ) {

    return;
  }


  gameState = STATE_PLAYING;
}



// ============================================================
// 30. RESTART CURRENT MODE
// ============================================================

function restartCurrentMode() {

  setupMode(currentMode);

  beginCountdown();
}



// ============================================================
// 31. RETURN TO MAIN MENU
// ============================================================

function returnToMainMenu() {

  insertionArmed = false;

  clearCollisionEffects();

  setupMode(MODE_PRACTICE);

  gameState = STATE_START;
}



// ============================================================
// 32. MODE MANAGEMENT
// ============================================================

function setupMode(mode) {

  currentMode = mode;

  insertionArmed = false;

  clearCollisionEffects();

  removeOpponents();

  resetPlayerToSpawn();


  switch (currentMode) {

    case MODE_PRACTICE:

      createPracticeOpponents();

      break;


    case MODE_RANDOM:

      createMovingOpponents(
        "straight"
      );

      break;


    case MODE_ADVANCED:

      createMovingOpponents(
        "advanced"
      );

      break;
  }
}



// ============================================================
// 33. MODE INFORMATION
// ============================================================

function getModeName() {

  if (
    currentMode === MODE_PRACTICE
  ) {

    return "PRACTICE MODE";
  }


  if (
    currentMode === MODE_RANDOM
  ) {

    return "RANDOM MODE";
  }


  return "ADVANCED MODE";
}


function getModeAccentColour() {

  if (
    currentMode === MODE_PRACTICE
  ) {

    return color(
      70,
      150,
      240
    );
  }


  if (
    currentMode === MODE_RANDOM
  ) {

    return color(
      245,
      155,
      55
    );
  }


  return color(
    170,
    90,
    220
  );
}



// ============================================================
// 34. RESET HELPERS
// ============================================================

function clearCollisionEffects() {

  impactFlashes = [];

  barrierPulses = [];

  collisionParticles = [];


  if (screenShake) {

    screenShake.reset();
  }
}


function resetPlayerToSpawn() {

  const spawn =
    arena.getPlayerSpawn();


  playerCar.reset(
    spawn.x,
    spawn.y,
    spawn.angle
  );
}


function removeOpponents() {

  for (
    const opponent
    of opponentCars
  ) {

    World.remove(
      world,
      opponent.body
    );
  }


  opponentCars = [];
}



// ============================================================
// 35. PRACTICE MODE
// ============================================================

function createPracticeOpponents() {

  const startLeft =
    arena.x -
    arena.w / 2;


  const practiceCarX =
    startLeft +
    PRACTICE_CAR_OFFSET_X;


  const practiceCars = [

    {
      yOffset: -240,
      colour: opponentColours[0],
      settings: STANDARD_CAR,
      label: "C2"
    },

    {
      yOffset: -120,
      colour: opponentColours[1],
      settings: STANDARD_CAR,
      label: "C3"
    },

    {
      yOffset: 120,
      colour: opponentColours[2],
      settings: SLOW_CAR,
      label: "C4"
    },

    {
      yOffset: 240,
      colour: opponentColours[3],
      settings: SLOW_CAR,
      label: "C5"
    }
  ];


  for (
    const carData
    of practiceCars
  ) {

    const opponent =
      new OpponentCar(
        practiceCarX,
        arena.y + carData.yOffset,
        HALF_PI,
        carData.colour,
        carData.settings,
        carData.label
      );


    opponent.behaviour =
      "parked";


    opponentCars.push(
      opponent
    );
  }
}



// ============================================================
// 36. RANDOM / ADVANCED OPPONENT CREATION
// ============================================================

function createMovingOpponents(
  behaviour
) {

  for (
    let i = 0;
    i < OPPONENT_COUNT;
    i++
  ) {

    const position =
      getRandomArenaPosition();


    const angle =
      random(TWO_PI);


    const carSettings =
      i < 2
        ? STANDARD_CAR
        : SLOW_CAR;


    const vehicleLabel =
      `C${i + 2}`;


    const opponent =
      new OpponentCar(
        position.x,
        position.y,
        angle,
        opponentColours[i],
        carSettings,
        vehicleLabel
      );


    opponent.behaviour =
      behaviour;


    opponentCars.push(
      opponent
    );
  }
}



// ============================================================
// 37. RANDOM ARENA POSITION
// ============================================================

function getRandomArenaPosition() {

  const margin = 100;


  const minX =
    arena.x -
    arena.w / 2 +
    arena.startZoneWidth +
    margin;


  const maxX =
    arena.x +
    arena.w / 2 -
    margin;


  const minY =
    arena.y -
    arena.h / 2 +
    margin;


  const maxY =
    arena.y +
    arena.h / 2 -
    margin;


  return {

    x:
      random(
        minX,
        maxX
      ),

    y:
      random(
        minY,
        maxY
      )
  };
}



// ============================================================
// 38. COLLISION SYSTEM
// ============================================================

function setupCollisionEvents() {

  Events.on(
    engine,
    "collisionStart",
    function(event) {

      // Collisions should only create gameplay feedback while
      // the physics simulation is actively running.
      if (
        gameState !== STATE_PLAYING
      ) {

        return;
      }


      for (
        const pair
        of event.pairs
      ) {

        const bodyA =
          pair.bodyA;


        const bodyB =
          pair.bodyB;


        // ----------------------------------------------------
        // CAR ↔ CAR
        // ----------------------------------------------------

        if (
          isCarBody(bodyA) &&
          isCarBody(bodyB)
        ) {

          createCarImpactEffects(
            bodyA,
            bodyB
          );
        }


        // ----------------------------------------------------
        // CAR ↔ WALL
        // ----------------------------------------------------

        const carHitWall =
          (
            isCarBody(bodyA) &&
            isWallBody(bodyB)
          )
          ||
          (
            isWallBody(bodyA) &&
            isCarBody(bodyB)
          );


        if (carHitWall) {

          createBarrierImpactEffects(
            bodyA,
            bodyB
          );
        }


        // Opponent-specific collision response.
        handleOpponentCollision(
          bodyA,
          bodyB
        );
      }
    }
  );
}



// ============================================================
// 39. RELATIVE COLLISION SPEED
// ============================================================

function getRelativeImpactSpeed(
  bodyA,
  bodyB
) {

  const relativeX =
    bodyA.velocity.x -
    bodyB.velocity.x;


  const relativeY =
    bodyA.velocity.y -
    bodyB.velocity.y;


  return Math.sqrt(
    relativeX * relativeX +
    relativeY * relativeY
  );
}



// ============================================================
// 40. CAR-TO-CAR IMPACT EFFECTS + SOUND
// ============================================================

function createCarImpactEffects(
  bodyA,
  bodyB
) {

  const impactX =
    (
      bodyA.position.x +
      bodyB.position.x
    ) / 2;


  const impactY =
    (
      bodyA.position.y +
      bodyB.position.y
    ) / 2;


  const impactStrength =
    getRelativeImpactSpeed(
      bodyA,
      bodyB
    );


  // Expanding impact flash.
  impactFlashes.push({

    x: impactX,

    y: impactY,

    size: 15,

    life: 255
  });


  // Direction between the two bodies.
  let directionX =
    bodyB.position.x -
    bodyA.position.x;


  let directionY =
    bodyB.position.y -
    bodyA.position.y;


  const directionLength =
    Math.sqrt(
      directionX * directionX +
      directionY * directionY
    );


  if (
    directionLength > 0
  ) {

    directionX /=
      directionLength;

    directionY /=
      directionLength;
  }


  // Particle burst in one direction.
  createCollisionParticleBurst(
    impactX,
    impactY,
    directionX,
    directionY,
    impactStrength,
    color(255, 190, 60)
  );


  // Smaller opposite burst.
  createCollisionParticleBurst(
    impactX,
    impactY,
    -directionX,
    -directionY,
    impactStrength * 0.7,
    color(255, 235, 150)
  );


  // Screen shake intensity depends upon impact strength.
  screenShake.trigger(
    impactStrength * 1.5
  );


  // ----------------------------------------------------------
  // SOUND
  // ----------------------------------------------------------
  //
  // The same impactStrength value already used by the visual
  // effects is passed to the audio system.
  //
  // This creates multimodal feedback from one physical event:
  //
  // collision strength
  //      ↓
  // particles + shake + sound
  //
  // ----------------------------------------------------------

  if (soundSystem) {

    soundSystem.playCarImpact(
      impactStrength
    );
  }
}



// ============================================================
// 41. CAR-TO-WALL IMPACT EFFECTS + SOUND
// ============================================================

function createBarrierImpactEffects(
  bodyA,
  bodyB
) {

  const carBody =
    isCarBody(bodyA)
      ? bodyA
      : bodyB;


  const wallBody =
    isWallBody(bodyA)
      ? bodyA
      : bodyB;


  let pulseX =
    carBody.position.x;


  let pulseY =
    carBody.position.y;


  let directionX = 0;
  let directionY = 0;


  if (
    wallBody === arena.topWall
  ) {

    pulseY =
      arena.y -
      arena.h / 2;

    directionY = 1;

  } else if (
    wallBody === arena.bottomWall
  ) {

    pulseY =
      arena.y +
      arena.h / 2;

    directionY = -1;

  } else if (
    wallBody === arena.leftWall
  ) {

    pulseX =
      arena.x -
      arena.w / 2;

    directionX = 1;

  } else if (
    wallBody === arena.rightWall
  ) {

    pulseX =
      arena.x +
      arena.w / 2;

    directionX = -1;
  }


  barrierPulses.push({

    x: pulseX,

    y: pulseY,

    size: 18,

    life: 255
  });


  const impactStrength =
    carBody.speed;


  createCollisionParticleBurst(
    pulseX,
    pulseY,
    directionX,
    directionY,
    impactStrength,
    color(255, 145, 40)
  );


  screenShake.trigger(
    impactStrength * 1.2
  );


  // A wall impact deliberately uses a different sound timbre
  // from a car-to-car collision.
  if (soundSystem) {

    soundSystem.playWallImpact(
      impactStrength
    );
  }
}



// ============================================================
// 42. COLLISION PARTICLE BURST
// ============================================================

function createCollisionParticleBurst(
  x,
  y,
  directionX,
  directionY,
  strength,
  particleColour
) {

  const particleCount =
    floor(
      constrain(
        map(
          strength,
          0,
          10,
          5,
          18
        ),
        5,
        18
      )
    );


  const baseAngle =
    atan2(
      directionY,
      directionX
    );


  for (
    let i = 0;
    i < particleCount;
    i++
  ) {

    const particleAngle =
      baseAngle +
      random(
        -0.85,
        0.85
      );


    const particleSpeed =
      random(
        1.5,
        3.5 +
        constrain(
          strength * 0.35,
          0,
          4
        )
      );


    collisionParticles.push(
      new CollisionParticle(
        x,
        y,

        cos(particleAngle) *
          particleSpeed,

        sin(particleAngle) *
          particleSpeed,

        particleColour
      )
    );
  }


  if (
    collisionParticles.length >
    MAX_COLLISION_PARTICLES
  ) {

    collisionParticles.splice(
      0,
      collisionParticles.length -
        MAX_COLLISION_PARTICLES
    );
  }
}



// ============================================================
// 43. PARTICLE UPDATE / DRAW
// ============================================================

function updateCollisionParticles() {

  for (
    let i =
      collisionParticles.length - 1;

    i >= 0;

    i--
  ) {

    collisionParticles[i].update();


    if (
      collisionParticles[i].isFinished()
    ) {

      collisionParticles.splice(
        i,
        1
      );
    }
  }
}


function drawCollisionParticles() {

  for (
    const particle
    of collisionParticles
  ) {

    particle.draw();
  }
}



// ============================================================
// 44. OPPONENT COLLISION RESPONSE
// ============================================================

function handleOpponentCollision(
  bodyA,
  bodyB
) {

  for (
    const opponent
    of opponentCars
  ) {

    const opponentWasHit =
      bodyA === opponent.body ||
      bodyB === opponent.body;


    if (
      !opponentWasHit
    ) {

      continue;
    }


    const otherBody =
      bodyA === opponent.body
        ? bodyB
        : bodyA;


    if (
      isWallBody(
        otherBody
      )
    ) {

      opponent.handleBarrierCollision();

    } else if (
      isCarBody(
        otherBody
      )
    ) {

      opponent.handleCarCollision();
    }
  }
}



// ============================================================
// 45. BODY IDENTIFICATION
// ============================================================

function isCarBody(body) {

  if (
    body === playerCar.body
  ) {

    return true;
  }


  return opponentCars.some(
    opponent =>
      body === opponent.body
  );
}


function isWallBody(body) {

  return (
    body === arena.topWall ||
    body === arena.bottomWall ||
    body === arena.leftWall ||
    body === arena.rightWall
  );
}



// ============================================================
// 46. IMPACT FLASH
// ============================================================

function updateImpactFlashes() {

  for (
    let i =
      impactFlashes.length - 1;

    i >= 0;

    i--
  ) {

    const flash =
      impactFlashes[i];


    flash.size += 3;

    flash.life -= 18;


    if (
      flash.life <= 0
    ) {

      impactFlashes.splice(
        i,
        1
      );
    }
  }
}


function drawImpactFlashes() {

  push();

  noFill();


  for (
    const flash
    of impactFlashes
  ) {

    stroke(
      255,
      190,
      60,
      flash.life
    );

    strokeWeight(3);


    circle(
      flash.x,
      flash.y,
      flash.size
    );


    stroke(
      255,
      245,
      180,
      flash.life
    );

    strokeWeight(2);


    line(
      flash.x - 6,
      flash.y,
      flash.x + 6,
      flash.y
    );


    line(
      flash.x,
      flash.y - 6,
      flash.x,
      flash.y + 6
    );
  }


  pop();
}



// ============================================================
// 47. BARRIER PULSE
// ============================================================

function updateBarrierPulses() {

  for (
    let i =
      barrierPulses.length - 1;

    i >= 0;

    i--
  ) {

    const pulse =
      barrierPulses[i];


    pulse.size += 4;

    pulse.life -= 20;


    if (
      pulse.life <= 0
    ) {

      barrierPulses.splice(
        i,
        1
      );
    }
  }
}


function drawBarrierPulses() {

  push();

  noFill();


  for (
    const pulse
    of barrierPulses
  ) {

    stroke(
      255,
      150,
      40,
      pulse.life
    );

    strokeWeight(3);


    circle(
      pulse.x,
      pulse.y,
      pulse.size
    );
  }


  pop();
}



// ============================================================
// 48. ROBUST KEY DETECTION
// ============================================================
//
// Keyboard events can expose special keys differently across
// browsers/environments.
//
// ENTER and ESC therefore use small helper functions rather
// than depending upon only one representation.
//
// ============================================================

function isEnterKey() {

  return (
    keyCode === ENTER ||
    key === "Enter" ||
    key === "Return"
  );
}


function isEscapeKey() {

  return (
    keyCode === ESCAPE ||
    keyCode === 27 ||
    key === "Escape" ||
    key === "Esc"
  );
}



// ============================================================
// 49. AUDIO UNLOCK
// ============================================================
//
// Modern browsers generally prohibit automatic audio before
// the user has interacted with the page.
//
// Audio is OPTIONAL presentation functionality.
//
// Therefore:
//
//   AUDIO FAILURE != GAME FAILURE
//
// Any failure while requesting access to the AudioContext is
// contained here and must never terminate gameplay.
//
// ============================================================

function unlockGameAudio() {

  try {

    if (
      typeof userStartAudio ===
      "function"
    ) {

      const result =
        userStartAudio();


      // Some versions return a Promise.
      // Prevent a rejected audio-unlock request from becoming
      // an unhandled error.
      if (
        result &&
        typeof result.catch ===
        "function"
      ) {

        result.catch(
          function(error) {

            console.warn(
              "Audio unlock was not available:",
              error
            );
          }
        );
      }
    }

  } catch (error) {

    console.warn(
      "Audio unlock failed. Game will continue without sound:",
      error
    );
  }
}



// ============================================================
// 50. KEYBOARD INPUT
// ============================================================

function keyPressed() {

  // A keyboard interaction is sufficient to unlock browser
  // audio in environments supporting p5.sound.
  unlockGameAudio();


  // ----------------------------------------------------------
  // START SCREEN
  // ----------------------------------------------------------

  if (
    gameState === STATE_START
  ) {

    if (
      isEnterKey()
    ) {

      gameState =
        STATE_MODE_SELECT;

      return false;
    }


    return;
  }


  // ----------------------------------------------------------
  // MODE SELECTION
  // ----------------------------------------------------------

  if (
    gameState === STATE_MODE_SELECT
  ) {

    if (
      key === "1"
    ) {

      startGameMode(
        MODE_PRACTICE
      );

      return false;

    } else if (
      key === "2"
    ) {

      startGameMode(
        MODE_RANDOM
      );

      return false;

    } else if (
      key === "3"
    ) {

      startGameMode(
        MODE_ADVANCED
      );

      return false;

    } else if (
      isEscapeKey()
    ) {

      gameState =
        STATE_START;

      return false;
    }


    return;
  }


  // ----------------------------------------------------------
  // COUNTDOWN
  // ----------------------------------------------------------

  if (
    gameState === STATE_COUNTDOWN
  ) {

    if (
      isEscapeKey()
    ) {

      gameState =
        STATE_MODE_SELECT;

      return false;
    }


    return;
  }


  // ----------------------------------------------------------
  // PAUSED
  // ----------------------------------------------------------

  if (
    gameState === STATE_PAUSED
  ) {

    if (
      key === "p" ||
      key === "P" ||
      isEscapeKey()
    ) {

      resumeGame();

      return false;
    }


    return;
  }


  // ----------------------------------------------------------
  // ACTIVE GAMEPLAY
  // ----------------------------------------------------------

  if (
    gameState === STATE_PLAYING
  ) {

    // Pause.
    if (
      key === "p" ||
      key === "P" ||
      isEscapeKey()
    ) {

      pauseGame();

      return false;
    }


    // Restart.
    if (
      key === "r" ||
      key === "R"
    ) {

      restartCurrentMode();

      return false;
    }


    // Player insertion.
    if (
      key === "i" ||
      key === "I"
    ) {

      insertionArmed =
        true;

      return false;
    }


    // Mode shortcuts.
    if (
      key === "1"
    ) {

      startGameMode(
        MODE_PRACTICE
      );

      return false;

    } else if (
      key === "2"
    ) {

      startGameMode(
        MODE_RANDOM
      );

      return false;

    } else if (
      key === "3"
    ) {

      startGameMode(
        MODE_ADVANCED
      );

      return false;
    }
  }
}



// ============================================================
// 51. ENTER / ESC KEY FALLBACK
// ============================================================

function keyReleased() {

  // ----------------------------------------------------------
  // ENTER FALLBACK
  // ----------------------------------------------------------

  if (
    gameState === STATE_START &&
    isEnterKey()
  ) {

    unlockGameAudio();


    gameState =
      STATE_MODE_SELECT;


    return false;
  }


  // ----------------------------------------------------------
  // ESC FALLBACK
  // ----------------------------------------------------------

  if (
    isEscapeKey()
  ) {

    // Mode selection -> Start screen.
    if (
      gameState === STATE_MODE_SELECT
    ) {

      gameState =
        STATE_START;

      return false;
    }


    // Countdown -> Mode selection.
    if (
      gameState === STATE_COUNTDOWN
    ) {

      gameState =
        STATE_MODE_SELECT;

      return false;
    }


    // Playing -> Paused.
    if (
      gameState === STATE_PLAYING
    ) {

      pauseGame();

      return false;
    }


    // Paused -> Playing.
    if (
      gameState === STATE_PAUSED
    ) {

      resumeGame();

      return false;
    }
  }
}



// ============================================================
// 52. MOUSE INPUT
// ============================================================

function mousePressed() {

  // Mouse interaction also unlocks p5.sound.
  unlockGameAudio();


  // ----------------------------------------------------------
  // START SCREEN
  // ----------------------------------------------------------

  if (
    gameState === STATE_START
  ) {

    if (
      playButton.isHovered()
    ) {

      gameState =
        STATE_MODE_SELECT;
    }


    return;
  }


  // ----------------------------------------------------------
  // MODE SELECTION
  // ----------------------------------------------------------

  if (
    gameState === STATE_MODE_SELECT
  ) {

    if (
      practiceButton.isHovered()
    ) {

      startGameMode(
        MODE_PRACTICE
      );

      return;
    }


    if (
      randomButton.isHovered()
    ) {

      startGameMode(
        MODE_RANDOM
      );

      return;
    }


    if (
      advancedButton.isHovered()
    ) {

      startGameMode(
        MODE_ADVANCED
      );

      return;
    }


    if (
      backButton.isHovered()
    ) {

      gameState =
        STATE_START;

      return;
    }


    return;
  }


  if (
    gameState === STATE_COUNTDOWN
  ) {

    return;
  }


  // ----------------------------------------------------------
  // PAUSED
  // ----------------------------------------------------------

  if (
    gameState === STATE_PAUSED
  ) {

    if (
      resumeButton.isHovered()
    ) {

      resumeGame();

      return;
    }


    if (
      restartButton.isHovered()
    ) {

      restartCurrentMode();

      return;
    }


    if (
      pauseMenuButton.isHovered()
    ) {

      returnToMainMenu();

      return;
    }


    return;
  }


  // ----------------------------------------------------------
  // PLAYING
  // ----------------------------------------------------------

  if (
    gameState === STATE_PLAYING
  ) {

    if (
      menuButton.isHovered()
    ) {

      pauseGame();

      return;
    }


    handlePlayerInsertion();
  }
}



// ============================================================
// 53. PLAYER INSERTION
// ============================================================

function handlePlayerInsertion() {

  if (
    !insertionArmed
  ) {

    return;
  }


  const left =
    arena.x -
    arena.w / 2;


  const right =
    left +
    arena.startZoneWidth;


  const top =
    arena.y -
    arena.h / 2;


  const bottom =
    arena.y +
    arena.h / 2;


  const marginX =
    playerCar.w / 2;


  const marginY =
    playerCar.h / 2;


  const insideStartZone =
    mouseX >= left + marginX &&
    mouseX <= right - marginX &&
    mouseY >= top + marginY &&
    mouseY <= bottom - marginY;


  if (
    !insideStartZone
  ) {

    return;
  }


  if (
    insertionOverlapsCar(
      mouseX,
      mouseY
    )
  ) {

    return;
  }


  playerCar.reset(
    mouseX,
    mouseY,
    HALF_PI
  );


  insertionArmed = false;
}



// ============================================================
// 54. INSERTION OVERLAP CHECK
// ============================================================

function insertionOverlapsCar(
  x,
  y
) {

  const safeDistance = 75;


  for (
    const opponent
    of opponentCars
  ) {

    const dx =
      x -
      opponent.body.position.x;


    const dy =
      y -
      opponent.body.position.y;


    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy
      );


    if (
      distance <
      safeDistance
    ) {

      return true;
    }
  }


  return false;
}



// ============================================================
// 55. RESET GAME
// ============================================================

function resetGame() {

  restartCurrentMode();
}



// ============================================================
// 56. ARENA CLASS
// ============================================================

class Arena {

  constructor(
    x,
    y,
    w,
    h
  ) {

    this.x = x;
    this.y = y;

    this.w = w;
    this.h = h;

    this.wallThickness = 30;

    this.startZoneWidth = 260;


    const startLeft =
      this.x -
      this.w / 2;


    this.playerSpawn = {

      x:
        startLeft +
        PRACTICE_CAR_OFFSET_X,

      y:
        this.y,

      angle:
        HALF_PI
    };


    this.createWalls();
  }



  getPlayerSpawn() {

    return {

      x:
        this.playerSpawn.x,

      y:
        this.playerSpawn.y,

      angle:
        this.playerSpawn.angle
    };
  }



  createWalls() {

    const thickness =
      this.wallThickness;


    const wallOptions = {

      isStatic: true,

      restitution: 0.8,

      friction: 0.2
    };


    this.topWall =
      Bodies.rectangle(
        this.x,
        this.y - this.h / 2,
        this.w,
        thickness,
        wallOptions
      );


    this.bottomWall =
      Bodies.rectangle(
        this.x,
        this.y + this.h / 2,
        this.w,
        thickness,
        wallOptions
      );


    this.leftWall =
      Bodies.rectangle(
        this.x - this.w / 2,
        this.y,
        thickness,
        this.h,
        wallOptions
      );


    this.rightWall =
      Bodies.rectangle(
        this.x + this.w / 2,
        this.y,
        thickness,
        this.h,
        wallOptions
      );


    World.add(
      world,
      [
        this.topWall,
        this.bottomWall,
        this.leftWall,
        this.rightWall
      ]
    );
  }



  draw() {

    push();

    rectMode(CENTER);


    // Main floor.
    noStroke();

    fill(235);

    rect(
      this.x,
      this.y,
      this.w,
      this.h
    );


    // Start Zone.
    fill(145, 210, 225);

    rect(
      this.x -
        this.w / 2 +
        this.startZoneWidth / 2,

      this.y,

      this.startZoneWidth,
      this.h
    );


    // Divider.
    const dividerX =
      this.x -
      this.w / 2 +
      this.startZoneWidth;


    stroke(40);
    strokeWeight(4);

    line(
      dividerX,
      this.y - this.h / 2,
      dividerX,
      this.y + this.h / 2
    );


    // Walls.
    this.drawWall(
      this.topWall
    );

    this.drawWall(
      this.bottomWall
    );

    this.drawWall(
      this.leftWall
    );

    this.drawWall(
      this.rightWall
    );


    // Start Zone label.
    push();


    const startZoneLabelX =
      this.x -
      this.w / 2 +
      START_ZONE_LABEL_OFFSET_X;


    translate(
      startZoneLabelX,
      this.y
    );


    rotate(-HALF_PI);


    noStroke();

    fill(30);

    textAlign(CENTER, CENTER);

    textSize(26);
    textStyle(BOLD);


    text(
      "START ZONE",
      0,
      0
    );


    pop();

    pop();
  }



  drawWall(body) {

    const position =
      body.position;


    push();


    translate(
      position.x,
      position.y
    );


    rotate(
      body.angle
    );


    rectMode(CENTER);


    fill(55);

    stroke(15);
    strokeWeight(3);


    const isHorizontal =
      body === this.topWall ||
      body === this.bottomWall;


    if (
      isHorizontal
    ) {

      rect(
        0,
        0,
        this.w,
        this.wallThickness
      );

    } else {

      rect(
        0,
        0,
        this.wallThickness,
        this.h
      );
    }


    pop();
  }
}



// ============================================================
// 57. BASE CAR CLASS
// ============================================================

class Car {

  constructor(
    x,
    y,
    angle,
    bodyColour,
    carSettings = STANDARD_CAR,
    label = ""
  ) {

    this.w = 50;
    this.h = 82;


    this.bodyColour =
      bodyColour;


    this.label =
      label;


    this.engineForce =
      carSettings.engineForce;


    this.maxSpeed =
      carSettings.maxSpeed;


    this.trail = [];


    this.body =
      Bodies.rectangle(
        x,
        y,
        this.w,
        this.h,
        {
          restitution: 0.65,

          friction: 0.2,

          frictionAir: 0.04,

          density:
            carSettings.density
        }
      );


    Body.setAngle(
      this.body,
      angle
    );


    World.add(
      world,
      this.body
    );
  }



  // ----------------------------------------------------------
  // Player update
  // ----------------------------------------------------------

  update() {

    this.handleControls();


    this.limitForwardSpeed(
      PLAYER_MAX_FORWARD_SPEED,
      PLAYER_MAX_REVERSE_SPEED
    );
  }



  // ----------------------------------------------------------
  // Reset
  // ----------------------------------------------------------

  reset(
    x,
    y,
    angle
  ) {

    Body.setPosition(
      this.body,
      {
        x,
        y
      }
    );


    Body.setAngle(
      this.body,
      angle
    );


    Body.setVelocity(
      this.body,
      {
        x: 0,
        y: 0
      }
    );


    Body.setAngularVelocity(
      this.body,
      0
    );


    this.body.force.x = 0;
    this.body.force.y = 0;

    this.body.torque = 0;


    this.trail = [];
  }



  // ----------------------------------------------------------
  // Controls
  // ----------------------------------------------------------

  handleControls() {

    if (
      keyIsDown(
        UP_ARROW
      )
    ) {

      this.applyThrottle(
        PLAYER_ENGINE_FORCE
      );
    }


    if (
      keyIsDown(
        DOWN_ARROW
      )
    ) {

      this.applyThrottle(
        -PLAYER_REVERSE_FORCE
      );
    }


    if (
      this.body.speed <= 0.05
    ) {

      Body.setAngularVelocity(
        this.body,
        0
      );

      return;
    }


    const forward =
      this.getForwardVector();


    const velocity =
      this.body.velocity;


    const forwardMotion =
      velocity.x * forward.x +
      velocity.y * forward.y;


    const steeringDirection =
      forwardMotion >= 0
        ? 1
        : -1;


    if (
      keyIsDown(
        LEFT_ARROW
      )
    ) {

      Body.setAngularVelocity(
        this.body,
        -PLAYER_STEER_SPEED *
          steeringDirection
      );

    } else if (
      keyIsDown(
        RIGHT_ARROW
      )
    ) {

      Body.setAngularVelocity(
        this.body,
        PLAYER_STEER_SPEED *
          steeringDirection
      );

    } else {

      Body.setAngularVelocity(
        this.body,
        0
      );
    }
  }



  // ----------------------------------------------------------
  // Forward vector
  // ----------------------------------------------------------

  getForwardVector() {

    return {

      x:
        Math.sin(
          this.body.angle
        ),

      y:
        -Math.cos(
          this.body.angle
        )
    };
  }



  // ----------------------------------------------------------
  // Right vector
  // ----------------------------------------------------------

  getRightVector() {

    const forward =
      this.getForwardVector();


    return {

      x:
        -forward.y,

      y:
        forward.x
    };
  }



  // ----------------------------------------------------------
  // Longitudinal velocity
  // ----------------------------------------------------------

  getForwardSpeed() {

    const forward =
      this.getForwardVector();


    return (
      this.body.velocity.x *
        forward.x +
      this.body.velocity.y *
        forward.y
    );
  }



  // ----------------------------------------------------------
  // Apply throttle
  // ----------------------------------------------------------

  applyThrottle(
    forceAmount
  ) {

    const forward =
      this.getForwardVector();


    Body.applyForce(
      this.body,
      this.body.position,
      {

        x:
          forward.x *
          forceAmount,

        y:
          forward.y *
          forceAmount
      }
    );
  }



  // ----------------------------------------------------------
  // Speed limiting
  // ----------------------------------------------------------

  limitForwardSpeed(
    maxForward,
    maxReverse
  ) {

    const forward =
      this.getForwardVector();


    const velocity =
      this.body.velocity;


    const forwardSpeed =
      velocity.x * forward.x +
      velocity.y * forward.y;


    const sidewaysVelocity = {

      x:
        velocity.x -
        forward.x *
        forwardSpeed,

      y:
        velocity.y -
        forward.y *
        forwardSpeed
    };


    const limitedForwardSpeed =
      constrain(
        forwardSpeed,
        -maxReverse,
        maxForward
      );


    if (
      limitedForwardSpeed ===
      forwardSpeed
    ) {

      return;
    }


    Body.setVelocity(
      this.body,
      {

        x:
          forward.x *
            limitedForwardSpeed +
          sidewaysVelocity.x,

        y:
          forward.y *
            limitedForwardSpeed +
          sidewaysVelocity.y
      }
    );
  }



  // ==========================================================
  // PHASE 3 - IMPROVED DUAL-WHEEL TRAIL
  // ==========================================================

  updateTrail() {

    const speed =
      this.body.speed;


    // Generate visible tyre marks once the vehicle has begun
    // moving at a meaningful speed.
    if (
      speed > 0.35 &&
      frameCount % 2 === 0
    ) {

      const forward =
        this.getForwardVector();


      const right =
        this.getRightVector();


      // Approximate the position of the rear axle.
      const rearDistance = 31;

      // Approximate lateral position of each rear wheel.
      const wheelOffset = 18;


      const rearCentreX =
        this.body.position.x -
        forward.x *
        rearDistance;


      const rearCentreY =
        this.body.position.y -
        forward.y *
        rearDistance;


      // Restore stronger visibility while retaining the
      // Phase 3 dual-wheel design.
      const trailSize =
        map(
          speed,
          0,
          PLAYER_MAX_FORWARD_SPEED,
          6,
          12,
          true
        );


      const trailAlpha =
        map(
          speed,
          0,
          PLAYER_MAX_FORWARD_SPEED,
          150,
          235,
          true
        );


      // Rear-left tyre mark.
      this.trail.push({

        x:
          rearCentreX -
          right.x *
          wheelOffset,

        y:
          rearCentreY -
          right.y *
          wheelOffset,

        size:
          trailSize,

        life:
          trailAlpha
      });


      // Rear-right tyre mark.
      this.trail.push({

        x:
          rearCentreX +
          right.x *
          wheelOffset,

        y:
          rearCentreY +
          right.y *
          wheelOffset,

        size:
          trailSize,

        life:
          trailAlpha
      });
    }


    // Fade existing tyre marks.
    for (
      let i =
        this.trail.length - 1;

      i >= 0;

      i--
    ) {

      this.trail[i].life -=
        2.0;


      if (
        this.trail[i].life <= 0
      ) {

        this.trail.splice(
          i,
          1
        );
      }
    }


    // Prevent indefinite trail growth.
    const maxTrailPoints = 240;


    if (
      this.trail.length >
      maxTrailPoints
    ) {

      this.trail.splice(
        0,
        this.trail.length -
          maxTrailPoints
      );
    }
  }



  drawTrail() {

    push();

    noStroke();


    for (
      const point
      of this.trail
    ) {

      fill(
        38,
        40,
        44,
        point.life
      );


      ellipse(
        point.x,
        point.y,
        point.size,
        point.size * 1.45
      );
    }


    pop();
  }



  // ----------------------------------------------------------
  // Vehicle rendering
  // ----------------------------------------------------------

  draw() {

    const position =
      this.body.position;


    push();


    translate(
      position.x,
      position.y
    );


    rotate(
      this.body.angle
    );


    rectMode(CENTER);


    // Wheels.
    noStroke();

    fill(25);

    rect(-27, -22, 10, 25, 4);
    rect(27, -22, 10, 25, 4);
    rect(-27, 22, 10, 25, 4);
    rect(27, 22, 10, 25, 4);


    // Rubber bumper.
    fill(35);

    rect(
      0,
      0,
      58,
      88,
      18
    );


    // Main body.
    fill(
      this.bodyColour
    );

    stroke(20);
    strokeWeight(2);

    rect(
      0,
      0,
      this.w,
      this.h,
      15
    );


    // Windscreen.
    noStroke();

    fill(45, 55, 65);

    rect(
      0,
      -22,
      30,
      22,
      7
    );


    // Headlights.
    fill(255, 235, 120);

    circle(-13, -34, 6);
    circle(13, -34, 6);


    // Identifier.
    if (
      this.label !== ""
    ) {

      noStroke();

      fill(255);

      textAlign(CENTER, CENTER);

      textSize(17);
      textStyle(NORMAL);

      text(
        this.label,
        0,
        8
      );
    }


    pop();
  }
}



// ============================================================
// 58. OPPONENT CAR CLASS
// ============================================================

class OpponentCar
  extends Car {

  constructor(
    x,
    y,
    angle,
    bodyColour,
    carSettings = STANDARD_CAR,
    label = ""
  ) {

    super(
      x,
      y,
      angle,
      bodyColour,
      carSettings,
      label
    );


    this.behaviour =
      "straight";


    this.target = {
      x,
      y
    };


    this.targetRadius =
      OPPONENT_TARGET_RADIUS;


    this.changeTargetTimer =
      0;


    this.collisionCooldown =
      0;


    this.chooseNewTarget();
  }



  update() {

    if (
      this.behaviour ===
      "parked"
    ) {

      Body.setAngularVelocity(
        this.body,
        0
      );

      return;
    }


    if (
      this.collisionCooldown > 0
    ) {

      this.collisionCooldown--;
    }


    if (
      this.behaviour ===
      "straight"
    ) {

      this.updateStraightBehaviour();

      return;
    }


    if (
      this.behaviour ===
      "advanced"
    ) {

      this.updateAdvancedBehaviour();
    }
  }



  updateStraightBehaviour() {

    this.applyThrottle(
      this.engineForce
    );


    this.limitForwardSpeed(
      this.maxSpeed,
      this.maxSpeed
    );
  }



  updateAdvancedBehaviour() {

    this.changeTargetTimer--;


    const distanceToTarget =
      this.getDistanceToTarget();


    if (
      distanceToTarget <
        this.targetRadius ||
      this.changeTargetTimer <= 0
    ) {

      this.chooseNewTarget();
    }


    if (
      this.collisionCooldown <= 0
    ) {

      this.steerTowardTarget();
    }


    this.applyThrottle(
      this.engineForce
    );


    this.limitForwardSpeed(
      this.maxSpeed,
      this.maxSpeed
    );
  }



  getDistanceToTarget() {

    const dx =
      this.target.x -
      this.body.position.x;


    const dy =
      this.target.y -
      this.body.position.y;


    return Math.sqrt(
      dx * dx +
      dy * dy
    );
  }



  chooseNewTarget() {

    const bounds =
      this.getTargetBounds();


    this.target.x =
      random(
        bounds.left,
        bounds.right
      );


    this.target.y =
      random(
        bounds.top,
        bounds.bottom
      );


    this.changeTargetTimer =
      random(
        TARGET_TIMER_MIN,
        TARGET_TIMER_MAX
      );
  }



  getTargetBounds() {

    const margin = 100;


    return {

      left:
        arena.x -
        arena.w / 2 +
        arena.startZoneWidth +
        margin,

      right:
        arena.x +
        arena.w / 2 -
        margin,

      top:
        arena.y -
        arena.h / 2 +
        margin,

      bottom:
        arena.y +
        arena.h / 2 -
        margin
    };
  }



  steerTowardTarget() {

    const dx =
      this.target.x -
      this.body.position.x;


    const dy =
      this.target.y -
      this.body.position.y;


    const desiredAngle =
      Math.atan2(
        dx,
        -dy
      );


    let angleDifference =
      desiredAngle -
      this.body.angle;


    angleDifference =
      Math.atan2(
        Math.sin(
          angleDifference
        ),
        Math.cos(
          angleDifference
        )
      );


    const angleTolerance = 0.05;


    if (
      angleDifference >
      angleTolerance
    ) {

      Body.setAngularVelocity(
        this.body,
        OPPONENT_STEER_SPEED
      );

    } else if (
      angleDifference <
      -angleTolerance
    ) {

      Body.setAngularVelocity(
        this.body,
        -OPPONENT_STEER_SPEED
      );

    } else {

      Body.setAngularVelocity(
        this.body,
        0
      );
    }
  }



  // ----------------------------------------------------------
  // Barrier collision
  // ----------------------------------------------------------

  handleBarrierCollision() {

    if (
      this.collisionCooldown > 0
    ) {

      return;
    }


    const newAngle =
      this.body.angle +
      PI;


    Body.setAngle(
      this.body,
      newAngle
    );


    Body.setAngularVelocity(
      this.body,
      0
    );


    this.collisionCooldown =
      OPPONENT_COLLISION_COOLDOWN;
  }



  // ----------------------------------------------------------
  // Car collision
  // ----------------------------------------------------------

  handleCarCollision() {

    if (
      this.collisionCooldown > 0
    ) {

      return;
    }


    const turnDirection =
      random() < 0.5
        ? -1
        : 1;


    const newAngle =
      this.body.angle +
      turnDirection *
      HALF_PI;


    Body.setAngle(
      this.body,
      newAngle
    );


    Body.setAngularVelocity(
      this.body,
      0
    );


    this.collisionCooldown =
      OPPONENT_COLLISION_COOLDOWN;
  }



  reset(
    x,
    y,
    angle
  ) {

    super.reset(
      x,
      y,
      angle
    );


    this.collisionCooldown =
      0;


    this.chooseNewTarget();
  }
}



// ============================================================
// 59. UI BUTTON CLASS
// ============================================================

class UIButton {

  constructor(
    x,
    y,
    w,
    h,
    label
  ) {

    this.x = x;
    this.y = y;

    this.w = w;
    this.h = h;

    this.label = label;

    this.depth = 8;
  }



  isHovered() {

    return (
      mouseX >=
        this.x - this.w / 2 &&

      mouseX <=
        this.x + this.w / 2 &&

      mouseY >=
        this.y - this.h / 2 &&

      mouseY <=
        this.y + this.h / 2
    );
  }



  draw() {

    const hovered =
      this.isHovered();


    push();

    rectMode(CENTER);


    // Lower 3D layer.
    noStroke();


    fill(
      hovered
        ? color(120, 75, 20)
        : color(25)
    );


    rect(
      this.x,
      this.y + this.depth,
      this.w,
      this.h,
      12
    );


    // Upper face.
    if (
      hovered
    ) {

      fill(255, 180, 55);

    } else {

      fill(65, 72, 82);
    }


    stroke(
      hovered
        ? color(255, 220, 120)
        : color(105)
    );


    strokeWeight(2);


    rect(
      this.x,
      this.y,
      this.w,
      this.h,
      12
    );


    // Label.
    noStroke();


    fill(
      hovered
        ? color(30)
        : color(255)
    );


    textAlign(CENTER, CENTER);

    textStyle(BOLD);


    textSize(
      this.h >= 70
        ? 23
        : 16
    );


    text(
      this.label,
      this.x,
      this.y
    );


    pop();
  }
}



// ============================================================
// 60. KEY INDICATOR CLASS
// ============================================================

class KeyIndicator {

  constructor(
    x,
    y,
    w,
    h,
    label,
    keyCodeValue = null,
    characterKey = null
  ) {

    this.x = x;
    this.y = y;

    this.w = w;
    this.h = h;

    this.label = label;

    this.keyCodeValue =
      keyCodeValue;

    this.characterKey =
      characterKey;

    this.depth = 6;
  }



  isPressed() {

    if (
      this.keyCodeValue !== null
    ) {

      return keyIsDown(
        this.keyCodeValue
      );
    }


    if (
      this.characterKey !== null
    ) {

      return keyIsDown(
        this.characterKey
          .toUpperCase()
          .charCodeAt(0)
      );
    }


    return false;
  }



  draw() {

    const pressed =
      this.isPressed();


    const visibleDepth =
      pressed
        ? 2
        : this.depth;


    const faceY =
      pressed
        ? this.y + 4
        : this.y;


    push();

    rectMode(CENTER);


    // Depth.
    noStroke();

    fill(18, 20, 24);

    rect(
      this.x,
      this.y + visibleDepth,
      this.w,
      this.h,
      7
    );


    // Face.
    if (
      pressed
    ) {

      fill(255, 180, 55);

      stroke(255, 220, 120);

    } else {

      fill(62, 68, 78);

      stroke(105);
    }


    strokeWeight(1.5);


    rect(
      this.x,
      faceY,
      this.w,
      this.h,
      7
    );


    // Label.
    noStroke();


    fill(
      pressed
        ? color(30)
        : color(245)
    );


    textAlign(CENTER, CENTER);

    textStyle(BOLD);


    textSize(
      this.label.length > 1
        ? 12
        : 18
    );


    text(
      this.label,
      this.x,
      faceY
    );


    pop();
  }
}



// ============================================================
// 61. GAME HUD
// ============================================================

class GameHUD {

  constructor() {

    const keySize = 38;

    const centreX = 805;

    const topY = 20;


    // --------------------------------------------------------
    // Arrow keys
    // --------------------------------------------------------

    this.upKey =
      new KeyIndicator(
        centreX,
        topY,
        keySize,
        30,
        "↑",
        UP_ARROW
      );


    this.leftKey =
      new KeyIndicator(
        centreX - 43,
        topY + 34,
        keySize,
        30,
        "←",
        LEFT_ARROW
      );


    this.downKey =
      new KeyIndicator(
        centreX,
        topY + 34,
        keySize,
        30,
        "↓",
        DOWN_ARROW
      );


    this.rightKey =
      new KeyIndicator(
        centreX + 43,
        topY + 34,
        keySize,
        30,
        "→",
        RIGHT_ARROW
      );


    // --------------------------------------------------------
    // Action keys
    // --------------------------------------------------------

    this.insertKey =
      new KeyIndicator(
        1000,
        37,
        42,
        34,
        "I",
        null,
        "I"
      );


    this.resetKey =
      new KeyIndicator(
        1110,
        37,
        42,
        34,
        "R",
        null,
        "R"
      );


    this.pauseKey =
      new KeyIndicator(
        1220,
        37,
        42,
        34,
        "P",
        null,
        "P"
      );
  }



  draw() {

    this.drawTopBar();

    this.drawModeIndicator();

    this.drawControlIndicators();

    this.drawSpeedometer();

    this.drawInsertionMessage();
  }



  // ----------------------------------------------------------
  // HUD background
  // ----------------------------------------------------------

  drawTopBar() {

    push();


    noStroke();

    fill(22, 24, 29, 245);

    rect(
      0,
      0,
      width,
      74
    );


    stroke(255, 255, 255, 28);
    strokeWeight(1);


    line(
      0,
      74,
      width,
      74
    );


    pop();
  }



  // ----------------------------------------------------------
  // Game title + current mode
  // ----------------------------------------------------------

  drawModeIndicator() {

    const accent =
      getModeAccentColour();


    push();


    noStroke();

    fill(accent);


    rect(
      32,
      18,
      5,
      38,
      3
    );


    fill(255);

    textAlign(LEFT, CENTER);

    textStyle(BOLD);
    textSize(15);


    text(
      "DODGEM ARENA",
      50,
      27
    );


    fill(accent);

    textSize(13);


    text(
      getModeName(),
      50,
      49
    );


    pop();
  }



  // ----------------------------------------------------------
  // Keyboard controls
  // ----------------------------------------------------------

  drawControlIndicators() {

    this.upKey.draw();

    this.leftKey.draw();

    this.downKey.draw();

    this.rightKey.draw();


    push();

    noStroke();

    fill(175);

    textAlign(RIGHT, CENTER);

    textStyle(NORMAL);
    textSize(13);


    text(
      "DRIVE",
      730,
      37
    );


    pop();


    this.insertKey.draw();
    this.resetKey.draw();
    this.pauseKey.draw();


    push();

    noStroke();

    fill(185);

    textAlign(LEFT, CENTER);

    textStyle(NORMAL);
    textSize(13);


    text(
      "Insert",
      1028,
      37
    );


    text(
      "Reset",
      1138,
      37
    );


    text(
      "Pause",
      1248,
      37
    );


    pop();
  }



  // ==========================================================
  // REPOSITIONED SPEEDOMETER
  // ==========================================================

  drawSpeedometer() {

    const forwardSpeed =
      playerCar.getForwardSpeed();


    const absoluteSpeed =
      abs(
        forwardSpeed
      );


    const displaySpeed =
      round(
        absoluteSpeed *
        SPEEDOMETER_MULTIPLIER
      );


    const speedRatio =
      constrain(
        absoluteSpeed /
        PLAYER_MAX_FORWARD_SPEED,
        0,
        1
      );


    const panelX = 1360;

    const panelY = 37;

    const panelW = 110;

    const panelH = 48;


    push();

    rectMode(CENTER);


    // Panel background.
    noStroke();

    fill(30, 33, 39);

    rect(
      panelX,
      panelY,
      panelW,
      panelH,
      10
    );


    // Numeric speed.
    textAlign(CENTER, CENTER);

    textStyle(BOLD);

    fill(255);

    textSize(19);


    text(
      displaySpeed,
      panelX - 18,
      panelY - 8
    );


    fill(155);

    textStyle(NORMAL);

    textSize(10);


    text(
      "SPEED",
      panelX + 22,
      panelY - 8
    );


    // Speed bar background.
    rectMode(CORNER);

    const barX =
      panelX - 45;


    const barY =
      panelY + 11;


    const barW = 90;

    const barH = 6;


    fill(55, 60, 68);


    rect(
      barX,
      barY,
      barW,
      barH,
      3
    );


    // Dynamic speed bar.
    if (
      speedRatio > 0
    ) {

      const speedColour =
        lerpColor(
          color(70, 160, 240),
          color(255, 180, 55),
          speedRatio
        );


      fill(speedColour);


      rect(
        barX,
        barY,
        barW * speedRatio,
        barH,
        3
      );
    }


    // Direction indicator.
    rectMode(CENTER);


    fill(
      forwardSpeed < -0.1
        ? color(255, 150, 70)
        : color(130, 190, 255)
    );


    textStyle(BOLD);
    textSize(9);


    text(
      forwardSpeed < -0.1
        ? "REV"
        : "FWD",

      panelX,
      panelY + 22
    );


    pop();
  }



  // ----------------------------------------------------------
  // Player insertion message
  // ----------------------------------------------------------

  drawInsertionMessage() {

    if (
      !insertionArmed
    ) {

      return;
    }


    push();

    rectMode(CENTER);


    // Shadow.
    noStroke();

    fill(0, 0, 0, 80);

    rect(
      width / 2 + 4,
      105,
      440,
      44,
      12
    );


    // Panel.
    fill(255, 180, 55, 235);

    rect(
      width / 2,
      101,
      440,
      44,
      12
    );


    fill(30);

    textAlign(CENTER, CENTER);

    textStyle(BOLD);
    textSize(14);


    text(
      "INSERT MODE  •  Click a free position inside the Start Zone",
      width / 2,
      101
    );


    pop();
  }
}



// ============================================================
// 62. COLLISION PARTICLE CLASS
// ============================================================

class CollisionParticle {

  constructor(
    x,
    y,
    velocityX,
    velocityY,
    particleColour
  ) {

    this.x = x;
    this.y = y;


    this.vx =
      velocityX;


    this.vy =
      velocityY;


    this.size =
      random(
        3,
        7
      );


    this.life = 255;


    this.decay =
      random(
        11,
        18
      );


    this.drag =
      random(
        0.90,
        0.96
      );


    this.particleColour =
      particleColour;
  }



  update() {

    this.x +=
      this.vx;


    this.y +=
      this.vy;


    this.vx *=
      this.drag;


    this.vy *=
      this.drag;


    this.size *=
      0.97;


    this.life -=
      this.decay;
  }



  isFinished() {

    return (
      this.life <= 0 ||
      this.size <= 0.4
    );
  }



  draw() {

    push();

    noStroke();


    fill(
      red(
        this.particleColour
      ),

      green(
        this.particleColour
      ),

      blue(
        this.particleColour
      ),

      this.life
    );


    circle(
      this.x,
      this.y,
      this.size
    );


    pop();
  }
}



// ============================================================
// 63. SCREEN SHAKE CLASS
// ============================================================
//
// Screen shake affects only p5.js drawing coordinates.
//
// It never changes Matter.js body positions and therefore has
// no effect on the actual physics simulation.
//
// ============================================================

class ScreenShake {

  constructor() {

    this.intensity = 0;

    this.maxIntensity = 12;

    this.decay = 0.82;

    this.minimum = 0.15;
  }



  trigger(amount) {

    const requestedIntensity =
      constrain(
        amount,
        0,
        this.maxIntensity
      );


    // max() prevents a small new collision from reducing an
    // already stronger shake.
    this.intensity =
      max(
        this.intensity,
        requestedIntensity
      );
  }



  update() {

    if (
      this.intensity <=
      this.minimum
    ) {

      this.intensity = 0;

      return;
    }


    this.intensity *=
      this.decay;
  }



  getOffset() {

    if (
      this.intensity <= 0
    ) {

      return {
        x: 0,
        y: 0
      };
    }


    return {

      x:
        random(
          -this.intensity,
          this.intensity
        ),

      y:
        random(
          -this.intensity,
          this.intensity
        )
    };
  }



  reset() {

    this.intensity = 0;
  }
}



// ============================================================
// 64. GAME SOUND SYSTEM
// ============================================================
//
// PHASE 3 - SAFE SOUND SYSTEM
//
// IMPORTANT:
//
// Sound is an optional presentation subsystem.
//
// Therefore:
//
//   SOUND FAILURE != GAME FAILURE
//
// This implementation deliberately avoids p5.Envelope.
// Short amplitude ramps are performed directly on each
// p5.Oscillator.
//
// Every sound operation is protected so an incompatibility in
// p5.sound cannot terminate p5.js draw().
//
// ============================================================

class GameSoundSystem {

  constructor() {

    // Overall output level.
    this.masterVolume = 0.40;


    // Prevent many Matter.js contacts from producing a large
    // number of simultaneous collision sounds.
    this.collisionSoundCooldown = 70;


    this.lastCarImpactTime =
      -Infinity;


    this.lastWallImpactTime =
      -Infinity;


    // Individual failures are handled locally. Keeping the
    // system enabled permits a later sound to succeed if the
    // original problem was only a temporary AudioContext state.
    this.enabled = true;
  }



  // ----------------------------------------------------------
  // Check whether oscillator support exists
  // ----------------------------------------------------------

  canPlaySound() {

    return (
      this.enabled &&
      typeof p5 !== "undefined" &&
      typeof p5.Oscillator === "function"
    );
  }



  // ----------------------------------------------------------
  // Generic safe tone generator
  // ----------------------------------------------------------

  playTone(
    frequency,
    duration,
    volume,
    oscillatorType = "sine"
  ) {

    if (
      !this.canPlaySound()
    ) {

      return;
    }


    let oscillator = null;


    try {

      // ------------------------------------------------------
      // Sanitise parameters
      // ------------------------------------------------------

      const safeFrequency =
        constrain(
          Number(frequency) || 440,
          40,
          4000
        );


      const safeDuration =
        constrain(
          Number(duration) || 0.1,
          0.04,
          2.0
        );


      const safeVolume =
        constrain(
          (Number(volume) || 0) *
            this.masterVolume,
          0,
          0.35
        );


      // ------------------------------------------------------
      // Construct oscillator
      // ------------------------------------------------------

      oscillator =
        new p5.Oscillator(
          oscillatorType
        );


      oscillator.freq(
        safeFrequency
      );


      // Always initialise silently before start().
      oscillator.amp(0);


      oscillator.start();


      // ------------------------------------------------------
      // ATTACK
      // ------------------------------------------------------

      oscillator.amp(
        safeVolume,
        0.01
      );


      // ------------------------------------------------------
      // RELEASE
      // ------------------------------------------------------

      const releaseSeconds =
        0.05;


      const releaseDelayMs =
        Math.max(
          10,
          (
            safeDuration -
            releaseSeconds
          ) * 1000
        );


      setTimeout(
        function() {

          try {

            if (oscillator) {

              oscillator.amp(
                0,
                releaseSeconds
              );
            }

          } catch (error) {

            console.warn(
              "Sound release skipped:",
              error
            );
          }

        },
        releaseDelayMs
      );


      // ------------------------------------------------------
      // CLEANUP
      // ------------------------------------------------------

      const stopDelayMs =
        safeDuration * 1000 +
        100;


      setTimeout(
        function() {

          try {

            if (!oscillator) {

              return;
            }


            oscillator.stop();


            if (
              typeof oscillator.dispose ===
              "function"
            ) {

              oscillator.dispose();
            }


            oscillator = null;

          } catch (error) {

            console.warn(
              "Sound cleanup skipped:",
              error
            );
          }

        },
        stopDelayMs
      );


    } catch (error) {

      // ------------------------------------------------------
      // CRITICAL FAULT CONTAINMENT
      // ------------------------------------------------------
      //
      // Never rethrow this error.
      //
      // Otherwise an audio exception could propagate through
      // drawCountdown() into draw() and stop subsequent frames.
      //
      // ------------------------------------------------------

      console.error(
        "Dodgem Arena sound error:",
        error
      );


      if (oscillator) {

        try {

          oscillator.stop();

        } catch (cleanupError) {

          // Intentionally ignored.
        }


        try {

          if (
            typeof oscillator.dispose ===
            "function"
          ) {

            oscillator.dispose();
          }

        } catch (cleanupError) {

          // Intentionally ignored.
        }
      }
    }
  }



  // ----------------------------------------------------------
  // Countdown beep
  // ----------------------------------------------------------

  playCountdownBeep() {

    try {

      this.playTone(
        440,
        0.13,
        0.42,
        "sine"
      );

    } catch (error) {

      console.warn(
        "Countdown sound skipped:",
        error
      );
    }
  }



  // ----------------------------------------------------------
  // GO sound
  // ----------------------------------------------------------

  playGo() {

    try {

      this.playTone(
        880,
        0.24,
        0.52,
        "sine"
      );


      setTimeout(
        () => {

          try {

            this.playTone(
              1320,
              0.13,
              0.18,
              "sine"
            );

          } catch (error) {

            console.warn(
              "GO harmonic skipped:",
              error
            );
          }

        },
        45
      );

    } catch (error) {

      console.warn(
        "GO sound skipped:",
        error
      );
    }
  }



  // ----------------------------------------------------------
  // Car-to-car collision
  // ----------------------------------------------------------

  playCarImpact(
    impactStrength
  ) {

    const currentTime =
      millis();


    if (
      currentTime -
        this.lastCarImpactTime <
      this.collisionSoundCooldown
    ) {

      return;
    }


    this.lastCarImpactTime =
      currentTime;


    try {

      const strength =
        constrain(
          impactStrength,
          0,
          10
        );


      // Ignore extremely weak contacts.
      if (
        strength < 0.35
      ) {

        return;
      }


      const frequency =
        map(
          strength,
          0,
          10,
          180,
          85,
          true
        );


      const volume =
        map(
          strength,
          0,
          10,
          0.12,
          0.58,
          true
        );


      const duration =
        map(
          strength,
          0,
          10,
          0.07,
          0.18,
          true
        );


      this.playTone(
        frequency,
        duration,
        volume,
        "triangle"
      );


      if (
        strength > 3
      ) {

        this.playTone(
          frequency * 1.8,
          duration * 0.55,
          volume * 0.35,
          "sine"
        );
      }

    } catch (error) {

      console.warn(
        "Car collision sound skipped:",
        error
      );
    }
  }



  // ----------------------------------------------------------
  // Car-to-wall collision
  // ----------------------------------------------------------

  playWallImpact(
    impactStrength
  ) {

    const currentTime =
      millis();


    if (
      currentTime -
        this.lastWallImpactTime <
      this.collisionSoundCooldown
    ) {

      return;
    }


    this.lastWallImpactTime =
      currentTime;


    try {

      const strength =
        constrain(
          impactStrength,
          0,
          10
        );


      // Do not play audio for tiny resting contacts.
      if (
        strength < 0.40
      ) {

        return;
      }


      const frequency =
        map(
          strength,
          0,
          10,
          135,
          60,
          true
        );


      const volume =
        map(
          strength,
          0,
          10,
          0.10,
          0.52,
          true
        );


      const duration =
        map(
          strength,
          0,
          10,
          0.06,
          0.16,
          true
        );


      this.playTone(
        frequency,
        duration,
        volume,
        "square"
      );

    } catch (error) {

      console.warn(
        "Wall collision sound skipped:",
        error
      );
    }
  }
}
