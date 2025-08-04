// 遊戲常數
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
let BLOCK_SIZE = 30; // 改為可變的，支援響應式

// 方塊類型定義
const PIECES = {
    I: {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00f5ff'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#a000f0'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00f000'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#f00000'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#0000f0'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#f0a000'
    }
};

// 遊戲狀態
let gameBoard = [];
let currentPiece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;
let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let level = 1;
let lines = 0;
let combo = 0;
let gameRunning = false;
let gamePaused = false;
let dropTime = 0;
let dropInterval = 1000;

// 按鍵狀態
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false
};

// 按鍵重複延遲
let keyRepeatDelay = 150;
let keyRepeatInterval = 105; // 減少間隔時間，提高靈敏度30%
let lastKeyTime = 0;

// Canvas 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

// DOM 元素
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const restartButton = document.getElementById('restartButton');
const comboDisplay = document.getElementById('comboDisplay');

// 初始化遊戲
function initGame() {
    // 初始化遊戲板
    gameBoard = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    
    // 重置遊戲狀態
    score = 0;
    level = 1;
    lines = 0;
    combo = 0;
    holdPiece = null;
    canHold = true;
    gameRunning = false;
    gamePaused = false;
    dropTime = 0;
    dropInterval = 1000;
    
    // 重置按鍵狀態
    keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowDown: false
    };
    
    // 調整 Canvas 大小
    resizeCanvas();
    
    // 更新顯示
    updateDisplay();
    
    // 生成第一個方塊
    nextPiece = generatePiece();
    
    // 顯示開始畫面
    showOverlay('遊戲開始', '按空白鍵開始遊戲');
}

// 生成隨機方塊
function generatePiece() {
    const pieceTypes = Object.keys(PIECES);
    const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    const piece = PIECES[randomType];
    
    return {
        type: randomType,
        shape: piece.shape,
        color: piece.color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

// 檢查碰撞
function isCollision(piece, dx = 0, dy = 0, rotation = 0) {
    const shape = rotation ? rotatePiece(piece.shape, rotation) : piece.shape;
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardX = newX + x;
                const boardY = newY + y;
                
                if (boardX < 0 || boardX >= BOARD_WIDTH || 
                    boardY >= BOARD_HEIGHT || 
                    (boardY >= 0 && gameBoard[boardY][boardX])) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 旋轉方塊
function rotatePiece(shape, direction) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (direction > 0) { // 順時針
                rotated[x][rows - 1 - y] = shape[y][x];
            } else { // 逆時針
                rotated[cols - 1 - x][y] = shape[y][x];
            }
        }
    }
    return rotated;
}

// 放置方塊到遊戲板
function placePiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    gameBoard[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    // 檢查並清除完整行
    clearLines();
    
    // 生成新方塊
    currentPiece = nextPiece;
    nextPiece = generatePiece();
    
    // 重置 hold 功能
    canHold = true;
    
    // 檢查遊戲結束
    if (isCollision(currentPiece)) {
        gameOver();
    }
}

// 清除完整行
function clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (gameBoard[y].every(cell => cell !== 0)) {
            gameBoard.splice(y, 1);
            gameBoard.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++; // 重新檢查同一行
        }
    }
    
    if (linesCleared > 0) {
        // 增加 combo
        combo++;
        
        // 更新分數（包含 combo 獎勵）
        const lineScores = [0, 100, 300, 500, 800];
        const comboBonus = combo > 1 ? (combo - 1) * 50 : 0;
        score += (lineScores[linesCleared] * level) + comboBonus;
        lines += linesCleared;
        
        // 更新等級
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        // 顯示 combo 特效
        showComboEffect();
        
        // 震動效果
        canvas.parentElement.classList.add('game-shake');
        setTimeout(() => {
            canvas.parentElement.classList.remove('game-shake');
        }, 300);
        
        updateDisplay();
    } else {
        // 沒有消除行，重置 combo
        combo = 0;
    }
}

// 移動方塊
function movePiece(dx, dy) {
    if (!gameRunning || gamePaused) return;
    
    if (!isCollision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// 旋轉方塊
function rotateCurrentPiece() {
    if (!gameRunning || gamePaused) return;
    
    const rotatedShape = rotatePiece(currentPiece.shape, 1);
    const originalShape = currentPiece.shape;
    currentPiece.shape = rotatedShape;
    
    if (isCollision(currentPiece)) {
        // 嘗試牆踢
        const kicks = [
            [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]
        ];
        
        let kicked = false;
        for (const [dx, dy] of kicks) {
            if (!isCollision(currentPiece, dx, dy)) {
                currentPiece.x += dx;
                currentPiece.y += dy;
                kicked = true;
                break;
            }
        }
        
        if (!kicked) {
            currentPiece.shape = originalShape;
        }
    }
}

// 硬降（直接落到底部）
function hardDrop() {
    if (!gameRunning || gamePaused) return;
    
    while (movePiece(0, 1)) {
        score += 2;
    }
    placePiece();
    updateDisplay();
}

// Hold 功能
function holdCurrentPiece() {
    if (!gameRunning || gamePaused || !canHold) return;
    
    if (holdPiece === null) {
        // 第一次 hold
        holdPiece = {
            type: currentPiece.type,
            shape: currentPiece.shape,
            color: currentPiece.color
        };
        currentPiece = nextPiece;
        nextPiece = generatePiece();
    } else {
        // 交換 hold 和當前方塊
        const temp = {
            type: currentPiece.type,
            shape: currentPiece.shape,
            color: currentPiece.color
        };
        currentPiece = {
            type: holdPiece.type,
            shape: holdPiece.shape,
            color: holdPiece.color,
            x: Math.floor(BOARD_WIDTH / 2) - Math.floor(holdPiece.shape[0].length / 2),
            y: 0
        };
        holdPiece = temp;
    }
    
    canHold = false;
    renderHoldPiece();
}

// 顯示 combo 特效
function showComboEffect() {
    if (combo > 1) {
        comboDisplay.textContent = `${combo} COMBO!`;
        comboDisplay.style.display = 'block';
        
        setTimeout(() => {
            comboDisplay.style.display = 'none';
        }, 1000);
    }
}

// 渲染遊戲
function render() {
    // 清空畫布
    ctx.fillStyle = '#000000'; // 改為黑色背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製遊戲板
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (gameBoard[y][x]) {
                drawBlock(ctx, x, y, gameBoard[y][x]);
            }
        }
    }
    
    // 繪製當前方塊
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(ctx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                }
            }
        }
    }
    
    // 移除網格繪製
}

// 繪製方塊
function drawBlock(context, x, y, color) {
    const pixelX = x * BLOCK_SIZE;
    const pixelY = y * BLOCK_SIZE;
    
    context.fillStyle = color;
    context.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    context.strokeStyle = '#333';
    context.lineWidth = 1;
    context.strokeRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // 添加高光效果
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(pixelX + 2, pixelY + 2, BLOCK_SIZE - 4, 4);
    context.fillRect(pixelX + 2, pixelY + 2, 4, BLOCK_SIZE - 4);
}

// 繪製網格
function drawGrid() {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
}

// 渲染下一個方塊
function renderNextPiece() {
    nextCtx.fillStyle = '#1a1a2e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const blockSize = Math.min(15, BLOCK_SIZE * 0.5); // 動態計算方塊尺寸
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    const pixelX = offsetX + x * blockSize;
                    const pixelY = offsetY + y * blockSize;
                    
                    nextCtx.fillStyle = nextPiece.color;
                    nextCtx.fillRect(pixelX, pixelY, blockSize, blockSize);
                    
                    nextCtx.strokeStyle = '#333';
                    nextCtx.lineWidth = 1;
                    nextCtx.strokeRect(pixelX, pixelY, blockSize, blockSize);
                }
            }
        }
    }
}

// 渲染 hold 方塊
function renderHoldPiece() {
    holdCtx.fillStyle = '#1a1a2e';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    if (holdPiece) {
        const blockSize = Math.min(15, BLOCK_SIZE * 0.5); // 動態計算方塊尺寸
        const offsetX = (holdCanvas.width - holdPiece.shape[0].length * blockSize) / 2;
        const offsetY = (holdCanvas.height - holdPiece.shape.length * blockSize) / 2;
        
        for (let y = 0; y < holdPiece.shape.length; y++) {
            for (let x = 0; x < holdPiece.shape[y].length; x++) {
                if (holdPiece.shape[y][x]) {
                    const pixelX = offsetX + x * blockSize;
                    const pixelY = offsetY + y * blockSize;
                    
                    holdCtx.fillStyle = canHold ? holdPiece.color : '#666';
                    holdCtx.fillRect(pixelX, pixelY, blockSize, blockSize);
                    
                    holdCtx.strokeStyle = '#333';
                    holdCtx.lineWidth = 1;
                    holdCtx.strokeRect(pixelX, pixelY, blockSize, blockSize);
                }
            }
        }
    }
    
    // 更新 hold 區域的視覺狀態
    const holdContainer = holdCanvas.parentElement;
    if (canHold && holdPiece) {
        holdContainer.classList.add('hold-available');
        holdContainer.classList.remove('hold-used');
    } else if (holdPiece) {
        holdContainer.classList.add('hold-used');
        holdContainer.classList.remove('hold-available');
    } else {
        holdContainer.classList.remove('hold-available', 'hold-used');
    }
}

// 調整 Canvas 大小
function resizeCanvas() {
    const container = canvas.parentElement;
    const containerWidth = container.offsetWidth;
    
    // 根據容器寬度計算合適的方塊大小
    if (containerWidth <= 300) {
        BLOCK_SIZE = 20;
    } else if (containerWidth <= 400) {
        BLOCK_SIZE = 25;
    } else {
        BLOCK_SIZE = 30;
    }
    
    // 設置 Canvas 尺寸
    canvas.width = BOARD_WIDTH * BLOCK_SIZE;
    canvas.height = BOARD_HEIGHT * BLOCK_SIZE;
    
    // 調整側邊欄 Canvas 大小
    const sidebarBlockSize = Math.min(15, BLOCK_SIZE * 0.5);
    nextCanvas.width = 120;
    nextCanvas.height = 120;
    holdCanvas.width = 120;
    holdCanvas.height = 120;
    
    // 重新渲染
    render();
    renderNextPiece();
    renderHoldPiece();
}

// 更新顯示
function updateDisplay() {
    scoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 顯示覆蓋層
function showOverlay(title, message, showRestartButton = false) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    if (restartButton) restartButton.style.display = showRestartButton ? '' : 'none';
    gameOverlay.classList.add('active');
}

// 隱藏覆蓋層
function hideOverlay() {
    gameOverlay.classList.remove('active');
    if (restartButton) restartButton.style.display = 'none';
}

// 重新開始按鈕事件
if (restartButton) {
    restartButton.onclick = () => {
        hideOverlay();
        restartGame();
    };
}

// 開始遊戲
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    currentPiece = nextPiece;
    nextPiece = generatePiece();
    hideOverlay();
    gameLoop();
}

// 暫停遊戲
function pauseGame() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseButton.textContent = gamePaused ? '繼續' : '暫停';
    
    if (gamePaused) {
        showOverlay('遊戲暫停', '按空白鍵繼續遊戲');
    } else {
        hideOverlay();
    }
}

// 重新開始遊戲
function restartGame() {
    initGame();
    pauseButton.textContent = '暫停';
}

// 遊戲結束
function gameOver() {
    gameRunning = false;
    
    // 保存原始歷史最高分數
    const originalHighScore = highScore;
    
    // 檢查是否破紀錄
    let isNewRecord = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore);
        isNewRecord = true;
    }
    
    const message = isNewRecord 
        ? `🎉 新紀錄！\n本次分數: ${score}\n歷史最高: ${originalHighScore}`
        : `本次分數: ${score}\n歷史最高: ${originalHighScore}`;
    
    showOverlay('遊戲結束', message, true);
}

// 遊戲主循環
function gameLoop() {
    if (!gameRunning) return;
    
    const now = Date.now();
    
    if (!gamePaused) {
        // 處理持續按鍵移動
        handleKeyRepeat(now);
        
        if (now - dropTime > dropInterval) {
            if (!movePiece(0, 1)) {
                placePiece();
            }
            dropTime = now;
        }
    }
    
    render();
    renderNextPiece();
    renderHoldPiece();
    
    requestAnimationFrame(gameLoop);
}

// 處理按鍵重複
function handleKeyRepeat(now) {
    if (keys.ArrowLeft && (now - lastKeyTime > keyRepeatInterval)) {
        movePiece(-1, 0);
        lastKeyTime = now;
    }
    if (keys.ArrowRight && (now - lastKeyTime > keyRepeatInterval)) {
        movePiece(1, 0);
        lastKeyTime = now;
    }
    if (keys.ArrowDown && (now - lastKeyTime > keyRepeatInterval)) {
        if (movePiece(0, 1)) {
            score += 1;
            updateDisplay();
        }
        lastKeyTime = now;
    }
}

// 鍵盤事件處理
document.addEventListener('keydown', (e) => {
    if (!gameRunning) {
        if (e.code === 'Space') {
            startGame();
        }
        return;
    }
    
    if (gamePaused) {
        if (e.code === 'Space') {
            pauseGame();
        }
        return;
    }
    
    switch (e.code) {
        case 'ArrowLeft':
            keys.ArrowLeft = true;
            if (!keys.ArrowRight) {
                movePiece(-1, 0);
                lastKeyTime = Date.now();
            }
            break;
        case 'ArrowRight':
            keys.ArrowRight = true;
            if (!keys.ArrowLeft) {
                movePiece(1, 0);
                lastKeyTime = Date.now();
            }
            break;
        case 'ArrowDown':
            keys.ArrowDown = true;
            if (movePiece(0, 1)) {
                score += 1;
                updateDisplay();
            }
            lastKeyTime = Date.now();
            break;
        case 'ArrowUp':
            rotateCurrentPiece();
            break;
        case 'Space':
            hardDrop();
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            holdCurrentPiece();
            break;
        case 'KeyP':
            pauseGame();
            break;
    }
    
    e.preventDefault();
});

// 鍵盤釋放事件
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'ArrowLeft':
            keys.ArrowLeft = false;
            break;
        case 'ArrowRight':
            keys.ArrowRight = false;
            break;
        case 'ArrowDown':
            keys.ArrowDown = false;
            break;
    }
});

// 視窗大小改變監聽器
window.addEventListener('resize', () => {
    if (!gameRunning) {
        resizeCanvas();
    }
});

// 防止觸控設備上的縮放
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
}, { passive: false });

// 初始化遊戲
initGame();
render();
renderNextPiece();
renderHoldPiece(); 