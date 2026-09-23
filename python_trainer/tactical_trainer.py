import chess
import chess.engine
import json
import os
from typing import Dict, Any, List, Optional

class TacticalTrainer:
    def __init__(self, stockfish_path: str = "stockfish", depth: int = 15):
        self.board = chess.Board()
        self.stockfish_path = stockfish_path
        self.depth = depth
        self.engine = None
        self.history = []  # List of dicts containing move analysis
        self.exploration_board = None
        
        # Classification thresholds (CP loss)
        self.thresholds = {
            "Best": 0,
            "Excellent": 50,
            "Good": 100,
            "Inaccuracy": 300,
            "Mistake": 500,
            "Blunder": float('inf')
        }
        
        # Refined thresholds based on user request:
        # Best: 0 cp loss
        # Excellent: 1–49 cp
        # Good: 50–99 cp
        # Inaccuracy: 100–299 cp
        # Mistake: 300–499 cp
        # Blunder: ≥ 500 cp

    def start_engine(self):
        if not self.engine:
            self.engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path)

    def stop_engine(self):
        if self.engine:
            self.engine.quit()
            self.engine = None

    def _get_eval(self, board: chess.Board) -> Dict[str, Any]:
        """Get evaluation for the current position."""
        info = self.engine.analyse(board, chess.engine.Limit(depth=self.depth))
        score = info["score"].pov(board.turn)
        
        eval_val = 0
        is_mate = False
        if score.is_mate():
            eval_val = score.mate()
            is_mate = True
        else:
            eval_val = score.score()
            
        return {
            "value": eval_val,
            "is_mate": is_mate,
            "pv": info.get("pv", []),
            "best_move": info.get("pv", [None])[0]
        }

    def classify_move(self, cp_loss: int, is_mate_before: bool, is_mate_after: bool) -> str:
        """Classify move based on centipawn loss."""
        if is_mate_before and not is_mate_after:
            return "Blunder"  # Lost a forced mate
        if not is_mate_before and is_mate_after:
            if cp_loss <= 0: return "Best"
            return "Excellent" # Found a mate (even if not the fastest)

        if cp_loss <= 0: return "Best"
        if cp_loss < 50: return "Excellent"
        if cp_loss < 100: return "Good"
        if cp_loss < 300: return "Inaccuracy"
        if cp_loss < 500: return "Mistake"
        return "Blunder"

    def analyze_move(self, move: chess.Move) -> Dict[str, Any]:
        """Analyze a move and return its quality metrics."""
        self.start_engine()
        
        # 1. Eval before
        eval_before = self._get_eval(self.board)
        
        # 2. Push move
        self.board.push(move)
        
        # 3. Eval after (from previous side's perspective)
        # We need to look at the board from the perspective of the player who just moved
        eval_after_info = self.engine.analyse(self.board, chess.engine.Limit(depth=self.depth))
        # pov(not self.board.turn) because the turn has already switched
        score_after = eval_after_info["score"].pov(not self.board.turn)
        
        eval_after_val = score_after.mate() * 10000 if score_after.is_mate() else score_after.score()
        eval_before_val = eval_before["value"]
        if eval_before["is_mate"]:
            eval_before_val *= 10000

        cp_loss = max(0, eval_before_val - eval_after_val)
        
        classification = self.classify_move(
            cp_loss, 
            eval_before["is_mate"], 
            score_after.is_mate()
        )
        
        result = {
            "move_uci": move.uci(),
            "classification": classification,
            "cp_loss": cp_loss,
            "eval_before": eval_before["value"],
            "eval_after": eval_after_val if not score_after.is_mate() else score_after.mate(),
            "is_mate_before": eval_before["is_mate"],
            "is_mate_after": score_after.is_mate(),
            "best_move": eval_before["best_move"].uci() if eval_before["best_move"] else None,
            "pv": [m.uci() for m in eval_before["pv"]],
            "fen_before": self.board.parent.fen() if self.board.parent else self.board.fen() # Simplification
        }
        
        self.history.append(result)
        return result

    def get_exploration_reply(self, board: chess.Board) -> Dict[str, Any]:
        """Get engine reply during exploration."""
        self.start_engine()
        result = self.engine.play(board, chess.engine.Limit(depth=self.depth))
        return {
            "move": result.move.uci(),
            "eval": self._get_eval(board)
        }

    def save_to_json(self, filepath: str):
        """Save game with full analysis annotations to JSON."""
        data = {
            "metadata": {
                "engine": "Stockfish",
                "depth": self.depth,
                "final_fen": self.board.fen(),
                "result": self.board.result() if self.board.is_game_over() else "ongoing"
            },
            "analysis": self.history,
            "move_stack": [m.uci() for m in self.board.move_stack]
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=4)

    def load_from_json(self, filepath: str):
        with open(filepath, 'r') as f:
            data = json.load(f)
            self.board = chess.Board(data.get("fen", chess.STARTING_FEN))
            self.history = data.get("history", [])
