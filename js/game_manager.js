var defaultVal = {
  heightWeight: 0.510066,
  linesWeight: 0.760666,
  holesWeight: 0.35663,
  bumpinessWeight: 0.184483
}

var linesPerLevel = 10
var baseGravity = 400
var letters = '0123456789ABCDEF';

function getRandomColor() {
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function getOpposedColor(color = '') {
  return '#' + color.slice(1,).split('').map(digit => {
    const val = 0xF - parseInt('0x' + digit, 16)
    return letters[val]
  }).join('')
}

class Color {
  constructor(r, g, b) {
    this.set(r, g, b);
  }

  toString() {
    return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
  }

  set(r, g, b) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
  }

  hueRotate(angle = 0) {
    angle = angle / 180 * Math.PI;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    this.multiply([
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ]);
  }

  grayscale(value = 1) {
    this.multiply([
      0.2126 + 0.7874 * (1 - value),
      0.7152 - 0.7152 * (1 - value),
      0.0722 - 0.0722 * (1 - value),
      0.2126 - 0.2126 * (1 - value),
      0.7152 + 0.2848 * (1 - value),
      0.0722 - 0.0722 * (1 - value),
      0.2126 - 0.2126 * (1 - value),
      0.7152 - 0.7152 * (1 - value),
      0.0722 + 0.9278 * (1 - value),
    ]);
  }

  sepia(value = 1) {
    this.multiply([
      0.393 + 0.607 * (1 - value),
      0.769 - 0.769 * (1 - value),
      0.189 - 0.189 * (1 - value),
      0.349 - 0.349 * (1 - value),
      0.686 + 0.314 * (1 - value),
      0.168 - 0.168 * (1 - value),
      0.272 - 0.272 * (1 - value),
      0.534 - 0.534 * (1 - value),
      0.131 + 0.869 * (1 - value),
    ]);
  }

  saturate(value = 1) {
    this.multiply([
      0.213 + 0.787 * value,
      0.715 - 0.715 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 + 0.285 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 - 0.715 * value,
      0.072 + 0.928 * value,
    ]);
  }

  multiply(matrix) {
    const newR = this.clamp(this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2]);
    const newG = this.clamp(this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5]);
    const newB = this.clamp(this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8]);
    this.r = newR;
    this.g = newG;
    this.b = newB;
  }

  brightness(value = 1) {
    this.linear(value);
  }

  contrast(value = 1) {
    this.linear(value, -(0.5 * value) + 0.5);
  }

  linear(slope = 1, intercept = 0) {
    this.r = this.clamp(this.r * slope + intercept * 255);
    this.g = this.clamp(this.g * slope + intercept * 255);
    this.b = this.clamp(this.b * slope + intercept * 255);
  }

  invert(value = 1) {
    this.r = this.clamp((value + this.r / 255 * (1 - 2 * value)) * 255);
    this.g = this.clamp((value + this.g / 255 * (1 - 2 * value)) * 255);
    this.b = this.clamp((value + this.b / 255 * (1 - 2 * value)) * 255);
  }

  hsl() {
    // Code taken from https://stackoverflow.com/a/9493060/2688027, licensed under CC BY-SA.
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;

        case g:
          h = (b - r) / d + 2;
          break;

        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 100,
      s: s * 100,
      l: l * 100,
    };
  }

  clamp(value) {
    if (value > 255) {
      value = 255;
    } else if (value < 0) {
      value = 0;
    }
    return value;
  }
}

class Solver {
  constructor(target, baseColor) {
    this.target = target;
    this.targetHSL = target.hsl();
    this.reusedColor = new Color(0, 0, 0);
  }

  solve() {
    const result = this.solveNarrow(this.solveWide());
    return {
      values: result.values,
      loss: result.loss,
      filter: this.css(result.values),
    };
  }

  solveWide() {
    const A = 5;
    const c = 15;
    const a = [60, 180, 18000, 600, 1.2, 1.2];

    let best = {loss: Infinity};
    for (let i = 0; best.loss > 25 && i < 3; i++) {
      const initial = [50, 20, 3750, 50, 100, 100];
      const result = this.spsa(A, a, c, initial, 1000);
      if (result.loss < best.loss) {
        best = result;
      }
    }
    return best;
  }

  solveNarrow(wide) {
    const A = wide.loss;
    const c = 2;
    const A1 = A + 1;
    const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
    return this.spsa(A, a, c, wide.values, 500);
  }

  spsa(A, a, c, values, iters) {
    const alpha = 1;
    const gamma = 0.16666666666666666;

    let best = null;
    let bestLoss = Infinity;
    const deltas = new Array(6);
    const highArgs = new Array(6);
    const lowArgs = new Array(6);

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);
      for (let i = 0; i < 6; i++) {
        deltas[i] = Math.random() > 0.5 ? 1 : -1;
        highArgs[i] = values[i] + ck * deltas[i];
        lowArgs[i] = values[i] - ck * deltas[i];
      }

      const lossDiff = this.loss(highArgs) - this.loss(lowArgs);
      for (let i = 0; i < 6; i++) {
        const g = lossDiff / (2 * ck) * deltas[i];
        const ak = a[i] / Math.pow(A + k + 1, alpha);
        values[i] = fix(values[i] - ak * g, i);
      }

      const loss = this.loss(values);
      if (loss < bestLoss) {
        best = values.slice(0);
        bestLoss = loss;
      }
    }
    return {values: best, loss: bestLoss};

    function fix(value, idx) {
      let max = 100;
      if (idx === 2 /* saturate */) {
        max = 7500;
      } else if (idx === 4 /* brightness */ || idx === 5 /* contrast */) {
        max = 200;
      }

      if (idx === 3 /* hue-rotate */) {
        if (value > max) {
          value %= max;
        } else if (value < 0) {
          value = max + value % max;
        }
      } else if (value < 0) {
        value = 0;
      } else if (value > max) {
        value = max;
      }
      return value;
    }
  }

  loss(filters) {
    // Argument is array of percentages.
    const color = this.reusedColor;
    color.set(0, 0, 0);

    color.invert(filters[0] / 100);
    color.sepia(filters[1] / 100);
    color.saturate(filters[2] / 100);
    color.hueRotate(filters[3] * 3.6);
    color.brightness(filters[4] / 100);
    color.contrast(filters[5] / 100);

    const colorHSL = color.hsl();
    return (
        Math.abs(color.r - this.target.r) +
        Math.abs(color.g - this.target.g) +
        Math.abs(color.b - this.target.b) +
        Math.abs(colorHSL.h - this.targetHSL.h) +
        Math.abs(colorHSL.s - this.targetHSL.s) +
        Math.abs(colorHSL.l - this.targetHSL.l)
    );
  }

  css(filters) {
    function fmt(idx, multiplier = 1) {
      return Math.round(filters[idx] * multiplier);
    }

    return `invert(${fmt(0)}%) sepia(${fmt(1)}%) saturate(${fmt(2)}%) hue-rotate(${fmt(3, 3.6)}deg) brightness(${fmt(4)}%) contrast(${fmt(5)}%)`;
  }
}

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
      ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
      : null;
}


function toggleMode() {
  const g = document.querySelector('body');
  const b = document.querySelector('.grid');
  const c = getRandomColor()
  const negC = getOpposedColor(c)

  g.style.setProperty('background', c)
  g.style.setProperty('color', negC)
  // b.style.setProperty('background-color', c)

  const rgb = hexToRgb(negC);

  const color = new Color(rgb[0], rgb[1], rgb[2]);
  const solver = new Solver(color);
  const result = solver.solve();
  b.style.setProperty('filter', result.filter)
  document.querySelector('#next-canvas').style.setProperty('filter', result.filter)
}

function GameManager(
    heightWeight = defaultVal.heightWeight,
    linesWeight = defaultVal.linesWeight,
    holesWeight = defaultVal.holesWeight,
    bumpinessWeight = defaultVal.bumpinessWeight,
) {
  var gridCanvas = document.getElementById('grid-canvas');
  var nextCanvas = document.getElementById('next-canvas');
  var scoreContainer = document.getElementById("score-container");
  var lvContainer = document.getElementById("lv-container");
  var resetButton = document.getElementById('reset-button');
  var aiButton = document.getElementById('ai-button');
  var gridContext = gridCanvas.getContext('2d');
  var nextContext = nextCanvas.getContext('2d');
  document.addEventListener('keydown', onKeyDown);

  var grid = new Grid(22, 10);
  var rpg = new RandomPieceGenerator();
  var geneticAI = new AI({
    heightWeight: heightWeight,
    linesWeight: linesWeight,
    holesWeight: holesWeight,
    bumpinessWeight: bumpinessWeight
  });
  var workingPieces = [null, rpg.nextPiece()];
  var workingPiece = null;
  var isAiActive = true;
  var isKeyEnabled = false;
  var gravityTimer = new Timer(onGravityTimerTick, baseGravity);
  var score = 0;

  // Graphics
  function intToRGBHexString(v) {
    return 'rgb(' + ((v >> 16) & 0xFF) + ',' + ((v >> 8) & 0xFF) + ',' + (v & 0xFF) + ')';
  }

  function redrawGridCanvas(workingPieceVerticalOffset = 0) {
    gridContext.save();

    // Clear
    gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

    // Draw grid
    for (var r = 2; r < grid.rows; r++) {
      for (var c = 0; c < grid.columns; c++) {
        if (grid.cells[r][c] != 0) {
          gridContext.fillStyle = intToRGBHexString(grid.cells[r][c]);
          gridContext.fillRect(20 * c, 20 * (r - 2), 20, 20);
          gridContext.strokeStyle = "#FFFFFF";
          gridContext.strokeRect(20 * c, 20 * (r - 2), 20, 20);
        }
      }
    }

    // Draw working piece
    for (var r = 0; r < workingPiece.dimension; r++) {
      for (var c = 0; c < workingPiece.dimension; c++) {
        if (workingPiece.cells[r][c] != 0) {
          gridContext.fillStyle = intToRGBHexString(workingPiece.cells[r][c]);
          gridContext.fillRect(20 * (c + workingPiece.column), 20 * ((r + workingPiece.row) - 2) + workingPieceVerticalOffset, 20, 20);
          gridContext.strokeStyle = "#FFFFFF";
          gridContext.strokeRect(20 * (c + workingPiece.column), 20 * ((r + workingPiece.row) - 2) + workingPieceVerticalOffset, 20, 20);
        }
      }
    }

    gridContext.restore();
  }

  function redrawNextCanvas() {
    nextContext.save();

    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    var next = workingPieces[1];
    var xOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 10 : next.dimension == 4 ? 0 : null;
    var yOffset = next.dimension == 2 ? 20 : next.dimension == 3 ? 20 : next.dimension == 4 ? 10 : null;
    for (var r = 0; r < next.dimension; r++) {
      for (var c = 0; c < next.dimension; c++) {
        if (next.cells[r][c] != 0) {
          nextContext.fillStyle = intToRGBHexString(next.cells[r][c]);
          nextContext.fillRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
          nextContext.strokeStyle = "#FFFFFF";
          nextContext.strokeRect(xOffset + 20 * c, yOffset + 20 * r, 20, 20);
        }
      }
    }

    nextContext.restore();
  }

  var currentLV = 0

  function updateScoreContainer() {
    scoreContainer.innerHTML = score.toString();
    const newLV = Math.floor(score / linesPerLevel)
    if (newLV !== currentLV) {
      console.log(newLV)
      currentLV = newLV
      lvContainer.innerText = newLV.toString()
      toggleMode()
      // gravityTimer = new Timer(onGravityTimerTick, Math.max(100, baseGravity - newLV * 100));
    }
  }

  // Drop animation
  var workingPieceDropAnimationStopwatch = null;

  function startWorkingPieceDropAnimation(callback = function () {
  }) {
    // Calculate animation height
    animationHeight = 0;
    _workingPiece = workingPiece.clone();
    while (_workingPiece.moveDown(grid)) {
      animationHeight++;
    }

    var stopwatch = new Stopwatch(function (elapsed) {
      if (elapsed >= animationHeight * 20) {
        stopwatch.stop();
        redrawGridCanvas(20 * animationHeight);
        callback();
        return;
      }

      redrawGridCanvas(20 * elapsed / 20);
    });

    workingPieceDropAnimationStopwatch = stopwatch;
  }

  function cancelWorkingPieceDropAnimation() {
    if (workingPieceDropAnimationStopwatch === null) {
      return;
    }
    workingPieceDropAnimationStopwatch.stop();
    workingPieceDropAnimationStopwatch = null;
  }

  // Process start of turn
  function startTurn() {
    // Shift working pieces
    for (var i = 0; i < workingPieces.length - 1; i++) {
      workingPieces[i] = workingPieces[i + 1];
    }
    workingPieces[workingPieces.length - 1] = rpg.nextPiece();
    workingPiece = workingPieces[0];

    // Refresh Graphics
    redrawGridCanvas();
    redrawNextCanvas();

    if (isAiActive) {
      isKeyEnabled = false;
      workingPiece = geneticAI.best(grid, workingPieces);
      startWorkingPieceDropAnimation(function () {
        while (workingPiece.moveDown(grid)) ; // Drop working piece
        if (!endTurn()) {
          alert('Game Over!');
          return;
        }
        startTurn();
      })
    } else {
      isKeyEnabled = true;
      gravityTimer.resetForward(500);
    }
  }

  // Process end of turn
  function endTurn() {
    // Add working piece
    grid.addPiece(workingPiece);

    // Clear lines
    score += grid.clearLines();

    // Refresh graphics
    redrawGridCanvas();
    updateScoreContainer();

    return !grid.exceeded();
  }

  // Process gravity tick
  function onGravityTimerTick() {
    // If working piece has not reached bottom
    if (workingPiece.canMoveDown(grid)) {
      workingPiece.moveDown(grid);
      redrawGridCanvas();
      return;
    }

    // Stop gravity if working piece has reached bottom
    gravityTimer.stop();

    // If working piece has reached bottom, end of turn has been processed
    // and game cannot continue because grid has been exceeded
    if (!endTurn()) {
      isKeyEnabled = false;
      alert('Game Over!');
      return;
    }

    // If working piece has reached bottom, end of turn has been processed
    // and game can still continue.
    startTurn();
  }

  // Process keys
  function onKeyDown(event) {
    if (!isKeyEnabled) {
      return;
    }
    switch (event.which) {
      case 32: // spacebar
        isKeyEnabled = false;
        gravityTimer.stop(); // Stop gravity
        startWorkingPieceDropAnimation(function () { // Start drop animation
          while (workingPiece.moveDown(grid)) ; // Drop working piece
          if (!endTurn()) {
            alert('Game Over!');
            return;
          }
          startTurn();
        });
        break;
      case 40: // down
        gravityTimer.resetForward(500);
        break;
      case 37: //left
        if (workingPiece.canMoveLeft(grid)) {
          workingPiece.moveLeft(grid);
          redrawGridCanvas();
        }
        break;
      case 39: //right
        if (workingPiece.canMoveRight(grid)) {
          workingPiece.moveRight(grid);
          redrawGridCanvas();
        }
        break;
      case 38: //up
        workingPiece.rotate(grid);
        redrawGridCanvas();
        break;
    }
  }

  aiButton.onclick = function () {
    if (isAiActive) {
      isAiActive = false;
      aiButton.style.backgroundColor = "#f9f9f9";
      aiButton.innerText = 'Run AI'
    } else {
      isAiActive = true;
      aiButton.style.backgroundColor = "#e9e9ff";
      aiButton.innerText = 'Human Mode'

      isKeyEnabled = false;
      gravityTimer.stop();
      startWorkingPieceDropAnimation(function () { // Start drop animation
        while (workingPiece.moveDown(grid)) ; // Drop working piece
        if (!endTurn()) {
          alert('Game Over!');
          return;
        }
        startTurn();
      });
    }
  }

  resetButton.onclick = function () {
    gravityTimer.stop();
    cancelWorkingPieceDropAnimation();
    grid = new Grid(22, 10);
    rpg = new RandomPieceGenerator();
    workingPieces = [null, rpg.nextPiece()];
    workingPiece = null;
    score = 0;
    isKeyEnabled = true;
    updateScoreContainer();
    const currentParameters = Array.from(document.querySelectorAll('.vector-container .vector-input'))
        .map(x => parseFloat(x.value))

    const isValid = currentParameters.every(v => isNaN(v) || (v >= 0 && v <= 1))
    if (!isValid) {
      alert("Invalid weight!")
    }

    const finalWeights = Object.keys(defaultVal)
        .reduce((acc, key, index) => {
          console.log(defaultVal[key], currentParameters[index])
          acc[key] = (isNaN(currentParameters[index]) || !isValid) ? defaultVal[key] : currentParameters[index]
          return acc
        }, {})

    console.log(finalWeights)
    geneticAI = new AI(finalWeights)

    //clear input
    document.querySelectorAll('.vector-container .vector-input')
        .forEach(el => el.value = '')
    document.querySelectorAll('.vector-display-container .current-v .val')
        .forEach(function (el, index) {
          el.innerText = Object.values(finalWeights)[index]
        })

    startTurn();
  }


  aiButton.style.backgroundColor = "#e9e9ff";
  startTurn();
}
