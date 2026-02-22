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

const PIECE_LETTER = {
  p: "",
  n: "N",
  b: "B",
  r: "R",
  q: "Q",
  k: "K",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const boardEl = document.getElementById("board");
const moveModeBtn = document.getElementById("moveModeBtn");
const placeModeBtn = document.getElementById("placeModeBtn");
const mySideSelect = document.getElementById("mySideSelect");
const boardSideSelect = document.getElementById("boardSideSelect");
const piecePalette = document.getElementById("piecePalette");
const whitePaletteEl = document.getElementById("whitePalette");
const blackPaletteEl = document.getElementById("blackPalette");
const toolPaletteEl = document.getElementById("toolPalette");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const historyListEl = document.getElementById("historyList");

let mode = "move";
let mySide = "w";
let boardPerspective = "w";
let selectedSquare = null;
let legalMoves = [];
let selectedPalettePiece = "wp";
let selectedPlaceSource = null;
let hoveredPiece = null;

let board = createInitialBoard();
let historySnapshots = [cloneBoard(board)];
let moveHistory = [];
let historyPointer = 0;

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
  boardEl.addEventListener("mouseleave", () => {
    if (!hoveredPiece) {
      return;
    }
    hoveredPiece = null;
    render();
  });
  undoBtn.addEventListener("click", undoMove);
  redoBtn.addEventListener("click", redoMove);
}

function setMode(nextMode) {
  mode = nextMode;
  moveModeBtn.classList.toggle("active", mode === "move");
  placeModeBtn.classList.toggle("active", mode === "place");
  piecePalette.disabled = mode !== "place";
  selectedSquare = null;
  selectedPlaceSource = null;
  hoveredPiece = null;
  legalMoves = [];
  render();
}

function initPalette() {
  const whitePieces = ["wk", "wq", "wr", "wb", "wn", "wp"];
  const blackPieces = ["bk", "bq", "br", "bb", "bn", "bp"];

  whitePieces.forEach((piece) => whitePaletteEl.append(createPaletteButton(piece)));
  blackPieces.forEach((piece) => blackPaletteEl.append(createPaletteButton(piece)));

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "⨯";
  clearButton.title = "Clear square";
  clearButton.addEventListener("click", () => {
    selectedPalettePiece = "";
    updateSelectedPaletteButton(clearButton);
  });
  toolPaletteEl.append(clearButton);
}

function createPaletteButton(piece) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = PIECE_UNICODE[piece];
  button.title = piece;
  button.classList.toggle("selected", piece === selectedPalettePiece);
  button.addEventListener("click", () => {
    selectedPalettePiece = piece;
    updateSelectedPaletteButton(button);
  });
  return button;
}

function updateSelectedPaletteButton(activeButton) {
  [...piecePalette.querySelectorAll("button")].forEach((btn) => btn.classList.remove("selected"));
  activeButton.classList.add("selected");
}

function render() {
  boardEl.innerHTML = "";
  const myCaptures = getCapturableSquares(mySide);
  const oppCaptures = getCapturableSquares(mySide === "w" ? "b" : "w");
  const attackedOccupiedSquares = getAttackedOccupiedSquares();
  const hoveredAttacks = getHoveredAttacks();

  const selectedWhiteCaptureTargets = new Set();
  if (mode === "move" && selectedSquare) {
    const selectedPiece = board[selectedSquare.row][selectedSquare.col];
    if (selectedPiece && selectedPiece[0] === "w") {
      legalMoves.forEach((move) => {
        const target = board[move.row][move.col];
        if (target && target[0] === "b") {
          selectedWhiteCaptureTargets.add(key(move.row, move.col));
        }
      });
    }
  }

  for (let displayRow = 0; displayRow < 8; displayRow += 1) {
    for (let displayCol = 0; displayCol < 8; displayCol += 1) {
      const { row, col } = toBoardCoords(displayRow, displayCol);
      const square = document.createElement("div");
      square.className = `square ${(displayRow + displayCol) % 2 ? "dark" : "light"}`;

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add("selected");
      }
      if (mode === "place" && selectedPlaceSource && selectedPlaceSource.row === row && selectedPlaceSource.col === col) {
        square.classList.add("place-selected");
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
      if (hoveredPiece && hoveredAttacks.has(key(row, col))) {
        square.classList.add(hoveredPiece.color === mySide ? "hover-green" : "hover-red");
      }
      if (selectedWhiteCaptureTargets.has(key(row, col))) {
        square.classList.add("capture-target-yellow");
      }
      if (attackedOccupiedSquares.has(key(row, col))) {
        square.classList.add("attack-line");
      }

      const piece = board[row][col];
      if (piece) {
        const pieceEl = document.createElement("span");
        pieceEl.className = `piece ${piece[0] === "w" ? "white" : "black"}`;
        pieceEl.textContent = PIECE_UNICODE[piece];
        square.append(pieceEl);
      }

      const coord = document.createElement("span");
      coord.className = "coord";
      coord.textContent = `${FILES[col]}${8 - row}`;
      square.append(coord);
      square.addEventListener("click", () => onSquareClick(row, col));
      square.addEventListener("mouseenter", () => onSquareMouseEnter(row, col));
      square.addEventListener("contextmenu", (event) => onSquareRightClick(event, row, col));
      boardEl.append(square);
    }
  }

  renderHistory();
  undoBtn.disabled = historyPointer === 0;
  redoBtn.disabled = historyPointer >= moveHistory.length;
}

function renderHistory() {
  historyListEl.innerHTML = "";

  for (let fullMove = 0; fullMove * 2 < moveHistory.length; fullMove += 1) {
    const whiteIdx = fullMove * 2;
    const blackIdx = whiteIdx + 1;
    const li = document.createElement("li");

    const white = formatMoveForHistory(moveHistory[whiteIdx], whiteIdx + 1);
    const black = moveHistory[blackIdx] ? formatMoveForHistory(moveHistory[blackIdx], blackIdx + 1) : "";
    li.textContent = `${fullMove + 1}. ${white}${black ? ` ${black}` : ""}`;

    historyListEl.append(li);
  }
}

function formatMoveForHistory(notation, plyNumber) {
  if (plyNumber <= historyPointer) {
    return notation;
  }
  return `(${notation})`;
}

function getHoveredAttacks() {
  const hoveredAttacks = new Set();
  if (!hoveredPiece) {
    return hoveredAttacks;
  }

  const hovered = board[hoveredPiece.row][hoveredPiece.col];
  if (!hovered) {
    return hoveredAttacks;
  }

  getAttackSquaresForPiece(hoveredPiece.row, hoveredPiece.col, hovered).forEach((sq) => {
    hoveredAttacks.add(key(sq.row, sq.col));
  });

  return hoveredAttacks;
}

function onSquareMouseEnter(row, col) {
  const piece = board[row][col];
  if (!piece) {
    if (hoveredPiece) {
      hoveredPiece = null;
      render();
    }
    return;
  }

  if (hoveredPiece && hoveredPiece.row === row && hoveredPiece.col === col) {
    return;
  }

  hoveredPiece = { row, col, color: piece[0] };
  render();
}

function applyPalettePiece(row, col) {
  board[row][col] = selectedPalettePiece || "";
  hoveredPiece = null;
  selectedSquare = null;
  selectedPlaceSource = null;
  legalMoves = [];
  resetHistoryFromCurrentBoard();
  render();
}

function onSquareRightClick(event, row, col) {
  event.preventDefault();
  if (!board[row][col]) {
    return;
  }
  board[row][col] = "";
  hoveredPiece = null;
  selectedSquare = null;
  selectedPlaceSource = null;
  legalMoves = [];
  resetHistoryFromCurrentBoard();
  render();
}

function onSquareClick(row, col) {
  if (mode === "place") {
    if (selectedPlaceSource) {
      if (selectedPlaceSource.row === row && selectedPlaceSource.col === col) {
        selectedPlaceSource = null;
        render();
        return;
      }

      board[row][col] = board[selectedPlaceSource.row][selectedPlaceSource.col];
      board[selectedPlaceSource.row][selectedPlaceSource.col] = "";
      selectedPlaceSource = null;
      hoveredPiece = null;
      selectedSquare = null;
      legalMoves = [];
      resetHistoryFromCurrentBoard();
      render();
      return;
    }

    if (board[row][col]) {
      selectedPlaceSource = { row, col };
      hoveredPiece = null;
      selectedSquare = null;
      legalMoves = [];
      render();
      return;
    }

    applyPalettePiece(row, col);
    return;
  }

  const clickedPiece = board[row][col];

  if (selectedSquare && legalMoves.some((move) => move.row === row && move.col === col)) {
    const movingPiece = board[selectedSquare.row][selectedSquare.col];
    const capturedPiece = board[row][col];

    board[row][col] = movingPiece;
    board[selectedSquare.row][selectedSquare.col] = "";

    recordMove(buildSanNotation(movingPiece, selectedSquare, { row, col }, capturedPiece));

    selectedSquare = null;
    legalMoves = [];
    hoveredPiece = null;
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

function buildSanNotation(piece, from, to, capturedPiece) {
  const pieceType = piece[1];
  const piecePrefix = PIECE_LETTER[pieceType];
  const capture = Boolean(capturedPiece);
  const dest = `${FILES[to.col]}${8 - to.row}`;

  if (pieceType === "p") {
    const pawnPrefix = capture ? FILES[from.col] : "";
    return `${pawnPrefix}${capture ? "x" : ""}${dest}`;
  }

  return `${piecePrefix}${capture ? "x" : ""}${dest}`;
}

function recordMove(notation) {
  if (historyPointer < moveHistory.length) {
    moveHistory = moveHistory.slice(0, historyPointer);
    historySnapshots = historySnapshots.slice(0, historyPointer + 1);
  }

  moveHistory.push(notation);
  historySnapshots.push(cloneBoard(board));
  historyPointer += 1;
}

function undoMove() {
  if (historyPointer === 0) {
    return;
  }

  historyPointer -= 1;
  board = cloneBoard(historySnapshots[historyPointer]);
  selectedSquare = null;
  legalMoves = [];
  hoveredPiece = null;
  selectedPlaceSource = null;
  render();
}

function redoMove() {
  if (historyPointer >= moveHistory.length) {
    return;
  }

  historyPointer += 1;
  board = cloneBoard(historySnapshots[historyPointer]);
  selectedSquare = null;
  legalMoves = [];
  hoveredPiece = null;
  selectedPlaceSource = null;
  render();
}

function resetHistoryFromCurrentBoard() {
  historySnapshots = [cloneBoard(board)];
  moveHistory = [];
  historyPointer = 0;
}

function cloneBoard(sourceBoard) {
  return sourceBoard.map((row) => [...row]);
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
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2],
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
