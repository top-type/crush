document.addEventListener('DOMContentLoaded', () => {
    // Game configuration
    const config = {
        rows: 8,
        cols: 8,
        symbols: ['👹', '💀', '🔥', '⛧', '🗡️', '🩸', '🐐', '🕯️'],
        activeSymbols: [], // Will be populated with a subset of symbols
        activeSymbolCount: 6, // Number of symbols to use in the game
        minMatch: 3,
        pointsPerTile: 10,
        soulsPerMatch: 1,
        matchDelay: 500,
        fallDelay: 100,
        newTileDelay: 50,
        audioEnabled: true, // Always enable audio
        specialSymbols: {
            striped: {
                points: 30,
                souls: 2
            },
            wrapped: {
                points: 50,
                souls: 3
            },
            colorBomb: {
                points: 100,
                souls: 5
            }
        }
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
    const activeSymbolsElement = document.getElementById('active-symbols');

    // Audio elements
    const backgroundMusic = document.getElementById('background-music');
    const matchSound = document.getElementById('match-sound');
    const swapSound = document.getElementById('swap-sound');
    const soulCollectSound = document.getElementById('soul-collect-sound');
    const gameOverSound = document.getElementById('game-over-sound');
    
    // Symbol-specific sound elements
    const symbolSounds = {
        '👹': document.getElementById('demon-sound'),
        '💀': document.getElementById('skull-sound'),
        '🔥': document.getElementById('fire-sound'),
        '⛧': document.getElementById('pentagram-sound'),
        '🗡️': document.getElementById('knife-sound'),
        '🩸': document.getElementById('blood-sound'),
        '🐐': document.getElementById('goat-sound'),
        '🕯️': document.getElementById('candle-sound')
    };

    // Audio functions - simplified since we always have audio enabled
    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Play symbol-specific sound
    function playSymbolSound(symbol) {
        if (symbol && symbolSounds[symbol]) {
            symbolSounds[symbol].volume = 0.4;
            playSound(symbolSounds[symbol]);
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
        
        // Select the active symbols for this game
        selectActiveSymbols();
        
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
                    board[row][col] = { 
                        symbol, 
                        row, 
                        col,
                        special: null,
                        direction: null
                    };
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
    function createTileElement(row, col, symbol, special = null, direction = null) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        // For color bombs, use a fixed pentagram symbol
        if (special === 'colorBomb') {
            tile.textContent = '';
        } else {
            tile.textContent = symbol;
        }
        
        // Add special class if this is a special tile
        if (special) {
            tile.classList.add(special);
            if (direction) {
                tile.classList.add(direction);
            }
            
            // Add visual indicator for special tiles
            const specialIndicator = document.createElement('div');
            specialIndicator.className = 'special-indicator';
            
            if (special === 'striped') {
                specialIndicator.classList.add('striped-indicator', direction);
            } else if (special === 'wrapped') {
                specialIndicator.classList.add('wrapped-indicator');
            } else if (special === 'colorBomb') {
                specialIndicator.classList.add('colorbomb-indicator');
            }
            
            tile.appendChild(specialIndicator);
        }
        
        // Add event listeners
        tile.addEventListener('click', () => handleTileClick(row, col));
        
        return tile;
    }

    // Update a tile element
    function updateTileElement(row, col, symbol, special = null, direction = null) {
        const tileElement = getTileElement(row, col);
        
        // Clear existing content and classes
        tileElement.classList.remove('striped', 'wrapped', 'colorBomb', 'horizontal', 'vertical');
        
        // Remove any existing special indicators
        const existingIndicator = tileElement.querySelector('.special-indicator');
        if (existingIndicator) {
            tileElement.removeChild(existingIndicator);
        }
        
        // For color bombs, don't show the symbol
        if (special === 'colorBomb') {
            tileElement.textContent = '';
        } else {
            tileElement.textContent = symbol;
        }
        
        // Add special class if this is a special tile
        if (special) {
            tileElement.classList.add(special);
            if (direction) {
                tileElement.classList.add(direction);
            }
            
            // Add visual indicator for special tiles
            const specialIndicator = document.createElement('div');
            specialIndicator.className = 'special-indicator';
            
            if (special === 'striped') {
                specialIndicator.classList.add('striped-indicator', direction);
            } else if (special === 'wrapped') {
                specialIndicator.classList.add('wrapped-indicator');
            } else if (special === 'colorBomb') {
                specialIndicator.classList.add('colorbomb-indicator');
            }
            
            tileElement.appendChild(specialIndicator);
        }
        
        return tileElement;
    }

    // Get a random symbol from the available symbols
    function getRandomSymbol() {
        // If activeSymbols is empty for some reason, use all symbols as fallback
        if (config.activeSymbols.length === 0) {
            console.warn("Active symbols array is empty, using all symbols as fallback");
            return config.symbols[Math.floor(Math.random() * config.symbols.length)];
        }
        return config.activeSymbols[Math.floor(Math.random() * config.activeSymbols.length)];
    }
    
    // Select a random subset of symbols to use in the game
    function selectActiveSymbols() {
        // Make a copy of the full symbols array
        const allSymbols = [...config.symbols];
        config.activeSymbols = [];
        
        // Ensure we don't try to select more symbols than are available
        const symbolCount = Math.min(config.activeSymbolCount, allSymbols.length);
        
        // Randomly select the specified number of symbols
        for (let i = 0; i < symbolCount; i++) {
            const randomIndex = Math.floor(Math.random() * allSymbols.length);
            config.activeSymbols.push(allSymbols.splice(randomIndex, 1)[0]);
        }
        
        console.log("Active symbols for this game:", config.activeSymbols);
        
        // Update the active symbols display
        activeSymbolsElement.textContent = config.activeSymbols.join(' ');
    }

    // Handle tile click
    function handleTileClick(row, col) {
        if (isSwapping || isChecking || gameOver) return;
        
        // Initialize background music on first user interaction
        if (!musicInitialized) {
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
        
        // Track which tile was moved by the player (tile2 is the destination)
        const movedToTile = tile2;
        
        // Check if this is a special combination:
        // 1. Two special tiles
        // 2. Color bomb + any symbol (special or not)
        const isSpecialCombo = 
            (tile1.special && tile2.special) || 
            (tile1.special === 'colorBomb' || tile2.special === 'colorBomb');
        
        // Swap the tile properties
        const tempSymbol = tile1.symbol;
        const tempSpecial = tile1.special;
        const tempDirection = tile1.direction;
        
        tile1.symbol = tile2.symbol;
        tile1.special = tile2.special;
        tile1.direction = tile2.direction;
        
        tile2.symbol = tempSymbol;
        tile2.special = tempSpecial;
        tile2.direction = tempDirection;
        
        // Update the tile elements
        updateTileElement(tile1.row, tile1.col, tile1.symbol, tile1.special, tile1.direction);
        updateTileElement(tile2.row, tile2.col, tile2.symbol, tile2.special, tile2.direction);
        
        // If this is a special combination, handle it immediately
        if (isSpecialCombo) {
            handleSpecialCombination(tile1, tile2, movedToTile);
            return;
        }
        
        // Check if the swap created any matches
        setTimeout(() => {
            const matches = findMatches();
            
            // If no matches were created, swap back
            if (matches.length === 0) {
                // Swap back the tile properties
                const tempSymbol = tile1.symbol;
                const tempSpecial = tile1.special;
                const tempDirection = tile1.direction;
                
                tile1.symbol = tile2.symbol;
                tile1.special = tile2.special;
                tile1.direction = tile2.direction;
                
                tile2.symbol = tempSymbol;
                tile2.special = tempSpecial;
                tile2.direction = tempDirection;
                
                // Update the tile elements
                updateTileElement(tile1.row, tile1.col, tile1.symbol, tile1.special, tile1.direction);
                updateTileElement(tile2.row, tile2.col, tile2.symbol, tile2.special, tile2.direction);
                
                isSwapping = false;
            } else {
                // Check if one of the swapped tiles is special
                if (tile1.special || tile2.special) {
                    handleSpecialCombination(tile1, tile2, movedToTile);
                } else {
                    // Process the matches
                    checkForMatches(matches, movedToTile);
                }
            }
        }, 300);
    }

    // Check if a tile is part of a match
    function isInMatch(tile, matches) {
        for (const match of matches) {
            for (const matchTile of match) {
                if (matchTile.row === tile.row && matchTile.col === tile.col) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check for matches on the board
    function checkForMatches(matches = [], movedToTile) {
        isChecking = true;
        
        // If no matches are provided, find them
        if (matches.length === 0) {
            matches = findMatches();
        }
        
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
        
        // Detect special patterns
        const specialTiles = detectSpecialPatterns(matches, movedToTile);
        
        // Collect all tiles to be removed
        const tilesToRemove = [];
        
        // Find special tiles that are part of matches
        const specialTilesToActivate = [];
        matches.forEach(match => {
            match.forEach(tile => {
                if (tile.special) {
                    specialTilesToActivate.push({
                        row: tile.row,
                        col: tile.col,
                        symbol: tile.symbol,
                        special: tile.special,
                        direction: tile.direction
                    });
                }
            });
        });
        
        // Remove matches after a delay
        setTimeout(() => {
            // Create special tiles
            for (const specialTileInfo of specialTiles) {
                // Only create a special tile if it's part of a match
                let isPartOfMatch = false;
                for (const match of matches) {
                    for (const tile of match) {
                        if (tile.row === specialTileInfo.row && tile.col === specialTileInfo.col) {
                            isPartOfMatch = true;
                            break;
                        }
                    }
                    if (isPartOfMatch) break;
                }
                
                if (isPartOfMatch) {
                    // Create the special tile
                    const tile = board[specialTileInfo.row][specialTileInfo.col];
                    tile.special = specialTileInfo.special;
                    tile.direction = specialTileInfo.direction;
                    
                    // Remove this tile from all matches so it doesn't get cleared
                    for (const match of matches) {
                        const index = match.findIndex(t => t.row === tile.row && t.col === tile.col);
                        if (index !== -1) {
                            match.splice(index, 1);
                        }
                    }
                    
                    // Update the tile element
                    updateTileElement(tile.row, tile.col, tile.symbol, tile.special, tile.direction);
                }
            }
            
            // Activate special tiles that are part of matches
            if (specialTilesToActivate.length > 0) {
                // Sort by special type to prioritize more powerful effects
                specialTilesToActivate.sort((a, b) => {
                    const powerOrder = { 'colorBomb': 3, 'wrapped': 2, 'striped': 1 };
                    return powerOrder[b.special] - powerOrder[a.special];
                });
                
                // Activate each special tile with a delay
                let activationDelay = 0;
                let maxActivationDelay = 0;
                
                for (const specialTile of specialTilesToActivate) {
                    // Skip if this tile has already been cleared by a previous activation
                    if (!board[specialTile.row][specialTile.col].symbol) continue;
                    
                    setTimeout(() => {
                        // Skip if this tile has been cleared during the delay
                        if (!board[specialTile.row][specialTile.col].symbol) return;
                        
                        // Activate the special tile
                        activateSpecialTile(board[specialTile.row][specialTile.col]);
                    }, activationDelay);
                    
                    activationDelay += 300;
                    maxActivationDelay = activationDelay;
                }
                
                // If we activated any special tiles, return early
                // The last activation will handle filling empty spaces
                if (maxActivationDelay > 0) {
                    return;
                }
            }
            
            // Collect all tiles to remove
            matches.forEach(match => {
                match.forEach(tile => {
                    tilesToRemove.push({
                        row: tile.row,
                        col: tile.col,
                        symbol: tile.symbol
                    });
                });
            });
            
            // Remove matching tiles with animation
            if (tilesToRemove.length > 0) {
                // Remove the matching animation
                tilesToRemove.forEach(tile => {
                    const tileElement = getTileElement(tile.row, tile.col);
                    tileElement.classList.remove('matching');
                });
                
                // Clear tiles with a slight delay between each
                let maxDelay = 0;
                tilesToRemove.forEach((tile, index) => {
                    const delay = 50 + (index * 20);
                    maxDelay = Math.max(maxDelay, delay);
                    
                    setTimeout(() => {
                        // Skip if this tile has been cleared by a special tile activation
                        if (!board[tile.row][tile.col].symbol) return;
                        
                        // Play the sound for the symbol being removed
                        playSymbolSound(tile.symbol);
                        
                        // Get the tile element
                        const tileElement = getTileElement(tile.row, tile.col);
                        
                        // Add special clear animation
                        tileElement.classList.add('special-clear');
                        
                        // Mark the tile as empty
                        board[tile.row][tile.col].symbol = null;
                        board[tile.row][tile.col].special = null;
                        board[tile.row][tile.col].direction = null;
                        
                        // Clear the tile after animation
                        setTimeout(() => {
                            tileElement.textContent = '';
                            tileElement.className = 'tile';
                        }, 300);
                    }, delay);
                });
                
                // Fill empty spaces after all animations
                setTimeout(() => {
                    fillEmptySpaces();
                }, maxDelay + 400);
            } else {
                // If no tiles to remove, check for matches
                fillEmptySpaces();
            }
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
        
        // First, identify all empty spaces and tiles that need to fall
        const fallingTiles = [];
        const newTiles = [];
        
        // Analyze each column
        for (let col = 0; col < config.cols; col++) {
            let emptySpaces = 0;
            
            // Count empty spaces from bottom to top
            for (let row = config.rows - 1; row >= 0; row--) {
                if (board[row][col].symbol === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // This tile needs to fall
                    const newRow = row + emptySpaces;
                    
                    // Store information about this falling tile
                    fallingTiles.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: newRow,
                        toCol: col,
                        symbol: board[row][col].symbol,
                        special: board[row][col].special,
                        direction: board[row][col].direction,
                        distance: emptySpaces
                    });
                    
                    hasEmptySpaces = true;
                }
            }
            
            // Record new tiles needed at the top
            for (let row = emptySpaces - 1; row >= 0; row--) {
                newTiles.push({
                    row: row,
                    col: col,
                    distance: emptySpaces - row
                });
                
                hasEmptySpaces = true;
            }
        }
        
        // If no empty spaces, we're done
        if (!hasEmptySpaces) {
            isChecking = false;
            isSwapping = false;
            return;
        }
        
        // First, clear all the positions where tiles will fall from
        fallingTiles.forEach(tile => {
            board[tile.fromRow][tile.fromCol].symbol = null;
            board[tile.fromRow][tile.fromCol].special = null;
            board[tile.fromRow][tile.fromCol].direction = null;
            
            // Clear the visual element
            const tileElement = getTileElement(tile.fromRow, tile.fromCol);
            tileElement.textContent = '';
            tileElement.className = 'tile';
        });
        
        // Then animate the falling tiles
        fallingTiles.forEach(tile => {
            // Update the board data
            board[tile.toRow][tile.toCol].symbol = tile.symbol;
            board[tile.toRow][tile.toCol].special = tile.special;
            board[tile.toRow][tile.toCol].direction = tile.direction;
            
            // Get the destination element
            const tileElement = getTileElement(tile.toRow, tile.toCol);
            
            // Set up the animation
            const fallDistance = tile.distance * 50; // 50px is the height of a tile
            tileElement.style.transition = 'none';
            tileElement.style.transform = `translateY(-${fallDistance}px)`;
            
            // Update the content
            updateTileElement(
                tile.toRow, 
                tile.toCol, 
                tile.symbol, 
                tile.special, 
                tile.direction
            );
            
            // Trigger the animation after a small delay
            setTimeout(() => {
                tileElement.style.transition = `transform ${Math.min(0.1 * tile.distance, 0.5)}s ease-in`;
                tileElement.style.transform = 'translateY(0)';
            }, 10);
        });
        
        // Finally, add new tiles at the top with a delay
        let maxDelay = 0;
        
        newTiles.forEach(tile => {
            const delay = 100 + (tile.distance * 50);
            maxDelay = Math.max(maxDelay, delay);
            
            setTimeout(() => {
                const symbol = getRandomSymbol();
                board[tile.row][tile.col].symbol = symbol;
                
                // Update the tile element
                updateTileElement(tile.row, tile.col, symbol, null, null);
                
                // Set up the animation
                const tileElement = getTileElement(tile.row, tile.col);
                tileElement.style.transition = 'none';
                tileElement.style.transform = 'translateY(-500px)';
                
                // Trigger the animation
                setTimeout(() => {
                    tileElement.style.transition = `transform ${Math.min(0.1 * (tile.distance + 5), 0.5)}s ease-in`;
                    tileElement.style.transform = 'translateY(0)';
                }, 10);
            }, delay);
        });
        
        // Check for new matches after all animations are complete
        setTimeout(() => {
            // Reset all transition styles
            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    const tileElement = getTileElement(row, col);
                    tileElement.style.transition = '';
                    tileElement.style.transform = '';
                }
            }
            
            checkForMatches();
        }, maxDelay + 500);
    }

    // Check if there are any possible moves
    function hasPossibleMoves() {
        // First check if there are any special tiles on the board
        // Special tiles always provide a possible move
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (board[row][col].special) {
                    return true;
                }
            }
        }
        
        // Check horizontal swaps
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols - 1; col++) {
                // Swap
                const temp = board[row][col].symbol;
                board[row][col].symbol = board[row][col + 1].symbol;
                board[row][col + 1].symbol = temp;
                
                // Check for matches
                const matches = findMatches();
                const hasMatch = matches.length > 0;
                
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
                const matches = findMatches();
                const hasMatch = matches.length > 0;
                
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

    // Handle special symbol combinations
    function handleSpecialCombination(tile1, tile2, movedToTile) {
        // Make copies of the tile properties to avoid issues when tiles are cleared
        const tile1Props = {
            row: tile1.row,
            col: tile1.col,
            symbol: tile1.symbol,
            special: tile1.special,
            direction: tile1.direction
        };
        
        const tile2Props = {
            row: tile2.row,
            col: tile2.col,
            symbol: tile2.symbol,
            special: tile2.special,
            direction: tile2.direction
        };
        
        // Determine which tile is the source of the combination effect
        // Default to the moved-to tile if available, otherwise use tile1
        const sourceTile = movedToTile ? 
            (movedToTile.row === tile1.row && movedToTile.col === tile1.col ? tile1Props : tile2Props) : 
            tile1Props;
        
        // Check if this is a special combination (two special tiles)
        const isSpecialCombo = tile1Props.special && tile2Props.special;
        
        // Check if this is a color bomb + any symbol combination
        const isColorBombCombo = 
            tile1Props.special === 'colorBomb' || 
            tile2Props.special === 'colorBomb';
        
        // Special combinations always activate when player-initiated
        // Only need to verify matches for single special tiles that aren't color bombs
        const needsMatchCheck = 
            !isSpecialCombo && 
            !isColorBombCombo &&
            (tile1Props.special === 'striped' || tile1Props.special === 'wrapped' ||
             tile2Props.special === 'striped' || tile2Props.special === 'wrapped');
        
        if (needsMatchCheck) {
            // Find matches to verify that the special tiles are part of a match
            const matches = findMatches();
            const tile1InMatch = isInMatch(tile1, matches);
            const tile2InMatch = isInMatch(tile2, matches);
            
            // If neither special tile is in a match, just process the matches
            if (!tile1InMatch && !tile2InMatch) {
                checkForMatches(matches, movedToTile);
                return;
            }
            
            // If only one special tile is in a match, only activate that one
            if (tile1InMatch && !tile2InMatch) {
                activateSpecialTile(tile1);
                checkForMatches(matches, movedToTile);
                return;
            }
            
            if (!tile1InMatch && tile2InMatch) {
                activateSpecialTile(tile2);
                checkForMatches(matches, movedToTile);
                return;
            }
            
            // Both are in a match, continue with the combination
        }
        
        // Clear both tiles first to prevent recursion issues
        clearTile(tile1);
        clearTile(tile2);
        
        // Handle different combinations
        if (tile1Props.special === 'colorBomb' && tile2Props.special === 'colorBomb') {
            // Color bomb + Color bomb: Clear the entire board
            clearEntireBoard();
        }
        else if (tile1Props.special === 'colorBomb' || tile2Props.special === 'colorBomb') {
            // Color bomb + something else
            const colorBombProps = tile1Props.special === 'colorBomb' ? tile1Props : tile2Props;
            const otherProps = tile1Props.special === 'colorBomb' ? tile2Props : tile1Props;
            
            if (otherProps.special) {
                // Color bomb + another special: Convert all of that symbol to the other special type
                convertSymbolToSpecial(otherProps.symbol, otherProps.special, otherProps.direction);
            } else {
                // Color bomb + Regular: Clear all of that symbol
                clearAllOfSymbol(otherProps.symbol);
            }
        }
        else if (tile1Props.special === 'striped' && tile2Props.special === 'striped') {
            // Striped + Striped: Clear the entire row and column
            clearRowAndColumn(sourceTile.row, sourceTile.col);
        }
        else if (tile1Props.special === 'wrapped' && tile2Props.special === 'wrapped') {
            // Wrapped + Wrapped: Massive 5×5 explosion
            clearArea(sourceTile.row, sourceTile.col, 5);
        }
        else if ((tile1Props.special === 'striped' && tile2Props.special === 'wrapped') || 
                 (tile1Props.special === 'wrapped' && tile2Props.special === 'striped')) {
            // Striped + Wrapped: Cross-shaped explosion
            clearCrossShape(sourceTile.row, sourceTile.col);
        }
        else if (tile1Props.special === 'striped') {
            // Striped + Regular: Clear row or column
            if (tile1Props.direction === 'horizontal') {
                clearRow(sourceTile.row);
            } else {
                clearColumn(sourceTile.col);
            }
        }
        else if (tile2Props.special === 'striped') {
            // Regular + Striped: Clear row or column
            if (tile2Props.direction === 'horizontal') {
                clearRow(sourceTile.row);
            } else {
                clearColumn(sourceTile.col);
            }
        }
        else if (tile1Props.special === 'wrapped') {
            // Wrapped + Regular: Double explosion
            clearArea(sourceTile.row, sourceTile.col, 3);
            setTimeout(() => {
                clearArea(sourceTile.row, sourceTile.col, 3);
            }, 300);
        }
        else if (tile2Props.special === 'wrapped') {
            // Regular + Wrapped: Double explosion
            clearArea(sourceTile.row, sourceTile.col, 3);
            setTimeout(() => {
                clearArea(sourceTile.row, sourceTile.col, 3);
            }, 300);
        }
        else {
            // No special tiles or combination not handled
            // This shouldn't happen, but just in case
            checkForMatches([], movedToTile);
        }
    }
    
    // Helper function to clear a tile
    function clearTile(tile) {
        if (!tile) return;
        
        tile.symbol = null;
        tile.special = null;
        tile.direction = null;
        
        const tileElement = getTileElement(tile.row, tile.col);
        tileElement.textContent = '';
        tileElement.className = 'tile';
        tileElement.style.transition = '';
        tileElement.style.transform = '';
    }
    
    // Convert all tiles of a symbol to a special type
    function convertSymbolToSpecial(symbol, special, direction) {
        const tilesToActivate = [];
        
        // First convert all matching symbols to special
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (board[row][col].symbol === symbol) {
                    board[row][col].special = special;
                    board[row][col].direction = direction;
                    updateTileElement(row, col, symbol, special, direction);
                    
                    // Store the tile for later activation
                    tilesToActivate.push({
                        row: row,
                        col: col
                    });
                }
            }
        }
        
        // Add bonus points and souls for this powerful combo
        const points = tilesToActivate.length * config.pointsPerTile * 2;
        const soulsCollected = Math.ceil(tilesToActivate.length / 2);
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Add a visual effect for the color bomb combo
        const boardRect = boardElement.getBoundingClientRect();
        const explosionElement = document.createElement('div');
        explosionElement.className = 'cross-explosion';
        explosionElement.style.width = `${boardRect.width}px`;
        explosionElement.style.height = `${boardRect.height}px`;
        explosionElement.style.left = '0';
        explosionElement.style.top = '0';
        explosionElement.style.background = 'radial-gradient(circle, rgba(255,0,255,0.5) 0%, rgba(0,0,0,0) 70%)';
        boardElement.appendChild(explosionElement);
        
        // Remove the explosion element after animation
        setTimeout(() => {
            boardElement.removeChild(explosionElement);
        }, 1000);
        
        // Activate the special tiles with a delay between each
        if (tilesToActivate.length > 0) {
            let delay = 100;
            for (const tilePos of tilesToActivate) {
                setTimeout(() => {
                    if (board[tilePos.row][tilePos.col].special) {
                        activateSpecialTile(board[tilePos.row][tilePos.col]);
                    }
                }, delay);
                delay += 100;
            }
        } else {
            // If no tiles to activate, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }
    
    // Activate a special tile
    function activateSpecialTile(tile) {
        if (!tile || !tile.special) return;
        
        // Store the tile properties before clearing it
        const { row, col, symbol, special, direction } = tile;
        
        // Mark the tile as empty first to prevent recursion issues
        clearTile(tile);
        
        // Activate the special effect based on the type
        if (special === 'striped') {
            // Striped: Clear the entire row or column
            if (direction === 'horizontal') {
                clearRow(row);
            } else {
                clearColumn(col);
            }
        } else if (special === 'wrapped') {
            // Wrapped: Explode in a 3×3 area, then again
            clearArea(row, col, 3);
            
            // Second explosion after a delay
            setTimeout(() => {
                clearArea(row, col, 3);
            }, 300);
        } else if (special === 'colorBomb') {
            // Color bomb: Should be handled in combination logic
            // But if activated alone, clear a random symbol
            const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
            const activeSymbols = symbols.filter(s => {
                // Find symbols that exist on the board
                for (let r = 0; r < config.rows; r++) {
                    for (let c = 0; c < config.cols; c++) {
                        if (board[r][c].symbol === s) return true;
                    }
                }
                return false;
            });
            
            if (activeSymbols.length > 0) {
                const randomSymbol = activeSymbols[Math.floor(Math.random() * activeSymbols.length)];
                clearAllOfSymbol(randomSymbol);
            } else {
                // If no symbols found, check for matches
                setTimeout(() => {
                    checkForMatches();
                }, 300);
            }
        }
    }
    
    // Clear the entire board
    function clearEntireBoard() {
        let points = 0;
        let soulsCollected = 0;
        
        // Add a dramatic visual effect for the color bomb + color bomb combo
        const boardRect = boardElement.getBoundingClientRect();
        const explosionElement = document.createElement('div');
        explosionElement.className = 'cross-explosion';
        explosionElement.style.width = `${boardRect.width}px`;
        explosionElement.style.height = `${boardRect.height}px`;
        explosionElement.style.left = '0';
        explosionElement.style.top = '0';
        explosionElement.style.background = 'radial-gradient(circle, rgba(255,0,255,0.8) 0%, rgba(128,0,128,0.5) 50%, rgba(0,0,0,0) 100%)';
        explosionElement.style.animation = 'cross-explosion 2s forwards';
        boardElement.appendChild(explosionElement);
        
        // Add a pentagram overlay for the ritualistic effect
        const pentagramElement = document.createElement('div');
        pentagramElement.className = 'cross-explosion';
        pentagramElement.style.width = `${boardRect.width}px`;
        pentagramElement.style.height = `${boardRect.height}px`;
        pentagramElement.style.left = '0';
        pentagramElement.style.top = '0';
        pentagramElement.style.display = 'flex';
        pentagramElement.style.justifyContent = 'center';
        pentagramElement.style.alignItems = 'center';
        pentagramElement.style.fontSize = '150px';
        pentagramElement.style.color = '#f0f';
        pentagramElement.style.textShadow = '0 0 20px #f0f';
        pentagramElement.style.animation = 'rotate-pentagram 2s linear forwards, cross-explosion 2s forwards';
        pentagramElement.textContent = '⛧';
        boardElement.appendChild(pentagramElement);
        
        // Remove the explosion elements after animation
        setTimeout(() => {
            boardElement.removeChild(explosionElement);
            boardElement.removeChild(pentagramElement);
        }, 2000);
        
        // Collect tiles in a specific order for better animation
        const tilesToClear = [];
        
        // Collect tiles in a spiral pattern from the center
        const centerRow = Math.floor(config.rows / 2);
        const centerCol = Math.floor(config.cols / 2);
        const maxRadius = Math.max(config.rows, config.cols);
        
        for (let radius = 0; radius <= maxRadius; radius++) {
            // Collect tiles in a circle at this radius
            for (let row = centerRow - radius; row <= centerRow + radius; row++) {
                for (let col = centerCol - radius; col <= centerCol + radius; col++) {
                    // Only include tiles at exactly this radius (on the perimeter)
                    const distance = Math.max(Math.abs(row - centerRow), Math.abs(col - centerCol));
                    if (distance === radius && row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
                        const tile = board[row][col];
                        if (tile.symbol) {
                            tilesToClear.push({
                                row: row,
                                col: col,
                                symbol: tile.symbol,
                                special: tile.special,
                                distance: distance
                            });
                            
                            // Add points and souls
                            points += config.pointsPerTile * 3; // Triple points for this powerful combo
                            soulsCollected++;
                        }
                    }
                }
            }
        }
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 500 + (tile.distance * 100); // Slower, more dramatic animation
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 600);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }
    
    // Clear all tiles of a specific symbol
    function clearAllOfSymbol(symbol) {
        let points = 0;
        let soulsCollected = 0;
        let clearedTiles = 0;
        const tilesToClear = [];
        
        // Add a visual effect for the color bomb + regular combo
        const boardRect = boardElement.getBoundingClientRect();
        const explosionElement = document.createElement('div');
        explosionElement.className = 'cross-explosion';
        explosionElement.style.width = `${boardRect.width}px`;
        explosionElement.style.height = `${boardRect.height}px`;
        explosionElement.style.left = '0';
        explosionElement.style.top = '0';
        explosionElement.style.background = `radial-gradient(circle, rgba(255,0,255,0.5) 0%, rgba(0,0,0,0) 70%)`;
        explosionElement.style.animation = 'cross-explosion 1.5s forwards';
        boardElement.appendChild(explosionElement);
        
        // Add a symbol overlay for the ritualistic effect
        const symbolElement = document.createElement('div');
        symbolElement.className = 'cross-explosion';
        symbolElement.style.width = `${boardRect.width}px`;
        symbolElement.style.height = `${boardRect.height}px`;
        symbolElement.style.left = '0';
        symbolElement.style.top = '0';
        symbolElement.style.display = 'flex';
        symbolElement.style.justifyContent = 'center';
        symbolElement.style.alignItems = 'center';
        symbolElement.style.fontSize = '150px';
        symbolElement.style.color = '#f0f';
        symbolElement.style.textShadow = '0 0 20px #f0f';
        symbolElement.style.animation = 'pulse-glow 1.5s infinite alternate, cross-explosion 1.5s forwards';
        symbolElement.textContent = symbol; // Show the symbol being cleared
        boardElement.appendChild(symbolElement);
        
        // Remove the explosion elements after animation
        setTimeout(() => {
            boardElement.removeChild(explosionElement);
            boardElement.removeChild(symbolElement);
        }, 1500);
        
        // Find all tiles with the matching symbol
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const tile = board[row][col];
                
                if (tile.symbol === symbol) {
                    // Add to the list of tiles to clear
                    tilesToClear.push({
                        row: row,
                        col: col,
                        symbol: tile.symbol,
                        special: tile.special,
                        // Calculate distance from center for animation timing
                        distance: Math.sqrt(
                            Math.pow(row - Math.floor(config.rows / 2), 2) + 
                            Math.pow(col - Math.floor(config.cols / 2), 2)
                        )
                    });
                    
                    // Add points
                    points += config.pointsPerTile * 2; // Double points for color bomb combo
                    clearedTiles++;
                }
            }
        }
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(clearedTiles / 2); // More souls for color bomb combo
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Check for special tiles that need to be activated
        const specialTilesToActivate = tilesToClear.filter(tile => tile.special);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            // Sort by distance from center for better animation
            tilesToClear.sort((a, b) => a.distance - b.distance);
            
            // Clear tiles with a delay based on distance
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 100 + (tile.distance * 50);
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // Activate special tiles after clearing
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let activationDelay = 0;
                    
                    for (const specialTile of specialTilesToActivate) {
                        // Create a copy of the special tile for activation
                        const tileCopy = { ...specialTile };
                        
                        setTimeout(() => {
                            // Activate the special effect directly
                            if (tileCopy.special === 'striped') {
                                if (tileCopy.direction === 'horizontal') {
                                    clearRow(tileCopy.row);
                                } else {
                                    clearColumn(tileCopy.col);
                                }
                            } else if (tileCopy.special === 'wrapped') {
                                clearArea(tileCopy.row, tileCopy.col, 3);
                                setTimeout(() => {
                                    clearArea(tileCopy.row, tileCopy.col, 3);
                                }, 300);
                            } else if (tileCopy.special === 'colorBomb') {
                                const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
                                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                                clearAllOfSymbol(randomSymbol);
                            }
                        }, activationDelay);
                        
                        activationDelay += 300;
                    }
                }, maxDelay + 100);
                
                // Don't fill empty spaces here, let the special tile activations handle it
                return;
            }
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 600);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }
    
    // Clear a row
    function clearRow(row) {
        let points = 0;
        let soulsCollected = 0;
        const tilesToClear = [];
        
        // First collect all tiles to clear
        for (let col = 0; col < config.cols; col++) {
            const tile = board[row][col];
            
            if (tile.symbol) {
                // Add to the list of tiles to clear
                tilesToClear.push({
                    row: row,
                    col: col,
                    symbol: tile.symbol,
                    special: tile.special,
                    distance: Math.abs(col - Math.floor(config.cols / 2))
                });
                
                // Add points
                points += config.pointsPerTile;
            }
        }
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(config.cols / 3);
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            // Sort by distance from center for better animation
            tilesToClear.sort((a, b) => a.distance - b.distance);
            
            // Check for special tiles that need to be activated
            const specialTilesToActivate = tilesToClear.filter(tile => tile.special && tile.special !== 'striped');
            
            // Clear tiles with a delay based on distance
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 50 + (tile.distance * 30);
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // Activate special tiles after clearing the row
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let activationDelay = 0;
                    
                    for (const specialTile of specialTilesToActivate) {
                        // Create a copy of the special tile for activation
                        const tileCopy = { ...specialTile };
                        
                        setTimeout(() => {
                            // Activate the special effect directly
                            if (tileCopy.special === 'wrapped') {
                                clearArea(tileCopy.row, tileCopy.col, 3);
                                setTimeout(() => {
                                    clearArea(tileCopy.row, tileCopy.col, 3);
                                }, 300);
                            } else if (tileCopy.special === 'colorBomb') {
                                const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
                                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                                clearAllOfSymbol(randomSymbol);
                            }
                        }, activationDelay);
                        
                        activationDelay += 300;
                    }
                }, maxDelay + 100);
                
                // Don't fill empty spaces here, let the special tile activations handle it
                return;
            }
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 600);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }
    
    // Clear a column
    function clearColumn(col) {
        let points = 0;
        let soulsCollected = 0;
        const tilesToClear = [];
        
        // First collect all tiles to clear
        for (let row = 0; row < config.rows; row++) {
            const tile = board[row][col];
            
            if (tile.symbol) {
                // Add to the list of tiles to clear
                tilesToClear.push({
                    row: row,
                    col: col,
                    symbol: tile.symbol,
                    special: tile.special,
                    distance: Math.abs(row - Math.floor(config.rows / 2))
                });
                
                // Add points
                points += config.pointsPerTile;
            }
        }
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(config.rows / 3);
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            // Sort by distance from center for better animation
            tilesToClear.sort((a, b) => a.distance - b.distance);
            
            // Check for special tiles that need to be activated
            const specialTilesToActivate = tilesToClear.filter(tile => tile.special && tile.special !== 'striped');
            
            // Clear tiles with a delay based on distance
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 50 + (tile.distance * 30);
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // Activate special tiles after clearing the column
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let activationDelay = 0;
                    
                    for (const specialTile of specialTilesToActivate) {
                        // Create a copy of the special tile for activation
                        const tileCopy = { ...specialTile };
                        
                        setTimeout(() => {
                            // Activate the special effect directly
                            if (tileCopy.special === 'wrapped') {
                                clearArea(tileCopy.row, tileCopy.col, 3);
                                setTimeout(() => {
                                    clearArea(tileCopy.row, tileCopy.col, 3);
                                }, 300);
                            } else if (tileCopy.special === 'colorBomb') {
                                const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
                                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                                clearAllOfSymbol(randomSymbol);
                            }
                        }, activationDelay);
                        
                        activationDelay += 300;
                    }
                }, maxDelay + 100);
                
                // Don't fill empty spaces here, let the special tile activations handle it
                return;
            }
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 600);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }
    
    // Clear both a row and column
    function clearRowAndColumn(row, col) {
        let points = 0;
        let soulsCollected = 0;
        let clearedTiles = 0;
        
        // Clear the row
        for (let c = 0; c < config.cols; c++) {
            const tile = board[row][c];
            
            if (tile.symbol) {
                // Play the sound for the symbol being removed
                playSymbolSound(tile.symbol);
                
                // Add points
                points += config.pointsPerTile;
                clearedTiles++;
                
                // Mark the tile as empty
                tile.symbol = null;
                tile.special = null;
                tile.direction = null;
                
                // Update the tile element
                const tileElement = getTileElement(row, c);
                tileElement.textContent = '';
                tileElement.className = 'tile special-clear';
                
                // Add animation
                setTimeout(() => {
                    tileElement.classList.remove('special-clear');
                }, 500);
            }
        }
        
        // Clear the column
        for (let r = 0; r < config.rows; r++) {
            // Skip the intersection point to avoid counting it twice
            if (r === row) continue;
            
            const tile = board[r][col];
            
            if (tile.symbol) {
                // Play the sound for the symbol being removed
                playSymbolSound(tile.symbol);
                
                // Add points
                points += config.pointsPerTile;
                clearedTiles++;
                
                // Mark the tile as empty
                tile.symbol = null;
                tile.special = null;
                tile.direction = null;
                
                // Update the tile element
                const tileElement = getTileElement(r, col);
                tileElement.textContent = '';
                tileElement.className = 'tile special-clear';
                
                // Add animation
                setTimeout(() => {
                    tileElement.classList.remove('special-clear');
                }, 500);
            }
        }
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(clearedTiles / 3);
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Fill empty spaces
        setTimeout(() => {
            fillEmptySpaces();
        }, config.matchDelay);
    }
    
    // Clear a cross shape
    function clearCrossShape(centerRow, centerCol) {
        let points = 0;
        let soulsCollected = 0;
        let clearedTiles = 0;
        const tilesToClear = [];
        
        // Add visual explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const tileSize = boardRect.width / config.cols;
        const explosionElement = document.createElement('div');
        explosionElement.className = 'cross-explosion';
        explosionElement.style.left = `${centerCol * tileSize}px`;
        explosionElement.style.top = `${centerRow * tileSize}px`;
        explosionElement.style.width = `${tileSize}px`;
        explosionElement.style.height = `${tileSize}px`;
        boardElement.appendChild(explosionElement);
        
        // Remove the explosion element after animation
        setTimeout(() => {
            boardElement.removeChild(explosionElement);
        }, 1000);
        
        // First collect all tiles to clear in the row
        for (let col = 0; col < config.cols; col++) {
            const tile = board[centerRow][col];
            
            if (tile.symbol) {
                // Add to the list of tiles to clear
                tilesToClear.push({
                    row: centerRow,
                    col: col,
                    symbol: tile.symbol,
                    special: tile.special,
                    distance: Math.abs(col - centerCol)
                });
                
                // Add points
                points += config.pointsPerTile;
                clearedTiles++;
            }
        }
        
        // Then collect all tiles to clear in the column (except the center which is already counted)
        for (let row = 0; row < config.rows; row++) {
            if (row === centerRow) continue; // Skip the center row (already counted)
            
            const tile = board[row][centerCol];
            
            if (tile.symbol) {
                // Add to the list of tiles to clear
                tilesToClear.push({
                    row: row,
                    col: centerCol,
                    symbol: tile.symbol,
                    special: tile.special,
                    distance: Math.abs(row - centerRow)
                });
                
                // Add points
                points += config.pointsPerTile;
                clearedTiles++;
            }
        }
        
        // For wrapped-striped combo, add bonus points and souls
        points *= 2; // Double the points for this powerful combo
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(clearedTiles / 2); // More souls for this combo
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            // Sort by distance from center for better animation
            tilesToClear.sort((a, b) => a.distance - b.distance);
            
            // Check for special tiles that need to be activated
            const specialTilesToActivate = tilesToClear.filter(tile => tile.special);
            
            // Clear tiles with a delay based on distance
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 50 + (tile.distance * 30);
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // For wrapped-striped combo, do a second explosion after a delay
            setTimeout(() => {
                // Create a 3x3 explosion at the center
                clearArea(centerRow, centerCol, 3);
            }, maxDelay + 300);
            
            // Activate special tiles after clearing the cross
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let activationDelay = 0;
                    
                    for (const specialTile of specialTilesToActivate) {
                        // Create a copy of the special tile for activation
                        const tileCopy = { ...specialTile };
                        
                        setTimeout(() => {
                            // Activate the special effect directly
                            if (tileCopy.special === 'striped') {
                                if (tileCopy.direction === 'horizontal') {
                                    clearRow(tileCopy.row);
                                } else {
                                    clearColumn(tileCopy.col);
                                }
                            } else if (tileCopy.special === 'wrapped') {
                                clearArea(tileCopy.row, tileCopy.col, 3);
                                setTimeout(() => {
                                    clearArea(tileCopy.row, tileCopy.col, 3);
                                }, 300);
                            } else if (tileCopy.special === 'colorBomb') {
                                const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
                                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                                clearAllOfSymbol(randomSymbol);
                            }
                        }, activationDelay);
                        
                        activationDelay += 300;
                    }
                }, maxDelay + 400);
                
                // Don't fill empty spaces here, let the special tile activations handle it
                return;
            }
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 700);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }

    // Clear an area around a point
    function clearArea(centerRow, centerCol, size) {
        let points = 0;
        let soulsCollected = 0;
        let clearedTiles = 0;
        const tilesToClear = [];
        
        const radius = Math.floor(size / 2);
        
        // First collect all tiles to clear
        for (let r = centerRow - radius; r <= centerRow + radius; r++) {
            for (let c = centerCol - radius; c <= centerCol + radius; c++) {
                // Skip tiles outside the board
                if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) continue;
                
                const tile = board[r][c];
                
                if (tile.symbol) {
                    // Add to the list of tiles to clear
                    tilesToClear.push({
                        row: r,
                        col: c,
                        symbol: tile.symbol,
                        special: tile.special,
                        distance: Math.sqrt(Math.pow(r - centerRow, 2) + Math.pow(c - centerCol, 2))
                    });
                    
                    // Add points
                    points += config.pointsPerTile;
                    clearedTiles++;
                }
            }
        }
        
        // Calculate souls based on tiles cleared
        soulsCollected = Math.ceil(clearedTiles / 3);
        
        // Update score and souls
        score += points;
        souls += soulsCollected;
        scoreElement.textContent = score;
        soulsElement.textContent = souls;
        
        // Play soul collect sound
        playSound(soulCollectSound);
        
        // Clear tiles with animation
        if (tilesToClear.length > 0) {
            // Sort by distance from center for better animation
            tilesToClear.sort((a, b) => a.distance - b.distance);
            
            // Check for special tiles that need to be activated
            const specialTilesToActivate = tilesToClear.filter(tile => tile.special);
            
            // Clear tiles with a delay based on distance
            let maxDelay = 0;
            tilesToClear.forEach((tile, index) => {
                const delay = 50 + (tile.distance * 30);
                maxDelay = Math.max(maxDelay, delay);
                
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Get the tile element
                    const tileElement = getTileElement(tile.row, tile.col);
                    
                    // Add special clear animation
                    tileElement.classList.add('special-clear');
                    
                    // Mark the tile as empty
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                    
                    // Clear the tile after animation
                    setTimeout(() => {
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }, 500);
                }, delay);
            });
            
            // Activate special tiles after clearing the area
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let activationDelay = 0;
                    
                    for (const specialTile of specialTilesToActivate) {
                        // Create a copy of the special tile for activation
                        const tileCopy = { ...specialTile };
                        
                        setTimeout(() => {
                            // Activate the special effect directly
                            if (tileCopy.special === 'striped') {
                                if (tileCopy.direction === 'horizontal') {
                                    clearRow(tileCopy.row);
                                } else {
                                    clearColumn(tileCopy.col);
                                }
                            } else if (tileCopy.special === 'wrapped') {
                                clearArea(tileCopy.row, tileCopy.col, 3);
                                setTimeout(() => {
                                    clearArea(tileCopy.row, tileCopy.col, 3);
                                }, 300);
                            } else if (tileCopy.special === 'colorBomb') {
                                const symbols = config.activeSymbols.length > 0 ? config.activeSymbols : config.symbols;
                                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                                clearAllOfSymbol(randomSymbol);
                            }
                        }, activationDelay);
                        
                        activationDelay += 300;
                    }
                }, maxDelay + 100);
                
                // Don't fill empty spaces here, let the special tile activations handle it
                return;
            }
            
            // Fill empty spaces after all animations
            setTimeout(() => {
                fillEmptySpaces();
            }, maxDelay + 600);
        } else {
            // If no tiles to clear, check for matches
            setTimeout(() => {
                checkForMatches();
            }, 300);
        }
    }

    // Detect special patterns from matches
    function detectSpecialPatterns(matches, movedToTile = null) {
        const specialTiles = [];
        const matchCoords = new Map(); // Map to track all matched coordinates
        
        // First, build a map of all matched coordinates for quick lookup
        matches.forEach(match => {
            match.forEach(tile => {
                const key = `${tile.row},${tile.col}`;
                matchCoords.set(key, tile);
            });
        });
        
        // Process each match to find special patterns
        matches.forEach(match => {
            // Skip matches that are too short
            if (match.length < 3) return;
            
            // Determine if this is a horizontal or vertical match
            const isHorizontal = match[0].row === match[1].row;
            
            // Check if the moved tile is part of this match
            let movedTileInMatch = false;
            let movedTileIndex = -1;
            
            if (movedToTile) {
                for (let i = 0; i < match.length; i++) {
                    if (match[i].row === movedToTile.row && match[i].col === movedToTile.col) {
                        movedTileInMatch = true;
                        movedTileIndex = i;
                        break;
                    }
                }
            }
            
            if (match.length === 4) {
                // Match of 4: Create a striped tile
                let specialTileIndex;
                
                if (movedTileInMatch) {
                    // If the moved tile is part of this match, create the special tile there
                    specialTileIndex = movedTileIndex;
                } else {
                    // Otherwise, create it in the middle of the match
                    specialTileIndex = Math.floor(match.length / 2);
                }
                
                const specialTile = match[specialTileIndex];
                
                specialTiles.push({
                    row: specialTile.row,
                    col: specialTile.col,
                    symbol: specialTile.symbol,
                    special: 'striped',
                    direction: isHorizontal ? 'horizontal' : 'vertical'
                });
            } else if (match.length >= 5) {
                // Match of 5 or more: Create a color bomb
                let specialTileIndex;
                
                if (movedTileInMatch) {
                    // If the moved tile is part of this match, create the special tile there
                    specialTileIndex = movedTileIndex;
                } else {
                    // Otherwise, create it in the middle of the match
                    specialTileIndex = Math.floor(match.length / 2);
                }
                
                const specialTile = match[specialTileIndex];
                
                // For color bombs, use a fixed symbol (pentagram) instead of the original symbol
                specialTiles.push({
                    row: specialTile.row,
                    col: specialTile.col,
                    symbol: '⛧', // Fixed pentagram symbol for all color bombs
                    special: 'colorBomb',
                    direction: null
                });
            }
        });
        
        // Look for L and T shapes (intersections between horizontal and vertical matches)
        const horizontalMatches = matches.filter(match => 
            match.length >= 3 && match[0].row === match[1].row
        );
        
        const verticalMatches = matches.filter(match => 
            match.length >= 3 && match[0].col === match[1].col
        );
        
        // Check each horizontal match against each vertical match for intersections
        horizontalMatches.forEach(hMatch => {
            verticalMatches.forEach(vMatch => {
                // Find intersection point
                const intersection = hMatch.find(hTile => 
                    vMatch.some(vTile => vTile.row === hTile.row && vTile.col === hTile.col)
                );
                
                if (intersection) {
                    // Verify this is a valid L or T shape
                    if (isValidLOrTShape(hMatch, vMatch, intersection.row, intersection.col)) {
                        // Check if there's already a special tile at this position
                        const existingSpecial = specialTiles.find(
                            st => st.row === intersection.row && st.col === intersection.col
                        );
                        
                        // Check if the moved tile is at the intersection
                        const movedTileIsIntersection = movedToTile && 
                            movedToTile.row === intersection.row && 
                            movedToTile.col === intersection.col;
                        
                        // Only create a wrapped tile if there's no existing special tile
                        // and either there's no moved tile or the moved tile is at the intersection
                        if (!existingSpecial && (!movedToTile || movedTileIsIntersection)) {
                            specialTiles.push({
                                row: intersection.row,
                                col: intersection.col,
                                symbol: intersection.symbol,
                                special: 'wrapped',
                                direction: null
                            });
                        }
                    }
                }
            });
        });
        
        return specialTiles;
    }

    // Check if the intersection forms a valid L or T shape
    function isValidLOrTShape(horizontalMatch, verticalMatch, row, col) {
        // Check if the intersection is at the end of the horizontal match (L shape)
        const isEndOfHorizontal = 
            (horizontalMatch[0].col === col) || 
            (horizontalMatch[horizontalMatch.length - 1].col === col);
            
        // Check if the intersection is at the end of the vertical match (L shape)
        const isEndOfVertical = 
            (verticalMatch[0].row === row) || 
            (verticalMatch[verticalMatch.length - 1].row === row);
            
        // Check if the intersection is in the middle of the horizontal match (T shape)
        const isMiddleOfHorizontal = 
            (horizontalMatch[0].col < col) && 
            (horizontalMatch[horizontalMatch.length - 1].col > col);
            
        // Check if the intersection is in the middle of the vertical match (T shape)
        const isMiddleOfVertical = 
            (verticalMatch[0].row < row) && 
            (verticalMatch[verticalMatch.length - 1].row > row);
            
        // L shape: intersection at the end of both matches
        const isLShape = isEndOfHorizontal && isEndOfVertical;
        
        // T shape: intersection in the middle of one match and at the end of the other
        const isTShape = 
            (isMiddleOfHorizontal && isEndOfVertical) || 
            (isEndOfHorizontal && isMiddleOfVertical);
            
        return isLShape || isTShape;
    }

    // Event listeners
    restartButton.addEventListener('click', initGame);

    // Start the game
    initGame();
}); 