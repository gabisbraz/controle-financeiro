import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { TransacoesService } from '../services/transacoes.service';
import { Transacao } from '../models/transaction.model';

@Component({
  selector: 'app-transacoes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatListModule,
    MatIconModule
  ],
  templateUrl: './transacoes.component.html',
  styleUrls: ['./transacoes.component.css']
})
export class TransacoesComponent {
  tipo: 'entrada' | 'saida' = 'entrada';
  categoria = '';
  valor: number | null = null;
  data: string = new Date().toISOString().slice(0, 10);
  loja = '';
  descricao = '';
  tipoPagamento: string = '';

  categoriasEntrada = ['salário', 'juros', 'bônus', '13', 'pagamento externo'];
  categoriasSaida = ['alimentacao', 'transporte', 'roupa', 'autocuidado', 'presente', 'pagamento'];
  tiposPagamento = ['credito', 'debito', 'pix'];

  constructor(private service: TransacoesService) {}

  get lista(): Transacao[] {
    return this.service.listarTransacoes();
  }

  adicionar() {
    if (!this.categoria || !this.valor || this.valor <= 0) {
      alert('Preencha corretamente.');
      return;
    }

    const transacao: Transacao = {
      tipo: this.tipo,
      categoria: this.categoria,
      valor: this.valor,
      data: this.data
    };

    if (this.tipo === 'saida') {
      transacao.loja = this.loja;
      transacao.descricao = this.descricao;
      transacao.tipoPagamento = this.tipoPagamento as any;
    }

    this.service.adicionarTransacao(transacao);

    this.valor = null;
    this.categoria = '';
    this.data = new Date().toISOString().slice(0, 10);
    this.loja = '';
    this.descricao = '';
    this.tipoPagamento = '';
  }

  remover(id: number) {
    if (confirm('Remover transação?')) {
      this.service.removerTransacao(id);
    }
  }

  limparTudo() {
    if (confirm('Deseja remover todas?')) {
      this.service.limparTudo();
    }
  }

  totalPorTipo(tipo: 'entrada' | 'saida') {
    return this.lista
      .filter(t => t.tipo === tipo)
      .reduce((s, t) => s + t.valor, 0);
  }

  saldo() {
    return this.totalPorTipo('entrada') - this.totalPorTipo('saida');
  }
}
