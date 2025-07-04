import { Component, OnDestroy, OnInit, HostBinding } from '@angular/core';
import { ChessBoard } from 'src/app/chess-logic/chess-board';
import { CheckState, Color, Coords, FENChar, GameHistory, LastMove, MoveList, MoveType, SafeSquares, pieceImagePaths } from 'src/app/chess-logic/models';
import { SelectedSquare } from './models';
import { ChessBoardService } from './chess-board.service';
import { Subscription, filter, fromEvent, tap } from 'rxjs';
import { FENConverter } from 'src/app/chess-logic/FENConverter';
import { CommonModule } from '@angular/common';
import { MoveListComponent } from '../move-list/move-list.component';
import { StockfishService } from '../computer-mode/stockfish.service';

@Component({
  selector: 'app-chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css'],
  standalone: true,
  imports: [CommonModule, MoveListComponent]
})
export class ChessBoardComponent implements OnInit, OnDestroy {
  @HostBinding('class.active') get isActive() {
    return this.gameState !== 'not_started';
  }

  public pieceImagePaths = pieceImagePaths;
  public currentStockfishLevel: number | undefined = undefined;
  public currentStockfishLevelLabel?: string;
  public gameState: 'not_started' | 'in_progress' | 'finished' = 'not_started';

  protected chessBoard!: ChessBoard;
  public chessBoardView: (FENChar | null)[][] = [];
  public get playerColor(): Color { return this.chessBoard.playerColor; };
  public get safeSquares(): SafeSquares { return this.chessBoard.safeSquares; };
  public get gameOverMessage(): string | undefined { 
    if (this.chessBoard.gameOverMessage) {
      this.gameState = 'finished';
      this.showResultOverlay = true;
    }
    return this.chessBoard.gameOverMessage; 
  }

  private selectedSquare: SelectedSquare = { piece: null };
  private pieceSafeSquares: Coords[] = [];
  private lastMove: LastMove | undefined;
  private checkState: CheckState = { isInCheck: false };

  public get moveList(): MoveList { return this.chessBoard.moveList; };
  public get gameHistory(): GameHistory { return this.chessBoard.gameHistory; };
  public gameHistoryPointer: number = 0;

  // promotion properties
  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: FENChar | null = null;
  public promotionPieces(): FENChar[] {
    return this.playerColor === Color.White ?
      [FENChar.WhiteKnight, FENChar.WhiteBishop, FENChar.WhiteRook, FENChar.WhiteQueen] :
      [FENChar.BlackKnight, FENChar.BlackBishop, FENChar.BlackRook, FENChar.BlackQueen];
  }

  public flipMode: boolean = false;
  private subscriptions$ = new Subscription();

  // Добавлено свойство для управления отображением оверлея результата
  public showResultOverlay = true;
  public hintText: string | null = null;
  public hintFrom: { x: number, y: number } | null = null;
  public hintTo: { x: number, y: number } | null = null;
  public hintIsCapture: boolean = false;

  constructor(protected chessBoardService: ChessBoardService, protected stockfish: StockfishService) { }

  public ngOnInit(): void {
    // Предупреждение о перезагрузке страницы во время игры
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    const keyEventSubscription$: Subscription = fromEvent<KeyboardEvent>(document, "keyup")
      .pipe(
        filter(event => event.key === "ArrowRight" || event.key === "ArrowLeft"),
        tap(event => {
          switch (event.key) {
            case "ArrowRight":
              if (this.gameHistoryPointer === this.gameHistory.length - 1) return;
              this.gameHistoryPointer++;
              break;
            case "ArrowLeft":
              if (this.gameHistoryPointer === 0) return;
              this.gameHistoryPointer--;
              break;
            default:
              break;
          }

          this.showPreviousPosition(this.gameHistoryPointer);
        })
      )
      .subscribe();

    this.subscriptions$.add(keyEventSubscription$);
    this.showResultOverlay = true;
  }

  public ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.subscriptions$.unsubscribe();
    this.chessBoardService.chessBoardState$.next(FENConverter.initalPosition);
  }

  public flipBoard(): void {
    this.flipMode = !this.flipMode;
  }

  public isSquareDark(x: number, y: number): boolean {
    return ChessBoard.isSquareDark(x, y);
  }

  public isSquareSelected(x: number, y: number): boolean {
    if (!this.selectedSquare.piece) return false;
    return this.selectedSquare.x === x && this.selectedSquare.y === y;
  }

  public isSquareSafeForSelectedPiece(x: number, y: number): boolean {
    return this.pieceSafeSquares.some(coords => coords.x === x && coords.y === y);
  }

  public isSquareLastMove(x: number, y: number): boolean {
    if (!this.lastMove) return false;
    const { prevX, prevY, currX, currY } = this.lastMove;
    return x === prevX && y === prevY || x === currX && y === currY;
  }

  public isSquareChecked(x: number, y: number): boolean {
    return this.checkState.isInCheck && this.checkState.x === x && this.checkState.y === y;
  }

  public isSquarePromotionSquare(x: number, y: number): boolean {
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === x && this.promotionCoords.y === y;
  }

  private unmarkingPreviouslySlectedAndSafeSquares(): void {
    this.selectedSquare = { piece: null };
    this.pieceSafeSquares = [];

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotedPiece = null;
      this.promotionCoords = null;
    }
  }

  private selectingPiece(x: number, y: number): void {
    if (this.gameOverMessage !== undefined) return;
    const piece: FENChar | null = this.chessBoardView[x][y];
    if (!piece) return;
    if (this.isWrongPieceSelected(piece)) return;

    const isSameSquareClicked: boolean = !!this.selectedSquare.piece && this.selectedSquare.x === x && this.selectedSquare.y === y;
    this.unmarkingPreviouslySlectedAndSafeSquares();
    if (isSameSquareClicked) return;

    this.selectedSquare = { piece, x, y };
    this.pieceSafeSquares = this.safeSquares.get(x + "," + y) || [];
  }

  private placingPiece(newX: number, newY: number): void {
    if (!this.selectedSquare.piece) return;
    if (!this.isSquareSafeForSelectedPiece(newX, newY)) return;

    // pawn promotion
    const isPawnSelected: boolean = this.selectedSquare.piece === FENChar.WhitePawn || this.selectedSquare.piece === FENChar.BlackPawn;
    const isPawnOnlastRank: boolean = isPawnSelected && (newX === 7 || newX === 0);
    const shouldOpenPromotionDialog: boolean = !this.isPromotionActive && isPawnOnlastRank;

    if (shouldOpenPromotionDialog) {
      this.pieceSafeSquares = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      // because now we wait for player to choose promoted piece
      return;
    }

    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  protected updateBoard(prevX: number, prevY: number, newX: number, newY: number, promotedPiece: FENChar | null): void {
    this.chessBoard.move(prevX, prevY, newX, newY, promotedPiece);
    this.chessBoardView = this.chessBoard.chessBoardView;
    this.markLastMoveAndCheckState(this.chessBoard.lastMove, this.chessBoard.checkState ?? { isInCheck: false });
    this.unmarkingPreviouslySlectedAndSafeSquares();
    this.chessBoardService.chessBoardState$.next(this.chessBoard.boardAsFEN ?? "");
    this.gameHistoryPointer++;
  }

  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedSquare.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  public closePawnPromotionDialog(): void {
    this.unmarkingPreviouslySlectedAndSafeSquares();
  }

  private markLastMoveAndCheckState(lastMove: LastMove | undefined, checkState: CheckState): void {
    this.lastMove = lastMove;
    this.checkState = checkState;

    if (this.lastMove)
      this.moveSound(this.lastMove.moveType);
    else
      this.moveSound(new Set<MoveType>([MoveType.BasicMove]));
  }
  public move(x: number, y: number): void {
    if (this.gameHistoryPointer !== this.chessBoard.gameHistory.length - 1) {
        this.chessBoard.restoreFromHistory(this.chessBoard.gameHistory.length - 1);
        this.chessBoardView = this.chessBoard.chessBoardView;
        this.gameHistoryPointer = this.chessBoard.gameHistory.length - 1;
        // Сбросить состояние окончания игры
        this.gameState = 'in_progress';
        // Сбросить подсветку шаха/мата
        this.markLastMoveAndCheckState(this.chessBoard.lastMove, this.chessBoard.checkState);
        // Сбросить выделения и подсказки
        this.unmarkingPreviouslySlectedAndSafeSquares();
        this.hintFrom = null;
        this.hintTo = null;
        this.hintIsCapture = false;
        return;
    }

    this.selectingPiece(x, y);
    this.placingPiece(x, y);
    this.hintFrom = null;
    this.hintTo = null;
}

  private isWrongPieceSelected(piece: FENChar): boolean {
    const isWhitePieceSelected: boolean = piece === piece.toUpperCase();
    return isWhitePieceSelected && this.playerColor === Color.Black ||
      !isWhitePieceSelected && this.playerColor === Color.White;
  }

  public showPreviousPosition(moveIndex: number): void {
    this.chessBoard.restoreFromHistory(moveIndex);
    this.chessBoardView = this.chessBoard.chessBoardView;
    this.gameHistoryPointer = moveIndex;
    this.unmarkingPreviouslySlectedAndSafeSquares();
    this.hintFrom = null;
    this.hintTo = null;
    this.hintIsCapture = false;
    this.markLastMoveAndCheckState(this.chessBoard.lastMove, this.chessBoard.checkState);

    this.gameState = 'in_progress';
    (this as any).gameOverMessage = undefined;
  }

  public onUndoLastMove(): void {
    const moveSound = new Audio("assets/sound/move.mp3");
    moveSound.play();

    this.chessBoard.undoMove();
    this.chessBoard.undoMove();
    this.chessBoardView = this.chessBoard.chessBoardView;
    this.unmarkingPreviouslySlectedAndSafeSquares();
    this.hintFrom = null;
    this.hintTo = null;
    this.hintIsCapture = false;
    this.gameHistoryPointer = this.chessBoard.gameHistory.length - 1;
    this.checkState = this.chessBoard.checkState;
  }
  
  private moveSound(moveType: Set<MoveType>): void {
    const moveSound = new Audio("assets/sound/move.mp3");

    if (moveType.has(MoveType.Promotion)) moveSound.src = "assets/sound/promote.mp3";
    else if (moveType.has(MoveType.Capture)) moveSound.src = "assets/sound/capture.mp3";
    else if (moveType.has(MoveType.Castling)) moveSound.src = "assets/sound/castling.mp3";

    if (moveType.has(MoveType.CheckMate)) moveSound.src = "assets/sound/checkmate.mp3";
    else if (moveType.has(MoveType.Check)) moveSound.src = "assets/sound/check.mp3";

    moveSound.play();
  }

  public isAttackOnEnemyPiece(x: number, y: number): boolean {
    const piece = this.chessBoardView[x][y];
    if (!piece || !this.selectedSquare.piece) return false;
    // Проверяем, что фигура вражеская и клетка входит в safeSquares выбранной фигуры
    const isEnemy = (piece === piece.toUpperCase()) !== (this.selectedSquare.piece === this.selectedSquare.piece.toUpperCase());
    return isEnemy && this.isSquareSafeForSelectedPiece(x, y);
  }

  public hideResultOverlay(): void {
    this.showResultOverlay = false;
  }

  public getColumnLetter(index: number): string {
    return String.fromCharCode(65 + index); // 65 = 'A'
  }

  public onShowHint(): void {
    this.hintFrom = null;
    this.hintTo = null;
    this.hintIsCapture = false;
    const fen = this.chessBoard.boardAsFEN;
    this.stockfish.getBestMove(fen).subscribe(move => {
      if (!move) return;
      this.hintFrom = { x: move.prevX, y: move.prevY };
      this.hintTo = { x: move.newX, y: move.newY };
      const toPiece = this.chessBoardView[move.newX][move.newY];
      const fromPiece = this.chessBoardView[move.prevX][move.prevY];
      if (toPiece && fromPiece && ((toPiece === toPiece.toUpperCase()) !== (fromPiece === fromPiece.toUpperCase()))) {
        this.hintIsCapture = true;
      }
    });
  }
  public isHintCapture(x: number, y: number): boolean {
    return !!this.hintIsCapture && !!this.hintTo && this.hintTo.x === x && this.hintTo.y === y;
  }
  public isHintFrom(x: number, y: number): boolean {
    return !!this.hintFrom && this.hintFrom.x === x && this.hintFrom.y === y;
  }
  public isHintTo(x: number, y: number): boolean {
    return !!this.hintTo && this.hintTo.x === x && this.hintTo.y === y;
  }

  private beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    if (this.gameState === 'in_progress') {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
    return undefined;
  };
}
