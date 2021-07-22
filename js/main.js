'use strict';

var EMPTY = ' ';
var MINE = '💣';
var FLAG = '🚩';
var HINT = '💡';
var EMOJIS = {
    start: '😊',
    win: '😉',
    loss: '😵',
    step: '😮'
};

var gCurrEmoji = EMOJIS.start;
var gBoard;
var gGame;
var gTimerInterval = 0;
var gLeftHearts;
var gHintsCount;
var gIsHintActive;
var gSafeClickCounter;

var gLevel = {
    size: 12,
    mines: 30,
    hearts: 3
};

var gWinAudio = new Audio('audio/win.wav');
var gLossAudio = new Audio('audio/loss.wav');
var gHeartAudio = new Audio('audio/heart.wav');
var gHintAudio = new Audio('audio/hint.wav');
var gShowAudio = new Audio('audio/show.wav');

disableMenu();
htmlMouseUp();
renderBestScores();

function gGameInit() {
    gGame = {
        isOn: false,
        isFirstClick: false,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
        startTime: 0,
    };
}

function initGame() {
    clearInterval(gTimerInterval);
    gGameInit();
    gBoard = buildBoard(gLevel.size, gLevel.mines);
    gCurrEmoji = EMOJIS.start;
    gLeftHearts = gLevel.hearts;
    renderCell(document.querySelector('.hearts'), gLeftHearts);
    gHintsCount = 3;
    gIsHintActive = false;
    renderHints();
    document.querySelector('.hints').style.cursor = 'pointer';
    gSafeClickCounter = 3;
    renderCell(document.querySelector('.safe-click-str'),
        `${gSafeClickCounter} click(s) is available`);
    gGame.isOn = true;
    renderBoard(gBoard);
}

function buildBoard(size, mines) {
    var board = [];
    for (var i = 0; i < size; i++) {
        board[i] = [];
        for (var j = 0; j < size; j++) {
            var cell = {
                minesAroundCount: EMPTY,
                isShown: false,
                isMine: false,
                isMarked: false
            };
            board[i][j] = cell;
        }
    }
    return board;
}

function renderBoard(board) {
    var tdSpan = gLevel.size - 2;
    var strHTML = `<tr>
    <td class="menu flags">${gLevel.mines}</td>
    <td class="menu emoji" colspan="${tdSpan}" onclick="initGame()">${EMOJIS.start}</td>
    <td class="menu timer">000</td>
    </tr>`;

    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>';
        for (var j = 0; j < board[0].length; j++) {
            var cell = board[i][j];
            var content = EMPTY;
            if (cell.isShown) {
                content = cell.minesAroundCount;
            } else if (cell.isMarked) {
                content = FLAG;
            }
            var className = `class="cell cell-${i}-${j}"`;
            var strOnMouseUp = `onmouseup="cellClicked(event, ${i}, ${j})"`;
            var strOnMouseDown = `onmousedown="cellOnMouseDown(event)"`;
            strHTML += `<td ${className} ${strOnMouseUp} ${strOnMouseDown}">${content}</td>`;
        }
        strHTML += '</tr>'
    }
    var elContainer = document.querySelector('.board');
    elContainer.innerHTML = strHTML;
}

function gameOver(win) {
    clearInterval(gTimerInterval);
    gGame.isOn = false;

    if (win) {
        gWinAudio.play();
        gCurrEmoji = EMOJIS.win;
        setEmoji(gCurrEmoji);
        checkIfBestScoreAndRender();
    } else {
        gLossAudio.play();
        gCurrEmoji = EMOJIS.loss;
        setEmoji(gCurrEmoji);
    }
}

function setMines(board, minesCount, pos) {
    for (var i = 0; i < minesCount; i++) {
        var emptyCells = getEmptyCells(board, pos);
        var minePos = emptyCells[getRandomInteger(0, emptyCells.length)];
        board[minePos.i][minePos.j].isMine = true;
    }
}

function setMinesNegsCount(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var cell = board[i][j];
            if (cell.isMine) continue;
            var pos = { i, j };
            var minesCount = getMinesNegsCount(board, pos);
            cell.minesAroundCount = minesCount;
        }
    }
}

function getMinesNegsCount(board, pos) {
    var minesCount = 0;
    for (var i = pos.i - 1; i <= pos.i + 1 && i < board.length; i++) {
        if (i < 0) continue;
        for (var j = pos.j - 1; j <= pos.j + 1 && j < board[0].length; j++) {
            if (j < 0 || (i === pos.i && j === pos.j)) continue;
            var cell = board[i][j];
            if (cell.isMine) minesCount++
        }
    }
    return minesCount;
}

function cellClicked(event, i, j) {
    if (!gGame.isOn) return;

    if (!gGame.isFirstClick) {
        setMines(gBoard, gLevel.mines, { i, j });
        setMinesNegsCount(gBoard);
        gGame.isFirstClick = true;
        startTimer();
    }

    var cell = gBoard[i][j];
    if (cell.isShown) return;

    if (gIsHintActive) {
        activateHint(document.querySelector('.hints'), true, { i, j });
        return;
    }

    if (event.button === 2) {
        cellMarked(event.target, cell);
        return;
    }

    if (cell.isMarked) return;

    if (cell.isMine) {
        if (gLeftHearts > 0) {
            revivePlayer(event)
            return;
        }
        renderCell(event.target, MINE);
        revealMines(gBoard);
        gameOver(false);
        return;
    }

    cell.isShown = true;
    gGame.shownCount++;
    renderCell(event.target, cell.minesAroundCount);
    event.target.classList.toggle('marked');

    if (cell.minesAroundCount === 0) {
        expandShown(gBoard, { i, j });
    }
    if (checkWin()) gameOver(true);
}

function expandShown(board, pos) {
    for (var i = pos.i - 1; i <= pos.i + 1 && i < board.length; i++) {
        if (i < 0) continue;
        for (var j = pos.j - 1; j <= pos.j + 1 && j < board[0].length; j++) {
            var cell = board[i][j];
            if (j < 0 || (i === pos.i && j === pos.j) ||
                cell.isMarked || cell.isShown) continue;

            var className = `cell-${i}-${j}`;
            var elCell = document.querySelector(`.${className}`);

            cell.isShown = true;
            gGame.shownCount++;
            renderCell(elCell, cell.minesAroundCount);
            elCell.classList.toggle('marked');


            if (cell.minesAroundCount === 0) {
                expandShown(gBoard, { i, j });
            }
        }
    }
}

function revivePlayer(event) {
    gGame.isOn = false;
    gHeartAudio.play();
    renderCell(event.target, MINE);
    setTimeout(function() {
        gLeftHearts--;
        renderCell(document.querySelector('.hearts'), gLeftHearts);
        renderCell(event.target, EMPTY);
        setTimeout(function() { gGame.isOn = true }, 1000);
    }, 1000);
}

function activateHint(elHints, isCellClicked = false, pos) {
    if (!gGame.isOn || !gHintsCount) return;

    var elFirstHint = document.querySelector('.hints span');
    if (gIsHintActive) {
        gIsHintActive = false;
        elFirstHint.classList.toggle('dark-bulb');
        if (isCellClicked) {
            gGame.isOn = false;
            gShowAudio.play();
            blinkNegs(gBoard, pos);
            setTimeout(function() { gGame.isOn = true }, 1000);
            gHintsCount--;
            var elHints = document.querySelector('.hints');
            elHints.querySelector('span').remove();

            if (!gHintsCount) elHints.style.cursor = 'context-menu';
        }
    } else if (!gIsHintActive) {
        gHintAudio.play();
        gIsHintActive = true;
        elFirstHint.classList.toggle('dark-bulb');
    }
}

function blinkNegs(board, pos) {
    var negs = [];
    for (var i = pos.i - 1; i <= pos.i + 1 && i < board.length; i++) {
        if (i < 0) continue;
        for (var j = pos.j - 1; j <= pos.j + 1 && j < board[0].length; j++) {
            if (j < 0) continue;
            var cell = board[i][j];
            if (cell.isShown) continue;
            var elCell = document.querySelector(`.cell-${i}-${j}`);
            var content = cell.isMine ? MINE : cell.minesAroundCount;
            renderCell(elCell, content);
            negs.push({ i, j })
        }
    }
    setTimeout(function() {
        for (var i = 0; i < negs.length; i++) {
            var cell = gBoard[negs[i].i][negs[i].j];
            var elCell = document.querySelector(`.cell-${negs[i].i}-${negs[i].j}`);
            var content = cell.isMarked ? FLAG : EMPTY;
            renderCell(elCell, content);
        }
    }, 1000);
}

function checkWin() {
    if (gGame.shownCount === gLevel.size ** 2 - gLevel.mines &&
        gGame.markedCount === gLevel.mines) {
        return true;
    }
    return false
}

function revealMines(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var cell = board[i][j];
            if (cell.isMine && !cell.isMarked) {
                var className = `cell-${i}-${j}`;
                var elMine = document.querySelector(`.${className}`);
                renderCell(elMine, MINE);
            }
        }
    }
}

function cellMarked(elCell, cell) {
    if (cell.isMarked) {
        cell.isMarked = false;
        gGame.markedCount--;
        renderCell(elCell, EMPTY);
    } else {
        cell.isMarked = true;
        gGame.markedCount++;
        renderCell(elCell, FLAG);
    }

    var elFlagsCount = document.querySelector('.flags');
    var flagsCount = gLevel.mines - gGame.markedCount
    renderCell(elFlagsCount, flagsCount);

    if (checkWin()) gameOver(true);
}

function getEmptyCells(board, pos) {
    var emptyCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (board[i][j].isMine) continue;
            if (i === pos.i && j === pos.j) continue;
            emptyCells.push({ i, j });
        }
    }
    return emptyCells;
}

function startTimer() {
    gGame.startTime = Date.now();
    gTimerInterval = setInterval(function() {
            var msDiff = Date.now() - gGame.startTime;
            gGame.secsPassed = '' + parseInt(msDiff / 1000);
            if (gGame.secsPassed.length === 1) {
                gGame.secsPassed = '00' + gGame.secsPassed;
            } else if (gGame.secsPassed.length === 2) {
                gGame.secsPassed = '0' + gGame.secsPassed;
            }
            var elTimer = document.querySelector('.timer');
            renderCell(elTimer, gGame.secsPassed);
            if (+gGame.secsPassed >= 999) {

                clearInterval(gTimerInterval);
            }
        },
        1000);
}

function renderCell(elCell, value) {
    elCell.innerHTML = value;
}

function setEmoji(emoji) {
    var elEmoji = document.querySelector('.emoji');
    renderCell(elEmoji, emoji);
}

function setLevel(size) {
    gLevel.size = size;
    if (size === 4) {
        gLevel.mines = 2;
        gLevel.hearts = 1;
    } else if (size === 8) {
        gLevel.mines = 12;
        gLevel.hearts = 2;
    } else if (size === 12) {
        gLevel.mines = 30;
        gLevel.hearts = 3;
    }
    initGame();
}

function renderHints() {
    var elHints = document.querySelector('.hints');
    var strHints = `<span class="dark-bulb">💡</span>
    <span class="dark-bulb">💡</span>
    <span class="dark-bulb">💡</span>`;
    renderCell(elHints, strHints);
}

function checkIfBestScoreAndRender() {
    var elScore;
    if (gLevel.size === 4 && +gGame.secsPassed < +localStorage.easyScore) {
        localStorage.setItem('easyScore', `${gGame.secsPassed}`);
        elScore = document.querySelector('.easy-score');
    } else if (gLevel.size === 8 && +gGame.secsPassed < +localStorage.hardScore) {
        localStorage.setItem('hardScore', `${gGame.secsPassed}`);
        elScore = document.querySelector('.hard-score');
    } else if (gLevel.size === 12 && +gGame.secsPassed < +localStorage.expertScore) {
        localStorage.setItem('expertScore', `${gGame.secsPassed}`);
        elScore = document.querySelector('.expert-score');
    } else {
        return;
    }
    renderCell(elScore, gGame.secsPassed);
}

function renderBestScores() {
    if (!localStorage.easyScore) {
        localStorage.setItem("easyScore", '1000');
    }
    if (!localStorage.hardScore) {
        localStorage.setItem("hardScore", '1000');
    }
    if (!localStorage.expertScore) {
        localStorage.setItem("expertScore", '1000');
    }

    var elScore = document.querySelector('.easy-score');
    renderCell(elScore, +localStorage.easyScore);
    elScore = document.querySelector('.hard-score');
    renderCell(elScore, +localStorage.hardScore);
    elScore = document.querySelector('.expert-score');
    renderCell(elScore, +localStorage.expertScore);
}

function getEmptyCellsWithoutMines(board) {
    var emptyCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (board[i][j].isMine || board[i][j].isShown) continue;
            emptyCells.push({ i, j });
        }
    }
    return emptyCells;
}

function safeClick() {
    if (!gGame.isOn || !gSafeClickCounter) return;

    var emptyCells = getEmptyCellsWithoutMines(gBoard);
    if (!emptyCells.length) return;

    var randomIdx = getRandomInteger(0, emptyCells.length);
    var cell = emptyCells[randomIdx];
    var elCell = document.querySelector(`.cell-${cell.i}-${cell.j}`);
    elCell.classList.add('safe-cell');
    gGame.isOn = false;
    setTimeout(function() {
        elCell.classList.remove('safe-cell');
        gGame.isOn = true
    }, 1000);
    gSafeClickCounter--;
    var elSafe = document.querySelector('.safe-click-str');
    renderCell(elSafe, `${gSafeClickCounter} click(s) is available`)
}

// get random number NOT inclusive max
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function disableMenu() {
    var elBoard = document.querySelector('.board');
    elBoard.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
}

function htmlMouseUp() {
    var elHtml = document.querySelector('html');
    elHtml.addEventListener("mouseup", function() {
        setEmoji(gCurrEmoji);
    });
}

function cellOnMouseDown(event) {
    if (!gGame.isOn || event.button === 2) return;
    setEmoji(EMOJIS.step);
}