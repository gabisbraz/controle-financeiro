import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
// import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { ExpenseService } from '../services/expense.service';
import { Expense } from '../models/expense';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDialogModule,
    AgGridModule
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesComponent implements OnInit {
  expenses$ = new BehaviorSubject<Expense[]>([]);
  expenseForm: FormGroup;
  private gridApi!: GridApi;
  columnDefs: ColDef[] = [
    { field: 'data', headerName: 'Data', sortable: true, filter: true },
    { field: 'loja', headerName: 'Loja', sortable: true, filter: true },
    { field: 'descricao', headerName: 'Descrição', sortable: true, filter: true },
    { field: 'categoria', headerName: 'Categoria', sortable: true, filter: true },
    { field: 'preco', headerName: 'Preço', sortable: true, filter: 'agNumberColumnFilter', valueFormatter: (params: any) => `R$ ${params.value?.toFixed(2)}` },
    { field: 'pagamento', headerName: 'Pagamento', sortable: true, filter: true },
    { headerName: 'Ações', cellRenderer: this.actionCellRenderer.bind(this), width: 120 }
  ];
  defaultColDef = { flex: 1, minWidth: 100, resizable: true };

  categories = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outro'];

  constructor(
    private expenseService: ExpenseService,
    private fb: FormBuilder,
// private dialog: MatDialog
  ) {
    this.expenseForm = this.fb.group({
      data: ['', Validators.required],
      loja: ['', Validators.required],
      descricao: ['', Validators.required],
      categoria: ['', Validators.required],
      preco: [0, [Validators.required, Validators.min(0)]],
      pagamento: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadExpenses();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  loadExpenses() {
    this.expenseService.getExpenses().subscribe({
      next: (expenses) => this.expenses$.next(expenses),
      error: (err) => console.error('Erro ao carregar despesas', err)
    });
  }

  openForm(expense?: Expense) {
    if (expense) {
      this.expenseForm.patchValue(expense);
    } else {
      this.expenseForm.reset();
    }
    // Simplified: use inline form or implement MatDialog properly
    // For brevity, using form in component
  }

  saveExpense() {
    if (this.expenseForm.valid) {
      const expense = this.expenseForm.value;
      if (expense.id) {
        this.expenseService.updateExpense(expense.id, expense).subscribe({
          next: () => {
            this.loadExpenses();
            this.expenseForm.reset();
          }
        });
      } else {
        this.expenseService.createExpense(expense).subscribe({
          next: () => {
            this.loadExpenses();
            this.expenseForm.reset();
          }
        });
      }
    }
  }

  deleteExpense(id: number) {
    if (confirm('Confirma exclusão?')) {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => this.loadExpenses()
      });
    }
  }

  actionCellRenderer(params: any) {
    return `
      <button mat-raised-button color="primary" (click)="editExpense(${params.data.id})" style="margin-right: 5px;">Editar</button>
      <button mat-raised-button color="warn" (click)="deleteExpense(${params.data.id})">Excluir</button>
    `;
  }
}
