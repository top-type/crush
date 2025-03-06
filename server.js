const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for high scores
let highScores = [];

// API endpoint to get high scores
app.get('/api/highscores', (req, res) => {
  res.json(highScores);
});

// API endpoint to add a high score
app.post('/api/highscores', (req, res) => {
  const { name, score, level } = req.body;
  
  if (!name || !score) {
    return res.status(400).json({ error: 'Name and score are required' });
  }
  
  const newScore = {
    id: Date.now(),
    name,
    score: Number(score),
    level: Number(level) || 1,
    date: new Date().toISOString()
  };
  
  highScores.push(newScore);
  
  // Sort high scores in descending order
  highScores.sort((a, b) => b.score - a.score);
  
  // Keep only top 10 scores
  if (highScores.length > 10) {
    highScores = highScores.slice(0, 10);
  }
  
  res.status(201).json(newScore);
});

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