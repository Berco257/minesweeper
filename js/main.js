'use strict';

var EMPTY = ' ';
var MINE = '💣';
var FLAG = '🚩';
var HINT = '💡';
var EMOJIS = {
    start: '😊',
    win: '😉',
    loss: '😵',
    step: '😮',
    creative: '🤓',
};

var gBoard;
var gGame;
var gTimerInterval = 0;
var gCreativeModeMineCount;

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
var gCreativeAudio = new Audio('audio/creative.wav');
var gCreativeEndAudio = new Audio('audio/creativeEnd.wav');

disableMenu();
htmlMouseUp();
renderBestScores();

function gGameInit() {
    gGame = {
        isOn: false,
        isFirstClick: true,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
        startTime: 0,
        currEmoji: EMOJIS.start,
        leftHearts: gLevel.hearts,
        isHintActive: false,
        elHint: '',
        safeClickCounter: 3,
        isCreativeMode: false,
    };
}

function initGame() {
    clearInterval(gTimerInterval);
    gGameInit();
    gBoard = buildBoard(gLevel.size, gLevel.mines);
    renderCell(document.querySelector('.hearts'), gGame.leftHearts);
    renderHints();
    renderCell(document.querySelector('.safe-click-str'),
        `${gGame.safeClickCounter} clicks available`);
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

    var cellSize = '103px';
    if (gLevel.size === 8) cellSize = '50.5px';
    else if (gLevel.size === 12) cellSize = '33px';

    var strTrStyle = `style="height: ${cellSize}";`;
    var strTdStyle = `style="min-width: ${cellSize}";`;

    for (var i = 0; i < board.length; i++) {
        strHTML += `<tr ${strTrStyle}>`;
        for (var j = 0; j < board[0].length; j++) {
            var cell = board[i][j];
            var content = EMPTY;
            if (cell.isShown) {
                content = cell.minesAroundCount;
            } else if (cell.isMarked) {
                content = FLAG;
            }
            var className = `class="cell cell-${i}-${j}"`;
            var strOnContextMenu = `oncontextmenu="cellMarked(this, ${i}, ${j})"`;
            var strOnClick = `onclick="cellClicked(this, ${i}, ${j})"`;
            var strOnMouseDown = `onmousedown="cellOnMouseDown(event)"`;
            var strOnMouseOver = `onmouseover="cellHintMarked(${i}, ${j})"`;
            var strOnMouseOut = `onmouseout="cellHintUnMarked(${i}, ${j})"`;
            strHTML += `<td ${strTdStyle} ${className} ${strOnContextMenu} ${strOnClick}
            ${strOnMouseDown} ${strOnMouseOver} ${strOnMouseOut}">${content}</td>`;
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
        gGame.currEmoji = EMOJIS.win;
        setEmoji(gGame.currEmoji);
        checkIfBestScoreAndRender();
    } else {
        gLossAudio.play();
        gGame.currEmoji = EMOJIS.loss;
        setEmoji(gGame.currEmoji);
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

function cellClicked(elCell, i, j) {
    var cell = gBoard[i][j];

    if (gGame.isCreativeMode && gGame.isFirstClick) {
        creativeModeSetMines(elCell, { i, j });
        return;
    }

    if (!gGame.isOn || cell.isShown) return;

    if (gGame.isFirstClick) {
        initMinesAndTimerAtFirstClick(i, j);
    }

    if (gGame.isCreativeMode && !gGame.isFirstClick) {
        gGame.isCreativeMode = false;
        startTimer();
    }

    if (gGame.isHintActive) {
        activateHint(gGame.elHint, true, { i, j });
        return;
    }

    if (cell.isMarked) return;

    if (cell.isMine) {
        if (gGame.leftHearts > 0) {
            revivePlayer(elCell)
            return;
        }
        renderCell(elCell, MINE);
        revealMines(gBoard);
        gameOver(false);
        return;
    }

    cell.isShown = true;
    gGame.shownCount++;
    renderCell(elCell, cell.minesAroundCount);
    elCell.classList.toggle('marked');

    if (cell.minesAroundCount === 0) {
        expandShown(gBoard, { i, j });
    }
    if (checkWin()) gameOver(true);
}

function cellMarked(elCell, i, j) {
    var cell = gBoard[i][j];
    if (!gGame.isOn || cell.isShown || gGame.isHintActive) return;

    if (gGame.isFirstClick) {
        initMinesAndTimerAtFirstClick(i, j);
    }

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

function initMinesAndTimerAtFirstClick(i, j) {
    setMines(gBoard, gLevel.mines, { i, j });
    setMinesNegsCount(gBoard);
    gGame.isFirstClick = false;
    startTimer();
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

function revivePlayer(elCell) {
    gGame.isOn = false;
    gHeartAudio.play();
    renderCell(elCell, MINE);
    setTimeout(function() {
        gGame.leftHearts--;
        renderCell(document.querySelector('.hearts'), gGame.leftHearts);
        renderCell(elCell, EMPTY);
        setTimeout(function() { gGame.isOn = true }, 1000);
    }, 1000);
}

function activateHint(elHint, isCellClicked = false, pos) {
    if (!gGame.isOn || gGame.isFirstClick) return;

    if (gGame.isHintActive) {
        gGame.isHintActive = false;
        if (isCellClicked) {
            gGame.isOn = false;
            gShowAudio.play();
            blinkNegs(gBoard, pos);
            setTimeout(function() { gGame.isOn = true }, 1000);
            elHint.removeAttribute('onclick')
        } else if (elHint === gGame.elHint) {
            gHintAudio.play();
            elHint.classList.toggle('bulb');
        }
    } else {
        gGame.isHintActive = true;
        gHintAudio.play();
        elHint.classList.toggle('bulb');
        gGame.elHint = elHint;
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
            elCell.classList.toggle('bulb-marked');
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

function cellHintMarked(i, j) {
    if (!gGame.isHintActive) return;
    toggleHintMarked('add', { i, j });
}

function cellHintUnMarked(i, j) {
    if (!gGame.isHintActive) return;
    toggleHintMarked('remove', { i, j });
}

function toggleHintMarked(type, pos) {
    for (var i = pos.i - 1; i <= pos.i + 1 && i < gBoard.length; i++) {
        if (i < 0) continue;
        for (var j = pos.j - 1; j <= pos.j + 1 && j < gBoard[0].length; j++) {
            if (j < 0) continue;
            var elCell = document.querySelector(`.cell-${i}-${j}`);
            type === 'add' ? elCell.classList.add('bulb-marked') : elCell.classList.remove('bulb-marked');
        }
    }
}

function safeClick() {
    if (!gGame.isOn || !gGame.safeClickCounter ||
        gGame.isHintActive || gGame.isFirstClick) return;

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
    gGame.safeClickCounter--;
    var elSafe = document.querySelector('.safe-click-str');

    if (!gGame.safeClickCounter) {
        renderCell(elSafe, `No clicks available`)
    } else if (gGame.safeClickCounter === 1) {
        renderCell(elSafe, `${gGame.safeClickCounter} click available`)
    } else {
        renderCell(elSafe, `${gGame.safeClickCounter} clicks available`)
    }
}

function creativeMode() {
    initGame();
    gGame.isCreativeMode = true;
    gGame.isOn = false;
    gCreativeAudio.play();
    gGame.currEmoji = EMOJIS.creative;
    setEmoji(gGame.currEmoji);
    creativeModeChangeCellsColor();
    gCreativeModeMineCount = 0;
}

function creativeModeInitGame() {
    gCreativeEndAudio.play();
    gGame.currEmoji = EMOJIS.start;
    setEmoji(gGame.currEmoji);
    setMinesNegsCount(gBoard);
    gGame.isFirstClick = false;
    renderBoard(gBoard);
    setTimeout(function() {
        gGame.isOn = true;
    }, 1000)
}

function creativeModeSetMines(elCell, pos) {
    if (gBoard[pos.i][pos.j].isMine) {
        gBoard[pos.i][pos.j].isMine = false;
        var elCell = document.querySelector(`.cell-${pos.i}-${pos.j}`);
        renderCell(elCell, EMPTY);
        gCreativeModeMineCount--;
    } else {
        gBoard[pos.i][pos.j].isMine = true;
        var elCell = document.querySelector(`.cell-${pos.i}-${pos.j}`);
        renderCell(elCell, MINE);
        gCreativeModeMineCount++;
    }
    var elFlags = document.querySelector('.flags');
    var value = gLevel.mines - gCreativeModeMineCount;
    renderCell(elFlags, value);

    if (!value) creativeModeInitGame();
}

function creativeModeChangeCellsColor() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            var elCell = document.querySelector(`.cell-${i}-${j}`);
            elCell.classList.add('creative-mode-cell');
        }
    }
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

function renderCell(elCell, value) {
    elCell.innerHTML = value;
}

function renderHints() {
    var elHints = document.querySelector('.hints');
    var strHints = `<span onclick="activateHint(this)">💡</span>
    <span onclick="activateHint(this)">💡</span>
    <span onclick="activateHint(this)">💡</span>`;
    renderCell(elHints, strHints);
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

function disableMenu() {
    var elBoard = document.querySelector('.board');
    elBoard.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
}

function htmlMouseUp() {
    var elHtml = document.querySelector('html');
    elHtml.addEventListener("mouseup", function() {
        setEmoji(gGame.currEmoji);
    });
}

function cellOnMouseDown(event) {
    if (!gGame.isOn || event.button === 2) return;
    setEmoji(EMOJIS.step);
}

// get random number NOT inclusive max
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}