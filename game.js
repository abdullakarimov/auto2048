class Game2048 {
    constructor() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('best2048') || '0');
        this.gameState = 'playing'; // 'playing', 'won', 'over'
        this.hasWon = false;
        this.keepPlayingAfterWin = false;
        
        this.updateDisplay();
        this.setupKeyboard();
    }
    
    start() {
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
    }
    
    restart() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.gameState = 'playing';
        this.hasWon = false;
        this.keepPlayingAfterWin = false;
        this.hideMessage();
        this.start();
    }
    
    keepPlaying() {
        this.keepPlayingAfterWin = true;
        this.gameState = 'playing';
        this.hideMessage();
    }
    
    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (this.board[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    move(direction, simulate = false) {
        if (this.gameState !== 'playing') return false;
        
        const previousScore = this.score;
        let moved = false;
        
        switch (direction) {
            case 'up':
                moved = this.moveUp();
                break;
            case 'down':
                moved = this.moveDown();
                break;
            case 'left':
                moved = this.moveLeft();
                break;
            case 'right':
                moved = this.moveRight();
                break;
        }
        
        if (moved && !simulate) {
            this.addRandomTile();
            this.updateDisplay();
            this.checkGameState();
            
            // Show score addition animation
            if (this.score > previousScore) {
                this.showScoreAddition(this.score - previousScore);
            }
        }
        
        return moved;
    }
    
    moveLeft() {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const newRow = this.slideArray(this.board[row]);
            if (JSON.stringify(newRow) !== JSON.stringify(this.board[row])) {
                moved = true;
                this.board[row] = newRow;
            }
        }
        return moved;
    }
    
    moveRight() {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const reversed = [...this.board[row]].reverse();
            const newRow = this.slideArray(reversed).reverse();
            if (JSON.stringify(newRow) !== JSON.stringify(this.board[row])) {
                moved = true;
                this.board[row] = newRow;
            }
        }
        return moved;
    }
    
    moveUp() {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [this.board[0][col], this.board[1][col], this.board[2][col], this.board[3][col]];
            const newColumn = this.slideArray(column);
            if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
                moved = true;
                for (let row = 0; row < 4; row++) {
                    this.board[row][col] = newColumn[row];
                }
            }
        }
        return moved;
    }
    
    moveDown() {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [this.board[0][col], this.board[1][col], this.board[2][col], this.board[3][col]];
            const reversed = [...column].reverse();
            const newColumn = this.slideArray(reversed).reverse();
            if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
                moved = true;
                for (let row = 0; row < 4; row++) {
                    this.board[row][col] = newColumn[row];
                }
            }
        }
        return moved;
    }
    
    slideArray(arr) {
        // Remove zeros
        let filtered = arr.filter(val => val !== 0);
        
        // Merge adjacent equal values
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                this.score += filtered[i];
                filtered.splice(i + 1, 1);
            }
        }
        
        // Add zeros to the end
        while (filtered.length < 4) {
            filtered.push(0);
        }
        
        return filtered;
    }
    
    checkGameState() {
        // Check for 2048 tile (win condition)
        if (!this.hasWon && !this.keepPlayingAfterWin) {
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    if (this.board[row][col] === 2048) {
                        this.hasWon = true;
                        this.gameState = 'won';
                        this.showMessage('You Win!');
                        return;
                    }
                }
            }
        }
        
        // Check for game over
        if (!this.canMove()) {
            this.gameState = 'over';
            this.showMessage('Game Over!');
        }
    }
    
    canMove() {
        // Check for empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (this.board[row][col] === 0) {
                    return true;
                }
            }
        }
        
        // Check for possible merges
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const current = this.board[row][col];
                if (
                    (row < 3 && this.board[row + 1][col] === current) ||
                    (col < 3 && this.board[row][col + 1] === current)
                ) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    showMessage(text) {
        const messageElement = document.getElementById('gameMessage');
        const messageText = document.getElementById('messageText');
        messageText.textContent = text;
        messageElement.style.display = 'flex';
    }
    
    hideMessage() {
        const messageElement = document.getElementById('gameMessage');
        messageElement.style.display = 'none';
    }
    
    showScoreAddition(points) {
        const scoreAddition = document.getElementById('score-addition');
        scoreAddition.textContent = '+' + points;
        scoreAddition.style.opacity = '1';
        setTimeout(() => {
            scoreAddition.style.opacity = '0';
        }, 600);
    }
    
    updateDisplay() {
        this.updateScore();
        this.updateTiles();
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('best2048', this.bestScore.toString());
        }
        
        document.getElementById('best').textContent = this.bestScore;
    }
    
    updateTiles() {
        const container = document.getElementById('tileContainer');
        container.innerHTML = '';
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = this.board[row][col];
                if (value !== 0) {
                    const tile = document.createElement('div');
                    tile.className = `tile tile-${value} tile-position-${col + 1}-${row + 1}`;
                    
                    if (value > 2048) {
                        tile.classList.add('tile-super');
                    }
                    
                    const inner = document.createElement('div');
                    inner.className = 'tile-inner';
                    inner.textContent = value;
                    
                    tile.appendChild(inner);
                    container.appendChild(tile);
                }
            }
        }
    }
    
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.move('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.move('right');
                    break;
            }
        });
    }
    
    // Method for bot to get current board state
    getBoard() {
        return this.board.map(row => [...row]);
    }
    
    // Method for bot to get available moves
    getAvailableMoves() {
        const moves = [];
        const directions = ['up', 'down', 'left', 'right'];
        
        for (const direction of directions) {
            const tempGame = new Game2048();
            tempGame.board = this.board.map(row => [...row]);
            tempGame.score = this.score;
            tempGame.gameState = this.gameState;
            
            if (tempGame.move(direction, true)) { // Use simulate flag
                moves.push(direction);
            }
        }
        
        return moves;
    }
    
    // Method to simulate a move and return the resulting board
    simulateMove(direction) {
        const tempGame = new Game2048();
        tempGame.board = this.board.map(row => [...row]);
        tempGame.score = this.score;
        tempGame.gameState = this.gameState;
        
        const moved = tempGame.move(direction, true); // Use simulate flag
        
        return {
            moved,
            board: tempGame.board,
            score: tempGame.score
        };
    }
}
