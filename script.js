// --- Constants and Variables ---
const boardElement = document.getElementById("tic-tac-toe-board");
const timerElement = document.getElementById("round-timer");
const statusElement = document.getElementById("status");
const modeSelect = document.getElementById("mode-select");
const difficultySelect = document.getElementById("difficulty-select");
const difficultySelectContainer = document.getElementById("difficulty-select-container");
const confettiCanvas = document.getElementById('confetti-canvas');
let confettiParticles = [], confettiTimer = null;

const X = "X", O = "O";
const cellCount = 9;
const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

let boardState, currentPlayer, round, timer, timerInterval, roundResults, lockBoard, gameMode, difficultyMode;

function showConfetti(duration = 1300) {
    resizeConfettiCanvas();
    confettiParticles = generateConfettiParticles();
    drawConfetti();
    if (confettiTimer) clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => {
        confettiParticles = [];
        clearCanvas();
    }, duration);
}

function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    const container = document.querySelector('.game-container');
    confettiCanvas.width = container.offsetWidth;
    confettiCanvas.height = container.offsetHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);

function generateConfettiParticles() {
    const colors = ['#ff0000','#0000ff','#FFD700','#00C853'];
    const n = 42;
    let arr = [];
    for (let i = 0; i < n; i++) {
        arr.push({
            x: Math.random() * confettiCanvas.width,
            y: -12,
            r: 7 + Math.random() * 7,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: 2 + Math.random() * 3,
            vx: -1 + Math.random() * 2,
            angle: Math.random() * 2 * Math.PI,
            vr: -0.1 + Math.random()*0.2
        });
    }
    return arr;
}

function drawConfetti() {
    if (!confettiParticles || confettiParticles.length === 0) return;
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let stillActive = false;
    for (const p of confettiParticles) {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.r/2, -p.r/6, p.r, p.r/3);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.vr;
        if (p.y < confettiCanvas.height + 16) stillActive = true;
    }
    confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 16);
    if (stillActive) {
        requestAnimationFrame(drawConfetti);
    } else {
        clearCanvas();
    }
}
function clearCanvas() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

function resetBoardState() {
    boardState = Array(cellCount).fill(null);
    currentPlayer = X;
    lockBoard = false;
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = "";
    for (let i = 0; i < cellCount; i++) {
        const cell = document.createElement("div");
        cell.className = "cell" + (boardState[i] ? (" " + boardState[i].toLowerCase()) : "");
        cell.dataset.index = i;
        cell.textContent = boardState[i] || "";
        cell.addEventListener("click", handleCellClick);
        boardElement.appendChild(cell);
    }
}

function handleCellClick(e) {
    if (lockBoard) return;
    const idx = +e.target.dataset.index;
    if (boardState[idx]) return;
    if (gameMode === 'pvc' && currentPlayer === O) return; // Only user can play X
    boardState[idx] = currentPlayer;
    renderBoard();
    const winner = checkWinner();
    if (winner) {
        lockBoard = true;
        clearInterval(timerInterval);
        roundResults.push(winner);
        showStatus(`WE HAVE A WINNER – <span style='color:${winner===X?'#ff0000':'#0000ff'}'>${winner}</span>`);
        showConfetti();
        setTimeout(endRound, 1500);
    } else if (boardState.every(cell => cell)) {
        lockBoard = true;
        clearInterval(timerInterval);
        roundResults.push("draw");
        showStatus("NO WINNERS");
        setTimeout(endRound, 1500);
    } else {
        currentPlayer = currentPlayer === X ? O : X;
        if (gameMode === 'pvc' && currentPlayer === O) {
            lockBoard = true;
            setTimeout(computerMove, 400);
        }
    }
}

function getEmptyCells(bd) {
    return bd
        .map((val, idx) => val === null ? idx : null)
        .filter(idx => idx !== null);
}

function computerMove() {
    // Decide which difficulty
    let move;
    if (difficultyMode === 'easy') {
        move = computerMoveEasy(boardState);
    } else if (difficultyMode === 'medium') {
        move = computerMoveMedium(boardState);
    } else {
        move = computerMoveHard(boardState);
    }
    if (move === undefined) return;
    boardState[move] = O;
    renderBoard();
    const winner = checkWinner();
    if (winner) {
        lockBoard = true;
        clearInterval(timerInterval);
        roundResults.push(winner);
        showStatus(`WE HAVE A WINNER – <span style='color:${winner===X?'#ff0000':'#0000ff'}'>${winner}</span>`);
        showConfetti();
        setTimeout(endRound, 1500);
    } else if (boardState.every(cell => cell)) {
        lockBoard = true;
        clearInterval(timerInterval);
        roundResults.push("draw");
        showStatus("NO WINNERS");
        setTimeout(endRound, 1500);
    } else {
        currentPlayer = X;
        lockBoard = false;
    }
}

function computerMoveEasy(bd) {
    const empties = getEmptyCells(bd);
    if (empties.length === 0) return undefined;
    return empties[Math.floor(Math.random() * empties.length)];
}

function computerMoveMedium(bd) {
    const empties = getEmptyCells(bd);
    // Try to win in one move
    for (const idx of empties) {
        const copy = [...bd];
        copy[idx] = O;
        if (getWinner(copy) === O) return idx;
    }
    // Try to block user if they're about to win
    for (const idx of empties) {
        const copy = [...bd];
        copy[idx] = X;
        if (getWinner(copy) === X) return idx;
    }
    // Otherwise, random
    return computerMoveEasy(bd);
}

function computerMoveHard(bd) {
    // Minimax
    let bestScore = -Infinity, move;
    for (const idx of getEmptyCells(bd)) {
        const copy = [...bd];
        copy[idx] = O;
        const score = minimax(copy, false);
        if (score > bestScore) {
            bestScore = score;
            move = idx;
        }
    }
    return move;
}

function minimax(bd, isMaximizing) {
    const winner = getWinner(bd);
    if (winner === O) return 1;
    if (winner === X) return -1;
    if (bd.every(cell => cell)) return 0;
    if (isMaximizing) {
        let best = -Infinity;
        for (const idx of getEmptyCells(bd)) {
            const copy = [...bd];
            copy[idx] = O;
            best = Math.max(best, minimax(copy, false));
        }
        return best;
    } else {
        let best = Infinity;
        for (const idx of getEmptyCells(bd)) {
            const copy = [...bd];
            copy[idx] = X;
            best = Math.min(best, minimax(copy, true));
        }
        return best;
    }
}

function getWinner(bd) {
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) {
            return bd[a];
        }
    }
    return null;
}

function checkWinner() {
    return getWinner(boardState);
}

function showStatus(msg) {
    statusElement.innerHTML = msg;
}

function startTimer() {
    let seconds = 0;
    timerElement.textContent = "0";
    timerInterval = setInterval(() => {
        seconds += 1;
        timerElement.textContent = seconds;
    }, 1000);
    timer = timerInterval;
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function endRound() {
    round++;
    if (round < 5) {
        startNextRound();
    } else {
        showFinalResults();
    }
}

function startNextRound() {
    resetBoardState();
    stopTimer();
    startTimer();
    showStatus(`<b>Round ${round + 1} of 5</b>`);
}

function showFinalResults() {
    stopTimer();
    lockBoard = true;
    const xWins = roundResults.filter(r => r === X).length;
    const oWins = roundResults.filter(r => r === O).length;
    const draws = roundResults.filter(r => r === "draw").length;
    let summary = `<b>FINAL RESULTS</b><br>X Wins: <span style='color:#ff0000'>${xWins}</span><br>O Wins: <span style='color:#0000ff'>${oWins}</span><br>Draws: ${draws}`;
    summary += `<br><br><button onclick='restartGame()' style='margin-top:10px;padding:8px 16px;font-size:1rem'>Restart</button>`;
    showStatus(summary);
    showConfetti(1600); // Show confetti at the end of five rounds
}

function restartGame() {
    round = 0;
    roundResults = [];
    lockBoard = false;
    startNextRound();
}

function handleModeChange() {
    gameMode = modeSelect.value;
    if (gameMode === "pvc") {
        difficultySelectContainer.style.display = "block";
    } else {
        difficultySelectContainer.style.display = "none";
    }
    restartGame();
}

function handleDifficultyChange() {
    difficultyMode = (difficultySelect && difficultySelect.value) || 'easy';
    if (gameMode === "pvc") restartGame();
}

function init() {
    round = 0;
    roundResults = [];
    lockBoard = false;
    gameMode = (modeSelect && modeSelect.value) || 'pvp';
    difficultyMode = (difficultySelect && difficultySelect.value) || 'easy';
    if (modeSelect) modeSelect.onchange = handleModeChange;
    if (difficultySelect) difficultySelect.onchange = handleDifficultyChange;
    if (gameMode === "pvc") {
        difficultySelectContainer.style.display = "block";
    } else {
        difficultySelectContainer.style.display = "none";
    }
    startNextRound();
}

window.restartGame = restartGame; // for button onclick
window.onload = init;
