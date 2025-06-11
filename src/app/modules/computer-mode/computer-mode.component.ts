import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { StockfishService } from './stockfish.service';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { Color, FENChar } from 'src/app/chess-logic/models';
import { CommonModule } from '@angular/common';
import { MoveListComponent } from '../move-list/move-list.component';
import { ChessBoard } from 'src/app/chess-logic/chess-board';

@Component({
  selector: 'app-computer-mode',
  templateUrl: '../chess-board/chess-board.component.html',
  styleUrls: ['../chess-board/chess-board.component.css'],
  standalone: true,
  imports: [CommonModule, MoveListComponent]
})
export class ComputerModeComponent extends ChessBoardComponent implements OnInit, OnDestroy {
  private computerSubscriptions$ = new Subscription();
  public override currentStockfishLevel = 1;
  public override gameState: 'not_started' | 'in_progress' | 'finished' = 'not_started';
  public override chessBoard!: ChessBoard;
  public override chessBoardView: (FENChar | null)[][] = [];
  private isFirstMove: boolean = true;

  public override currentStockfishLevelLabel: string | undefined = undefined;

  private stockfishLevelLabels: Record<number, string> = {
    1: 'Новачок',
    2: 'Продвинутий',
    3: 'Сильний',
    4: 'Мастер',
    5: 'Гроссмейстер'
  };

  constructor(private stockfishService: StockfishService) {
    super(inject(ChessBoardService));
  }

  public override ngOnInit(): void {
    super.ngOnInit();
    this.gameState = 'in_progress';
    this.chessBoard = new ChessBoard();
    this.chessBoardView = this.chessBoard.chessBoardView;

    this.setStockfishLevelLabel(this.stockfishService.computerConfiguration$.value.level);
    const computerConfiSubscription$: Subscription = this.stockfishService.computerConfiguration$.subscribe({
      next: (computerConfiguration) => {
        this.setStockfishLevelLabel(computerConfiguration.level);
        if (computerConfiguration.color === Color.White) {
          this.flipBoard();
          this.makeComputerMove();
        }
      }
    });

    const chessBoardStateSubscription$: Subscription = this.chessBoardService.chessBoardState$.subscribe({
      next: async (FEN: string) => {
        if (this.chessBoard.isGameOver) {
          chessBoardStateSubscription$.unsubscribe();
          return;
        }

        const player: Color = FEN.split(" ")[1] === "w" ? Color.White : Color.Black;
        if (player !== this.stockfishService.computerConfiguration$.value.color) return;

        if (this.isFirstMove && this.stockfishService.computerConfiguration$.value.color === Color.White) {
          this.isFirstMove = false;
          return;
        }

        const { prevX, prevY, newX, newY, promotedPiece } = await firstValueFrom(this.stockfishService.getBestMove(FEN));
        this.updateBoard(prevX, prevY, newX, newY, promotedPiece);
      }
    });

    this.computerSubscriptions$.add(chessBoardStateSubscription$);
    this.computerSubscriptions$.add(computerConfiSubscription$);
  }

  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.computerSubscriptions$.unsubscribe();
    this.isFirstMove = true;
  }

  private initializeBoard(): void {
    const newBoard = new ChessBoard();
    this.chessBoard = newBoard;
    this.chessBoardView = newBoard.chessBoardView;
  }

  private async makeComputerMove(): Promise<void> {
    if (!this.chessBoard) return;
    
    const FEN = this.chessBoard.boardAsFEN;
    const { prevX, prevY, newX, newY, promotedPiece } = await firstValueFrom(this.stockfishService.getBestMove(FEN));
    this.updateBoard(prevX, prevY, newX, newY, promotedPiece);
  }

  private setStockfishLevelLabel(level: number) {
    this.currentStockfishLevelLabel = this.stockfishLevelLabels[level] || `ELO: ${level}`;
  }
}
