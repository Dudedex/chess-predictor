const PIECE_UNICODE = {
  wk: "♚", wq: "♛", wr: "♜", wb: "🨡", wn: "♞", wp: "🨸",
  bk: "♚", bq: "♛", br: "♜", bb: "🨒", bn: "♞", bp: "🨔",
};
const PIECE_LETTER = { p: "", n: "N", b: "B", r: "R", q: "Q", k: "K" };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const boardEl = document.getElementById("board");
const moveModeBtn = document.getElementById("moveModeBtn");
const placeModeBtn = document.getElementById("placeModeBtn");
const mySideSelect = document.getElementById("mySideSelect");
const boardSideSelect = document.getElementById("boardSideSelect");
const greenOpacityInput = document.getElementById("greenOpacity");
const redOpacityInput = document.getElementById("redOpacity");
const piecePalette = document.getElementById("piecePalette");
const whitePaletteEl = document.getElementById("whitePalette");
const blackPaletteEl = document.getElementById("blackPalette");
const toolPaletteEl = document.getElementById("toolPalette");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const resetBoardBtn = document.getElementById("resetBoardBtn");
const switchTurnBtn = document.getElementById("switchTurnBtn");
const smoothMoveToggle = document.getElementById("smoothMoveToggle");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const flipHorizontalBtn = document.getElementById("flipHorizontalBtn");
const flipVerticalBtn = document.getElementById("flipVerticalBtn");
const historyListEl = document.getElementById("historyList");
const statusTextEl = document.getElementById("statusText");
const placeActionsEl = document.getElementById("placeActions");
const controlsPanelEl = document.getElementById("controlsPanel");
const menuBurgerBtn = document.getElementById("menuBurgerBtn");
const historyPanelEl = document.getElementById("historyPanel");
const historyToggleBtn = document.getElementById("historyToggleBtn");
const historyCloseBtn = document.getElementById("historyCloseBtn");

let mode = "move";
let mySide = "w";
let boardPerspective = "w";
let selectedSquare = null;
let legalMoves = [];
let selectedPalettePiece = "wp";
let selectedPlaceSource = null;
let hoveredPiece = null;
let currentTurn = "w";
let gameStateLabel = "";
let greenOpacity = 0.16;
let redOpacity = 0.16;
let smoothMoveEnabled = false;
let isAnimatingMove = false;
let enPassantTarget = null;

let board = createInitialBoard();
let historySnapshots = [{ board: cloneBoard(board), turn: currentTurn, enPassantTarget: cloneEnPassantTarget(enPassantTarget) }];
let moveHistory = [];
let historyPointer = 0;

applyStateFromUrl();
initPalette();
wireEvents();
updateGameStateLabel();
greenOpacityInput.value = String(greenOpacity);
redOpacityInput.value = String(redOpacity);
setMode(mode);

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
  greenOpacityInput.addEventListener("input", () => {
    greenOpacity = Number(greenOpacityInput.value);
    render();
  });
  redOpacityInput.addEventListener("input", () => {
    redOpacity = Number(redOpacityInput.value);
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
  resetBoardBtn.addEventListener("click", resetBoard);
  switchTurnBtn.addEventListener("click", switchTurn);
  smoothMoveToggle.addEventListener("change", () => {
    smoothMoveEnabled = smoothMoveToggle.checked;
  });
  clearBoardBtn.addEventListener("click", clearBoard);
  flipHorizontalBtn.addEventListener("click", flipBoardHorizontally);
  flipVerticalBtn.addEventListener("click", flipBoardVertically);
  menuBurgerBtn.addEventListener("click", toggleControlsMenu);
  historyToggleBtn.addEventListener("click", toggleHistoryPanel);
  historyCloseBtn.addEventListener("click", closeHistoryPanel);
  document.addEventListener("click", (event) => {
    if (!historyPanelEl.classList.contains("open")) {
      return;
    }
    if (historyPanelEl.contains(event.target) || historyToggleBtn.contains(event.target)) {
      return;
    }
    if (window.matchMedia("(max-width: 1120px)").matches) {
      closeHistoryPanel();
    }
  });
}



function toggleControlsMenu() {
  controlsPanelEl.classList.toggle("open");
}

function toggleHistoryPanel() {
  historyPanelEl.classList.toggle("open");
}

function closeHistoryPanel() {
  historyPanelEl.classList.remove("open");
}

function setMode(nextMode) {
  mode = nextMode;
  moveModeBtn.classList.toggle("active", mode === "move");
  placeModeBtn.classList.toggle("active", mode === "place");
  const isPlace = mode === "place";
  piecePalette.disabled = !isPlace;
  clearBoardBtn.disabled = !isPlace;
  resetBoardBtn.disabled = !isPlace;
  flipHorizontalBtn.disabled = !isPlace;
  flipVerticalBtn.disabled = !isPlace;
  piecePalette.classList.toggle("hidden", !isPlace);
  placeActionsEl.classList.toggle("hidden", !isPlace);

  clearSelections();
  render();
}

function initPalette() {
  ["wk", "wq", "wr", "wb", "wn", "wp"].forEach((piece) => whitePaletteEl.append(createPaletteButton(piece)));
  ["bk", "bq", "br", "bb", "bn", "bp"].forEach((piece) => blackPaletteEl.append(createPaletteButton(piece)));

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
  button.title = piece;
  button.textContent = PIECE_UNICODE[piece];
  button.classList.add(piece[0] === "w" ? "palette-piece-white" : "palette-piece-black");
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
  boardEl.style.setProperty("--green-opacity", String(greenOpacity));
  boardEl.style.setProperty("--red-opacity", String(redOpacity));
  boardEl.innerHTML = "";
  const myCaptures = getCapturableSquares(mySide, board);
  const oppCaptures = getCapturableSquares(mySide === "w" ? "b" : "w", board);
  const attackedOccupiedSquares = getAttackedOccupiedSquares(board);
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
      square.dataset.row = String(row);
      square.dataset.col = String(col);

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add("selected");
      }
      if (mode === "place" && selectedPlaceSource && selectedPlaceSource.row === row && selectedPlaceSource.col === col) {
        square.classList.add("place-selected");
      }
      if (legalMoves.some((m) => m.row === row && m.col === col)) {
        square.classList.add("legal");
      }
      const isMyCapture = myCaptures.has(key(row, col));
      const isOppCapture = oppCaptures.has(key(row, col));
      if (isMyCapture && isOppCapture) {
        square.classList.add("capture-mixed");
      } else if (isMyCapture) {
        square.classList.add("capture-green");
      } else if (isOppCapture) {
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
  statusTextEl.textContent = gameStateLabel || `Turn: ${currentTurn === "w" ? "White" : "Black"}`;
  undoBtn.disabled = historyPointer === 0;
  redoBtn.disabled = historyPointer >= moveHistory.length;

  syncUrlState();
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
  return plyNumber <= historyPointer ? notation : `(${notation})`;
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
  getAttackSquaresForPiece(hoveredPiece.row, hoveredPiece.col, hovered, board).forEach((sq) => {
    hoveredAttacks.add(key(sq.row, sq.col));
  });
  return hoveredAttacks;
}

function onSquareMouseEnter(row, col) {
  if (isAnimatingMove) {
    return;
  }
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
  clearSelections();
  resetHistoryFromCurrentBoard();
  render();
}

function onSquareRightClick(event, row, col) {
  if (isAnimatingMove) {
    return;
  }
  event.preventDefault();
  if (!board[row][col]) {
    return;
  }
  board[row][col] = "";
  clearSelections();
  resetHistoryFromCurrentBoard();
  render();
}

function onSquareClick(row, col) {
  if (isAnimatingMove) {
    return;
  }

  if (mode === "place") {
    handlePlaceModeClick(row, col);
    return;
  }

  if (gameStateLabel.includes("Checkmate")) {
    return;
  }

  const clickedPiece = board[row][col];

  const selectedMove = selectedSquare ? legalMoves.find((move) => move.row === row && move.col === col) : null;
  if (selectedMove) {
    executeMove(selectedSquare, selectedMove);
    return;
  }

  if (!clickedPiece || clickedPiece[0] !== currentTurn) {
    selectedSquare = null;
    legalMoves = [];
    render();
    return;
  }

  selectedSquare = { row, col };
  legalMoves = getLegalMoves(row, col, clickedPiece, board);
  render();
}

function handlePlaceModeClick(row, col) {
  if (selectedPalettePiece === "") {
    if (board[row][col]) {
      board[row][col] = "";
      clearSelections();
      resetHistoryFromCurrentBoard();
      render();
      return;
    }

    clearSelections();
    render();
    return;
  }

  if (selectedPlaceSource) {
    if (selectedPlaceSource.row === row && selectedPlaceSource.col === col) {
      selectedPlaceSource = null;
      render();
      return;
    }
    board[row][col] = board[selectedPlaceSource.row][selectedPlaceSource.col];
    board[selectedPlaceSource.row][selectedPlaceSource.col] = "";
    clearSelections();
    resetHistoryFromCurrentBoard();
    render();
    return;
  }

  if (board[row][col]) {
    selectedPlaceSource = { row, col };
    selectedSquare = null;
    legalMoves = [];
    hoveredPiece = null;
    render();
    return;
  }

  applyPalettePiece(row, col);
}

function executeMove(from, move) {
  const to = { row: move.row, col: move.col };
  const movingPiece = board[from.row][from.col];
  const capturedPiece = move.enPassant
    ? board[move.capturedRow][move.capturedCol]
    : board[to.row][to.col];

  if (!movingPiece) {
    clearSelections();
    render();
    return;
  }

  if (smoothMoveEnabled && animateMove(from, move, movingPiece)) {
    return;
  }

  commitMove(from, move, movingPiece, capturedPiece);
}

function commitMove(from, move, movingPiece, capturedPiece) {
  const to = { row: move.row, col: move.col };
  board[to.row][to.col] = movingPiece;
  board[from.row][from.col] = "";
  if (move.enPassant) {
    board[move.capturedRow][move.capturedCol] = "";
  }

  enPassantTarget = null;
  if (movingPiece[1] === "p" && Math.abs(to.row - from.row) === 2) {
    enPassantTarget = {
      row: (to.row + from.row) / 2,
      col: from.col,
      pawnColor: movingPiece[0],
    };
  }

  currentTurn = currentTurn === "w" ? "b" : "w";
  updateGameStateLabel();

  let notation = buildSanNotation(movingPiece, from, to, capturedPiece);
  if (gameStateLabel.includes("Checkmate")) {
    notation += "#";
  } else if (gameStateLabel.includes("Check:")) {
    notation += "+";
  }

  recordMove(notation);
  clearSelections();
  render();
}

function animateMove(from, move, movingPiece) {
  const to = { row: move.row, col: move.col };
  const fromSquare = getSquareElement(from.row, from.col);
  const toSquare = getSquareElement(to.row, to.col);
  if (!fromSquare || !toSquare) {
    return false;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  const ghost = document.createElement("span");
  ghost.className = `piece moving-piece-ghost ${movingPiece[0] === "w" ? "white" : "black"}`;
  ghost.textContent = PIECE_UNICODE[movingPiece];
  ghost.style.left = `${fromRect.left + fromRect.width / 2}px`;
  ghost.style.top = `${fromRect.top + fromRect.height / 2}px`;
  document.body.append(ghost);

  isAnimatingMove = true;
  let finished = false;

  const finishAnimation = () => {
    if (finished) {
      return;
    }
    finished = true;
    if (ghost.isConnected) {
      ghost.remove();
    }
    isAnimatingMove = false;
    const capturedPiece = move.enPassant
      ? board[move.capturedRow][move.capturedCol]
      : board[to.row][to.col];
    commitMove(from, move, movingPiece, capturedPiece);
  };

  requestAnimationFrame(() => {
    ghost.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  });

  ghost.addEventListener("transitionend", finishAnimation, { once: true });
  setTimeout(finishAnimation, 280);
  return true;
}

function getSquareElement(row, col) {
  return boardEl.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
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

function updateGameStateLabel() {
  const inCheck = isKingInCheck(currentTurn, board);
  const hasMoves = hasAnyLegalMove(currentTurn, board);

  if (inCheck && !hasMoves) {
    gameStateLabel = `Checkmate: ${currentTurn === "w" ? "Black" : "White"} wins`;
    return;
  }
  if (inCheck) {
    gameStateLabel = `Check: ${currentTurn === "w" ? "White" : "Black"} king under attack`;
    return;
  }
  gameStateLabel = `Turn: ${currentTurn === "w" ? "White" : "Black"}`;
}

function hasAnyLegalMove(color, boardState) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = boardState[row][col];
      if (!piece || piece[0] !== color) {
        continue;
      }
      if (getLegalMoves(row, col, piece, boardState).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function isKingInCheck(color, boardState) {
  const kingPos = findKing(color, boardState);
  if (!kingPos) {
    return false;
  }
  const enemy = color === "w" ? "b" : "w";
  return isSquareAttacked(kingPos.row, kingPos.col, enemy, boardState);
}

function findKing(color, boardState) {
  const target = `${color}k`;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (boardState[row][col] === target) {
        return { row, col };
      }
    }
  }
  return null;
}

function isSquareAttacked(row, col, byColor, boardState) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = boardState[r][c];
      if (!piece || piece[0] !== byColor) {
        continue;
      }
      const attacks = getAttackSquaresForPiece(r, c, piece, boardState);
      if (attacks.some((sq) => sq.row === row && sq.col === col)) {
        return true;
      }
    }
  }
  return false;
}

function recordMove(notation) {
  if (historyPointer < moveHistory.length) {
    moveHistory = moveHistory.slice(0, historyPointer);
    historySnapshots = historySnapshots.slice(0, historyPointer + 1);
  }

  moveHistory.push(notation);
  historySnapshots.push({
    board: cloneBoard(board),
    turn: currentTurn,
    enPassantTarget: cloneEnPassantTarget(enPassantTarget),
  });
  historyPointer += 1;
}

function undoMove() {
  if (historyPointer === 0) {
    return;
  }
  historyPointer -= 1;
  board = cloneBoard(historySnapshots[historyPointer].board);
  currentTurn = historySnapshots[historyPointer].turn;
  enPassantTarget = cloneEnPassantTarget(historySnapshots[historyPointer].enPassantTarget);
  clearSelections();
  updateGameStateLabel();
  render();
}

function redoMove() {
  if (historyPointer >= moveHistory.length) {
    return;
  }
  historyPointer += 1;
  board = cloneBoard(historySnapshots[historyPointer].board);
  currentTurn = historySnapshots[historyPointer].turn;
  enPassantTarget = cloneEnPassantTarget(historySnapshots[historyPointer].enPassantTarget);
  clearSelections();
  updateGameStateLabel();
  render();
}

function switchTurn() {
  currentTurn = currentTurn === "w" ? "b" : "w";
  enPassantTarget = null;
  clearSelections();

  if (historyPointer < moveHistory.length) {
    moveHistory = moveHistory.slice(0, historyPointer);
    historySnapshots = historySnapshots.slice(0, historyPointer + 1);
  }
  historySnapshots[historyPointer] = {
    board: cloneBoard(board),
    turn: currentTurn,
    enPassantTarget: cloneEnPassantTarget(enPassantTarget),
  };

  updateGameStateLabel();
  render();
}

function clearBoard() {
  board = Array.from({ length: 8 }, () => Array(8).fill(""));
  currentTurn = "w";
  enPassantTarget = null;
  clearSelections();
  resetHistoryFromCurrentBoard();
  updateGameStateLabel();
  render();
}

function resetBoard() {
  board = createInitialBoard();
  currentTurn = "w";
  enPassantTarget = null;
  clearSelections();
  resetHistoryFromCurrentBoard();
  updateGameStateLabel();
  render();
}

function flipBoardHorizontally() {
  // Flip on X-axis: top <-> bottom
  board = [...board].reverse().map((row) => [...row]);
  enPassantTarget = null;
  clearSelections();
  resetHistoryFromCurrentBoard();
  updateGameStateLabel();
  render();
}

function flipBoardVertically() {
  // Flip on Y-axis: left <-> right
  board = board.map((row) => [...row].reverse());
  enPassantTarget = null;
  clearSelections();
  resetHistoryFromCurrentBoard();
  updateGameStateLabel();
  render();
}

function resetHistoryFromCurrentBoard() {
  historySnapshots = [{
    board: cloneBoard(board),
    turn: currentTurn,
    enPassantTarget: cloneEnPassantTarget(enPassantTarget),
  }];
  moveHistory = [];
  historyPointer = 0;
}

function clearSelections() {
  hoveredPiece = null;
  selectedSquare = null;
  selectedPlaceSource = null;
  legalMoves = [];
}

function syncUrlState() {
  const payload = {
    board,
    currentTurn,
  };

  const encoded = encodeState(payload);
  const nextUrl = `${window.location.pathname}?board=${encoded}`;
  window.history.replaceState(null, "", nextUrl);
}

function applyStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("board");
  if (!encoded) {
    return;
  }

  try {
    const parsed = decodeState(encoded);
    if (!Array.isArray(parsed.board) || parsed.board.length !== 8) {
      return;
    }

    board = parsed.board.map((row) => {
      const safe = Array.isArray(row) ? row.slice(0, 8) : [];
      while (safe.length < 8) {
        safe.push("");
      }
      return safe;
    });

    currentTurn = parsed.currentTurn === "b" ? "b" : "w";
    enPassantTarget = null;

    // URL import intentionally contains board coordinates + side to move.
    resetHistoryFromCurrentBoard();
  } catch {
    // Ignore malformed URL state.
  }
}

function encodeState(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

function decodeState(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))));
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

function getLegalMoves(row, col, piece, boardState, epTarget = enPassantTarget) {
  const pseudoMoves = getPseudoLegalMoves(row, col, piece, boardState, epTarget);
  const color = piece[0];

  return pseudoMoves.filter((move) => {
    const nextBoard = cloneBoard(boardState);
    applyMoveOnBoard(nextBoard, { row, col }, move);
    return !isKingInCheck(color, nextBoard);
  });
}

function getPseudoLegalMoves(row, col, piece, boardState, epTarget = enPassantTarget) {
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  if (type === "p") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;

    if (isInBounds(row + dir, col) && !boardState[row + dir][col]) {
      moves.push({ row: row + dir, col });
      if (row === startRow && !boardState[row + 2 * dir][col]) {
        moves.push({ row: row + 2 * dir, col });
      }
    }

    [-1, 1].forEach((dc) => {
      const nr = row + dir;
      const nc = col + dc;
      if (!isInBounds(nr, nc)) {
        return;
      }
      const target = boardState[nr][nc];
      if (target && target[0] !== color) {
        moves.push({ row: nr, col: nc });
        return;
      }
      if (
        epTarget
        && epTarget.row === nr
        && epTarget.col === nc
        && epTarget.pawnColor !== color
        && boardState[row][nc] === `${epTarget.pawnColor}p`
      ) {
        moves.push({ row: nr, col: nc, enPassant: true, capturedRow: row, capturedCol: nc });
      }
    });

    return moves;
  }

  if (type === "n") {
    [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => {
      pushIfValidMove(row + dr, col + dc, color, moves, boardState);
    });
    return moves;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) {
          continue;
        }
        pushIfValidMove(row + dr, col + dc, color, moves, boardState);
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
      const target = boardState[nr][nc];
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

function getCapturableSquares(color, boardState) {
  const captureSquares = new Set();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = boardState[row][col];
      if (!piece || piece[0] !== color) {
        continue;
      }
      getAttackSquaresForPiece(row, col, piece, boardState).forEach((sq) => captureSquares.add(key(sq.row, sq.col)));
    }
  }
  return captureSquares;
}

function getAttackedOccupiedSquares(boardState) {
  const attacked = new Set();
  const whiteAttacks = getCapturableSquares("w", boardState);
  const blackAttacks = getCapturableSquares("b", boardState);

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = boardState[row][col];
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

function getAttackSquaresForPiece(row, col, piece, boardState) {
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
      if (boardState[nr][nc]) {
        break;
      }
      nr += dr;
      nc += dc;
    }
  });

  return attacks;
}

function pushIfValidMove(row, col, color, collection, boardState) {
  if (!isInBounds(row, col)) {
    return;
  }
  const target = boardState[row][col];
  if (!target || target[0] !== color) {
    collection.push({ row, col });
  }
}

function applyMoveOnBoard(boardState, from, move) {
  const movingPiece = boardState[from.row][from.col];
  boardState[move.row][move.col] = movingPiece;
  boardState[from.row][from.col] = "";
  if (move.enPassant) {
    boardState[move.capturedRow][move.capturedCol] = "";
  }
}

function cloneEnPassantTarget(target) {
  if (!target) {
    return null;
  }
  return { ...target };
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
