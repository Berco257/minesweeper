'use strict';

var EMPTY = ' ';
var MINE = '💣';
var FLAG = '🚩';
var EMOJI = {
    start: '😊',
    win: '😉',
    loss: '😵'
};

var gBoard;
var gGame;
var gMouseButton;
var gTimerInterval = 0;

var gLevel = {
    size: 12,
    mines: 30
};

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
    setMines(gBoard, gLevel.mines);
    setMinesNegsCount(gBoard);
    renderBoard(gBoard);
    disableMenu();
    gGame.isOn = true;
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
    <td class="menu emoji" colspan="${tdSpan}" onclick="initGame()">${EMOJI.start}</td>
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
            strHTML += `<td ${className} ${strOnMouseUp}">${content}</td>`;
        }
        strHTML += '</tr>'
    }
    var elContainer = document.querySelector('.board');
    elContainer.innerHTML = strHTML;
}

function setMines(board, minesCount) {
    for (var i = 0; i < minesCount; i++) {
        var emptyCells = getEmptyCells(board);
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

function renderCell(elCell, value) {
    elCell.innerText = value;
}

// true = win and false = loss
function gameOver(res) {
    clearInterval(gTimerInterval);
    gGame.isOn = false;
    var emoji = res ? EMOJI.win : EMOJI.loss;
    var elEmoji = document.querySelector('.emoji');
    renderCell(elEmoji, emoji);
}

function checkWin() {
    if (gGame.shownCount === gLevel.size ** 2 - gLevel.mines &&
        gGame.markedCount === gLevel.mines) {
        return true;
    }
    return false
}

function cellClicked(event, i, j) {
    if (!gGame.isOn) return;

    if (!gGame.isFirstClick) {
        gGame.isFirstClick = true;
        startTimer();
    }

    var cell = gBoard[i][j];
    if (cell.isShown) return;

    if (event.button === 2) {
        cellMarked(event.target, cell);
        return;
    }

    if (cell.isMarked) return;

    if (cell.isMine) {
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

function setLevel(size, mines) {
    gLevel = {
        size,
        mines
    };
    initGame();
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

function getEmptyCells(board) {
    var emptyCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (board[i][j].isMine) continue;
            emptyCells.push({ i, j });
        }
    }
    return emptyCells;
}

// get random number NOT inclusive max
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
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
            if (gGame.secsPassed === '999') {
                clearInterval(gTimerInterval);
            }
        },
        1000);
}

function disableMenu() {
    var elBoard = document.querySelector('.board');
    elBoard.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
}