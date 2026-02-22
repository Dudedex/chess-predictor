const PIECE_UNICODE = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const boardEl = document.getElementById("board");
const moveModeBtn = document.getElementById("moveModeBtn");
const placeModeBtn = document.getElementById("placeModeBtn");
const mySideSelect = document.getElementById("mySideSelect");
const boardSideSelect = document.getElementById("boardSideSelect");
const piecePalette = document.getElementById("piecePalette");

let mode = "move";
let mySide = "w";
let boardPerspective = "w";
let selectedSquare = null;
let legalMoves = [];
let selectedPalettePiece = "wp";
let isPaintingInPlaceMode = false;

let board = createInitialBoard();

initPalette();
wireEvents();
render();

function wireEvents() {
  moveModeBtn.addEventListener("click", () => setMode("move"));
  placeModeBtn.addEventListener("click", () => setMode("place"));
  mySideSelect.addEventListener("change", () => {
    mySide = mySideSelect.value;
    render();
  });
  boardSideSelect.addEventListener("change", () => {
    boardPerspective = boardSideSelect.value;
    render();
  });
  document.addEventListener("mouseup", () => {
    isPaintingInPlaceMode = false;
  });
}

function setMode(nextMode) {
  mode = nextMode;
  moveModeBtn.classList.toggle("active", mode === "move");
  placeModeBtn.classList.toggle("active", mode === "place");
  piecePalette.disabled = mode !== "place";
  selectedSquare = null;
  legalMoves = [];
  render();
}

function initPalette() {
  const placementChoices = [
    "wk",
    "wq",
    "wr",
    "wb",
    "wn",
    "wp",
    "bk",
    "bq",
    "br",
    "bb",
    "bn",
    "bp",
  ];

  placementChoices.forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = PIECE_UNICODE[piece];
    button.title = piece;
    button.classList.toggle("selected", piece === selectedPalettePiece);
    button.addEventListener("click", () => {
      selectedPalettePiece = piece;
      [...piecePalette.querySelectorAll("button")].forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
    });
    piecePalette.append(button);
  });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "⨯";
  clearButton.title = "Clear square";
  clearButton.addEventListener("click", () => {
    selectedPalettePiece = "";
    [...piecePalette.querySelectorAll("button")].forEach((btn) => btn.classList.remove("selected"));
    clearButton.classList.add("selected");
  });
  piecePalette.append(clearButton);
}

function render() {
  boardEl.innerHTML = "";
  const myCaptures = getCapturableSquares(mySide);
  const oppCaptures = getCapturableSquares(mySide === "w" ? "b" : "w");
  const attackedOccupiedSquares = getAttackedOccupiedSquares();

  for (let displayRow = 0; displayRow < 8; displayRow += 1) {
    for (let displayCol = 0; displayCol < 8; displayCol += 1) {
      const { row, col } = toBoardCoords(displayRow, displayCol);
      const square = document.createElement("div");
      square.className = `square ${(displayRow + displayCol) % 2 ? "dark" : "light"}`;

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add("selected");
      }
      if (legalMoves.some((m) => m.row === row && m.col === col)) {
        square.classList.add("legal");
      }
      if (myCaptures.has(key(row, col))) {
        square.classList.add("capture-green");
      }
      if (oppCaptures.has(key(row, col))) {
        square.classList.add("capture-red");
      }
      if (attackedOccupiedSquares.has(key(row, col))) {
        square.classList.add("attack-line");
      }

      const piece = board[row][col];
      square.textContent = piece ? PIECE_UNICODE[piece] : "";
      const coord = document.createElement("span");
      coord.className = "coord";
      coord.textContent = `${FILES[col]}${8 - row}`;
      square.append(coord);
      square.addEventListener("click", () => onSquareClick(row, col));
      square.addEventListener("mousedown", (event) => onSquareMouseDown(event, row, col));
      square.addEventListener("mouseenter", (event) => onSquareMouseEnter(event, row, col));
      square.addEventListener("contextmenu", (event) => onSquareRightClick(event, row, col));
      square.addEventListener("dragstart", (event) => event.preventDefault());
      boardEl.append(square);
    }
  }
}


function onSquareMouseDown(event, row, col) {
  if (mode !== "place" || event.button !== 0) {
    return;
  }

  event.preventDefault();
  isPaintingInPlaceMode = true;
  applyPalettePiece(row, col);
}

function onSquareMouseEnter(event, row, col) {
  if (mode !== "place" || !isPaintingInPlaceMode) {
    return;
  }

  if ((event.buttons & 1) !== 1) {
    isPaintingInPlaceMode = false;
    return;
  }

  applyPalettePiece(row, col);
}

function applyPalettePiece(row, col) {
  board[row][col] = selectedPalettePiece || "";
  selectedSquare = null;
  legalMoves = [];
  render();
}

function onSquareRightClick(event, row, col) {
  event.preventDefault();
  if (!board[row][col]) {
    return;
  }
  board[row][col] = "";
  selectedSquare = null;
  legalMoves = [];
  render();
}

function onSquareClick(row, col) {
  if (mode === "place") {
    applyPalettePiece(row, col);
    return;
  }

  const clickedPiece = board[row][col];

  if (selectedSquare && legalMoves.some((move) => move.row === row && move.col === col)) {
    board[row][col] = board[selectedSquare.row][selectedSquare.col];
    board[selectedSquare.row][selectedSquare.col] = "";
    selectedSquare = null;
    legalMoves = [];
    render();
    return;
  }

  if (!clickedPiece) {
    selectedSquare = null;
    legalMoves = [];
    render();
    return;
  }

  selectedSquare = { row, col };
  legalMoves = getLegalMoves(row, col, clickedPiece);
  render();
}

function createInitialBoard() {
  return [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  ];
}

function getLegalMoves(row, col, piece) {
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    if (isInBounds(row + dir, col) && !board[row + dir][col]) {
      moves.push({ row: row + dir, col });
      if (row === startRow && !board[row + 2 * dir][col]) {
        moves.push({ row: row + 2 * dir, col });
      }
    }

    [-1, 1].forEach((dc) => {
      const nr = row + dir;
      const nc = col + dc;
      if (!isInBounds(nr, nc)) {
        return;
      }
      const target = board[nr][nc];
      if (target && target[0] !== color) {
        moves.push({ row: nr, col: nc });
      }
    });

    return moves;
  }

  if (type === "n") {
    const jumps = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    jumps.forEach(([dr, dc]) => pushIfValidMove(row + dr, col + dc, color, moves));
    return moves;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) {
          continue;
        }
        pushIfValidMove(row + dr, col + dc, color, moves);
      }
    }
    return moves;
  }

  const directions = [];
  if (["b", "q"].includes(type)) {
    directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  }
  if (["r", "q"].includes(type)) {
    directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  }

  directions.forEach(([dr, dc]) => {
    let nr = row + dr;
    let nc = col + dc;

    while (isInBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push({ row: nr, col: nc });
      } else {
        if (target[0] !== color) {
          moves.push({ row: nr, col: nc });
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  });

  return moves;
}

function getCapturableSquares(color) {
  const captureSquares = new Set();

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || piece[0] !== color) {
        continue;
      }
      getAttackSquaresForPiece(row, col, piece).forEach((sq) => captureSquares.add(key(sq.row, sq.col)));
    }
  }

  return captureSquares;
}

function getAttackedOccupiedSquares() {
  const attacked = new Set();
  const whiteAttacks = getCapturableSquares("w");
  const blackAttacks = getCapturableSquares("b");

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) {
        continue;
      }
      const enemyAttacks = piece[0] === "w" ? blackAttacks : whiteAttacks;
      if (enemyAttacks.has(key(row, col))) {
        attacked.add(key(row, col));
      }
    }
  }

  return attacked;
}

function getAttackSquaresForPiece(row, col, piece) {
  const color = piece[0];
  const type = piece[1];
  const attacks = [];

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    [-1, 1].forEach((dc) => {
      const nr = row + dir;
      const nc = col + dc;
      if (isInBounds(nr, nc)) {
        attacks.push({ row: nr, col: nc });
      }
    });
    return attacks;
  }

  if (type === "n") {
    [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => {
      if (isInBounds(row + dr, col + dc)) {
        attacks.push({ row: row + dr, col: col + dc });
      }
    });
    return attacks;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) {
          continue;
        }
        if (isInBounds(row + dr, col + dc)) {
          attacks.push({ row: row + dr, col: col + dc });
        }
      }
    }
    return attacks;
  }

  const directions = [];
  if (["b", "q"].includes(type)) {
    directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  }
  if (["r", "q"].includes(type)) {
    directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  }

  directions.forEach(([dr, dc]) => {
    let nr = row + dr;
    let nc = col + dc;

    while (isInBounds(nr, nc)) {
      attacks.push({ row: nr, col: nc });
      if (board[nr][nc]) {
        break;
      }
      nr += dr;
      nc += dc;
    }
  });

  return attacks;
}

function pushIfValidMove(row, col, color, collection) {
  if (!isInBounds(row, col)) {
    return;
  }
  const target = board[row][col];
  if (!target || target[0] !== color) {
    collection.push({ row, col });
  }
}

function toBoardCoords(displayRow, displayCol) {
  if (boardPerspective === "b") {
    return { row: 7 - displayRow, col: 7 - displayCol };
  }
  return { row: displayRow, col: displayCol };
}

function key(row, col) {
  return `${row},${col}`;
}

function isInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}
