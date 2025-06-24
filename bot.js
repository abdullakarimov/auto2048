class Bot2048 {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.speed = 100; // Slightly faster for more games
        this.moveInterval = null;
        this.strategy = 'enhanced'; // 'random', 'greedy', 'expectimax', 'enhanced'
        this.maxDepth = 5; // Increased depth for better lookahead
        
        // Enhanced weights based on successful 2048 bots - optimized for high scores
        this.weights = {
            emptyTiles: 20.0,      // Higher - empty space is absolutely critical
            smoothness: 0.5,       // Keep moderate - helps with merging
            monotonicity: 18.0,    // Much higher - this is key for very high scores
            maxTile: 3.0,          // Slightly higher boost for larger tiles
            cornerBonus: 35.0,     // Higher bonus for corner strategy
            edgeBonus: 6.0,        // Slightly higher edge preference
            clustering: 2.0,       // Lower - can sometimes hurt
            gradientBonus: 10.0,   // Higher reward for gradient patterns
            trapAvoidance: 1.5     // Keep light penalty
        };
        
        // Cache for evaluation results
        this.evalCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    
    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateStatus();
        this.updateToggleButton();
        
        // Auto-click "Keep Playing" if the game is won
        if (this.game.gameState === 'won') {
            this.game.keepPlaying();
        }
        
        this.moveInterval = setInterval(() => {
            this.makeMove();
            this.updatePerformanceStats(); // Update stats periodically
        }, this.speed);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.updateStatus();
        this.updateToggleButton();
        
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }
    
    setSpeed(speed) {
        this.speed = speed;
        
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
    
    makeMove() {
        // Auto-click "Keep Playing" if we've won and the message is showing
        if (this.game.gameState === 'won' && !this.game.keepPlayingAfterWin) {
            this.game.keepPlaying();
            return;
        }
        
        if (this.game.gameState !== 'playing') {
            this.stop();
            return;
        }
        
        let bestMove;
        
        switch (this.strategy) {
            case 'random':
                bestMove = this.getRandomMove();
                break;
            case 'greedy':
                bestMove = this.getGreedyMove();
                break;
            case 'expectimax':
                bestMove = this.getExpectimaxMove();
                break;
            case 'enhanced':
                bestMove = this.getEnhancedMove();
                break;
            default:
                bestMove = this.getEnhancedMove();
        }
        
        if (bestMove) {
            this.game.move(bestMove);
        } else {
            this.stop();
        }
    }
    
    getRandomMove() {
        const availableMoves = this.game.getAvailableMoves();
        if (availableMoves.length === 0) return null;
        
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    
    getGreedyMove() {
        const moves = ['up', 'down', 'left', 'right'];
        let bestMove = null;
        let bestScore = -1;
        
        for (const move of moves) {
            const result = this.game.simulateMove(move);
            if (result.moved) {
                const score = this.evaluateBoard(result.board);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }
        
        return bestMove;
    }
    
    getExpectimaxMove() {
        const moves = ['up', 'down', 'left', 'right'];
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            const result = this.game.simulateMove(move);
            if (result.moved) {
                const score = this.expectimax(result.board, this.maxDepth - 1, false);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }
        
        return bestMove;
    }
    
    expectimax(board, depth, isPlayerTurn) {
        if (depth === 0 || this.isTerminal(board)) {
            return this.enhancedEvaluateBoard(board);
        }
        
        if (isPlayerTurn) {
            // Player's turn - maximize
            let maxScore = -Infinity;
            const moves = ['up', 'down', 'left', 'right'];
            
            for (const move of moves) {
                const newBoard = this.simulateMoveOnBoard(board, move);
                if (newBoard) {
                    const score = this.expectimax(newBoard, depth - 1, false);
                    maxScore = Math.max(maxScore, score);
                }
            }
            
            return maxScore === -Infinity ? this.enhancedEvaluateBoard(board) : maxScore;
        } else {
            // Computer's turn (adding random tile) - expectation
            const emptyCells = this.getEmptyCells(board);
            if (emptyCells.length === 0) {
                return this.enhancedEvaluateBoard(board);
            }
            
            let expectedScore = 0;
            const totalCells = emptyCells.length;
            
            for (const cell of emptyCells) {
                // 90% chance of 2, 10% chance of 4
                const boardWith2 = this.copyBoard(board);
                boardWith2[cell.row][cell.col] = 2;
                expectedScore += 0.9 * this.expectimax(boardWith2, depth - 1, true);
                
                const boardWith4 = this.copyBoard(board);
                boardWith4[cell.row][cell.col] = 4;
                expectedScore += 0.1 * this.expectimax(boardWith4, depth - 1, true);
            }
            
            return expectedScore / totalCells;
        }
    }
    
    evaluateBoard(board) {
        return (
            this.weights.emptyTiles * this.countEmptyTiles(board) +
            this.weights.smoothness * this.calculateSmoothness(board) +
            this.weights.monotonicity * this.calculateEnhancedMonotonicity(board) +
            this.weights.maxTile * Math.log2(this.getMaxTile(board) || 1) +
            this.weights.cornerBonus * this.calculateCornerBonus(board) +
            this.weights.edgeBonus * this.calculateEdgeBonus(board) +
            this.weights.clustering * this.calculateClustering(board)
        );
    }
    
    enhancedEvaluateBoard(board) {
        const baseScore = (
            this.weights.emptyTiles * this.countEmptyTiles(board) +
            this.weights.smoothness * this.calculateSmoothness(board) +
            this.weights.monotonicity * this.calculateEnhancedMonotonicity(board) +
            this.weights.maxTile * Math.log2(this.getMaxTile(board) || 1) +
            this.weights.cornerBonus * this.calculateCornerBonus(board) +
            this.weights.edgeBonus * this.calculateEdgeBonus(board) +
            this.weights.clustering * this.calculateClustering(board) +
            this.weights.gradientBonus * this.calculateGradientBonus(board) +
            this.weights.trapAvoidance * this.calculateTrapAvoidance(board)
        );
        
        // Additional enhanced heuristics
        const mergeOpportunities = this.calculateMergeOpportunities(board);
        const snakePattern = this.calculateSnakePattern(board);
        const cornerStrategy = this.calculateCornerStrategy(board);
        const highTileBonus = this.calculateHighTileBonus(board);
        
        return baseScore + (mergeOpportunities * 1.5) + (snakePattern * 2.0) + 
               (cornerStrategy * 15.0) + (highTileBonus * 2.0);
    }

    calculateHighTileBonus(board) {
        // Bonus for having multiple high-value tiles (encourages progression)
        let bonus = 0;
        const tiles = [];
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] > 0) {
                    tiles.push(board[row][col]);
                }
            }
        }
        
        tiles.sort((a, b) => b - a);
        
        // Bonus for having high tiles (top 6 tiles)
        for (let i = 0; i < Math.min(6, tiles.length); i++) {
            if (tiles[i] >= 32) { // Only count tiles 32 and above
                bonus += Math.log2(tiles[i]) * (6 - i); // Higher bonus for higher tiles
            }
        }
        
        return bonus;
    }
    
    calculateMergeOpportunities(board) {
        let opportunities = 0;
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = board[row][col];
                if (value > 0) {
                    // Check for adjacent tiles that can merge
                    const adjacent = this.getAdjacentPositions(row, col);
                    for (const pos of adjacent) {
                        if (board[pos.row][pos.col] === value) {
                            opportunities += value; // Weight by tile value
                        }
                    }
                }
            }
        }
        
        return opportunities / 2; // Divide by 2 since we count each pair twice
    }
    
    calculateSnakePattern(board) {
        // Reward snake-like patterns that are common in high-scoring games
        let snakeScore = 0;
        
        // Check for descending pattern in rows (snake pattern)
        for (let row = 0; row < 4; row++) {
            let isDescending = true;
            for (let col = 0; col < 3; col++) {
                if (board[row][col] > 0 && board[row][col + 1] > 0) {
                    if (board[row][col] < board[row][col + 1]) {
                        isDescending = false;
                        break;
                    }
                }
            }
            if (isDescending) {
                snakeScore += this.getRowSum(board, row);
            }
        }
        
        return snakeScore;
    }
    
    getRowSum(board, row) {
        return board[row].reduce((sum, val) => sum + val, 0);
    }
    
    countEmptyTiles(board) {
        let count = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === 0) count++;
            }
        }
        return count;
    }
    
    calculateSmoothness(board) {
        let smoothness = 0;
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                smoothness += this.calculateCellSmoothness(board, row, col);
            }
        }
        
        return smoothness;
    }
    
    calculateCellSmoothness(board, row, col) {
        if (board[row][col] === 0) return 0;
        
        const value = Math.log2(board[row][col]);
        let smoothness = 0;
        
        // Check right neighbor
        if (col < 3 && board[row][col + 1] !== 0) {
            const neighborValue = Math.log2(board[row][col + 1]);
            smoothness -= Math.abs(value - neighborValue);
        }
        
        // Check down neighbor
        if (row < 3 && board[row + 1][col] !== 0) {
            const neighborValue = Math.log2(board[row + 1][col]);
            smoothness -= Math.abs(value - neighborValue);
        }
        
        return smoothness;
    }
    
    calculateEnhancedMonotonicity(board) {
        // Enhanced monotonicity that strongly prefers corner-based strategies
        let totalScore = 0;
        
        // Check each corner and calculate monotonicity from that corner
        const corners = [
            { row: 0, col: 0, rowDir: 1, colDir: 1 },   // Top-left
            { row: 0, col: 3, rowDir: 1, colDir: -1 },  // Top-right
            { row: 3, col: 0, rowDir: -1, colDir: 1 },  // Bottom-left
            { row: 3, col: 3, rowDir: -1, colDir: -1 }  // Bottom-right
        ];
        
        for (const corner of corners) {
            const score = this.calculateCornerMonotonicity(board, corner);
            totalScore = Math.max(totalScore, score);
        }
        
        return totalScore;
    }
    
    calculateCornerMonotonicity(board, corner) {
        const horizontalScore = this.calculateHorizontalCornerMonotonicity(board, corner);
        const verticalScore = this.calculateVerticalCornerMonotonicity(board, corner);
        return horizontalScore + verticalScore;
    }
    
    calculateHorizontalCornerMonotonicity(board, corner) {
        let score = 0;
        const { row: startRow, col: startCol, rowDir, colDir } = corner;
        
        for (let row = startRow; row >= 0 && row < 4; row += rowDir) {
            score += this.calculateRowMonotonicityFromPosition(board, row, startCol, colDir);
        }
        
        return score;
    }
    
    calculateVerticalCornerMonotonicity(board, corner) {
        let score = 0;
        const { row: startRow, col: startCol, rowDir, colDir } = corner;
        
        for (let col = startCol; col >= 0 && col < 4; col += colDir) {
            score += this.calculateColumnMonotonicityFromPosition(board, startRow, col, rowDir);
        }
        
        return score;
    }
    
    calculateRowMonotonicityFromPosition(board, row, startCol, colDir) {
        let score = 0;
        let prevValue = board[row][startCol];
        
        for (let col = startCol + colDir; col >= 0 && col < 4; col += colDir) {
            const currentValue = board[row][col];
            score += this.getMonotonicityScore(prevValue, currentValue);
            prevValue = currentValue;
        }
        
        return score;
    }
    
    calculateColumnMonotonicityFromPosition(board, startRow, col, rowDir) {
        let score = 0;
        let prevValue = board[startRow][col];
        
        for (let row = startRow + rowDir; row >= 0 && row < 4; row += rowDir) {
            const currentValue = board[row][col];
            score += this.getMonotonicityScore(prevValue, currentValue);
            prevValue = currentValue;
        }
        
        return score;
    }
    
    getMonotonicityScore(prevValue, currentValue) {
        if (prevValue >= currentValue && prevValue > 0) {
            return prevValue;
        } else if (currentValue > 0) {
            return -currentValue;
        }
        return 0;
    }
    
    calculateCornerBonus(board) {
        const maxTile = this.getMaxTile(board);
        let bonus = 0;
        
        // Huge bonus for max tile in corner
        const corners = [[0,0], [0,3], [3,0], [3,3]];
        for (const [row, col] of corners) {
            if (board[row][col] === maxTile) {
                bonus += maxTile * 10;
            }
        }
        
        // Additional bonus for second highest tile adjacent to max tile in corner
        const maxPositions = this.findMaxTilePositions(board, maxTile);
        for (const pos of maxPositions) {
            if (this.isCorner(pos.row, pos.col)) {
                const secondHighest = this.getSecondHighestTile(board);
                const adjacent = this.getAdjacentPositions(pos.row, pos.col);
                
                for (const adjPos of adjacent) {
                    if (board[adjPos.row][adjPos.col] === secondHighest) {
                        bonus += secondHighest * 2;
                    }
                }
            }
        }
        
        return bonus;
    }
    
    calculateEdgeBonus(board) {
        const allTiles = this.getAllTilesSorted(board);
        return this.calculateEdgeBonusForTiles(board, allTiles);
    }
    
    getAllTilesSorted(board) {
        const allTiles = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] > 0) {
                    allTiles.push(board[row][col]);
                }
            }
        }
        return allTiles.sort((a, b) => b - a);
    }
    
    calculateEdgeBonusForTiles(board, allTiles) {
        let bonus = 0;
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                bonus += this.getEdgeTileBonus(board, row, col, allTiles);
            }
        }
        
        return bonus;
    }
    
    getEdgeTileBonus(board, row, col, allTiles) {
        const value = board[row][col];
        if (value > 0 && this.isEdge(row, col)) {
            const rank = allTiles.indexOf(value);
            if (rank < 6) { // Top 6 tiles
                return value * (6 - rank) * 0.5;
            }
        }
        return 0;
    }
    
    calculateClustering(board) {
        let penalty = 0;
        
        // Penalize high-value tiles that are not clustered together
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = board[row][col];
                if (value >= 32) { // Only consider tiles 32 and above
                    const neighbors = this.getAdjacentValues(board, row, col);
                    const hasHighNeighbor = neighbors.some(n => n >= value / 2);
                    
                    if (!hasHighNeighbor) {
                        penalty -= value; // Penalty for isolated high tiles
                    }
                }
            }
        }
        
        return penalty;
    }
    
    getSecondHighestTile(board) {
        const allTiles = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] > 0) {
                    allTiles.push(board[row][col]);
                }
            }
        }
        allTiles.sort((a, b) => b - a);
        return allTiles.length > 1 ? allTiles[1] : 0;
    }
    
    isCorner(row, col) {
        return (row === 0 || row === 3) && (col === 0 || col === 3);
    }
    
    isEdge(row, col) {
        return row === 0 || row === 3 || col === 0 || col === 3;
    }
    
    getAdjacentPositions(row, col) {
        const positions = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 4 && newCol >= 0 && newCol < 4) {
                positions.push({ row: newRow, col: newCol });
            }
        }
        
        return positions;
    }
    
    getAdjacentValues(board, row, col) {
        const positions = this.getAdjacentPositions(row, col);
        return positions.map(pos => board[pos.row][pos.col]).filter(val => val > 0);
    }
    
    getEnhancedMove() {
        let bestMove = null;
        let bestScore = -Infinity;
        
        // Clear cache periodically to prevent memory bloat
        if (this.evalCache.size > 10000) {
            this.evalCache.clear();
        }

        // Adaptive depth based on game state
        const maxTile = this.getMaxTile(this.game.board);
        const emptyTiles = this.countEmptyTiles(this.game.board);
        let searchDepth = this.maxDepth;
        
        // Deeper search in critical late-game situations
        if (maxTile >= 1024 && emptyTiles <= 4) {
            searchDepth = Math.min(this.maxDepth + 2, 7);
        } else if (emptyTiles <= 2) {
            searchDepth = Math.min(this.maxDepth + 1, 6);
        }

        // Order moves strategically to try corner-preserving moves first
        const orderedMoves = this.getStrategicMoveOrdering();

        for (const move of orderedMoves) {
            const result = this.game.simulateMove(move);
            if (result.moved) {
                // Use expectimax with enhanced evaluation
                const score = this.expectimax(result.board, searchDepth - 1, false);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return bestMove;
    }

    getStrategicMoveOrdering() {
        const maxTile = this.getMaxTile(this.game.board);
        const maxPositions = this.findMaxTilePositions(this.game.board, maxTile);
        
        // If max tile is in a corner, prioritize moves that keep it there
        const cornerWithMax = maxPositions.find(pos => this.isCorner(pos.row, pos.col));
        
        if (cornerWithMax) {
            return this.getMovesForCornerStrategy(cornerWithMax);
        }
        
        // Otherwise, prioritize moves that could lead to corner placement
        return this.getMovesTowardsCorner(maxPositions);
    }
    
    enhancedExpectimax(board, depth, isPlayerTurn, alpha, beta) {
        const boardKey = this.getBoardKey(board);
        const cacheKey = `${boardKey}_${depth}_${isPlayerTurn}`;
        
        if (this.evalCache.has(cacheKey)) {
            this.cacheHits++;
            return this.evalCache.get(cacheKey);
        }
        
        this.cacheMisses++;
        
        if (depth === 0 || this.isTerminal(board)) {
            const score = this.enhancedEvaluateBoard(board);
            this.evalCache.set(cacheKey, score);
            return score;
        }
        
        const result = isPlayerTurn ? 
            this.handlePlayerTurn(board, depth, alpha, beta) :
            this.handleComputerTurn(board, depth, alpha, beta);
        
        this.evalCache.set(cacheKey, result);
        return result;
    }
    
    handlePlayerTurn(board, depth, alpha, beta) {
        let maxScore = -Infinity;
        const moves = this.getOrderedMoves(board);
        
        for (const move of moves) {
            const newBoard = this.simulateMoveOnBoard(board, move);
            if (newBoard) {
                const score = this.enhancedExpectimax(newBoard, depth - 1, false, alpha, beta);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
        }
        
        return maxScore === -Infinity ? this.enhancedEvaluateBoard(board) : maxScore;
    }
    
    handleComputerTurn(board, depth, alpha, beta) {
        const emptyCells = this.getEmptyCells(board);
        if (emptyCells.length === 0) {
            return this.enhancedEvaluateBoard(board);
        }
        
        let expectedScore = 0;
        // Adaptive cell consideration based on game state
        const maxTile = this.getMaxTile(board);
        const isLateGame = maxTile >= 512;
        const maxCellsToConsider = isLateGame ? 
            Math.min(emptyCells.length, 4) : // More focused in late game
            Math.min(emptyCells.length, 6);
        
        const sortedCells = this.getSortedEmptyCells(board, emptyCells);
        
        for (let i = 0; i < maxCellsToConsider; i++) {
            const cell = sortedCells[i];
            expectedScore += this.evaluateCellPlacement(board, cell, depth, alpha, beta);
        }
        
        return expectedScore / maxCellsToConsider;
    }
    
    evaluateCellPlacement(board, cell, depth, alpha, beta) {
        // 90% chance of 2, 10% chance of 4
        const boardWith2 = this.copyBoard(board);
        boardWith2[cell.row][cell.col] = 2;
        const score2 = 0.9 * this.enhancedExpectimax(boardWith2, depth - 1, true, alpha, beta);
        
        const boardWith4 = this.copyBoard(board);
        boardWith4[cell.row][cell.col] = 4;
        const score4 = 0.1 * this.enhancedExpectimax(boardWith4, depth - 1, true, alpha, beta);
        
        return score2 + score4;
    }
    
    getOrderedMoves(board) {
        const maxTile = this.getMaxTile(board);
        const maxPositions = this.findMaxTilePositions(board, maxTile);
        
        // Determine which corner (if any) has the max tile
        const cornerWithMax = maxPositions.find(pos => this.isCorner(pos.row, pos.col));
        
        if (cornerWithMax) {
            return this.getMovesForCornerStrategy(cornerWithMax);
        }
        
        // Advanced move ordering based on board state
        return this.getStrategicMoveOrder(board, maxPositions);
    }
    
    getStrategicMoveOrder(board, maxPositions) {
        const moves = ['up', 'down', 'left', 'right'];
        const moveScores = [];
        
        // Evaluate each move quickly for ordering
        for (const move of moves) {
            const newBoard = this.simulateMoveOnBoard(board, move);
            if (newBoard) {
                const score = this.quickEvaluate(newBoard);
                moveScores.push({ move, score });
            }
        }
        
        // Sort by score descending and return move order
        moveScores.sort((a, b) => b.score - a.score);
        return moveScores.map(item => item.move);
    }
    
    quickEvaluate(board) {
        // Fast evaluation for move ordering
        return (
            this.countEmptyTiles(board) * 10 +
            this.calculateCornerBonus(board) * 2 +
            this.calculateTrapAvoidance(board) * 0.5
        );
    }
    
    getMovesForCornerStrategy(cornerPos) {
        const { row, col } = cornerPos;
        
        // Bottom-right corner strategy (most common)
        if (row === 3 && col === 3) {
            return ['down', 'right', 'left', 'up'];
        }
        // Bottom-left corner strategy
        if (row === 3 && col === 0) {
            return ['down', 'left', 'right', 'up'];
        }
        // Top-right corner strategy
        if (row === 0 && col === 3) {
            return ['up', 'right', 'left', 'down'];
        }
        // Top-left corner strategy
        if (row === 0 && col === 0) {
            return ['up', 'left', 'right', 'down'];
        }
        
        return ['down', 'right', 'left', 'up']; // Default to bottom-right strategy
    }
    
    getMovesTowardsCorner(maxPositions) {
        if (maxPositions.length === 0) {
            return ['down', 'right', 'left', 'up'];
        }
        
        const pos = maxPositions[0];
        const { row, col } = pos;
        
        // Determine which corner is closest and move towards it
        if (row >= 2 && col >= 2) {
            return ['down', 'right', 'left', 'up']; // Move towards bottom-right
        } else if (row >= 2 && col <= 1) {
            return ['down', 'left', 'right', 'up']; // Move towards bottom-left
        } else if (row <= 1 && col >= 2) {
            return ['up', 'right', 'left', 'down']; // Move towards top-right
        } else {
            return ['up', 'left', 'right', 'down']; // Move towards top-left
        }
    }
    
    getSortedEmptyCells(board, emptyCells) {
        // Sort empty cells by strategic value (prefer corner/edge positions)
        return emptyCells.sort((a, b) => {
            const scoreA = this.getCellStrategicValue(a);
            const scoreB = this.getCellStrategicValue(b);
            return scoreB - scoreA; // Descending order
        });
    }
    
    getCellStrategicValue(cell) {
        const { row, col } = cell;
        let value = 0;
        
        // Corner positions are most valuable
        if ((row === 0 || row === 3) && (col === 0 || col === 3)) {
            value += 10;
        }
        // Edge positions are valuable
        else if (row === 0 || row === 3 || col === 0 || col === 3) {
            value += 5;
        }
        
        return value;
    }
    
    getBoardKey(board) {
        return board.flat().join(',');
    }
    
    findMaxTilePositions(board, maxTile) {
        const positions = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === maxTile) {
                    positions.push({ row, col });
                }
            }
        }
        return positions;
    }
    
    updatePerformanceStats() {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? Math.round((this.cacheHits / total) * 100) : 0;
        const cacheHitElement = document.getElementById('cacheHitRate');
        if (cacheHitElement) {
            cacheHitElement.textContent = `${hitRate}%`;
        }
        
        const strategyElement = document.getElementById('strategy');
        if (strategyElement) {
            const strategyNames = {
                'random': 'Random',
                'greedy': 'Greedy',
                'expectimax': 'Expectimax',
                'enhanced': 'Enhanced AI'
            };
            strategyElement.textContent = strategyNames[this.strategy] || 'Enhanced AI';
        }
    }
    
    updateStatus() {
        const statusElement = document.getElementById('botStatus');
        if (this.isRunning) {
            statusElement.textContent = 'Running';
            statusElement.className = 'running';
        } else {
            statusElement.textContent = 'Stopped';
            statusElement.className = '';
        }
    }
    
    updateToggleButton() {
        const toggleButton = document.getElementById('botToggle');
        if (this.isRunning) {
            toggleButton.textContent = 'Stop Bot';
            toggleButton.classList.add('active');
        } else {
            toggleButton.textContent = 'Start Bot';
            toggleButton.classList.remove('active');
        }
    }
    
    simulateMoveOnBoard(board, direction) {
        const newBoard = this.copyBoard(board);
        let moved = false;
        
        switch (direction) {
            case 'left':
                moved = this.simulateMoveLeft(newBoard);
                break;
            case 'right':
                moved = this.simulateMoveRight(newBoard);
                break;
            case 'up':
                moved = this.simulateMoveUp(newBoard);
                break;
            case 'down':
                moved = this.simulateMoveDown(newBoard);
                break;
        }
        
        return moved ? newBoard : null;
    }
    
    simulateMoveLeft(board) {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const newRow = this.slideArray([...board[row]]);
            if (JSON.stringify(newRow) !== JSON.stringify(board[row])) {
                moved = true;
                board[row] = newRow;
            }
        }
        return moved;
    }
    
    simulateMoveRight(board) {
        let moved = false;
        for (let row = 0; row < 4; row++) {
            const reversed = [...board[row]].reverse();
            const newRow = this.slideArray(reversed).reverse();
            if (JSON.stringify(newRow) !== JSON.stringify(board[row])) {
                moved = true;
                board[row] = newRow;
            }
        }
        return moved;
    }
    
    simulateMoveUp(board) {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [board[0][col], board[1][col], board[2][col], board[3][col]];
            const newColumn = this.slideArray(column);
            if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
                moved = true;
                for (let row = 0; row < 4; row++) {
                    board[row][col] = newColumn[row];
                }
            }
        }
        return moved;
    }
    
    simulateMoveDown(board) {
        let moved = false;
        for (let col = 0; col < 4; col++) {
            const column = [board[0][col], board[1][col], board[2][col], board[3][col]];
            const reversed = [...column].reverse();
            const newColumn = this.slideArray(reversed).reverse();
            if (JSON.stringify(newColumn) !== JSON.stringify(column)) {
                moved = true;
                for (let row = 0; row < 4; row++) {
                    board[row][col] = newColumn[row];
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
                filtered.splice(i + 1, 1);
            }
        }
        
        // Add zeros to the end
        while (filtered.length < 4) {
            filtered.push(0);
        }
        
        return filtered;
    }
    
    getMaxTile(board) {
        let max = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                max = Math.max(max, board[row][col]);
            }
        }
        return max;
    }
    
    isTerminal(board) {
        // Check for empty cells
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === 0) return false;
            }
        }
        
        // Check for possible merges
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const current = board[row][col];
                if (
                    (row < 3 && board[row + 1][col] === current) ||
                    (col < 3 && board[row][col + 1] === current)
                ) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    getEmptyCells(board) {
        const cells = [];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === 0) {
                    cells.push({ row, col });
                }
            }
        }
        return cells;
    }
    
    copyBoard(board) {
        return board.map(row => [...row]);
    }
    
    calculateGradientBonus(board) {
        // Reward smooth gradients from corners - critical for high scores
        let maxGradient = 0;
        
        // Check gradient from each corner
        const corners = [
            { row: 0, col: 0, rowDir: 1, colDir: 1 },   // Top-left
            { row: 0, col: 3, rowDir: 1, colDir: -1 },  // Top-right  
            { row: 3, col: 0, rowDir: -1, colDir: 1 },  // Bottom-left
            { row: 3, col: 3, rowDir: -1, colDir: -1 }  // Bottom-right
        ];
        
        for (const corner of corners) {
            const gradient = this.calculateCornerGradient(board, corner);
            maxGradient = Math.max(maxGradient, gradient);
        }
        
        return maxGradient;
    }
    
    calculateCornerGradient(board, corner) {
        const { row: startRow, col: startCol, rowDir, colDir } = corner;
        let gradientScore = 0;
        let prevValue = board[startRow][startCol];
        
        if (prevValue === 0) return 0;
        
        // Check main diagonal gradient
        for (let i = 1; i < 4; i++) {
            const row = startRow + (rowDir * i);
            const col = startCol + (colDir * i);
            
            if (row >= 0 && row < 4 && col >= 0 && col < 4) {
                const currentValue = board[row][col];
                if (currentValue > 0 && prevValue >= currentValue) {
                    gradientScore += prevValue;
                    prevValue = currentValue;
                } else {
                    break;
                }
            }
        }
        
        return gradientScore;
    }
    
    calculateTrapAvoidance(board) {
        // Lightly penalize positions where high tiles are trapped
        let penalty = 0;
        const maxTile = this.getMaxTile(board);
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = board[row][col];
                
                // Check if high-value tiles are trapped (only very high tiles matter)
                if (value >= maxTile / 2 && value > 128) { // Only care about tiles >= 128
                    const mobility = this.calculateTileMobility(board, row, col);
                    if (mobility === 0) {
                        penalty -= Math.log2(value); // Much lighter penalty
                    } else if (mobility === 1) {
                        penalty -= Math.log2(value) * 0.25; // Very light penalty
                    }
                }
            }
        }
        
        return penalty;
    }
    
    calculateTileMobility(board, row, col) {
        const value = board[row][col];
        let mobility = 0;
        
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < 4 && newCol >= 0 && newCol < 4) {
                const neighbor = board[newRow][newCol];
                // Can move if neighbor is empty or same value (can merge)
                if (neighbor === 0 || neighbor === value) {
                    mobility++;
                }
            }
        }
        
        return mobility;
    }
    
    calculateCornerStrategy(board) {
        // Advanced corner strategy - reward specific patterns that lead to high scores
        const maxTile = this.getMaxTile(board);
        let strategyBonus = 0;
        
        // Find max tile position
        const maxPositions = this.findMaxTilePositions(board, maxTile);
        
        for (const pos of maxPositions) {
            if (this.isCorner(pos.row, pos.col)) {
                // Bonus for max tile in corner
                strategyBonus += maxTile * 5;
                
                // Additional bonus for proper build-up around corner
                strategyBonus += this.calculateCornerBuildUp(board, pos);
            }
        }
        
        return strategyBonus;
    }
    
    calculateCornerBuildUp(board, cornerPos) {
        const { row, col } = cornerPos;
        let buildUpScore = 0;
        const maxTile = board[row][col];
        
        // Define expected ratios for optimal build-up
        const expectedRatios = [0.5, 0.25, 0.125]; // 1/2, 1/4, 1/8 of max tile
        
        // Check adjacent positions for proper build-up
        const adjacent = this.getAdjacentPositions(row, col);
        
        for (const adjPos of adjacent) {
            const adjValue = board[adjPos.row][adjPos.col];
            if (adjValue > 0) {
                for (const ratio of expectedRatios) {
                    const expectedValue = maxTile * ratio;
                    if (Math.abs(adjValue - expectedValue) < expectedValue * 0.1) {
                        buildUpScore += adjValue;
                        break;
                    }
                }
            }
        }
        
        return buildUpScore;
    }
}
