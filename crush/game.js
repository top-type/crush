document.addEventListener('DOMContentLoaded', () => {
    // Game configuration
    const config = {
        rows: 8,
        cols: 8,
        symbols: ['👹', '💀', '🔥', '⛧', '🗡️', '🩸', '🐐', '🕯️'],
        activeSymbols: [], // Will be populated with a subset of symbols
        activeSymbolCount: 5, // Number of symbols to use in the game
        minMatch: 3,
        pointsPerTile: 10,
        matchDelay: 500,
        fallDelay: 100,
        newTileDelay: 50,
        audioEnabled: true, // Always enable audio
        specialSymbols: {
            striped: {
                points: 30
            },
            wrapped: {
                points: 50
            },
            colorBomb: {
                points: 100
            }
        }
    };

    // Game state
    let board = [];
    let score = 0;
    let selectedTile = null;
    let isSwapping = false;
    let isChecking = false;
    let gameOver = false;
    let musicInitialized = false; // Flag to track if music has been initialized

    // DOM elements
    const boardElement = document.getElementById('board');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const gameOverElement = document.getElementById('game-over');
    const restartButton = document.getElementById('restart-button');

    // Audio elements
    const backgroundMusic = document.getElementById('background-music');
    const matchSound = document.getElementById('match-sound');
    const swapSound = document.getElementById('swap-sound');
    const gameOverSound = document.getElementById('game-over-sound');
    const selectSound = document.getElementById('select-sound'); // Added select sound
    
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
        selectedTile = null;
        isSwapping = false;
        isChecking = false;
        gameOver = false;
        
        // Update UI
        scoreElement.textContent = score;
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
            // Ensure the symbol is displayed
            if (symbol) {
                tileElement.textContent = symbol;
            } else {
                // If there's no symbol, make sure the tile is visually empty
                tileElement.textContent = '';
                tileElement.className = 'tile';
                return tileElement;
            }
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
        // Clear the active symbols array
        config.activeSymbols = [];
        
        // Create a copy of all symbols
        const allSymbols = [...config.symbols];
        
        // Randomly select the specified number of symbols
        for (let i = 0; i < config.activeSymbolCount; i++) {
            const randomIndex = Math.floor(Math.random() * allSymbols.length);
            config.activeSymbols.push(allSymbols.splice(randomIndex, 1)[0]);
        }
        
        console.log("Active symbols for this game:", config.activeSymbols);
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
            
            // Make sure the selected class is applied properly
            tileElement.classList.add('selected');
            
            // Play selection sound
            playSound(selectSound);
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
    function checkForMatches(matches = null, movedToTile = null) {
        isChecking = true;
        
        // If matches weren't provided, find them
        if (!matches) {
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
        
        // Create a set of all matched tile coordinates for quick lookup
        const matchedCoords = new Set();
        
        // Check for special tiles in the matches
        const specialTilesInMatches = [];
        
        matches.forEach(match => {
            match.forEach(tile => {
                matchedCoords.add(`${tile.row},${tile.col}`);
                
                // Mark matching tiles visually
                const tileElement = getTileElement(tile.row, tile.col);
                tileElement.classList.add('matching');
                
                // Check if this is a special tile
                if (tile.special) {
                    specialTilesInMatches.push(tile);
                }
            });
        });
        
        // Calculate points
        const matchedTiles = matches.reduce((count, match) => count + match.length, 0);
        const points = matchedTiles * config.pointsPerTile;
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Detect special patterns
        const specialTiles = detectSpecialPatterns(matches, movedToTile);
        
        // Remove matches after a delay
        setTimeout(() => {
            // Create special tiles
            for (const specialTileInfo of specialTiles) {
                // Only create a special tile if it's part of a match
                const coordKey = `${specialTileInfo.row},${specialTileInfo.col}`;
                if (matchedCoords.has(coordKey)) {
                    // Create the special tile
                    const tile = board[specialTileInfo.row][specialTileInfo.col];
                    tile.special = specialTileInfo.special;
                    tile.direction = specialTileInfo.direction;
                    
                    // Remove this tile from the matched coordinates so it doesn't get cleared
                    matchedCoords.delete(coordKey);
                    
                    // Update the tile element
                    updateTileElement(tile.row, tile.col, tile.symbol, tile.special, tile.direction);
                    
                    // Remove the matching animation
                    const tileElement = getTileElement(tile.row, tile.col);
                    tileElement.classList.remove('matching');
                }
            }
            
            // First, activate any special tiles that are in matches
            if (specialTilesInMatches.length > 0) {
                let specialDelay = 0;
                const activatedSpecials = new Set(); // Track which special tiles have been activated
                
                specialTilesInMatches.forEach(tile => {
                    const coordKey = `${tile.row},${tile.col}`;
                    
                    // Only activate if not already activated and not part of a new special tile
                    if (!activatedSpecials.has(coordKey) && matchedCoords.has(coordKey)) {
                        activatedSpecials.add(coordKey);
                        
                        // Remove from matched coords so it doesn't get cleared normally
                        matchedCoords.delete(coordKey);
                        
                        // Activate with a delay
                        setTimeout(() => {
                            // Check if the tile still exists and has a special property
                            if (board[tile.row] && board[tile.row][tile.col] && 
                                board[tile.row][tile.col].special) {
                                activateSpecialTile(board[tile.row][tile.col]);
                            }
                        }, specialDelay);
                        
                        specialDelay += 200;
                    }
                });
            }
            
            // Collect all tiles to remove based on the matched coordinates
            const tilesToRemove = [];
            matchedCoords.forEach(coordKey => {
                const [row, col] = coordKey.split(',').map(Number);
                // Only add to removal list if the tile still has a symbol
                if (board[row] && board[row][col] && board[row][col].symbol) {
                    tilesToRemove.push({
                        row: row,
                        col: col,
                        symbol: board[row][col].symbol,
                        special: board[row][col].special,
                        direction: board[row][col].direction
                    });
                }
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
                
                // Process all tiles to remove at once to avoid race conditions
                tilesToRemove.forEach(tile => {
                    // Mark the tile as empty in the data model immediately
                    // This prevents race conditions where a tile might be counted in multiple matches
                    board[tile.row][tile.col].symbol = null;
                    board[tile.row][tile.col].special = null;
                    board[tile.row][tile.col].direction = null;
                });
                
                // Now animate the removal
                tilesToRemove.forEach((tile, index) => {
                    const delay = 50 + (index * 20);
                    maxDelay = Math.max(maxDelay, delay);
                    
                    setTimeout(() => {
                        // Play the sound for the symbol being removed
                        playSymbolSound(tile.symbol);
                        
                        // Get the tile element
                        const tileElement = getTileElement(tile.row, tile.col);
                        if (!tileElement) return; // Skip if element doesn't exist
                        
                        // Add special clear animation
                        tileElement.classList.add('special-clear');
                        
                        // Clear the tile after animation
                        setTimeout(() => {
                            if (!tileElement) return; // Skip if element doesn't exist
                            
                            // Ensure the tile is completely cleared
                            tileElement.textContent = '';
                            tileElement.className = 'tile';
                            tileElement.style.transition = '';
                            tileElement.style.transform = '';
                            
                            // Double-check that the board data is cleared
                            if (board[tile.row] && board[tile.row][tile.col]) {
                                board[tile.row][tile.col].symbol = null;
                                board[tile.row][tile.col].special = null;
                                board[tile.row][tile.col].direction = null;
                            }
                        }, 300);
                    }, delay);
                });
                
                // Fill empty spaces after all animations
                setTimeout(() => {
                    // Ensure all tiles are properly cleared before filling
                    for (let row = 0; row < config.rows; row++) {
                        for (let col = 0; col < config.cols; col++) {
                            const tileElement = getTileElement(row, col);
                            if (!tileElement) continue;
                            
                            // Remove any lingering animations
                            tileElement.classList.remove('special-clear', 'matching');
                            
                            // If the board data says empty but the element still has content, clear it
                            if (!board[row][col].symbol) {
                                tileElement.textContent = '';
                                tileElement.className = 'tile';
                                tileElement.style.transition = '';
                                tileElement.style.transform = '';
                                
                                // Remove any special indicators
                                const existingIndicator = tileElement.querySelector('.special-indicator');
                                if (existingIndicator) {
                                    tileElement.removeChild(existingIndicator);
                                }
                            } else {
                                // Ensure the visual state matches the data state
                                updateTileElement(
                                    row,
                                    col,
                                    board[row][col].symbol,
                                    board[row][col].special,
                                    board[row][col].direction
                                );
                            }
                        }
                    }
                    
                    // Run the global cleanup function to ensure all animations are cleared
                    cleanupBoard();
                    
                    fillEmptySpaces();
                }, maxDelay + 400);
            } else {
                // If no tiles to remove, check for matches
                cleanupBoard();
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

    // Clean up any stuck animations or visual inconsistencies
    function cleanupBoard() {
        // Clear any lingering animations and ensure visual state matches data state
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                const tileElement = getTileElement(row, col);
                if (!tileElement) continue;
                
                // Remove any lingering animations
                tileElement.classList.remove('special-clear', 'matching');
                
                // If the board data says empty but the element still has content, clear it
                if (!board[row][col].symbol) {
                    tileElement.textContent = '';
                    tileElement.className = 'tile';
                    tileElement.style.transition = '';
                    tileElement.style.transform = '';
                    
                    // Remove any special indicators
                    const existingIndicator = tileElement.querySelector('.special-indicator');
                    if (existingIndicator) {
                        tileElement.removeChild(existingIndicator);
                    }
                } else {
                    // Ensure the visual state matches the data state
                    updateTileElement(
                        row,
                        col,
                        board[row][col].symbol,
                        board[row][col].special,
                        board[row][col].direction
                    );
                }
            }
        }
    }

    // Fill empty spaces with new tiles
    function fillEmptySpaces() {
        let hasEmptySpaces = false;
        
        // First, run cleanup to ensure all animations are cleared
        cleanupBoard();
        
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
                    hasEmptySpaces = true;
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
                }
            }
            
            // Record new tiles needed at the top
            for (let i = 0; i < emptySpaces; i++) {
                const row = i;
                newTiles.push({
                    row: row,
                    col: col,
                    distance: emptySpaces - i
                });
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
                    
                    // Ensure the visual state matches the data state
                    if (board[row][col].symbol) {
                        updateTileElement(
                            row,
                            col,
                            board[row][col].symbol,
                            board[row][col].special,
                            board[row][col].direction
                        );
                    } else {
                        // If there's no symbol, make sure the tile is visually empty
                        tileElement.textContent = '';
                        tileElement.className = 'tile';
                    }
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
        
        // Check if either tile is part of a match
        const matches = findMatches();
        const tile1InMatch = isInMatch(tile1, matches);
        const tile2InMatch = isInMatch(tile2, matches);
        
        // If only one tile is in a match, activate its special effect and continue with the match
        if (!isSpecialCombo) {
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
                clearRow(tile1Props.row);
            } else {
                clearColumn(tile1Props.col);
            }
        }
        else if (tile2Props.special === 'striped') {
            // Regular + Striped: Clear row or column
            if (tile2Props.direction === 'horizontal') {
                clearRow(tile2Props.row);
            } else {
                clearColumn(tile2Props.col);
            }
        }
        else if (tile1Props.special === 'wrapped') {
            // Wrapped + Regular: Double explosion
            clearArea(tile1Props.row, tile1Props.col, 3);
            setTimeout(() => {
                clearArea(tile1Props.row, tile1Props.col, 3);
            }, 300);
        }
        else if (tile2Props.special === 'wrapped') {
            // Regular + Wrapped: Double explosion
            clearArea(tile2Props.row, tile2Props.col, 3);
            setTimeout(() => {
                clearArea(tile2Props.row, tile2Props.col, 3);
            }, 300);
        }
    }
    
    // Helper function to clear a tile
    function clearTile(tile) {
        if (!tile) return;
        
        // Store the row and col before clearing the tile
        const row = tile.row;
        const col = tile.col;
        
        // Clear the tile data
        tile.symbol = null;
        tile.special = null;
        tile.direction = null;
        
        // Clear the visual element
        const tileElement = getTileElement(row, col);
        if (!tileElement) return; // Skip if element doesn't exist
        
        // Remove any special classes and animations
        tileElement.classList.remove('matching', 'special-clear', 'striped', 'wrapped', 'colorBomb', 'horizontal', 'vertical');
        
        // Remove any existing special indicators
        const existingIndicator = tileElement.querySelector('.special-indicator');
        if (existingIndicator) {
            tileElement.removeChild(existingIndicator);
        }
        
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
            // Wrapped: Clear a 3x3 area
            clearArea(row, col, 1);
        } else if (special === 'colorBomb') {
            // Color Bomb: Clear all tiles of a random symbol
            // If no symbol was provided, choose a random one
            if (!symbol) {
                const availableSymbols = [];
                for (let r = 0; r < config.rows; r++) {
                    for (let c = 0; c < config.cols; c++) {
                        if (board[r][c].symbol && !availableSymbols.includes(board[r][c].symbol)) {
                            availableSymbols.push(board[r][c].symbol);
                        }
                    }
                }
                if (availableSymbols.length > 0) {
                    symbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
                }
            }
            
            if (symbol) {
                clearAllOfSymbol(symbol);
            }
        }
    }
    
    // Clear the entire board
    function clearEntireBoard() {
        // Find all tiles with symbols
        const tilesToClear = [];
        
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (board[row][col].symbol) {
                    tilesToClear.push({
                        row: row,
                        col: col,
                        symbol: board[row][col].symbol,
                        special: board[row][col].special,
                        direction: board[row][col].direction
                    });
                }
            }
        }
        
        // If no tiles to clear, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add bonus points for this powerful combo
        const points = tilesToClear.length * config.pointsPerTile * 3; // Triple points for clearing the board
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create a full-board explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const explosionElement = document.createElement('div');
        explosionElement.className = 'cross-explosion';
        explosionElement.style.width = `${boardRect.width}px`;
        explosionElement.style.height = `${boardRect.height}px`;
        explosionElement.style.left = '0';
        explosionElement.style.top = '0';
        explosionElement.style.background = 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,0,0,0.5) 50%, rgba(0,0,0,0) 100%)';
        boardElement.appendChild(explosionElement);
        
        // Remove the explosion element after animation
        setTimeout(() => {
            boardElement.removeChild(explosionElement);
        }, 1000);
        
        // Identify special tiles to activate
        const tilesToActivate = tilesToClear.filter(tile => tile.special);
        
        // Clear all tiles immediately
        tilesToClear.forEach(tile => {
            // Skip if this tile has already been cleared
            if (!board[tile.row][tile.col].symbol) return;
            
            // Clear the tile
            clearTile(board[tile.row][tile.col]);
            
            // Add special clear animation
            const tileElement = getTileElement(tile.row, tile.col);
            if (tileElement) {
                tileElement.classList.add('special-clear');
            }
        });
        
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
            // Fill empty spaces after all tiles have been cleared
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 300);
        }
    }
    
    // Clear all tiles of a specific symbol
    function clearAllOfSymbol(symbol) {
        // Find all tiles with this symbol
        const tilesToClear = [];
        
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (board[row][col].symbol === symbol) {
                    tilesToClear.push({
                        row: row,
                        col: col,
                        symbol: symbol,
                        special: board[row][col].special,
                        direction: board[row][col].direction
                    });
                }
            }
        }
        
        // If no tiles found, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add points based on the number of tiles cleared
        const points = tilesToClear.length * config.pointsPerTile * 2; // Double points for color bomb
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create a cross-shaped explosion effect
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
        
        // Clear the tiles with a delay between each
        let delay = 0;
        const specialTilesToActivate = [];
        
        // First, identify any special tiles to activate
        tilesToClear.forEach(tile => {
            if (tile.special) {
                specialTilesToActivate.push(tile);
            }
        });
        
        // Clear regular tiles first
        tilesToClear.forEach(tile => {
            if (!tile.special) {
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Clear the tile
                    clearTile(board[tile.row][tile.col]);
                    
                    // Add special clear animation
                    const tileElement = getTileElement(tile.row, tile.col);
                    if (tileElement) {
                        tileElement.classList.add('special-clear');
                    }
                }, delay);
                delay += 50;
            }
        });
        
        // Then activate special tiles
        if (specialTilesToActivate.length > 0) {
            setTimeout(() => {
                let specialDelay = 0;
                specialTilesToActivate.forEach(tile => {
                    setTimeout(() => {
                        // Skip if this tile has already been cleared
                        if (!board[tile.row] || !board[tile.row][tile.col] || !board[tile.row][tile.col].symbol) return;
                        
                        // Activate the special tile
                        activateSpecialTile(board[tile.row][tile.col]);
                    }, specialDelay);
                    specialDelay += 200;
                });
            }, delay + 200);
            
            // Fill empty spaces after all special tiles have been activated
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 200 + (specialTilesToActivate.length * 200) + 300);
        } else {
            // Fill empty spaces after all tiles have been cleared
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 300);
        }
    }

    // Clear a cross shape (row and column)
    function clearCrossShape(centerRow, centerCol) {
        // Find all tiles in the cross shape
        const tilesToClear = [];
        
        // Add tiles in the row
        for (let col = 0; col < config.cols; col++) {
            if (board[centerRow][col].symbol) {
                tilesToClear.push({
                    row: centerRow,
                    col: col,
                    symbol: board[centerRow][col].symbol,
                    special: board[centerRow][col].special,
                    direction: board[centerRow][col].direction
                });
            }
        }
        
        // Add tiles in the column (except the center which is already counted)
        for (let row = 0; row < config.rows; row++) {
            if (row !== centerRow && board[row][centerCol].symbol) {
                tilesToClear.push({
                    row: row,
                    col: centerCol,
                    symbol: board[row][centerCol].symbol,
                    special: board[row][centerCol].special,
                    direction: board[row][centerCol].direction
                });
            }
        }
        
        // If no tiles to clear, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add points based on the number of tiles cleared
        const points = tilesToClear.length * config.pointsPerTile * 2; // 2x points for cross shape
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create a cross-shaped explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const tileSize = boardRect.width / config.cols;
        
        // Horizontal part of the cross
        const horizontalElement = document.createElement('div');
        horizontalElement.className = 'cross-explosion';
        horizontalElement.style.width = `${boardRect.width}px`;
        horizontalElement.style.height = `${tileSize}px`;
        horizontalElement.style.left = '0';
        horizontalElement.style.top = `${centerRow * tileSize}px`;
        horizontalElement.style.background = 'linear-gradient(to right, rgba(255,0,0,0) 0%, rgba(255,0,0,0.8) 50%, rgba(255,0,0,0) 100%)';
        boardElement.appendChild(horizontalElement);
        
        // Vertical part of the cross
        const verticalElement = document.createElement('div');
        verticalElement.className = 'cross-explosion';
        verticalElement.style.width = `${tileSize}px`;
        verticalElement.style.height = `${boardRect.height}px`;
        verticalElement.style.left = `${centerCol * tileSize}px`;
        verticalElement.style.top = '0';
        verticalElement.style.background = 'linear-gradient(to bottom, rgba(255,0,0,0) 0%, rgba(255,0,0,0.8) 50%, rgba(255,0,0,0) 100%)';
        boardElement.appendChild(verticalElement);
        
        // Remove the explosion elements after animation
        setTimeout(() => {
            boardElement.removeChild(horizontalElement);
            boardElement.removeChild(verticalElement);
        }, 1000);
        
        // Clear the tiles with a delay between each
        let delay = 0;
        const specialTilesToActivate = [];
        
        // First, identify any special tiles to activate
        tilesToClear.forEach(tile => {
            if (tile.special) {
                specialTilesToActivate.push(tile);
            }
        });
        
        // Clear regular tiles first
        tilesToClear.forEach(tile => {
            if (!tile.special) {
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Clear the tile
                    clearTile(board[tile.row][tile.col]);
                    
                    // Add special clear animation
                    const tileElement = getTileElement(tile.row, tile.col);
                    if (tileElement) {
                        tileElement.classList.add('special-clear');
                    }
                }, delay);
                delay += 50;
            }
        });
        
        // Then activate special tiles
        if (specialTilesToActivate.length > 0) {
            setTimeout(() => {
                let specialDelay = 0;
                specialTilesToActivate.forEach(tile => {
                    setTimeout(() => {
                        // Skip if this tile has already been cleared
                        if (!board[tile.row] || !board[tile.row][tile.col] || !board[tile.row][tile.col].symbol) return;
                        
                        // Activate the special tile
                        activateSpecialTile(board[tile.row][tile.col]);
                    }, specialDelay);
                    specialDelay += 200;
                });
            }, delay + 200);
            
            // Fill empty spaces after all special tiles have been activated
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 200 + (specialTilesToActivate.length * 200) + 300);
        } else {
            // Fill empty spaces after all tiles have been cleared
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 300);
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

    // Clear both a row and column
    function clearRowAndColumn(centerRow, centerCol) {
        // This is essentially the same as clearCrossShape
        clearCrossShape(centerRow, centerCol);
    }

    // Clear a row
    function clearRow(row) {
        // Find all tiles in this row
        const tilesToClear = [];
        
        for (let col = 0; col < config.cols; col++) {
            if (board[row][col].symbol) {
                tilesToClear.push({
                    row: row,
                    col: col,
                    symbol: board[row][col].symbol,
                    special: board[row][col].special,
                    direction: board[row][col].direction
                });
            }
        }
        
        // If no tiles to clear, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add points based on the number of tiles cleared
        const points = tilesToClear.length * config.pointsPerTile * 1.5; // 1.5x points for striped
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create a row explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const tileSize = boardRect.width / config.cols;
        
        const rowElement = document.createElement('div');
        rowElement.className = 'cross-explosion';
        rowElement.style.width = `${boardRect.width}px`;
        rowElement.style.height = `${tileSize}px`;
        rowElement.style.left = '0';
        rowElement.style.top = `${row * tileSize}px`;
        rowElement.style.background = 'linear-gradient(to right, rgba(255,0,0,0) 0%, rgba(255,0,0,0.8) 50%, rgba(255,0,0,0) 100%)';
        boardElement.appendChild(rowElement);
        
        // Remove the explosion element after animation
        setTimeout(() => {
            boardElement.removeChild(rowElement);
        }, 1000);
        
        // Clear the tiles with a delay between each
        let delay = 0;
        const specialTilesToActivate = [];
        
        // First, identify any special tiles to activate
        tilesToClear.forEach(tile => {
            if (tile.special) {
                specialTilesToActivate.push(tile);
            }
        });
        
        // Clear regular tiles first
        tilesToClear.forEach(tile => {
            if (!tile.special) {
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Clear the tile
                    clearTile(board[tile.row][tile.col]);
                    
                    // Add special clear animation
                    const tileElement = getTileElement(tile.row, tile.col);
                    if (tileElement) {
                        tileElement.classList.add('special-clear');
                    }
                }, delay);
                delay += 50;
            }
        });
        
        // Then activate special tiles
        if (specialTilesToActivate.length > 0) {
            setTimeout(() => {
                let specialDelay = 0;
                specialTilesToActivate.forEach(tile => {
                    setTimeout(() => {
                        // Skip if this tile has already been cleared
                        if (!board[tile.row] || !board[tile.row][tile.col] || !board[tile.row][tile.col].symbol) return;
                        
                        // Activate the special tile
                        activateSpecialTile(board[tile.row][tile.col]);
                    }, specialDelay);
                    specialDelay += 200;
                });
            }, delay + 200);
            
            // Fill empty spaces after all special tiles have been activated
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 200 + (specialTilesToActivate.length * 200) + 300);
        } else {
            // Fill empty spaces after all tiles have been cleared
            setTimeout(() => {
                fillEmptySpaces();
            }, delay + 300);
        }
    }
    
    // Clear a column
    function clearColumn(col) {
        // Find all tiles in this column
        const tilesToClear = [];
        
        for (let row = 0; row < config.rows; row++) {
            if (board[row][col].symbol) {
                tilesToClear.push({
                    row: row,
                    col: col,
                    symbol: board[row][col].symbol,
                    special: board[row][col].special,
                    direction: board[row][col].direction
                });
            }
        }
        
        // If no tiles to clear, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add points based on the number of tiles cleared
        const points = tilesToClear.length * config.pointsPerTile * 1.5; // 1.5x points for striped
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create a column explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const tileSize = boardRect.width / config.cols;
        
        const colElement = document.createElement('div');
        colElement.className = 'cross-explosion';
        colElement.style.width = `${tileSize}px`;
        colElement.style.height = `${boardRect.height}px`;
        colElement.style.left = `${col * tileSize}px`;
        colElement.style.top = '0';
        colElement.style.background = 'linear-gradient(to bottom, rgba(255,0,0,0) 0%, rgba(255,0,0,0.8) 50%, rgba(255,0,0,0) 100%)';
        boardElement.appendChild(colElement);
        
        // Remove the explosion element after animation
        setTimeout(() => {
            boardElement.removeChild(colElement);
        }, 1000);
        
        // Clear the tiles with a delay between each
        let delay = 0;
        const specialTilesToActivate = [];
        
        // First, identify any special tiles to activate
        tilesToClear.forEach(tile => {
            if (tile.special) {
                specialTilesToActivate.push(tile);
            }
        });
        
        // Clear regular tiles first
        tilesToClear.forEach(tile => {
            if (!tile.special) {
                setTimeout(() => {
                    // Skip if this tile has already been cleared
                    if (!board[tile.row][tile.col].symbol) return;
                    
                    // Play the sound for the symbol being removed
                    playSymbolSound(tile.symbol);
                    
                    // Clear the tile
                    clearTile(board[tile.row][tile.col]);
                    
                    // Add special clear animation
                    const tileElement = getTileElement(tile.row, tile.col);
                    if (tileElement) {
                        tileElement.classList.add('special-clear');
                    }
                }, delay);
                delay += 50;
            }
        });
        
        // Then activate special tiles
        if (specialTilesToActivate.length > 0) {
            setTimeout(() => {
                let specialDelay = 0;
                specialTilesToActivate.forEach(tile => {
                    setTimeout(() => {
                        // Skip if this tile has already been cleared
                        if (!board[tile.row] || !board[tile.row][tile.col] || !board[tile.row][tile.col].symbol) return;
                        
                        // Activate the special tile
                        activateSpecialTile(board[tile.row][tile.col]);
                    }, specialDelay);
                    specialDelay += 200;
                });
            }, delay + 200);
            
            // Check for matches after all special tiles have been activated
            setTimeout(() => {
                checkForMatches();
            }, delay + 200 + (specialTilesToActivate.length * 200) + 300);
        } else {
            // Check for matches after all tiles have been cleared
            setTimeout(() => {
                checkForMatches();
            }, delay + 300);
        }
    }

    // Clear an area
    function clearArea(centerRow, centerCol, size) {
        // Find all tiles in the area
        const tilesToClear = [];
        
        const radius = Math.floor(size / 2);
        
        // Collect all tiles to clear
        for (let r = centerRow - radius; r <= centerRow + radius; r++) {
            for (let c = centerCol - radius; c <= centerCol + radius; c++) {
                // Skip tiles outside the board
                if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) continue;
                
                if (board[r][c].symbol) {
                    tilesToClear.push({
                        row: r,
                        col: c,
                        symbol: board[r][c].symbol,
                        special: board[r][c].special,
                        direction: board[r][c].direction
                    });
                }
            }
        }
        
        // If no tiles to clear, return
        if (tilesToClear.length === 0) {
            setTimeout(() => {
                fillEmptySpaces();
            }, 300);
            return;
        }
        
        // Add points based on the number of tiles cleared
        const points = tilesToClear.length * config.pointsPerTile * 2; // 2x points for area
        
        // Update score
        score += points;
        scoreElement.textContent = score;
        
        // Create an area explosion effect
        const boardRect = boardElement.getBoundingClientRect();
        const tileSize = boardRect.width / config.cols;
        
        // Remove the explosion element after animation
        setTimeout(() => {
            // Clear the tiles with a delay between each
            let delay = 0;
            const specialTilesToActivate = [];
            
            // First, identify any special tiles to activate
            tilesToClear.forEach(tile => {
                if (tile.special) {
                    specialTilesToActivate.push(tile);
                }
            });
            
            // Clear regular tiles first
            tilesToClear.forEach(tile => {
                if (!tile.special) {
                    setTimeout(() => {
                        // Skip if this tile has already been cleared
                        if (!board[tile.row][tile.col].symbol) return;
                        
                        // Play the sound for the symbol being removed
                        playSymbolSound(tile.symbol);
                        
                        // Clear the tile
                        clearTile(board[tile.row][tile.col]);
                        
                        // Add special clear animation
                        const tileElement = getTileElement(tile.row, tile.col);
                        if (tileElement) {
                            tileElement.classList.add('special-clear');
                        }
                    }, delay);
                    delay += 50;
                }
            });
            
            // Then activate special tiles
            if (specialTilesToActivate.length > 0) {
                setTimeout(() => {
                    let specialDelay = 0;
                    specialTilesToActivate.forEach(tile => {
                        setTimeout(() => {
                            // Skip if this tile has already been cleared
                            if (!board[tile.row] || !board[tile.row][tile.col] || !board[tile.row][tile.col].symbol) return;
                            
                            // Activate the special tile
                            activateSpecialTile(board[tile.row][tile.col]);
                        }, specialDelay);
                        specialDelay += 200;
                    });
                }, delay + 200);
                
                // Fill empty spaces after all special tiles have been activated
                setTimeout(() => {
                    fillEmptySpaces();
                }, delay + 200 + (specialTilesToActivate.length * 200) + 300);
            } else {
                // Fill empty spaces after all tiles have been cleared
                setTimeout(() => {
                    fillEmptySpaces();
                }, delay + 300);
            }
        }, 1000);
    }

    // Event listeners
    restartButton.addEventListener('click', initGame);

    // Start the game
    initGame();
}); 
