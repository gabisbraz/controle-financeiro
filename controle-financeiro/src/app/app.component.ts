// app.component.ts
import { Component } from '@angular/core';
import { TransacoesComponent } from './transacoes/transacoes.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatButtonModule, TransacoesComponent, DashboardComponent],
  template: `
    <div style="padding:20px; background:var(--cor-fundo); min-height:100vh;">
      <div class="nav" style="max-width:1100px;margin:0 auto 18px;display:flex;gap:8px;">
        <button mat-stroked-button (click)="view='transacoes'">Transações</button>
        <button mat-stroked-button (click)="view='dashboard'">Dashboard</button>
      </div>

      <div *ngIf="view === 'transacoes'">
        <app-transacoes></app-transacoes>
      </div>

      <div *ngIf="view === 'dashboard'">
        <app-dashboard></app-dashboard>
      </div>
    </div>
  `
})
export class AppComponent {
  view: 'transacoes' | 'dashboard' = 'transacoes';
}
