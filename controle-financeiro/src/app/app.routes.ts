import { Routes } from '@angular/router';
import { ExpensesComponent } from './expenses/expenses.component';

export const routes: Routes = [
  { path: '', component: ExpensesComponent },
  { path: '**', redirectTo: '' }
];
