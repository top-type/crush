const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get game configuration
app.get('/api/config', (req, res) => {
  // This could be loaded from a database or configuration file
  const gameConfig = {
    rows: 8,
    cols: 8,
    activeSymbolCount: 5,
    minMatch: 3,
    pointsPerTile: 10,
    movesPerLevel: 20,
    baseTargetScore: 1000,
    targetScoreIncrease: 500
  };
  
  res.json(gameConfig);
});

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 