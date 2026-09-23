import chess
from tactical_trainer import TacticalTrainer
import sys

def print_board(board):
    print("\n" + str(board))
    print("\nFEN: " + board.fen())

def exploration_mode(trainer, original_board):
    print("\n" + "="*40)
    print("ENTERING EXPLORATION MODE")
    print("Try different moves to see why your move was bad.")
    print("Type 'exit' to resume the main game.")
    print("Type 'reset' to return to the bad move position.")
    print("="*40)
    
    exploration_board = original_board.copy()
    
    while True:
        print_board(exploration_board)
        eval_info = trainer._get_eval(exploration_board)
        print(f"Current Eval: {eval_info['value']} {'(Mate)' if eval_info['is_mate'] else '(CP)'}")
        
        cmd = input("\nExploration Move (UCI, e.g., e2e4) or command: ").strip()
        
        if cmd.lower() == 'exit':
            break
        if cmd.lower() == 'reset':
            exploration_board = original_board.copy()
            continue
            
        try:
            move = chess.Move.from_uci(cmd)
            if move in exploration_board.legal_moves:
                exploration_board.push(move)
                # Engine reply
                reply = trainer.get_exploration_reply(exploration_board)
                print(f"Engine replies: {reply['move']}")
                exploration_board.push(chess.Move.from_uci(reply['move']))
            else:
                print("Illegal move!")
        except ValueError:
            print("Invalid UCI format. Use e2e4, g1f3, etc.")

def main():
    trainer = TacticalTrainer()
    print("Welcome to Chess Horizon Tactical Trainer!")
    print("Playing as White. Enter moves in UCI format (e.g., e2e4).")
    
    try:
        while not trainer.board.is_game_over():
            print_board(trainer.board)
            
            # User move
            user_input = input("\nYour move: ").strip()
            try:
                move = chess.Move.from_uci(user_input)
                if move not in trainer.board.legal_moves:
                    print("Illegal move!")
                    continue
            except ValueError:
                print("Invalid UCI format. Use e2e4, g1f3, etc.")
                continue
            
            # Analyze
            print("Analyzing...")
            analysis = trainer.analyze_move(move)
            
            print(f"\nMove: {analysis['move_uci']}")
            print(f"Classification: {analysis['classification']}")
            print(f"Centipawn Loss: {analysis['cp_loss']}")
            
            if analysis['classification'] in ["Inaccuracy", "Mistake", "Blunder"]:
                print(f"\n[!] {analysis['classification']} detected!")
                print(f"Engine's best move was: {analysis['best_move']}")
                print(f"Principal Variation: {' '.join(analysis['pv'][:5])}...")
                
                choice = input("\nEnter exploration mode? (y/n): ").strip().lower()
                if choice == 'y':
                    # The trainer.board already has the move pushed. 
                    # For exploration, we might want to start from the position AFTER the bad move.
                    exploration_mode(trainer, trainer.board)
                    
                    resume = input("\nResume from your move or take it back? (resume/takeback): ").strip().lower()
                    if resume == 'takeback':
                        trainer.board.pop()
                        trainer.history.pop()
                        continue
            
            # Computer move
            if not trainer.board.is_game_over():
                print("\nComputer is thinking...")
                reply = trainer.get_exploration_reply(trainer.board)
                print(f"Computer played: {reply['move']}")
                trainer.board.push(chess.Move.from_uci(reply['move']))
                
        print("\nGame Over!")
        print(f"Result: {trainer.board.result()}")
        
        trainer.save_to_json("last_game.json")
        print("Game saved to last_game.json")
        
    finally:
        trainer.stop_engine()

if __name__ == "__main__":
    main()
