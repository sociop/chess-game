import { Component } from '@angular/core';
import { NavMenuComponent } from './modules/nav-menu/nav-menu.component';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PlayAgainstComputerDialogComponent } from './modules/play-against-computer-dialog/play-against-computer-dialog.component';
import { Router } from '@angular/router';
import { StockfishService } from './modules/computer-mode/stockfish.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [NavMenuComponent, CommonModule]
})
export class AppComponent {
  title = 'chess-game';
  public gameState: 'not_started' | 'in_progress' | 'finished' = 'not_started';

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private stockfishService: StockfishService
  ) {}

  public playAgainstComputer(): void {
    const dialogRef = this.dialog.open(PlayAgainstComputerDialogComponent);
    dialogRef.componentInstance.gameStarted.subscribe(() => {
      console.log('Game started event received');
      this.gameState = 'in_progress';
      console.log('Game state changed to:', this.gameState);
    });
  }

  public playAgain(): void {
    this.stockfishService.resetConfiguration();
    this.gameState = 'not_started';
    this.router.navigate(['/']);
  }
}
