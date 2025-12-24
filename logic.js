// ==========================================
// 1. KONFIGURASI & VARIABEL (JANGAN DIUBAH)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDmer19KTaijOz3bTdknEEs5dqwKNt6HQg",
  authDomain: "masjid-pekalongan.firebaseapp.com",
  projectId: "masjid-pekalongan",
  storageBucket: "masjid-pekalongan.firebasestorage.app",
  messagingSenderId: "619031365600",
  appId: "1:619031365600:web:35061354a11cf3f72e4d85",
  measurementId: "G-R511G99W8R",
};
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {}
const auth = firebase.auth(),
  db = firebase.firestore(),
  appId = "chess-v3-final";

// Global Vars
let currentUser = null,
  currentGameId = null,
  gameData = null;
let chess = new Chess(),
  boardOrientation = "white",
  playerColor = "white",
  stockfishWorker = null,
  gameUnsubscribe = null;
let premoveQueue = [],
  soundEnabled = true,
  selectedSquare = null;
let whiteTime = 600,
  blackTime = 600,
  timerInterval = null,
  selectedTime = 10,
  lastTimestamp = null;
let arrows = [],
  circleHighlights = [],
  isRightClicking = false,
  rightClickStart = null,
  rightClickCurrent = null;
let isDragging = false,
  dragStartSquare = null,
  draggedPieceElement = null;
let startX = 0,
  startY = 0,
  isClickCandidate = false;
let isAI = false,
  isAnalysisMode = false,
  viewHistoryIndex = -1,
  aiLevel = 5,
  aiTimeout = null;
let windowPendingGameType = "human",
  selectedColor = "random";

const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const audioFiles = {
  move: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3",
  capture:
    "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3",
  check:
    "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/notify.mp3",
  start:
    "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-start.mp3",
  end: "https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3",
};

// ==========================================
// 2. FUNGSI PENDUKUNG (WAJIB ADA DISINI)
// ==========================================

// Fungsi UI Dasar (Mengatasi ReferenceError)
function updateConnectionStatus(c) {
  const el = document.getElementById("connection-status");
  if (el) el.innerText = c ? "Online" : "Offline";
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById("sound-toggle").innerHTML = soundEnabled
    ? '<i class="fas fa-volume-up"></i>'
    : '<i class="fas fa-volume-mute text-red-500"></i>';
}

function getPieceUrl(c, t) {
  return `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${c}${t}.png`;
}

function playSound(t) {
  if (soundEnabled && audioFiles[t]) {
    const s = new Audio(audioFiles[t]);
    s.volume = 1;
    s.play().catch(() => {});
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function showModalConfirm(t, m, y) {
  document.getElementById("modal-title").innerText = t;
  document.getElementById("modal-message").innerText = m;
  document.getElementById("modal-yes-btn").onclick = () => {
    y();
    closeModal("modal-confirm");
  };
  document.getElementById("modal-no-btn").onclick = () => {
    closeModal("modal-confirm");
  };
  document.getElementById("modal-confirm").classList.remove("hidden");
}

// Fungsi Login & Auth (Mengatasi ReferenceError handleLogin)
async function handleLogin() {
  const n = document.getElementById("username-input").value.trim();
  if (n) {
    localStorage.setItem("chess_username", n);
    document.getElementById("user-display").innerText = n;
    showScreen("lobby");
    listenToLobby();
    loadHistory();
  }
}

function logout() {
  localStorage.removeItem("chess_username");
  location.reload();
}

function showScreen(id) {
  ["screen-login", "screen-lobby", "screen-game"].forEach((s) =>
    document.getElementById(s).classList.add("hidden")
  );
  document.getElementById("screen-" + id).classList.remove("hidden");
}

// Fungsi Handler Stockfish (Mengatasi ReferenceError handleStockfishMessage)
function handleStockfishMessage(e) {
  if (window.awaitingAI && e.data.startsWith("bestmove")) {
    window.awaitingAI = false;
    if (aiTimeout) clearTimeout(aiTimeout);
    chess.move(e.data.split(" ")[1], { sloppy: true });
    finalizeAIMove();
  }
  if (
    isAnalysisMode &&
    e.data.startsWith("info") &&
    e.data.includes("score cp")
  ) {
    const m = e.data.match(/score cp (-?\d+)/);
    if (m) {
      let cp = parseInt(m[1]);
      if (chess.turn() === "b") cp = -cp;
      const f = document.getElementById("eval-fill"),
        s = document.getElementById("eval-score");
      if (f) f.style.width = Math.max(5, Math.min(95, 50 + cp / 10)) + "%";
      if (s) s.innerText = (cp / 100).toFixed(2);
    }
  }
  if (isAnalysisMode && e.data.startsWith("bestmove")) {
    const el = document.getElementById("best-move-text");
    if (el) el.innerText = "Saran: " + e.data.split(" ")[1];
  }
}

// ==========================================
// 3. CORE LOGIC (TIMER, MOVE, PREMOVE)
// ==========================================

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  if (isAnalysisMode || selectedTime === -1) return;
  if (!isAI && (!gameData || gameData.status !== "playing")) return;

  lastTimestamp = Date.now();

  timerInterval = setInterval(() => {
    // ONLINE: Tunggu langkah pertama
    if (!isAI && (!gameData || !gameData.lastMove)) {
      if (gameData && gameData.whiteTime) {
        whiteTime = gameData.whiteTime;
        blackTime = gameData.blackTime;
        updateTimerDisplay();
      }
      return;
    }

    const now = Date.now();
    const delta = Math.floor((now - lastTimestamp) / 1000);

    if (delta >= 1) {
      if (chess.turn() === "w") whiteTime -= 1;
      else blackTime -= 1;
      lastTimestamp = now;

      // Sync Guest agar tidak drift
      if (!isAI && gameData) {
        const myColor = playerColor.charAt(0);
        if (chess.turn() !== myColor) {
          if (myColor === "w") whiteTime = gameData.whiteTime;
          else blackTime = gameData.blackTime;
        }
      }
      updateTimerDisplay();
    }

    if (whiteTime <= 0) handleFlagFall("white");
    if (blackTime <= 0) handleFlagFall("black");
  }, 1000);
}

async function pushMoveToFirestore() {
  if (!currentGameId) return;
  const now = Date.now();
  let sentWhiteTime = whiteTime;
  let sentBlackTime = blackTime;

  if (!gameData.lastMove) {
    const limit = (gameData.timeControl || 10) * 60;
    sentWhiteTime = limit;
    sentBlackTime = limit;
    whiteTime = limit;
    blackTime = limit;
  }

  await db
    .collection("artifacts")
    .doc(appId)
    .collection("public")
    .doc("data")
    .collection("games")
    .doc(currentGameId)
    .update({
      fen: chess.fen(),
      pgn: chess.pgn(),
      lastMove: { t: now },
      whiteTime: sentWhiteTime,
      blackTime: sentBlackTime,
    });
  checkGameOver(true);
}

// --- ANIMATION & RENDER ---
function animateMovePiece(from, to, callback) {
  const fromSquareDiv = document.querySelector(`[data-square="${from}"]`);
  const toSquareDiv = document.querySelector(`[data-square="${to}"]`);
  if (!fromSquareDiv || !toSquareDiv) {
    callback();
    return;
  }
  const pieceDiv = fromSquareDiv.querySelector(".piece");
  if (!pieceDiv) {
    callback();
    return;
  }

  const clone = pieceDiv.cloneNode(true);
  const startRect = fromSquareDiv.getBoundingClientRect();
  const endRect = toSquareDiv.getBoundingClientRect();

  clone.style.position = "fixed";
  clone.style.left = startRect.left + "px";
  clone.style.top = startRect.top + "px";
  clone.style.width = startRect.width + "px";
  clone.style.height = startRect.height + "px";
  clone.style.zIndex = "9999";
  clone.style.pointerEvents = "none";
  clone.style.willChange = "transform";
  clone.style.transition = "transform 0.25s cubic-bezier(0.2, 1, 0.3, 1)";

  document.body.appendChild(clone);
  pieceDiv.style.opacity = "0";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const deltaX = endRect.left - startRect.left;
      const deltaY = endRect.top - startRect.top;
      clone.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    });
  });

  setTimeout(() => {
    clone.remove();
    callback();
  }, 260);
}

function renderBoard() {
  const boardEl = document.getElementById("chess-board");
  if (!boardEl) return;
  boardEl.innerHTML =
    '<svg id="arrow-layer" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"></svg>';
  let boardState = chess.board();
  if (premoveQueue.length > 0) {
    premoveQueue.forEach((pm) => {
      const fC = pm.from.charCodeAt(0) - 97,
        fR = 8 - parseInt(pm.from[1]);
      const tC = pm.to.charCodeAt(0) - 97,
        tR = 8 - parseInt(pm.to[1]);
      if (boardState[fR][fC]) {
        boardState[tR][tC] = boardState[fR][fC];
        boardState[fR][fC] = null;
      }
    });
  }
  const rows =
    boardOrientation === "white"
      ? [0, 1, 2, 3, 4, 5, 6, 7]
      : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols =
    boardOrientation === "white"
      ? [0, 1, 2, 3, 4, 5, 6, 7]
      : [7, 6, 5, 4, 3, 2, 1, 0];
  const lastMove = chess.history({ verbose: true }).pop();
  rows.forEach((r) => {
    cols.forEach((c) => {
      const square = String.fromCharCode(97 + c) + (8 - r);
      const piece = boardState[r][c];
      const div = document.createElement("div");
      div.className = `square ${(r + c) % 2 === 0 ? "white" : "black"}`;
      div.dataset.square = square;
      if (selectedSquare === square) div.classList.add("selected");
      if (lastMove && (lastMove.from === square || lastMove.to === square))
        div.classList.add("last-move");
      const pmIndex = premoveQueue.findIndex(
        (pm) => pm.from === square || pm.to === square
      );
      if (pmIndex !== -1) {
        const pm = premoveQueue[pmIndex];
        if (pm.from === square) div.classList.add("premove-source");
        if (pm.to === square) div.classList.add("premove-dest");
      }
      if (
        piece &&
        piece.type === "k" &&
        chess.in_check() &&
        piece.color === chess.turn() &&
        premoveQueue.length === 0
      )
        div.classList.add("in-check");
      if (circleHighlights.includes(square))
        div.classList.add("circle-highlight");
      if (
        selectedSquare &&
        !premoveQueue.length &&
        chess.turn() === playerColor.charAt(0)
      ) {
        const moves = chess.moves({
          square: selectedSquare,
          verbose: true,
        });
        if (moves.find((m) => m.to === square))
          div.classList.add("possible-move");
      }
      if (piece) {
        const img = document.createElement("div");
        img.className = "piece";
        if (
          premoveQueue.length > 0 &&
          premoveQueue.some((pm) => pm.to === square)
        )
          img.classList.add("premove-piece");
        img.style.backgroundImage = `url('${getPieceUrl(
          piece.color,
          piece.type
        )}')`;
        if (
          viewHistoryIndex === -1 &&
          (isAnalysisMode || piece.color === playerColor.charAt(0))
        )
          attachInputListeners(img, square);
        div.appendChild(img);
      }
      div.onclick = () => onSquareClick(square);
      if (!isMobile) {
        div.addEventListener("mousedown", (e) => {
          if (e.button === 2) handleRightClickDown(e, square);
        });
        div.addEventListener("mouseup", (e) => {
          if (e.button === 2) handleRightClickUp(e, square);
        });
        div.addEventListener("mouseenter", (e) =>
          handleRightClickMove(e, square)
        );
      }
      boardEl.appendChild(div);
    });
  });
  drawArrows();
  updateStatusText();
}

// --- GAME LOGIC ---
function setupGameCommon(id, o, n) {
  currentGameId = id;
  boardOrientation = o;
  playerColor = o;
  if (timerInterval) clearInterval(timerInterval);
  chess.reset();
  isAnalysisMode = false;
  premoveQueue = [];
  viewHistoryIndex = -1;
  selectedSquare = null;
  const elO = document.getElementById("opponent-name");
  const elM = document.getElementById("player-name-display");
  if (elO) elO.innerText = n;
  if (elM) elM.innerText = localStorage.getItem("chess_username");
  whiteTime = 0;
  blackTime = 0;
  updateTimerDisplay();
  showScreen("game");
  document.getElementById("play-controls").classList.remove("hidden");
  document.getElementById("analysis-controls").classList.add("hidden");
  renderBoard();
  updateMoveHistoryUI();
}

function startGameFirestore(id, o) {
  setupGameCommon(id, o, "Menunggu...");
  if (gameUnsubscribe) gameUnsubscribe();

  gameUnsubscribe = db
    .collection("artifacts")
    .doc(appId)
    .collection("public")
    .doc("data")
    .collection("games")
    .doc(id)
    .onSnapshot((doc) => {
      if (!doc.exists) return;
      gameData = doc.data();

      const opp = o === "white" ? gameData.black : gameData.white;
      if (document.getElementById("opponent-name"))
        document.getElementById("opponent-name").innerText = opp
          ? opp.name
          : "Menunggu...";
      if (gameData.timeControl) selectedTime = gameData.timeControl;

      const dbW = gameData.whiteTime;
      const dbB = gameData.blackTime;
      if (dbW !== undefined && dbB !== undefined) {
        if (playerColor === "white") blackTime = dbB;
        else whiteTime = dbW;
        if (Math.abs(whiteTime - dbW) > 2) whiteTime = dbW;
        if (Math.abs(blackTime - dbB) > 2) blackTime = dbB;
      }
      updateTimerDisplay();

      if (gameData.status === "playing") {
        if (
          gameData.fen &&
          gameData.fen !== chess.fen() &&
          gameData.fen !== "start"
        ) {
          const tempChess = new Chess();
          if (gameData.pgn) tempChess.load_pgn(gameData.pgn);
          else tempChess.load(gameData.fen);
          const lastMoveHistory = tempChess.history({ verbose: true });
          const lastMove = lastMoveHistory[lastMoveHistory.length - 1];

          if (lastMove) {
            animateMovePiece(lastMove.from, lastMove.to, () => {
              if (gameData.pgn) chess.load_pgn(gameData.pgn);
              else chess.load(gameData.fen);
              const realLast = chess.history({ verbose: true }).pop();
              if (chess.in_check()) playSound("check");
              else if (realLast.flags.includes("c")) playSound("capture");
              else playSound("move");
              renderBoard();
              updateMoveHistoryUI();
              if (isAI || gameData.lastMove) {
                setTimeout(processPremoves, 100);
              }
            });
          } else {
            if (gameData.pgn) chess.load_pgn(gameData.pgn);
            else chess.load(gameData.fen);
            renderBoard();
            updateMoveHistoryUI();
          }
        }
        if (!timerInterval) startTimer();
      }

      if (gameData.status === "finished" && !isAnalysisMode) {
        let r = "draw";
        if (gameData.winner !== "draw")
          r =
            gameData.winner === localStorage.getItem("chess_username")
              ? "win"
              : "loss";
        handleGameOver(r);
      }
      if (
        gameData.requests?.status === "pending" &&
        gameData.requests.sender !== currentUser.uid
      )
        showRequestModal(gameData.requests.type);
    });
}

function startGameLocal(id, o, n) {
  if (gameUnsubscribe) {
    gameUnsubscribe();
    gameUnsubscribe = null;
  }
  gameData = null;
  setupGameCommon(id, o, n);
  const t = selectedTime === -1 ? 999999 : selectedTime * 60;
  whiteTime = t;
  blackTime = t;
  updateTimerDisplay();
  playSound("start");
  if (o === "black") setTimeout(makeAIMove, 500);
  else startTimer();
}

// --- MOVE HANDLING ---
function handleMoveAttempt(from, to) {
  if (isAnalysisMode) {
    if (chess.move({ from, to, promotion: "q" })) {
      renderBoard();
      updateMoveHistoryUI();
      playSound("move");
      if (stockfishWorker)
        stockfishWorker.postMessage("position fen " + chess.fen());
    }
    return;
  }
  const myColor = playerColor.charAt(0);
  const isSyncReady =
    isAI || (gameData && (gameData.lastMove || gameData.fen === "start"));

  if (chess.turn() === myColor && isSyncReady) {
    const move = chess.move({ from, to, promotion: "q" });
    if (move) {
      selectedSquare = null;
      animateMovePiece(from, to, () => {
        clearArrowsAndHighlights();
        renderBoard();
        updateMoveHistoryUI();
        if (chess.in_check()) playSound("check");
        else if (move.flags.includes("c")) playSound("capture");
        else playSound("move");
        if (isAI) {
          checkGameOver(true);
          setTimeout(makeAIMove, 500);
        } else {
          pushMoveToFirestore();
        }
      });
    } else {
      selectedSquare = null;
      renderBoard();
    }
  } else {
    const tempChess = new Chess(chess.fen());
    for (let pm of premoveQueue) {
      forceTurn(tempChess, myColor);
      tempChess.move({ from: pm.from, to: pm.to, promotion: "q" });
    }
    forceTurn(tempChess, myColor);
    if (tempChess.move({ from, to, promotion: "q" })) {
      premoveQueue.push({ from, to });
      selectedSquare = null;
      renderBoard();
      if (isSyncReady) setTimeout(processPremoves, 100);
    } else {
      selectedSquare = null;
      renderBoard();
    }
  }
}

function processPremoves() {
  if (premoveQueue.length === 0 || chess.game_over()) return;
  if (chess.turn() !== playerColor.charAt(0)) return;
  const isSyncReady =
    isAI || (gameData && (gameData.lastMove || gameData.fen === "start"));
  if (!isSyncReady) return;
  const moveData = premoveQueue[0];
  const move = chess.move({
    from: moveData.from,
    to: moveData.to,
    promotion: "q",
  });
  if (move) {
    premoveQueue.shift();
    animateMovePiece(moveData.from, moveData.to, () => {
      renderBoard();
      updateMoveHistoryUI();
      playSound("move");
      if (!isAI) {
        pushMoveToFirestore();
        setTimeout(processPremoves, 100);
      } else {
        setTimeout(makeAIMove, 500);
      }
    });
  } else {
    premoveQueue = [];
    playSound("check");
    renderBoard();
  }
}

// --- INPUT HANDLERS ---
function attachInputListeners(element, square) {
  element.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    initInput(e.clientX, e.clientY, square, element);
  });
  element.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      initInput(touch.clientX, touch.clientY, square, element);
    },
    { passive: false }
  );
}
function initInput(x, y, square, el) {
  if (!isAnalysisMode && viewHistoryIndex !== -1) return;
  isDragging = false;
  isClickCandidate = true;
  startX = x;
  startY = y;
  dragStartSquare = square;
  draggedPieceElement = el;
  const ghost = document.getElementById("drag-ghost");
  if (ghost) {
    ghost.style.backgroundImage = el.style.backgroundImage;
    ghost.style.left = x + "px";
    ghost.style.top = y + "px";
    ghost.style.display = "none";
  }
}
function handleGlobalMove(e) {
  if (!isClickCandidate && !isDragging) return;
  let clientX, clientY;
  if (e.type === "touchmove") {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  const diffX = Math.abs(clientX - startX),
    diffY = Math.abs(clientY - startY);
  if (!isDragging && (diffX > 5 || diffY > 5)) {
    isDragging = true;
    isClickCandidate = false;
    const ghost = document.getElementById("drag-ghost");
    if (ghost) ghost.style.display = "block";
  }
  if (isDragging) {
    if (e.cancelable && e.type === "touchmove") e.preventDefault();
    const ghost = document.getElementById("drag-ghost");
    if (ghost) {
      ghost.style.left = clientX + "px";
      ghost.style.top = clientY + "px";
    }
  }
}
function handleGlobalEnd(e) {
  const ghost = document.getElementById("drag-ghost");
  if (ghost) ghost.style.display = "none";
  if (isClickCandidate && !isDragging) {
    isClickCandidate = false;
    if (dragStartSquare) onSquareClick(dragStartSquare);
    dragStartSquare = null;
    return;
  }
  if (isDragging) {
    isDragging = false;
    isClickCandidate = false;
    let clientX, clientY;
    if (e.type === "touchend") {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const elements = document.elementsFromPoint(clientX, clientY);
    const squareEl = elements.find((el) => el.classList.contains("square"));
    if (squareEl) {
      const target = squareEl.dataset.square;
      if (target && target !== dragStartSquare)
        handleMoveAttempt(dragStartSquare, target);
      else onSquareClick(target);
    } else {
      selectedSquare = null;
      renderBoard();
    }
  }
  dragStartSquare = null;
}
function onSquareClick(square) {
  if (arrows.length > 0 || circleHighlights.length > 0)
    clearArrowsAndHighlights();
  const myColor = playerColor.charAt(0);
  const isMyTurn = chess.turn() === myColor;
  if (!isMyTurn && !isAnalysisMode) {
    if (selectedSquare) handleMoveAttempt(selectedSquare, square);
    else {
      const p = chess.get(square);
      if (p && p.color === myColor) {
        selectedSquare = square;
        renderBoard();
      } else {
        premoveQueue = [];
        selectedSquare = null;
        renderBoard();
      }
    }
    return;
  }
  if (selectedSquare === null) {
    const p = chess.get(square);
    if (p && (p.color === myColor || isAnalysisMode)) {
      selectedSquare = square;
      renderBoard();
    }
  } else {
    if (selectedSquare === square) {
      selectedSquare = null;
      renderBoard();
      return;
    }
    const p = chess.get(square);
    if (p && p.color === myColor && !isAnalysisMode) {
      selectedSquare = square;
      renderBoard();
      return;
    }
    handleMoveAttempt(selectedSquare, square);
  }
}

// --- OTHER HELPERS ---
function forceTurn(chessInstance, color) {
  const t = chessInstance.fen().split(" ");
  t[1] = color;
  chessInstance.load(t.join(" "));
}
function updateTimerDisplay() {
  const fmt = (t) => {
    if (t < 0) t = 0;
    const m = Math.floor(t / 60),
      s = t % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
  };
  if (selectedTime === -1) {
    document.getElementById("timer-self").innerText = "∞";
    document.getElementById("timer-opponent").innerText = "∞";
    return;
  }
  const elS = document.getElementById("timer-self"),
    elO = document.getElementById("timer-opponent");
  if (playerColor === "white") {
    elS.innerText = fmt(whiteTime);
    elO.innerText = fmt(blackTime);
  } else {
    elS.innerText = fmt(blackTime);
    elO.innerText = fmt(whiteTime);
  }
  const turn = chess.turn();
  const selfTurn =
    (playerColor === "white" && turn === "w") ||
    (playerColor === "black" && turn === "b");
  if (selfTurn) {
    elS.classList.add("timer-active");
    elO.classList.remove("timer-active");
  } else {
    elO.classList.add("timer-active");
    elS.classList.remove("timer-active");
  }
}
function handleRightClickDown(e, s) {
  if (!s) return;
  isRightClicking = true;
  rightClickStart = s;
  rightClickCurrent = s;
}
function handleRightClickMove(e, s) {
  if (isRightClicking && s) {
    rightClickCurrent = s;
    if (s !== rightClickStart) drawArrows();
  }
}
function handleRightClickUp(e, s) {
  if (!isRightClicking) return;
  isRightClicking = false;
  rightClickCurrent = null;
  if (rightClickStart === s) {
    const i = circleHighlights.indexOf(s);
    if (i > -1) circleHighlights.splice(i, 1);
    else circleHighlights.push(s);
  } else if (s) {
    const i = arrows.findIndex((a) => a.from === rightClickStart && a.to === s);
    if (i > -1) arrows.splice(i, 1);
    else arrows.push({ from: rightClickStart, to: s });
  }
  rightClickStart = null;
  renderBoard();
}
function clearArrowsAndHighlights() {
  arrows = [];
  circleHighlights = [];
  renderBoard();
}
function drawArrows() {
  const svg = document.getElementById("arrow-layer");
  if (!svg) return;
  svg.innerHTML = "";
  const getC = (s) => {
    const c = s.charCodeAt(0) - 97,
      r = 8 - parseInt(s[1]);
    return {
      x: (boardOrientation === "white" ? c : 7 - c) * 12.5 + 6.25,
      y: (boardOrientation === "white" ? r : 7 - r) * 12.5 + 6.25,
    };
  };
  arrows.forEach((a) =>
    renderArrowSvg(svg, getC(a.from), getC(a.to), "#f57c00", 0.8)
  );
  if (
    isRightClicking &&
    rightClickStart &&
    rightClickCurrent &&
    rightClickStart !== rightClickCurrent
  )
    renderArrowSvg(
      svg,
      getC(rightClickStart),
      getC(rightClickCurrent),
      "#f57c00",
      0.5
    );
}
function renderArrowSvg(svg, s, e, c, o = 0.8) {
  const ang = Math.atan2(e.y - s.y, e.x - s.x),
    dist = Math.hypot(e.x - s.x, e.y - s.y);
  if (dist < 5) return;
  const lw = 1.2,
    hl = 3.5,
    hw = 3.5,
    endX = e.x - hl * 0.1 * Math.cos(ang),
    endY = e.y - hl * 0.1 * Math.sin(ang),
    id = `a-${Math.random().toString(36).substr(2)}`;
  const d = document.createElementNS("http://www.w3.org/2000/svg", "defs"),
    m = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  m.setAttribute("id", id);
  m.setAttribute("markerWidth", hl);
  m.setAttribute("markerHeight", hw);
  m.setAttribute("refX", hl);
  m.setAttribute("refY", hw / 2);
  m.setAttribute("orient", "auto");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", `M0,0 L${hl},${hw / 2} L0,${hw} Z`);
  p.setAttribute("fill", c);
  p.setAttribute("fill-opacity", o);
  m.appendChild(p);
  d.appendChild(m);
  svg.appendChild(d);
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l.setAttribute("x1", s.x);
  l.setAttribute("y1", s.y);
  l.setAttribute("x2", endX);
  l.setAttribute("y2", endY);
  l.setAttribute("stroke", c);
  l.setAttribute("stroke-width", lw);
  l.setAttribute("stroke-opacity", o);
  l.setAttribute("marker-end", `url(#${id})`);
  svg.appendChild(l);
}
function makeAIMove() {
  if (chess.game_over() || chess.in_threefold_repetition()) return;
  document.getElementById("game-status").innerText = "AI Berpikir...";
  if (stockfishWorker) {
    stockfishWorker.postMessage("position fen " + chess.fen());
    stockfishWorker.postMessage("setoption name Skill Level value " + aiLevel);
    stockfishWorker.postMessage("go depth " + (aiLevel > 10 ? 10 : 5));
    window.awaitingAI = true;
    if (aiTimeout) clearTimeout(aiTimeout);
    aiTimeout = setTimeout(() => {
      if (window.awaitingAI) {
        window.awaitingAI = false;
        const m = chess.moves();
        chess.move(m[Math.floor(Math.random() * m.length)]);
        finalizeAIMove();
      }
    }, 8000);
  } else {
    const m = chess.moves();
    chess.move(m[Math.floor(Math.random() * m.length)]);
    finalizeAIMove();
  }
}
function finalizeAIMove() {
  const lastMove = chess.history({ verbose: true }).pop();
  if (lastMove) {
    chess.undo();
    renderBoard();
    chess.move(lastMove);
    animateMovePiece(lastMove.from, lastMove.to, () => {
      renderBoard();
      updateMoveHistoryUI();
      if (chess.in_check()) playSound("check");
      else playSound("move");
      checkGameOver(true);
      if (chess.turn() === playerColor.charAt(0)) startTimer();
      document.getElementById("game-status").innerText = "";
      setTimeout(processPremoves, 200);
    });
  } else {
    renderBoard();
    updateMoveHistoryUI();
    if (chess.in_check()) playSound("check");
    else playSound("move");
    checkGameOver(true);
    if (chess.turn() === playerColor.charAt(0)) startTimer();
    document.getElementById("game-status").innerText = "";
    setTimeout(processPremoves, 200);
  }
}
async function handleFlagFall(c) {
  clearInterval(timerInterval);
  const myColor = playerColor.charAt(0) === "w" ? "white" : "black";
  const res = c === myColor ? "loss" : "win";
  handleGameOver(res);
  if (!isAI && currentGameId) {
    const w =
      c === "white"
        ? gameData.black?.name || "Black"
        : gameData.white?.name || "White";
    await db
      .collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(currentGameId)
      .update({ status: "finished", winner: w, reason: "timeout" });
  }
}
function openCreateGameModal(t) {
  windowPendingGameType = t;
  document.getElementById("modal-create").classList.remove("hidden");
  document.getElementById("ai-settings").classList.toggle("hidden", t !== "ai");
  selectTime(10);
  selectColor("random");
}
function selectColor(c) {
  selectedColor = c;
  ["white", "random", "black"].forEach((x) =>
    document
      .getElementById(`btn-color-${x}`)
      .classList.toggle("selected", x === c)
  );
}
function selectTime(t) {
  selectedTime = t;
  [1, 3, 5, 10, 30, -1].forEach((x) =>
    document
      .getElementById(`btn-time-${x}`)
      .classList.toggle("selected", x === t)
  );
}
function confirmCreateGame() {
  if (windowPendingGameType === "ai")
    aiLevel = document.getElementById("ai-elo").value;
  document.getElementById("modal-create").classList.add("hidden");
  createGameExec(windowPendingGameType);
}
function listenToLobby() {
  db.collection("artifacts")
    .doc(appId)
    .collection("public")
    .doc("data")
    .collection("games")
    .where("status", "==", "waiting")
    .limit(50)
    .onSnapshot((snap) => {
      const listEl = document.getElementById("room-list");
      if (!listEl) return;
      listEl.innerHTML = "";
      if (snap.empty) {
        listEl.innerHTML =
          '<div class="text-center text-stone-500 py-4 text-xs italic">Belum ada tantangan.</div>';
        return;
      }
      let games = [];
      const now = Date.now();
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d.createdAt) return;
        if (now - d.createdAt.toMillis() > 3600000 || (d.white && d.black)) {
          db.collection("artifacts")
            .doc(appId)
            .collection("public")
            .doc("data")
            .collection("games")
            .doc(doc.id)
            .delete()
            .catch(() => {});
          return;
        }
        games.push({ id: doc.id, ...d });
      });
      games.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      games.forEach((g) => {
        if (
          g.white?.id === currentUser?.uid ||
          g.black?.id === currentUser?.uid
        )
          return;
        const hostName = g.white
          ? g.white.name
          : g.black
          ? g.black.name
          : "Unknown";
        const time = g.timeControl === -1 ? "∞" : g.timeControl;
        const div = document.createElement("div");
        div.className =
          "bg-[#2b1d0e] p-3 rounded flex justify-between items-center border border-[#5d4037] mb-2 hover:border-yellow-600 transition";
        div.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-[#1a0f00] flex items-center justify-center border border-[#5d4037]"><i class="fas ${
          g.white ? "fa-chess-king text-[#e6d2b5]" : "fa-chess-king text-black"
        }"></i></div><div><span class="block text-sm font-bold text-[#c5a059] font-medieval">${hostName}</span><span class="text-[10px] text-stone-500">${time} Menit</span></div></div><button onclick="joinGame('${
          g.id
        }', this)" class="medieval-btn px-4 py-1.5 rounded text-xs shadow-lg"><i class="fas fa-swords mr-1"></i> LAWAN</button>`;
        listEl.appendChild(div);
      });
    });
}
function loadHistory() {
  const histList = document.getElementById("history-list");
  if (!histList) return;
  const history = JSON.parse(localStorage.getItem("chess_history") || "[]");
  histList.innerHTML = "";
  if (history.length === 0) {
    histList.innerHTML =
      '<div class="text-center text-stone-500 py-4 text-xs italic">Belum ada jejak pertempuran.</div>';
    return;
  }
  history
    .reverse()
    .slice(0, 10)
    .forEach((game) => {
      const el = document.createElement("div");
      const color =
        game.result === "win"
          ? "text-green-500"
          : game.result === "loss"
          ? "text-red-500"
          : "text-yellow-500";
      el.className =
        "bg-[#2b1d0e] p-3 rounded text-xs mb-2 border border-[#5d4037] flex justify-between items-center cursor-pointer hover:border-yellow-600 transition";
      el.innerHTML = `<div class="flex flex-col"><span class="text-[#c5a059] font-bold">vs ${
        game.opponent
      }</span><span class="text-[10px] text-stone-500">${new Date(
        game.date
      ).toLocaleDateString()}</span></div><span class="${color} font-bold uppercase border border-stone-600 px-2 py-1 rounded bg-black/30">${
        game.result
      }</span>`;
      el.onclick = () => loadReplayGame(game);
      histList.appendChild(el);
    });
}
function loadReplayGame(game) {
  currentGameId = null;
  isReplayMode = true;
  isAnalysisMode = true;
  boardOrientation = "white";
  if (!game.pgn) return alert("Arsip rusak.");
  chess.load_pgn(game.pgn);
  viewHistoryIndex = -1;
  document.getElementById("opponent-name").innerText = game.opponent;
  showScreen("game");
  document.getElementById("play-controls").classList.add("hidden");
  document.getElementById("analysis-controls").classList.remove("hidden");
  renderBoard();
  updateMoveHistoryUI();
  if (stockfishWorker) {
    stockfishWorker.postMessage("position fen " + chess.fen());
    stockfishWorker.postMessage("go depth 15");
  }
}
async function createGameExec(type) {
  if (!currentUser) return alert("Koneksi terputus!");
  try {
    const gameId = currentUser.uid + "_" + Date.now();
    const myName = localStorage.getItem("chess_username");
    let white = null,
      black = null,
      orient = "white";
    if (selectedColor === "random")
      selectedColor = Math.random() < 0.5 ? "white" : "black";
    if (selectedColor === "white") {
      white = { name: myName, id: currentUser.uid };
      orient = "white";
    } else {
      black = { name: myName, id: currentUser.uid };
      orient = "black";
    }
    const initialSeconds = selectedTime === -1 ? 999999 : selectedTime * 60;
    if (type === "ai") {
      isAI = true;
      const aiName = `Stockfish (Lv.${aiLevel})`;
      if (orient === "white") black = { name: aiName, id: "ai" };
      else white = { name: aiName, id: "ai" };
      startGameLocal(gameId, orient, aiName);
    } else {
      isAI = false;
      await db
        .collection("artifacts")
        .doc(appId)
        .collection("public")
        .doc("data")
        .collection("games")
        .doc(gameId)
        .set({
          white,
          black,
          fen: "start",
          pgn: "",
          status: "waiting",
          timeControl: selectedTime,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          requests: {},
          whiteTime: initialSeconds,
          blackTime: initialSeconds,
          lastMove: null,
        });
      startGameFirestore(gameId, orient);
    }
  } catch (e) {
    alert(e.message);
  }
}
async function joinGame(id) {
  isAI = false;
  try {
    const gameRef = db
      .collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(id);
    const doc = await gameRef.get();
    if (!doc.exists) return alert("Room hilang!");
    const d = doc.data();
    let updateData = { status: "playing" };
    if (d.whiteTime === undefined) {
      const limit = d.timeControl === -1 ? 999999 : d.timeControl * 60;
      updateData.whiteTime = limit;
      updateData.blackTime = limit;
    }
    const myName = localStorage.getItem("chess_username");
    let myColor = "";
    if (!d.white) {
      updateData.white = { name: myName, id: currentUser.uid };
      myColor = "white";
    } else if (!d.black) {
      updateData.black = { name: myName, id: currentUser.uid };
      myColor = "black";
    } else return alert("Penuh!");
    await gameRef.update(updateData);
    startGameFirestore(id, myColor);
  } catch (e) {
    alert(e.message);
  }
}
function checkGameOver(l) {
  if (chess.game_over() || chess.in_threefold_repetition()) {
    let r = "draw";
    if (chess.in_checkmate())
      r = chess.turn() === playerColor.charAt(0) ? "loss" : "win";
    if (chess.in_threefold_repetition()) r = "draw";
    handleGameOver(r);
    if (l && !isAI)
      db.collection("artifacts")
        .doc(appId)
        .collection("public")
        .doc("data")
        .collection("games")
        .doc(currentGameId)
        .update({
          status: "finished",
          winner:
            r === "win"
              ? localStorage.getItem("chess_username")
              : r === "draw"
              ? "draw"
              : document.getElementById("opponent-name").innerText,
        });
  }
}
function handleGameOver(res) {
  clearInterval(timerInterval);
  document.getElementById("go-title").innerText =
    res === "win" ? "KEMENANGAN!" : res === "loss" ? "KEKALAHAN" : "REMIS";
  document.getElementById("go-message").innerText =
    res === "win"
      ? "Musuh tumbang."
      : res === "loss"
      ? "Istana runtuh."
      : "Posisi Seimbang (Draw).";
  document.getElementById("modal-gameover").classList.remove("hidden");
  playSound("end");
  const h = JSON.parse(localStorage.getItem("chess_history") || "[]");
  const o = document.getElementById("opponent-name").innerText;
  if (
    !h.length ||
    Date.now() - new Date(h[h.length - 1].date).getTime() > 5000
  ) {
    h.push({
      date: new Date().toISOString(),
      opponent: o,
      result: res,
      pgn: chess.pgn(),
    });
    localStorage.setItem("chess_history", JSON.stringify(h));
  }
}
function showRequestModal(t) {
  document.getElementById("req-title").innerText =
    t === "takeback" ? "Minta Mundur" : "Tawaran Remis";
  document.getElementById("req-message").innerText =
    "Lawan meminta persetujuan.";
  document.getElementById("modal-request").classList.remove("hidden");
}
async function reqTakeback() {
  if (isAI) {
    chess.undo();
    chess.undo();
    renderBoard();
    updateMoveHistoryUI();
    playSound("notify");
    return;
  }
  showModalConfirm("MUNDUR?", "Minta mundur ke lawan?", async () => {
    await db
      .collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(currentGameId)
      .update({
        requests: {
          type: "takeback",
          sender: currentUser.uid,
          status: "pending",
        },
      });
  });
}
async function reqDraw() {
  showModalConfirm("REMIS?", "Ajukan remis?", async () => {
    await db
      .collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(currentGameId)
      .update({
        requests: {
          type: "draw",
          sender: currentUser.uid,
          status: "pending",
        },
      });
  });
}
function confirmResign() {
  if (document.getElementById("game-status").innerText === "Menunggu...") {
    db.collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(currentGameId)
      .delete();
    exitGame();
    return;
  }
  showModalConfirm("MENYERAH?", "YAKIN?", () => {
    handleGameOver("loss");
    if (!isAI)
      db.collection("artifacts")
        .doc(appId)
        .collection("public")
        .doc("data")
        .collection("games")
        .doc(currentGameId)
        .update({
          status: "finished",
          winner: document.getElementById("opponent-name").innerText,
        });
  });
}
async function respondRequest(acc) {
  document.getElementById("modal-request").classList.add("hidden");
  if (acc) {
    if (gameData.requests.type === "takeback") {
      const t = new Chess();
      t.load_pgn(chess.pgn());
      t.undo();
      if (
        t.turn() !==
        (gameData.requests.sender === gameData.white.id ? "w" : "b")
      )
        t.undo();
      await db
        .collection("artifacts")
        .doc(appId)
        .collection("public")
        .doc("data")
        .collection("games")
        .doc(currentGameId)
        .update({
          fen: t.fen(),
          pgn: t.pgn(),
          requests: { status: "accepted" },
        });
    } else if (gameData.requests.type === "draw") {
      await db
        .collection("artifacts")
        .doc(appId)
        .collection("public")
        .doc("data")
        .collection("games")
        .doc(currentGameId)
        .update({
          status: "finished",
          winner: "draw",
          requests: { status: "accepted" },
        });
    }
  } else {
    await db
      .collection("artifacts")
      .doc(appId)
      .collection("public")
      .doc("data")
      .collection("games")
      .doc(currentGameId)
      .update({ requests: { status: "rejected" } });
  }
}
function updateStatusText() {
  const el = document.getElementById("turn-indicator");
  if (!el) return;
  if (viewHistoryIndex !== -1) {
    el.innerText = "REPLAY";
    el.className = "text-xs font-bold text-yellow-500";
    return;
  }
  if (chess.turn() === boardOrientation.charAt(0)) {
    el.innerText = "GILIRAN ANDA";
    el.className = "text-xs font-bold text-green-400 animate-pulse";
  } else {
    el.innerText = "GILIRAN LAWAN";
    el.className = "text-xs font-bold text-slate-500";
  }
  const statusEl = document.getElementById("game-status");
  if (statusEl) statusEl.innerText = chess.in_check() ? "SKAK!" : "";
}

// ==========================================
// 4. MAIN INIT (DIJALANKAN PALING AKHIR)
// ==========================================

// Inisialisasi Aplikasi (Load Stockfish & Cek Login)
async function initApp() {
  // Fetch Stockfish (Async, No Await)
  fetch(
    "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js"
  )
    .then((r) => r.blob())
    .then((b) => {
      stockfishWorker = new Worker(URL.createObjectURL(b));
      stockfishWorker.onmessage = handleStockfishMessage;
      console.log("AI Ready");
    })
    .catch((e) => console.warn("AI Load Error: " + e.message));

  const s = localStorage.getItem("chess_username");
  if (s) document.getElementById("username-input").value = s;

  auth.onAuthStateChanged((u) => {
    if (u) {
      currentUser = u;
      updateConnectionStatus(true);
      if (
        s &&
        !document.getElementById("screen-login").classList.contains("hidden")
      )
        handleLogin();
    } else {
      updateConnectionStatus(false);
      auth.signInAnonymously().catch((e) => console.error("Auth Fail", e));
    }
  });

  // Global Event Listeners
  document.addEventListener("mouseup", handleGlobalEnd);
  document.addEventListener("touchend", handleGlobalEnd);
  document.addEventListener("mousemove", handleGlobalMove);
  document.addEventListener("touchmove", handleGlobalMove, {
    passive: false,
  });

  // Prevent context menu on board
  document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName !== "INPUT") e.preventDefault();
  });
}

// --- FUNGSI UPDATE HISTORY YANG HILANG ---
function updateMoveHistoryUI() {
  const tbody = document.getElementById("move-history");
  if (!tbody) return;

  tbody.innerHTML = ""; // Kosongkan tabel dulu

  const history = chess.history();
  // Loop setiap 2 langkah (Putih & Hitam)
  for (let i = 0; i < history.length; i += 2) {
    const moveWhite = history[i];
    const moveBlack = history[i + 1] || "";
    const moveNumber = i / 2 + 1;

    const tr = document.createElement("tr");
    tr.className = "border-b border-[#3e2723] hover:bg-[#2b1d0e]";
    tr.innerHTML = `
        <td class="px-3 py-2 text-stone-500 w-10 border-r border-[#3e2723] text-center">${moveNumber}.</td>
        <td class="px-3 py-2 cursor-pointer hover:text-white font-bold text-[#e6d2b5]">${moveWhite}</td>
        <td class="px-3 py-2 cursor-pointer hover:text-white font-bold text-[#e6d2b5]">${moveBlack}</td>
    `;
    tbody.appendChild(tr);
  }

  // Auto scroll ke bawah jika tidak sedang melihat replay
  if (viewHistoryIndex === -1) {
    const container = document.getElementById("pgn-container");
    if (container) container.scrollTop = container.scrollHeight;
  }
}

// JALANKAN APLIKASI
initApp();
