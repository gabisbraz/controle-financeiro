// Finance Control - Dashboard JavaScript

const API_BASE = 'http://localhost:3000/tables';

// Global state
let entradas = [];
let saidas = [];
let filteredEntradas = [];
let filteredSaidas = [];
let currentPeriod = 'semester';
let charts = {};

// Colors for charts
const colors = {
    emerald: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
    red: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'],
    blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
    purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
    categories: [
        '#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Apply active state to 6 months button on page load
    document.getElementById('btnSemester').classList.add('active');
    
    await loadAllData();
    await loadCartaoMeses(); // Carrega os meses do cartão
    initCharts();
    updateDashboard();
});

// Load all data
async function loadAllData() {
    try {
        const [entradasRes, saidasRes] = await Promise.all([
            fetch(`${API_BASE}/entradas`),
            fetch(`${API_BASE}/saidas`)
        ]);
        
        const entradasData = await entradasRes.json();
        const saidasData = await saidasRes.json();
        
        entradas = entradasData.data || [];
        saidas = saidasData.data || [];
        
        applyFilter();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Set period filter
function setPeriod(period) {

    if (currentPeriod === period) {
        currentPeriod = 'all';
        document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btnAll')?.classList.add('active');
        applyFilter(); // mostra todos os dados
        updateDashboard();
        return;
    }

    currentPeriod = period;
    
    // Update button styles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn${period.charAt(0).toUpperCase() + period.slice(1)}`).classList.add('active');
    
    applyFilter();
    updateDashboard();
}

// Apply custom period
function applyCustomPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Por favor, selecione as datas inicial e final.');
        return;
    }
    
    currentPeriod = 'custom';
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    
    applyFilter(startDate, endDate);
    updateDashboard();
}

// Apply filter to data
function applyFilter(customStart = null, customEnd = null) {
    const now = new Date();
    let startDate, endDate;
    
    if ((currentPeriod === 'custom' || currentPeriod === 'cartao') && customStart && customEnd) {
        if (!customStart || !customEnd) return;
        startDate = new Date(customStart + 'T00:00:00');
        endDate = new Date(customEnd + 'T23:59:59');
    } else {
        switch (currentPeriod) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'quarter':
                // Mês atual + 2 últimos meses (3 meses total)
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'semester':
                // Mês atual + 5 últimos meses (6 meses total)
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            default: // 'all'
                filteredEntradas = [...entradas];
                filteredSaidas = [...saidas];
                return;
        }
    }
    
    filteredEntradas = entradas.filter(e => {
        const date = new Date(e.data + 'T00:00:00');
        return date >= startDate && date <= endDate;
    });
    
    filteredSaidas = saidas.filter(s => {
        const date = new Date(s.data + 'T00:00:00');
        return date >= startDate && date <= endDate;
    });
}

// Update all dashboard elements
function updateDashboard() {
    updateSummaryCards();
    updateCharts();
    updateRecentTransactions();
}

// Update summary cards
function updateSummaryCards() {
    const totalEntradas = filteredEntradas.reduce((sum, e) => sum + (parseFloat(e.valor) || 0), 0);
    const totalSaidas = filteredSaidas.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    const saldo = totalEntradas - totalSaidas;
    const taxaEconomia = totalEntradas > 0 ? ((totalEntradas - totalSaidas) / totalEntradas * 100) : 0;
    
    document.getElementById('totalEntradas').textContent = formatCurrency(totalEntradas);
    document.getElementById('totalSaidas').textContent = formatCurrency(totalSaidas);
    
    const saldoEl = document.getElementById('saldo');
    saldoEl.textContent = formatCurrency(saldo);
    saldoEl.className = `text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`;
    
    const taxaEl = document.getElementById('taxaEconomia');
    taxaEl.textContent = `${taxaEconomia.toFixed(1)}%`;
    taxaEl.className = `text-2xl font-bold ${taxaEconomia >= 0 ? 'text-purple-600' : 'text-red-600'}`;
}

// Initialize all charts
function initCharts() {
    // Entradas vs Saídas Bar Chart
    charts.entradasSaidas = new Chart(document.getElementById('chartEntradasSaidas'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Entradas',
                    data: [],
                    backgroundColor: colors.emerald[0],
                    borderRadius: 4
                },
                {
                    label: 'Saídas',
                    data: [],
                    backgroundColor: colors.red[0],
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });

    // Fluxo de Caixa Line Chart
    charts.fluxoCaixa = new Chart(document.getElementById('chartFluxoCaixa'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Saldo Acumulado',
                data: [],
                borderColor: colors.blue[0],
                backgroundColor: colors.blue[4],
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });

    // Saídas por Categoria Doughnut
    charts.saidasCategoria = new Chart(document.getElementById('chartSaidasCategoria'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: colors.categories,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });

    // Entradas por Categoria Doughnut
    charts.entradasCategoria = new Chart(document.getElementById('chartEntradasCategoria'), {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: colors.categories,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });

    // Tipo de Pagamento Pie Chart
    charts.tipoPagamento = new Chart(document.getElementById('chartTipoPagamento'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: colors.categories,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.label}: ${formatCurrency(context.raw)}`
                    }
                }
            }
        }
    });

    // Top Lojas Horizontal Bar Chart
    charts.topLojas = new Chart(document.getElementById('chartTopLojas'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Gasto',
                data: [],
                backgroundColor: colors.categories,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => formatCurrency(context.raw)
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatCurrency(value)
                    }
                }
            }
        }
    });
}

// Update all charts with filtered data
function updateCharts() {
    // Get monthly data
    const monthlyData = getMonthlyData();
    
    // Update Entradas vs Saídas
    charts.entradasSaidas.data.labels = monthlyData.labels;
    charts.entradasSaidas.data.datasets[0].data = monthlyData.entradas;
    charts.entradasSaidas.data.datasets[1].data = monthlyData.saidas;
    charts.entradasSaidas.update();
    
    // Update Fluxo de Caixa
    charts.fluxoCaixa.data.labels = monthlyData.labels;
    charts.fluxoCaixa.data.datasets[0].data = monthlyData.saldoAcumulado;
    charts.fluxoCaixa.update();
    
    // Update Saídas por Categoria
    const saidasPorCategoria = groupByField(filteredSaidas, 'categoria');
    charts.saidasCategoria.data.labels = saidasPorCategoria.labels;
    charts.saidasCategoria.data.datasets[0].data = saidasPorCategoria.values;
    charts.saidasCategoria.update();
    
    // Update Entradas por Categoria
    const entradasPorCategoria = groupByField(filteredEntradas, 'categoria');
    charts.entradasCategoria.data.labels = entradasPorCategoria.labels;
    charts.entradasCategoria.data.datasets[0].data = entradasPorCategoria.values;
    charts.entradasCategoria.update();
    
    // Update Tipo de Pagamento
    const tipoPagamento = groupByField(filteredSaidas, 'tipo_pagamento');
    charts.tipoPagamento.data.labels = tipoPagamento.labels;
    charts.tipoPagamento.data.datasets[0].data = tipoPagamento.values;
    charts.tipoPagamento.update();
    
    // Update Top Lojas
    const topLojas = getTopLojas(10);
    charts.topLojas.data.labels = topLojas.labels;
    charts.topLojas.data.datasets[0].data = topLojas.values;
    charts.topLojas.update();
}

// Get monthly aggregated data
function getMonthlyData() {
    const monthlyEntradas = {};
    const monthlySaidas = {};
    
    // Aggregate entradas by month
    filteredEntradas.forEach(e => {
        const date = new Date(e.data + 'T00:00:00');
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyEntradas[key] = (monthlyEntradas[key] || 0) + (parseFloat(e.valor) || 0);
    });
    
    // Aggregate saidas by month
    filteredSaidas.forEach(s => {
        const date = new Date(s.data + 'T00:00:00');
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlySaidas[key] = (monthlySaidas[key] || 0) + (parseFloat(s.valor) || 0);
    });
    
    // Get all unique months and sort them
    const allMonths = [...new Set([...Object.keys(monthlyEntradas), ...Object.keys(monthlySaidas)])].sort();
    
    // Format labels and calculate cumulative balance
    const labels = allMonths.map(m => {
        const [year, month] = m.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
    });
    
    const entradas = allMonths.map(m => monthlyEntradas[m] || 0);
    const saidas = allMonths.map(m => monthlySaidas[m] || 0);
    
    // Calculate cumulative balance
    let cumulative = 0;
    const saldoAcumulado = allMonths.map((m, i) => {
        cumulative += (entradas[i] - saidas[i]);
        return cumulative;
    });
    
    return { labels, entradas, saidas, saldoAcumulado };
}

// Group data by a field
function groupByField(data, field) {
    const grouped = {};
    
    data.forEach(item => {
        const key = item[field] || 'Outros';
        grouped[key] = (grouped[key] || 0) + (parseFloat(item.valor) || 0);
    });
    
    // Sort by value descending
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    
    return {
        labels: sorted.map(([label]) => label),
        values: sorted.map(([, value]) => value)
    };
}

// Get top lojas by total spent
function getTopLojas(limit = 10) {
    const grouped = {};
    
    filteredSaidas.forEach(s => {
        const key = s.loja || 'Outros';
        grouped[key] = (grouped[key] || 0) + (parseFloat(s.valor) || 0);
    });
    
    // Sort and limit
    const sorted = Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    
    return {
        labels: sorted.map(([label]) => label),
        values: sorted.map(([, value]) => value)
    };
}

// Update recent transactions table
function updateRecentTransactions() {
    const tbody = document.getElementById('tabelaTransacoes');
    
    // Combine and sort all transactions
    const allTransactions = [
        ...filteredEntradas.map(e => ({
            ...e,
            tipo: 'entrada',
            descricaoFull: e.descricao || e.categoria
        })),
        ...filteredSaidas.map(s => ({
            ...s,
            tipo: 'saida',
            descricaoFull: `${s.loja} - ${s.descricao}`
        }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data))
    
    if (allTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma transação encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allTransactions.map(t => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(t.data)}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    <i class="fas ${t.tipo === 'entrada' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1"></i>
                    ${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">${t.descricaoFull}</td>
            <td class="px-4 py-3 text-sm">
                ${t.parcelas > 1 
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <i class="fas fa-layer-group mr-1"></i>
                        ${t.parcela_atual}/${t.parcelas}
                       </span>` 
                    : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-red-500'}"></i>
                    ${t.categoria}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">
                ${t.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(t.valor)}
            </td>
        </tr>
    `).join('');
}

// Update recent transactions table with parcela info
function updateRecentTransactionsOld() {
    const tbody = document.getElementById('tabelaTransacoes');
    
    // Combine and sort all transactions
    const allTransactions = [
        ...filteredEntradas.map(e => ({
            ...e,
            tipo: 'entrada',
            descricaoFull: e.descricao || e.categoria
        })),
        ...filteredSaidas.map(s => ({
            ...s,
            tipo: 'saida',
            descricaoFull: `${s.loja} - ${s.descricao}`,
            parcelaInfo: s.parcelas > 1 ? ` (${s.parcela_atual}/${s.parcelas})` : ''
        }))
    ].sort((a, b) => new Date(b.data) - new Date(a.data))
    
    if (allTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma transação encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allTransactions.map(t => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(t.data)}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    <i class="fas ${t.tipo === 'entrada' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1"></i>
                    ${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">${t.descricaoFull}${t.parcelaInfo || ''}</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-red-500'}"></i>
                    ${t.categoria}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}">
                ${t.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(t.valor)}
            </td>
        </tr>
    `).join('');
}

async function loadCartaoMeses() {
    try {
        // Buscar dados do cartão para saber o dia de vencimento
        const res = await fetch('http://localhost:3000/cartao');
        const cartao = await res.json();
        
        // Buscar todos os meses únicos das tabelas de entradas e saídas
        const allDates = new Set();
        
        // Adicionar datas da tabela entradas
        entradas.forEach(e => {
            if (e.data) allDates.add(e.data.substring(0, 7)); // YYYY-MM
        });
        
        // Adicionar datas da tabela saidas
        saidas.forEach(s => {
            if (s.data) allDates.add(s.data.substring(0, 7)); // YYYY-MM
        });
        
        // Converter para array e ordenar
        const uniqueMonths = Array.from(allDates).sort();
        
        const select = document.getElementById('cartaoMes');
        select.innerHTML = '<option value="">Todos</option>';
        
        // Adicionar opções para cada mês único
        uniqueMonths.forEach(monthStr => {
            const [year, month] = monthStr.split('-');
            const optionValue = monthStr;
            const optionText = `${String(month).padStart(2, '0')}/${year}`;
            const option = document.createElement('option');
            option.value = optionValue;
            option.text = optionText;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar meses do cartão:', error);
    }
}

let currentCartaoMonth = null;

async function applyCartaoPeriod() {
    try {
        // Buscar dados do cartão para saber o dia de vencimento
        const res = await fetch('http://localhost:3000/cartao');
        const cartao = await res.json();
        
        const diaVencimento = cartao ? parseInt(cartao.dia_vencimento) : 10; // Default para 10 se não configurado
        
        const select = document.getElementById('cartaoMes');
        const selectedMonth = select.value;

        // Se "Todos" for selecionado, remove o filtro do cartão
        if (!selectedMonth) {
            currentCartaoMonth = null;
            // Restaurar filtro do período atual (semestre)
            document.getElementById('btnSemester').classList.add('active');
            applyFilter();
            updateDashboard();
            return;
        }

        currentCartaoMonth = selectedMonth;

        // Filtrar baseado no vencimento do cartão
        const [year, month] = currentCartaoMonth.split('-'); // formato: "YYYY-MM"
        const startDate = new Date(year, parseInt(month) - 1, diaVencimento + 1);
        const endDate = new Date(year, parseInt(month), diaVencimento);

        console.log(`Filtrando de ${startDate.toISOString()} até ${endDate.toISOString()}`);
        
        // Filtrar entradas e saídas baseado no período do cartão
        filteredEntradas = entradas.filter(e => {
            const date = new Date(e.data + 'T00:00:00');
            return date >= startDate && date <= endDate;
        });

        filteredSaidas = saidas.filter(s => {
            const date = new Date(s.data + 'T00:00:00');
            return date >= startDate && date <= endDate;
        });

        updateDashboard();
    } catch (error) {
        console.error('Erro ao aplicar filtro do cartão:', error);
    }
}
