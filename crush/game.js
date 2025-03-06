document.addEventListener('DOMContentLoaded', () => {
    // Game configuration
    const config = {
        rows: 8,
        cols: 8,
        symbols: ['👹', '💀', '🔥', '⛧', '🗡️', '🩸', '🐐', '🕯️'],
        minMatch: 3,
        pointsPerTile: 10,
        soulsPerMatch: 1,
        matchDelay: 500,
        fallDelay: 100,
        newTileDelay: 50,
        audioEnabled: true
    };

    // Game state
    let board = [];
    let score = 0;
    let souls = 0;
    let selectedTile = null;
    let isSwapping = false;
    let isChecking = false;
    let gameOver = false;
    let musicInitialized = false; // Flag to track if music has been initialized

    // DOM elements
    const boardElement = document.getElementById('board');
    const scoreElement = document.getElementById('score');
    const soulsElement = document.getElementById('souls');
    const gameOverElement = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    const finalSoulsElement = document.getElementById('final-souls');
    const restartButton = document.getElementById('restart-button');
    const toggleAudioButton = document.getElementById('toggle-audio');

    // Audio elements
    const backgroundMusic = document.getElementById('background-music');
    const matchSound = document.getElementById('match-sound');
    const swapSound = document.getElementById('swap-sound');
    const soulCollectSound = document.getElementById('soul-collect-sound');
    const gameOverSound = document.getElementById('game-over-sound');

    // Audio functions
    function toggleAudio() {
        config.audioEnabled = !config.audioEnabled;
        
        if (config.audioEnabled) {
            // Only try to play if user has interacted with the page
            if (musicInitialized) {
                backgroundMusic.volume = 0.3;
                backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            }
            toggleAudioButton.textContent = "Mute Sounds";
        } else {
            backgroundMusic.pause();
            toggleAudioButton.textContent = "Enable Sounds";
        }
    }

    function playSound(sound) {
        if (config.audioEnabled) {
            sound.currentTime = 0;
            sound.play();
        }
    }

    // Initialize the game
    function initGame() {
        // Reset game state
        board = [];
        score = 0;
        souls = 0;
        selectedTile = null;
        isSwapping = false;
        isChecking = false;
        gameOver = false;
        
        // Update UI
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        gameOverElement.classList.add('hidden');
        
        // Clear the board
        boardElement.innerHTML = '';
        
        // Create the initial board
        createBoard();
        
        // Check for initial matches and fill the board
        checkForMatches();
    }

    // Create the initial game board
    function createBoard() {
        // Create a grid of tiles
        for (let row = 0; row < config.rows; row++) {
            board[row] = [];
            for (let col = 0; col < config.cols; col++) {
                // Create a new tile with a random symbol
                let symbol;
                do {
                    symbol = getRandomSymbol();
                    board[row][col] = { symbol, row, col };
                } while (
                    // Avoid creating matches at the start
                    (col >= 2 && board[row][col-1].symbol === symbol && board[row][col-2].symbol === symbol) ||
                    (row >= 2 && board[row-1][col].symbol === symbol && board[row-2][col].symbol === symbol)
                );
                
                // Create the tile element
                const tile = createTileElement(row, col, symbol);
                boardElement.appendChild(tile);
            }
        }
    }

    // Create a tile element
    function createTileElement(row, col, symbol) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.textContent = symbol;
        
        // Add event listeners
        tile.addEventListener('click', () => handleTileClick(row, col));
        
        return tile;
    }

    // Get a random symbol from the available symbols
    function getRandomSymbol() {
        return config.symbols[Math.floor(Math.random() * config.symbols.length)];
    }

    // Handle tile click
    function handleTileClick(row, col) {
        if (isSwapping || isChecking || gameOver) return;
        
        // Initialize background music on first user interaction
        if (!musicInitialized && config.audioEnabled) {
            backgroundMusic.volume = 0.3;
            backgroundMusic.play().catch(e => console.log("Audio play failed:", e));
            musicInitialized = true;
        }
        
        const clickedTile = board[row][col];
        const tileElement = getTileElement(row, col);
        
        // If no tile is selected, select this one
        if (!selectedTile) {
            selectedTile = clickedTile;
            tileElement.classList.add('selected');
            return;
        }
        
        // If the same tile is clicked again, deselect it
        if (selectedTile === clickedTile) {
            getTileElement(selectedTile.row, selectedTile.col).classList.remove('selected');
            selectedTile = null;
            return;
        }
        
        // Check if the clicked tile is adjacent to the selected tile
        const isAdjacent = (
            (Math.abs(selectedTile.row - row) === 1 && selectedTile.col === col) ||
            (Math.abs(selectedTile.col - col) === 1 && selectedTile.row === row)
        );
        
        // If the tiles are not adjacent, select the new tile instead
        if (!isAdjacent) {
            getTileElement(selectedTile.row, selectedTile.col).classList.remove('selected');
            selectedTile = clickedTile;
            tileElement.classList.add('selected');
            return;
        }
        
        // Swap the tiles
        swapTiles(selectedTile, clickedTile);
    }

    // Swap two tiles
    function swapTiles(tile1, tile2) {
        isSwapping = true;
        
        // Play swap sound
        playSound(swapSound);
        
        // Remove selection
        getTileElement(tile1.row, tile1.col).classList.remove('selected');
        selectedTile = null;
        
        // Swap the symbols in the board array
        const tempSymbol = tile1.symbol;
        tile1.symbol = tile2.symbol;
        tile2.symbol = tempSymbol;
        
        // Update the tile elements
        getTileElement(tile1.row, tile1.col).textContent = tile1.symbol;
        getTileElement(tile2.row, tile2.col).textContent = tile2.symbol;
        
        // Check if the swap created any matches
        setTimeout(() => {
            const matches = findMatches();
            
            // If no matches were created, swap back
            if (matches.length === 0) {
                // Swap back the symbols
                const tempSymbol = tile1.symbol;
                tile1.symbol = tile2.symbol;
                tile2.symbol = tempSymbol;
                
                // Update the tile elements
                getTileElement(tile1.row, tile1.col).textContent = tile1.symbol;
                getTileElement(tile2.row, tile2.col).textContent = tile2.symbol;
                
                isSwapping = false;
            } else {
                // Process the matches
                checkForMatches();
            }
        }, 300);
    }

    // Check for matches on the board
    function checkForMatches() {
        isChecking = true;
        
        const matches = findMatches();
        
        // If no matches, end checking
        if (matches.length === 0) {
            isChecking = false;
            isSwapping = false;
            
            // Check if the board is in a valid state (has possible moves)
            if (!hasPossibleMoves()) {
                endGame();
            }
            
            return;
        }
        
        // Play match sound
        playSound(matchSound);
        
        // Mark matching tiles
        matches.forEach(match => {
            match.forEach(tile => {
                const tileElement = getTileElement(tile.row, tile.col);
                tileElement.classList.add('matching');
            });
        });
        
        // Calculate points
        const matchedTiles = matches.reduce((count, match) => count + match.length, 0);
        const points = matchedTiles * config.pointsPerTile;
        const matchSouls = matches.length * config.soulsPerMatch;
        
        // Update score and souls
        score += points;
        souls += matchSouls;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound if souls were collected
        if (matchSouls > 0) {
            playSound(soulCollectSound);
        }
        
        // Remove matches after a delay
        setTimeout(() => {
            // Remove matching tiles
            matches.forEach(match => {
                match.forEach(tile => {
                    // Mark the tile as empty
                    tile.symbol = null;
                    
                    // Update the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    tileElement.textContent = '';
                    tileElement.classList.remove('matching');
                });
            });
            
            // Fill empty spaces
            fillEmptySpaces();
        }, config.matchDelay);
    }

    // Find all matches on the board
    function findMatches() {
        const matches = [];
        
        // Check horizontal matches
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols - 2; col++) {
                const symbol = board[row][col].symbol;
                if (!symbol) continue;
                
                let matchLength = 1;
                while (col + matchLength < config.cols && board[row][col + matchLength].symbol === symbol) {
                    matchLength++;
                }
                
                if (matchLength >= config.minMatch) {
                    const match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push(board[row][col + i]);
                    }
                    matches.push(match);
                    col += matchLength - 1;
                }
            }
        }
        
        // Check vertical matches
        for (let col = 0; col < config.cols; col++) {
            for (let row = 0; row < config.rows - 2; row++) {
                const symbol = board[row][col].symbol;
                if (!symbol) continue;
                
                let matchLength = 1;
                while (row + matchLength < config.rows && board[row + matchLength][col].symbol === symbol) {
                    matchLength++;
                }
                
                if (matchLength >= config.minMatch) {
                    const match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push(board[row + i][col]);
                    }
                    matches.push(match);
                    row += matchLength - 1;
                }
            }
        }
        
        return matches;
    }

    // Fill empty spaces with new tiles
    function fillEmptySpaces() {
        let hasEmptySpaces = false;
        
        // Move tiles down to fill empty spaces
        for (let col = 0; col < config.cols; col++) {
            let emptySpaces = 0;
            
            // Count empty spaces and move tiles down
            for (let row = config.rows - 1; row >= 0; row--) {
                if (board[row][col].symbol === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Move the tile down
                    const newRow = row + emptySpaces;
                    board[newRow][col].symbol = board[row][col].symbol;
                    board[row][col].symbol = null;
                    
                    // Update the tile element
                    const tileElement = getTileElement(newRow, col);
                    tileElement.textContent = board[newRow][col].symbol;
                    tileElement.classList.add('falling');
                    
                    hasEmptySpaces = true;
                }
            }
            
            // Fill the top with new tiles
            for (let row = emptySpaces - 1; row >= 0; row--) {
                setTimeout(() => {
                    const symbol = getRandomSymbol();
                    board[row][col].symbol = symbol;
                    
                    // Update the tile element
                    const tileElement = getTileElement(row, col);
                    tileElement.textContent = symbol;
                    tileElement.classList.add('falling');
                    
                    // Remove the falling class after animation
                    setTimeout(() => {
                        tileElement.classList.remove('falling');
                    }, 500);
                }, config.newTileDelay * (emptySpaces - row));
                
                hasEmptySpaces = true;
            }
        }
        
        // Check for new matches after filling
        if (hasEmptySpaces) {
            setTimeout(() => {
                checkForMatches();
            }, config.fallDelay + (config.newTileDelay * config.rows));
        } else {
            isChecking = false;
            isSwapping = false;
        }
    }

    // Check if there are any possible moves
    function hasPossibleMoves() {
        // Check horizontal swaps
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols - 1; col++) {
                // Swap
                const temp = board[row][col].symbol;
                board[row][col].symbol = board[row][col + 1].symbol;
                board[row][col + 1].symbol = temp;
                
                // Check for matches
                const hasMatch = findMatches().length > 0;
                
                // Swap back
                board[row][col + 1].symbol = board[row][col].symbol;
                board[row][col].symbol = temp;
                
                if (hasMatch) return true;
            }
        }
        
        // Check vertical swaps
        for (let row = 0; row < config.rows - 1; row++) {
            for (let col = 0; col < config.cols; col++) {
                // Swap
                const temp = board[row][col].symbol;
                board[row][col].symbol = board[row + 1][col].symbol;
                board[row + 1][col].symbol = temp;
                
                // Check for matches
                const hasMatch = findMatches().length > 0;
                
                // Swap back
                board[row + 1][col].symbol = board[row][col].symbol;
                board[row][col].symbol = temp;
                
                if (hasMatch) return true;
            }
        }
        
        return false;
    }

    // Get a tile element by row and column
    function getTileElement(row, col) {
        return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    }

    // End the game
    function endGame() {
        gameOver = true;
        finalScoreElement.textContent = score;
        finalSoulsElement.textContent = souls;
        gameOverElement.classList.remove('hidden');
        
        // Play game over sound
        playSound(gameOverSound);
    }

    // Event listeners
    restartButton.addEventListener('click', initGame);
    toggleAudioButton.addEventListener('click', toggleAudio);

    // Set initial audio button text based on config
    toggleAudioButton.textContent = config.audioEnabled ? "Mute Sounds" : "Enable Sounds";

    // Start the game
    initGame();
}); 