# Crush Game Server

A Node.js server for the Crush match-3 game.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Running the Server

To start the server in development mode with auto-restart:

```bash
npm run dev
```

To start the server in production mode:

```bash
npm start
```

The game will be available at http://localhost:3000

## Project Structure

- `server.js` - The main server file
- `public/` - Static files served by the server
  - `index.html` - The game's HTML file
  - `style.css` - The game's CSS file
  - `game.js` - The game's JavaScript file
  - `sounds/` - Sound files used by the game

## Game Features

- Match-3 gameplay with special tiles
- Level progression
- Score tracking
- Sound effects and background music 