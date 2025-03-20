const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameOverScreen = document.getElementById("gameOver");
const startScreen = document.getElementById("startScreen");
const usernameInput = document.getElementById("usernameInput");
const currentEntry = document.getElementById("currentEntry");
const leaderboardList = document.getElementById("leaderboardList");
const toggleLeaderboardButton = document.getElementById("toggleLeaderboard");

const blockSize = 50;
const tuskySize = 40;
const stepSize = 25;
const padding = 2;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
let speed = 100;
const speedIncreaseThreshold = 200;
const speedIncreasePercent = 0.1;

const backgroundColor = "#0c0f1d";

const walrusImage = new Image();
walrusImage.src = "walrus.png";

const tuskyImage = new Image();
tuskyImage.src = "tusky.png";

let snake = [{
    x: Math.floor((canvasWidth / 2 - padding) / stepSize) * stepSize + padding,
    y: Math.floor((canvasHeight / 2 - padding) / stepSize) * stepSize + padding,
    direction: "KANAN"
}];
let direction = "KANAN";
let newDirection = "KANAN";

let tusky = {
    x: Math.floor(Math.random() * ((canvasWidth - 2 * padding) / stepSize)) * stepSize + padding,
    y: Math.floor(Math.random() * ((canvasHeight - 2 * padding) / stepSize)) * stepSize + padding
};

let gameOver = false;
let score = 0;
let lastTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;
let snakeTargetPositions = [];
let username = "";

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && direction !== "KANAN") {
        newDirection = "KIRI";
    } else if (event.key === "ArrowRight" && direction !== "KIRI") {
        newDirection = "KANAN";
    } else if (event.key === "ArrowUp" && direction !== "BAWAH") {
        newDirection = "ATAS";
    } else if (event.key === "ArrowDown" && direction !== "ATAS") {
        newDirection = "BAWAH";
    }
});

function interpolatePosition(current, target, factor) {
    return current + (target - current) * factor;
}

async function saveScoreToLeaderboard(username, score) {
    try {
        const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, score }),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Failed to save score:', data.error);
        }
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const leaderboard = await response.json();
        return leaderboard;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function updateLeaderboard() {
    if (score > 0) {
        await saveScoreToLeaderboard(username, score);
    }

    currentEntry.textContent = `@${username} - ${score}`;
    const leaderboard = await fetchLeaderboard();
    leaderboardList.innerHTML = "";
    leaderboard.forEach(entry => {
        const entryDiv = document.createElement("div");
        entryDiv.textContent = `@${entry.username} - ${entry.score}`;
        leaderboardList.appendChild(entryDiv);
    });
}

function toggleLeaderboard() {
    if (leaderboardList.style.display === "none") {
        leaderboardList.style.display = "block";
        toggleLeaderboardButton.textContent = "▲";
    } else {
        leaderboardList.style.display = "none";
        toggleLeaderboardButton.textContent = "▼";
    }
}

function startGame() {
    username = usernameInput.value.trim();
    if (username === "") {
        alert("Masukkan username dulu bro!");
        return;
    }
    startScreen.style.display = "none";
    updateLeaderboard();
    requestAnimationFrame(gameLoop);
}

function moveSnake() {
    if (direction !== newDirection) {
        direction = newDirection;
    }

    const previousPositions = snake.map(segment => ({ x: segment.x, y: segment.y, direction: segment.direction }));
    const head = { x: snake[0].x, y: snake[0].y, direction: direction };
    if (direction === "KANAN") head.x += stepSize;
    else if (direction === "KIRI") head.x -= stepSize;
    else if (direction === "ATAS") head.y -= stepSize;
    else if (direction === "BAWAH") head.y += stepSize;

    if (head.x >= canvasWidth - padding - blockSize) head.x = padding;
    else if (head.x < padding) head.x = canvasWidth - padding - blockSize;
    if (head.y >= canvasHeight - padding - blockSize) head.y = padding;
    else if (head.y < padding) head.y = canvasHeight - padding - blockSize;

    snake.unshift(head);

    const distanceX = Math.abs(head.x - tusky.x);
    const distanceY = Math.abs(head.y - tusky.y);
    let ateTusky = false;
    if (distanceX < stepSize && distanceY < stepSize) {
        ateTusky = true;
        score += 10;
        tusky.x = Math.floor(Math.random() * ((canvasWidth - 2 * padding - blockSize) / stepSize)) * stepSize + padding;
        tusky.y = Math.floor(Math.random() * ((canvasHeight - 2 * padding - blockSize) / stepSize)) * stepSize + padding;

        let isOnSnake;
        do {
            isOnSnake = false;
            for (let segment of snake) {
                const distX = Math.abs(tusky.x - segment.x);
                const distY = Math.abs(tusky.y - segment.y);
                if (distX < stepSize && distY < stepSize) {
                    isOnSnake = true;
                    tusky.x = Math.floor(Math.random() * ((canvasWidth - 2 * padding - blockSize) / stepSize)) * stepSize + padding;
                    tusky.y = Math.floor(Math.random() * ((canvasHeight - 2 * padding - blockSize) / stepSize)) * stepSize + padding;
                    break;
                }
            }
        } while (isOnSnake);

        if (score % speedIncreaseThreshold === 0) {
            speed = speed * (1 - speedIncreasePercent);
            console.log(`Speed increased! New speed: ${speed}ms`);
        }
    }

    if (!ateTusky) {
        snake.pop();
    }

    for (let i = 1; i < snake.length; i++) {
        snake[i].x = previousPositions[i - 1].x;
        snake[i].y = previousPositions[i - 1].y;
        snake[i].direction = previousPositions[i - 1].direction;
    }

    if (ateTusky) {
        const lastSegment = previousPositions[previousPositions.length - 1];
        let newSegment;
        if (lastSegment.direction === "KANAN") {
            newSegment = { x: lastSegment.x - stepSize, y: lastSegment.y, direction: lastSegment.direction };
        } else if (lastSegment.direction === "KIRI") {
            newSegment = { x: lastSegment.x + stepSize, y: lastSegment.y, direction: lastSegment.direction };
        } else if (lastSegment.direction === "ATAS") {
            newSegment = { x: lastSegment.x, y: lastSegment.y + stepSize, direction: lastSegment.direction };
        } else if (lastSegment.direction === "BAWAH") {
            newSegment = { x: lastSegment.x, y: lastSegment.y - stepSize, direction: lastSegment.direction };
        }
        snake.push(newSegment);
    }

    updateLeaderboard();
}

function checkCollision() {
    const head = snake[0];
    for (let i = 1; i < snake.length; i++) {
        const distX = Math.abs(head.x - snake[i].x);
        const distY = Math.abs(head.y - snake[i].y);
        if (distX < stepSize && distY < stepSize) {
            return true;
        }
    }
    return false;
}

function restartGame() {
    updateLeaderboard();
    snake = [{
        x: Math.floor((canvasWidth / 2 - padding) / stepSize) * stepSize + padding,
        y: Math.floor((canvasHeight / 2 - padding) / stepSize) * stepSize + padding,
        direction: "KANAN"
    }];
    direction = "KANAN";
    newDirection = "KANAN";
    tusky = {
        x: Math.floor(Math.random() * ((canvasWidth - 2 * padding - blockSize) / stepSize)) * stepSize + padding,
        y: Math.floor(Math.random() * ((canvasHeight - 2 * padding - blockSize) / stepSize)) * stepSize + padding
    };
    score = 0;
    speed = 100;
    gameOver = false;
    gameOverScreen.style.display = "none";
    lastTime = 0;
    snakeTargetPositions = [];
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (gameOver) {
        gameOverScreen.style.display = "block";
        return;
    }

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;

    if (deltaTime >= speed) {
        moveSnake();
        snakeTargetPositions = snake.map(segment => ({ x: segment.x, y: segment.y }));
        if (checkCollision()) {
            gameOver = true;
        }
        lastTime = timestamp;
    }

    const factor = Math.min(deltaTime / speed, 1);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.drawImage(tuskyImage, tusky.x, tusky.y, tuskySize, tuskySize);

    snake.forEach((segment, index) => {
        const target = snakeTargetPositions[index] || { x: segment.x, y: segment.y };
        const smoothX = interpolatePosition(segment.x, target.x, factor);
        const smoothY = interpolatePosition(segment.y, target.y, factor);

        ctx.save();
        ctx.translate(smoothX + blockSize / 2, smoothY + blockSize / 2);

        let angle = 0;
        if (segment.direction === "KANAN") angle = Math.PI / 2;
        else if (segment.direction === "KIRI") angle = -Math.PI / 2;
        else if (segment.direction === "ATAS") angle = 0;
        else if (segment.direction === "BAWAH") angle = Math.PI;

        ctx.rotate(angle);
        ctx.drawImage(walrusImage, -blockSize / 2, -blockSize / 2, blockSize, blockSize);
        ctx.restore();
    });

    requestAnimationFrame(gameLoop);
}

async function initLeaderboard() {
    const leaderboard = await fetchLeaderboard();
    currentEntry.textContent = username ? `@${username} - ${score}` : "Belum ada skor";
    leaderboardList.innerHTML = "";
    leaderboard.forEach(entry => {
        const entryDiv = document.createElement("div");
        entryDiv.textContent = `@${entry.username} - ${entry.score}`;
        leaderboardList.appendChild(entryDiv);
    });
}

Promise.all([
    new Promise((resolve) => {
        walrusImage.onload = resolve;
        walrusImage.onerror = () => console.error("Gagal memuat walrus.png.");
    }),
    new Promise((resolve) => {
        tuskyImage.onload = resolve;
        tuskyImage.onerror = () => console.error("Gagal memuat tusky.png.");
    })
]).then(() => {
    initLeaderboard();
    startScreen.style.display = "block";
});