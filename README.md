# 2048 Bot Player

An intelligent AI bot that plays the 2048 game automatically with the ability to automatically click "Keep Playing" when the 2048 tile is reached.

## Features

- **Intelligent AI Bot**: Uses the Expectimax algorithm with sophisticated evaluation heuristics
- **Auto Keep Playing**: Automatically clicks "Keep Playing" when 2048 tile is reached
- **Multiple Strategies**: Supports Random, Greedy, and Expectimax strategies
- **Adjustable Speed**: Control how fast the bot makes moves (50ms - 1000ms)
- **Manual Override**: Switch between bot and manual play at any time
- **Score Tracking**: Tracks current score and best score with local storage
- **Responsive Design**: Works on both desktop and mobile devices

## How to Run

1. Open `index.html` in a web browser
2. Click "Start Bot" to begin automated play
3. Use the speed slider to adjust bot speed
4. Click "Manual Mode" to take control yourself
5. Click "New Game" to restart

## Bot Strategies

### Expectimax (Default)
- Uses game tree search with expectation for random tile placement
- Evaluates board positions using multiple heuristics:
  - **Empty Tiles**: Prefers boards with more empty spaces
  - **Smoothness**: Prefers boards where adjacent tiles have similar values
  - **Monotonicity**: Prefers boards where tiles are arranged in monotonic sequences
  - **Max Tile**: Considers the highest tile value

### Greedy
- Makes moves based on immediate board evaluation
- Faster but less strategic than Expectimax

### Random
- Makes random valid moves
- Useful for testing and comparison

## Key Bot Features

### Auto Keep Playing
The bot automatically detects when the 2048 tile is reached and clicks "Keep Playing" to continue the game, allowing it to pursue higher tiles like 4096, 8192, etc.

### Intelligent Move Selection
The bot uses sophisticated algorithms to:
- Look ahead multiple moves
- Consider probable tile placements
- Evaluate board positions using multiple criteria
- Choose moves that maximize long-term success

## File Structure

- `index.html` - Main game interface
- `style.css` - Game styling and animations
- `game.js` - Core 2048 game logic
- `bot.js` - AI bot implementation with Expectimax algorithm

## Customization

You can modify the bot's behavior by adjusting parameters in `bot.js`:

- `maxDepth` - How many moves ahead the bot looks (default: 4)
- `weights` - Relative importance of evaluation criteria
- `speed` - Default speed between moves

## Controls

- **Start Bot**: Begin automated play
- **Stop Bot**: Stop the bot (same button, toggles)
- **Manual Mode**: Switch to manual keyboard controls
- **New Game**: Restart the game
- **Speed Slider**: Adjust bot move speed
- **Keyboard**: Use arrow keys for manual play

## Browser Compatibility

Works in all modern browsers that support:
- ES6 Classes
- CSS Flexbox
- Local Storage
- SetInterval/ClearInterval

Enjoy watching the AI master the 2048 game!
