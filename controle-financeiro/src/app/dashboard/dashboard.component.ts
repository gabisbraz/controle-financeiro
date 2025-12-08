import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { TransacoesService } from '../services/transacoes.service';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, NgxEchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  transacoes: any[] = [];

  chartPie!: EChartsOption;
  chartLine!: EChartsOption;
  chartBar!: EChartsOption;

  constructor(private transacoesService: TransacoesService) {}

  ngOnInit() {
    this.transacoesService.transacoes$.subscribe(lista => {
      this.transacoes = lista;
      this.updateCharts();
    });
  }

  updateCharts() {
    this.chartPie = this.buildPie();
    this.chartLine = this.buildLine();
    this.chartBar = this.buildBar();
  }

  // -------------- PIE: Entradas vs Saídas ------------------
  buildPie(): EChartsOption {
    const entradas = this.transacoes
      .filter(t => t.tipo === 'entrada')
      .reduce((s, t) => s + t.valor, 0);

    const saidas = this.transacoes
      .filter(t => t.tipo === 'saida')
      .reduce((s, t) => s + t.valor, 0);

    return {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: [
            { value: entradas, name: 'Entradas' },
            { value: saidas, name: 'Saídas' }
          ]
        }
      ]
    };
  }

  // -------------- LINE: Saldo diário -----------------------
  buildLine(): EChartsOption {
    const sorted = [...this.transacoes].sort((a, b) =>
      a.data.localeCompare(b.data)
    );

    let saldo = 0;
    const labels: string[] = [];
    const valores: number[] = [];

    sorted.forEach(t => {
      saldo += t.tipo === 'entrada' ? t.valor : -t.valor;
      labels.push(t.data);
      valores.push(saldo);
    });

    return {
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'axis' },
      series: [
        {
          data: valores,
          type: 'line',
          smooth: true,
        }
      ]
    };
  }

  // -------------- BAR: Total por mês -----------------------
  buildBar(): EChartsOption {
    const meses: Record<string, number> = {};

    this.transacoes.forEach(t => {
      const mes = t.data.slice(0, 7); // YYYY-MM
      meses[mes] = (meses[mes] || 0) + (t.tipo === 'entrada' ? t.valor : -t.valor);
    });

    const labels = Object.keys(meses).sort();
    const valores = labels.map(m => meses[m]);

    return {
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'axis' },
      series: [
        {
          type: 'bar',
          data: valores
        }
      ]
    };
  }
}
