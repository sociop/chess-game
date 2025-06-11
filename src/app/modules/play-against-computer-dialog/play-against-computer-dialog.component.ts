import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StockfishService } from '../computer-mode/stockfish.service';
import { Color } from 'src/app/chess-logic/models';
import { Router } from '@angular/router';

export interface StockfishLevelOption {
  level: number;
  label: string;
  elo: number;
}

@Component({
  selector: 'app-play-against-computer-dialog',
  templateUrl: './play-against-computer-dialog.component.html',
  styleUrls: ['./play-against-computer-dialog.component.css'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, CommonModule, MatFormFieldModule, MatSelectModule]
})
export class PlayAgainstComputerDialogComponent {
  public stockfishLevels: readonly StockfishLevelOption[] = [
    { level: 1, label: 'Новачок', elo: 1600 },
    { level: 2, label: 'Продвинутий', elo: 1800 },
    { level: 3, label: 'Сильний', elo: 2000 },
    { level: 4, label: 'Мастер', elo: 2300 },
    { level: 5, label: 'Гроссмейстер', elo: 3000 }
  ];
  public stockfishLevel: StockfishLevelOption = this.stockfishLevels[0];
  @Output() gameStarted = new EventEmitter<void>();

  constructor(
    private stockfishService: StockfishService,
    private dialog: MatDialog,
    private router: Router,
    private dialogRef: MatDialogRef<PlayAgainstComputerDialogComponent>
  ) {}

  public selectStockfishLevel(level: StockfishLevelOption): void {
    this.stockfishLevel = level;
  }

  public play(color: "w" | "b"): void {
    this.dialog.closeAll();
    this.stockfishService.computerConfiguration$.next({
      color: color === "w" ? Color.Black : Color.White,
      level: this.stockfishLevel.level
    });
    this.gameStarted.emit();
    this.router.navigate(["against-computer"]);
  }

  public closeDialog(): void {
    this.router.navigate(["/"]);
  }
}
