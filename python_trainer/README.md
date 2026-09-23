# Chess Horizon Tactical Trainer (Python Module)

This module provides a live chess analysis and training experience powered by Stockfish. It classifies every move and allows users to explore tactical mistakes in real-time.

## Features

- **Live Stockfish Analysis:** Real-time evaluation of every move.
- **Move Classification:** Categorizes moves as Best, Excellent, Good, Inaccuracy, Mistake, or Blunder based on centipawn (CP) loss.
- **Auto-Pause:** Automatically pauses the game when a sub-optimal move (Inaccuracy or worse) is detected.
- **Exploration Mode:** A "what-if" mode where users can try different variations from a bad-move position to understand why their move was flagged.
- **Annotated JSON Export:** Saves full game history with analysis data for every move.

## Prerequisites

1. **Python 3.x**
2. **Stockfish Engine:**
   - Install via apt: `sudo apt-get install stockfish`
   - Or download from [stockfishchess.org](https://stockfishchess.org/download/)
3. **Python Libraries:**
   ```bash
   pip install python-chess
   ```

## Usage

### Core Module (`tactical_trainer.py`)
The `TacticalTrainer` class is the main entry point. It manages the board state, engine connection, and analysis history.

```python
from tactical_trainer import TacticalTrainer
import chess

trainer = TacticalTrainer(stockfish_path="/usr/games/stockfish")
move = chess.Move.from_uci("e2e4")
analysis = trainer.analyze_move(move)
print(f"Quality: {analysis['classification']}, CP Loss: {analysis['cp_loss']}")
```

### Interactive Demo (`demo.py`)
Run the interactive CLI demo to see the trainer in action:
```bash
python3 demo.py
```

## Move Classification Thresholds
- **Best:** 0 cp loss
- **Excellent:** 1–49 cp
- **Good:** 50–99 cp
- **Inaccuracy:** 100–299 cp
- **Mistake:** 300–499 cp
- **Blunder:** ≥ 500 cp

## JSON Data Format
Games are saved with a rich metadata structure:
- `metadata`: Engine info, depth, final FEN, and result.
- `analysis`: A list of analysis objects for every move (CP loss, best move, PV, classification).
- `move_stack`: The full sequence of moves in UCI format.
