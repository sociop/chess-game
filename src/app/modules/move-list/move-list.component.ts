import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { MoveList } from 'src/app/chess-logic/models';

@Component({
  selector: 'app-move-list',
  templateUrl: './move-list.component.html',
  styleUrls: ['./move-list.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule]
})
export class MoveListComponent {
  @Input({ required: true }) public moveList!: MoveList;
  @Input({ required: true }) public gameHistoryPointer: number = 0;
  @Input({ required: true }) public gameHistoryLength: number = 1;
  @Input() public hintText: string | null = null;
  @Output() public showPreviousPositionEvent = new EventEmitter<number>();
  @Output() public flipBoard = new EventEmitter<void>();
  @Output() public showHint = new EventEmitter<void>();
  @Output() public undoLastMove = new EventEmitter<void>();

  public showPreviousPosition(moveIndex: number): void {
    this.showPreviousPositionEvent.emit(moveIndex);
  }

  public getVisibleMovesCount(): number {
    return Math.ceil(this.gameHistoryPointer / 2);
  }
}
