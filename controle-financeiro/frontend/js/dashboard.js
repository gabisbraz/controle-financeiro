// Finance Control - Dashboard JavaScript

const API_BASE = 'http://localhost:3000/tables';

// Global state
let entradas = [];
let saidas = [];
let filteredEntradas = [];
let filteredSaidas = [];
let currentPeriod = 'semester';
let charts = {};
let deleteTarget = { type: null, id: null };

// Dados para os selects do modal de edição
let categoriasSaida = [];
let tiposPagamento = [];
let lojas = [];

// Cartões cadastrados
let cartoes = [];

// Filtros dinâmicos da tabela de saídas
let filtroTabelaLoja = '';
let filtroTabelaCategoria = '';
let filtroTabelaTipoPagamento = '';
let filtroTabelaFatura = '';

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
    // Apply active state to This Month button on page load
    currentPeriod = 'month';
    document.getElementById('btnMonth').classList.add('active');
    
    // Hide monthly charts since "Este Mês" is selected by default
    toggleMonthlyCharts();
    
    await loadAllData();
    await loadCartaoMeses(); // Carrega os meses do cartão
    await carregarCategoriasEntrada(); // Carregar categorias de entrada do banco de dados
    initCharts();
    updateDashboard();
    
    // Setup event listeners for modals
    setupModalListeners();
});

// Setup modal event listeners
function setupModalListeners() {
    // Delete modal buttons
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
    
    // Close modal on backdrop click
    const modalDelete = document.getElementById('modalDelete');
    modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) closeDeleteModal();
    });
    
    // Edit forms
    document.getElementById('formEditarSaida').addEventListener('submit', handleEditSaidaSubmit);
    document.getElementById('formEditarEntrada').addEventListener('submit', handleEditEntradaSubmit);
}

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
        
        // Carregar filtros dinâmicos da tabela de saídas
        carregarFiltrosDinamicosTabela();
        
        // Atualizar contagem inicial
        atualizarContagemFiltrada();
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

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toastIcon.className = 'fas fa-exclamation-circle';
    }
    
    toast.classList.remove('hidden', 'translate-y-full', 'opacity-0');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('show');
        }, 300);
    }, 3000);
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
    
    // Toggle charts visibility based on period
    toggleMonthlyCharts();
    
    applyFilter();
    updateDashboard();
}

// Toggle visibility of monthly charts (Entradas vs Saídas por Mês and Fluxo de Caixa)
function toggleMonthlyCharts() {
    const chartsRow1 = document.getElementById('chartsRow1');
    if (chartsRow1) {
        if (currentPeriod === 'month') {
            chartsRow1.classList.add('hidden');
        } else {
            chartsRow1.classList.remove('hidden');
        }
    }
    
    // Toggle Comprometimento Cartão Crédito chart (visible only in 'month' period)
    const cartaoCreditoContainer = document.getElementById('chartCartaoCreditoContainer');
    if (cartaoCreditoContainer) {
        if (currentPeriod === 'month') {
            cartaoCreditoContainer.classList.remove('hidden');
        } else {
            cartaoCreditoContainer.classList.add('hidden');
        }
    }
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
    
    // Show monthly charts for custom periods
    toggleMonthlyCharts();
    
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
                // Trimestre móvel: mês atual + 2 meses anteriores
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'semester':
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
    updateTables();
    
    // Atualizar filtros e contagem
    carregarFiltrosDinamicosTabela();
    atualizarContagemFiltrada();
}

// Switch between tabs
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-emerald-500', 'text-emerald-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Add active class to selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    selectedTab.classList.add('active', 'border-emerald-500', 'text-emerald-600');
    selectedTab.classList.remove('border-transparent', 'text-gray-500');
    
    // Show selected content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
}

// Update all tables
function updateTables() {
    renderTabelaSaidas();
    renderTabelaEntradas();
}

// Render tabela de saídas
function renderTabelaSaidas(filtroFatura = '', filtroCartaoId = '') {
    const tbody = document.getElementById('tabelaSaidas');
    const footer = document.getElementById('tabelaSaidasFooter');
    const footerTotal = document.getElementById('totalSaidasFooter');
    
    // Aplicar filtros dinâmicos
    let dadosFiltrados = filteredSaidas;
    
    if (filtroTabelaLoja) {
        dadosFiltrados = dadosFiltrados.filter(s => s.loja === filtroTabelaLoja);
    }
    if (filtroTabelaCategoria) {
        dadosFiltrados = dadosFiltrados.filter(s => s.categoria === filtroTabelaCategoria);
    }
    if (filtroTabelaTipoPagamento) {
        dadosFiltrados = dadosFiltrados.filter(s => s.tipo_pagamento === filtroTabelaTipoPagamento);
    }
    if (filtroFatura && filtroCartaoId) {
        // Filtrar por mês de fatura E cartão selecionado (considerando dia de vencimento)
        const cartao = cartoes.find(c => c.id == filtroCartaoId);
        const diaVencimento = cartao ? parseInt(cartao.dia_vencimento) : 10;
        
        // Converter filtroFatura (YYYY-MM) para determinar o período da fatura
        const [year, month] = filtroFatura.split('-');
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month) - 1; // 0-indexed
        
        // O período da fatura vai do dia após o vencimento até o dia do vencimento do mês seguinte
        const startDate = new Date(selectedYear, selectedMonth, diaVencimento + 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, diaVencimento);
        
        dadosFiltrados = dadosFiltrados.filter(s => {
            // Verificar se é pagamento com cartão de crédito
            const tipo = (s.tipo_pagamento || '').toLowerCase();
            const isCredito = tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
            
            if (!isCredito) return false;
            
            // Verificar se a data está no período da fatura do cartão
            if (s.data) {
                const date = new Date(s.data + 'T00:00:00');
                return date >= startDate && date <= endDate;
            }
            return false;
        });
    } else if (filtroFatura) {
        // Filtrar apenas por mês (comportamento anterior)
        dadosFiltrados = dadosFiltrados.filter(s => {
            const tipo = (s.tipo_pagamento || '').toLowerCase();
            const isCredito = tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
            
            if (!isCredito) return false;
            
            if (s.data && s.data.startsWith(filtroFatura)) {
                return true;
            }
            return false;
        });
    }
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma saída encontrada</p>
                </td>
            </tr>
        `;
        if (footer) footer.classList.add('hidden');
        return;
    }
    
    // Calcular total dos valores filtrados
    const totalFiltrado = dadosFiltrados.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    
    // Atualizar footer com o total
    if (footer && footerTotal) {
        footerTotal.textContent = `- ${formatCurrency(totalFiltrado)}`;
        footer.classList.remove('hidden');
    }
    
    // Sort by date descending
    const sortedSaidas = [...dadosFiltrados].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    tbody.innerHTML = sortedSaidas.map(s => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${formatDate(s.data)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${s.descricao || '-'}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${s.loja || '-'}</td>
            <td class="px-4 py-3 text-sm">
                ${s.parcelas > 1 
                    ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <i class="fas fa-layer-group mr-1"></i>
                        ${s.parcela_atual}/${s.parcelas}
                       </span>` 
                    : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-red-500"></i>
                    ${s.categoria}
                </span>
            </td>
            <td class="px-4 py-3">
                <span class="badge badge-pix">
                    ${s.tipo_pagamento || '-'}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">
                - ${formatCurrency(s.valor)}
            </td>
            <td class="px-4 py-3 text-center">
                <button 
                    onclick='editSaida(${JSON.stringify(s).replace(/'/g, "\\'")})'
                    class="text-blue-500 hover:text-blue-700 mr-2 transition"
                    title="Editar"
                >
                    <i class="fas fa-edit"></i>
                </button>
                <button 
                    onclick="openDeleteModal('saida', '${s.id}')"
                    class="text-red-500 hover:text-red-700 transition"
                    title="Excluir"
                >
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render tabela de entradas
function renderTabelaEntradas() {
    const tbody = document.getElementById('tabelaEntradas');
    
    if (filteredEntradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma entrada encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by date descending
    const sortedEntradas = [...filteredEntradas].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    tbody.innerHTML = sortedEntradas.map(e => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${formatDate(e.data)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${e.descricao || e.categoria}</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-emerald-500"></i>
                    ${e.categoria}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                + ${formatCurrency(e.valor)}
            </td>
            <td class="px-4 py-3 text-center">
                <button 
                    onclick='editEntrada(${JSON.stringify(e).replace(/'/g, "\\'")})'
                    class="text-blue-500 hover:text-blue-700 mr-2 transition"
                    title="Editar"
                >
                    <i class="fas fa-edit"></i>
                </button>
                <button 
                    onclick="openDeleteModal('entrada', '${e.id}')"
                    class="text-red-500 hover:text-red-700 transition"
                    title="Excluir"
                >
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Edit functions
function editSaida(saida) {
    document.getElementById('editSaidaId').value = saida.id;
    document.getElementById('editSaidaData').value = saida.data;
    document.getElementById('editSaidaValor').value = saida.valor;
    document.getElementById('editSaidaLoja').value = saida.loja || '';
    document.getElementById('editSaidaDescricao').value = saida.descricao || '';
    document.getElementById('editSaidaCategoria').value = saida.categoria;
    document.getElementById('editSaidaPagamento').value = saida.tipo_pagamento || 'pix';
    document.getElementById('editSaidaParcelas').value = saida.parcelas || 1;
    document.getElementById('editSaidaParcelaAtual').value = saida.parcela_atual || 1;
    
    const modal = document.getElementById('modalEditarSaida');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Inicializar visibilidade dos campos de parcelamento
    inicializarToggleParcelamentoEdit();
}

function editEntrada(entrada) {
    document.getElementById('editEntradaId').value = entrada.id;
    document.getElementById('editEntradaData').value = entrada.data;
    document.getElementById('editEntradaValor').value = entrada.valor;
    document.getElementById('editEntradaCategoria').value = entrada.categoria;
    document.getElementById('editEntradaDescricao').value = entrada.descricao || '';
    
    const modal = document.getElementById('modalEditarEntrada');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalEditarSaida() {
    const modal = document.getElementById('modalEditarSaida');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Toggle de parcelamento no modal de edição de saída
function inicializarToggleParcelamentoEdit() {
    const editSaidaPagamento = document.getElementById('editSaidaPagamento');
    const editCamposParcelamento = document.getElementById('editCamposParcelamento');
    
    if (editSaidaPagamento && editCamposParcelamento) {
        function toggleParcelamentoEdit() {
            if (editSaidaPagamento.value === 'credito' || editSaidaPagamento.value === 'Crédito') {
                editCamposParcelamento.classList.remove('hidden');
            } else {
                editCamposParcelamento.classList.add('hidden');
                // Resetar parcelas para 1x quando não for crédito
                document.getElementById('editSaidaParcelas').value = 1;
                document.getElementById('editSaidaParcelaAtual').value = 1;
            }
        }
        
        // Inicializar estado
        toggleParcelamentoEdit();
        
        // Adicionar event listener
        editSaidaPagamento.removeEventListener('change', toggleParcelamentoEdit);
        editSaidaPagamento.addEventListener('change', toggleParcelamentoEdit);
    }
}

function fecharModalEditarEntrada() {
    const modal = document.getElementById('modalEditarEntrada');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Delete functions
function openDeleteModal(type, id) {
    deleteTarget = { type, id };
    const modal = document.getElementById('modalDelete');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteModal() {
    const modal = document.getElementById('modalDelete');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    deleteTarget = { type: null, id: null };
}

async function confirmDelete() {
    if (!deleteTarget.type || !deleteTarget.id) return;
    
    const tableName = deleteTarget.type === 'entrada' ? 'entradas' : 'saidas';
    
    try {
        const response = await fetch(`${API_BASE}/${tableName}/${deleteTarget.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            showToast(`${deleteTarget.type === 'entrada' ? 'Entrada' : 'Saída'} excluída com sucesso!`);
            closeDeleteModal();
            
            // Reload data and update dashboard
            await loadAllData();
            updateDashboard();
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir registro', 'error');
    }
}

// Handle edit form submissions
async function handleEditSaidaSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editSaidaId').value;
    
    const data = {
        loja: document.getElementById('editSaidaLoja').value,
        categoria: document.getElementById('editSaidaCategoria').value,
        descricao: document.getElementById('editSaidaDescricao').value,
        valor: parseFloat(document.getElementById('editSaidaValor').value),
        tipo_pagamento: document.getElementById('editSaidaPagamento').value,
        data: document.getElementById('editSaidaData').value,
        parcelas: parseInt(document.getElementById('editSaidaParcelas').value) || 1,
        parcela_atual: parseInt(document.getElementById('editSaidaParcelaAtual').value) || 1
    };
    
    try {
        const response = await fetch(`${API_BASE}/saidas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Erro ao atualizar');
        
        showToast('Saída atualizada com sucesso!');
        fecharModalEditarSaida();
        await loadAllData();
        updateDashboard();
    } catch (error) {
        console.error('Erro ao atualizar saída:', error);
        showToast('Erro ao atualizar saída', 'error');
    }
}

async function handleEditEntradaSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editEntradaId').value;
    
    const data = {
        categoria: document.getElementById('editEntradaCategoria').value,
        descricao: document.getElementById('editEntradaDescricao').value,
        valor: parseFloat(document.getElementById('editEntradaValor').value),
        data: document.getElementById('editEntradaData').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/entradas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Erro ao atualizar');
        
        showToast('Entrada atualizada com sucesso!');
        fecharModalEditarEntrada();
        await loadAllData();
        updateDashboard();
    } catch (error) {
        console.error('Erro ao atualizar entrada:', error);
        showToast('Erro ao atualizar entrada', 'error');
    }
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

    // Comprometimento Cartão Crédito Bar Chart
    charts.cartaoCredito = new Chart(document.getElementById('chartCartaoCredito'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Gasto no Crédito',
                data: [],
                backgroundColor: [],
                borderRadius: 4
            }]
        },
        options: {
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
                y: {
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
    
    // Update Comprometimento Cartão Crédito
    const cartaoCreditoData = getCartaoCreditoData();
    charts.cartaoCredito.data.labels = cartaoCreditoData.labels;
    charts.cartaoCredito.data.datasets[0].data = cartaoCreditoData.values;
    charts.cartaoCredito.data.datasets[0].backgroundColor = cartaoCreditoData.backgroundColors;
    charts.cartaoCredito.update();
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

// Get credit card installment data by due date
function getCartaoCreditoData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Filter only credit card expenses
    const creditoSaidas = filteredSaidas.filter(s => {
        const tipo = (s.tipo_pagamento || '').toLowerCase();
        return tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
    });
    
    // Group by month
    const monthlyCredito = {};
    
    creditoSaidas.forEach(s => {
        const date = new Date(s.data + 'T00:00:00');
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCredito[key] = (monthlyCredito[key] || 0) + (parseFloat(s.valor) || 0);
    });
    
    // Generate labels for next 12 months including current month
    const labels = [];
    const values = [];
    const backgroundColors = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 0; i < 12; i++) {
        let month = currentMonth + i;
        let year = currentYear;
        
        if (month > 11) {
            month = month - 12;
            year = currentYear + 1;
        }
        
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const label = `${monthNames[month]}/${year.toString().slice(2)}`;
        
        labels.push(label);
        values.push(monthlyCredito[key] || 0);
        
        // Current month gets different color (blue), future months get purple
        if (i === 0) {
            backgroundColors.push(colors.blue[0]);
        } else {
            backgroundColors.push(colors.purple[1]);
        }
    }
    
    return { labels, values, backgroundColors };
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

// Carregar categorias de entrada do banco de dados
async function carregarCategoriasEntrada() {
    try {
        const response = await fetch('http://localhost:3000/categorias/entradas');
        if (!response.ok) throw new Error('Erro ao carregar categorias');
        
        const result = await response.json();
        const categorias = result.data || [];
        
        const select = document.getElementById('editEntradaCategoria');
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>' +
                categorias.map(cat => `<option value="${cat.nome}">${cat.nome}</option>`).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar categorias de entrada:', error);
        // Fallback para opções hardcoded em caso de erro
        const select = document.getElementById('editEntradaCategoria');
        if (select) {
            select.innerHTML = `
                <option value="">Selecione...</option>
                <option value="Salário">Salário</option>
                <option value="13º Salário">13º Salário</option>
                <option value="Bônus">Bônus</option>
                <option value="Pagamento">Pagamento</option>
                <option value="Freelance">Freelance</option>
                <option value="Investimentos">Investimentos</option>
                <option value="Outros">Outros</option>
            `;
        }
    }
}

// ========== Funções para o Modal de Edição de Saída (reutilizadas do main.js) ==========

// Carregar categorias de saída para o modal de edição
function carregarCategoriasSaidaModal() {
    return new Promise((resolve, reject) => {
        const select = document.getElementById("editSaidaCategoria");
        if (!select) {
            resolve();
            return;
        }
        
        // Se já tem opções, resolver imediatamente
        if (categoriasSaida.length > 0) {
            select.innerHTML = categoriasSaida
                .map((cat) => `<option value="${cat}">${cat}</option>`)
                .join("");
            resolve();
            return;
        }
        
        // Caso contrário, carregar da API
        fetch('http://localhost:3000/categorias/saidas')
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar categorias');
                return res.json();
            })
            .then(json => {
                categoriasSaida = (json.data || []).map(cat => cat.nome);
                select.innerHTML = categoriasSaida
                    .map((cat) => `<option value="${cat}">${cat}</option>`)
                    .join("");
                resolve();
            })
            .catch(err => {
                console.error('Erro ao carregar categorias de saída:', err);
                // Usar categorias padrão em caso de erro
                categoriasSaida = [
                    "Transporte", "Alimentação", "Autocuidado", "Moradia", "Saúde",
                    "Educação", "Lazer", "Vestuário", "MG", "Outros"
                ];
                select.innerHTML = categoriasSaida
                    .map((cat) => `<option value="${cat}">${cat}</option>`)
                    .join("");
                resolve();
            });
    });
}

// Carregar tipos de pagamento para o modal de edição
function carregarTiposPagamentoModal() {
    return new Promise((resolve, reject) => {
        const select = document.getElementById("editSaidaPagamento");
        if (!select) {
            resolve();
            return;
        }
        
        // Se já tem opções, resolver imediatamente
        if (tiposPagamento.length > 0) {
            select.innerHTML =
                '<option value="">Selecione...</option>' +
                tiposPagamento
                    .map((tipo) => `<option value="${tipo}">${tipo}</option>`)
                    .join("");
            resolve();
            return;
        }
        
        // Caso contrário, carregar da API
        fetch('http://localhost:3000/tipos-pagamento')
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar tipos de pagamento');
                return res.json();
            })
            .then(json => {
                tiposPagamento = (json.data || []).map(tipo => tipo.nome);
                select.innerHTML =
                    '<option value="">Selecione...</option>' +
                    tiposPagamento
                        .map((tipo) => `<option value="${tipo}">${tipo}</option>`)
                        .join("");
                resolve();
            })
            .catch(err => {
                console.error('Erro ao carregar tipos de pagamento:', err);
                
            });
    });
}

// Carregar lojas para o modal de edição
function carregarLojasModal() {
    return new Promise((resolve, reject) => {
        const select = document.getElementById("editSaidaLoja");
        if (!select) {
            resolve();
            return;
        }
        
        // Se já tem opções, resolver imediatamente
        if (lojas.length > 0) {
            atualizarSelectLojaEdit();
            resolve();
            return;
        }
        
        // Caso contrário, carregar da API
        fetch('http://localhost:3000/lojas')
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar lojas');
                return res.json();
            })
            .then(json => {
                lojas = (json.data || []).map(loja => ({ id: loja.id, nome: loja.nome }));
                atualizarSelectLojaEdit();
                resolve();
            })
            .catch(err => {
                console.error('Erro ao carregar lojas:', err);
                // Manter array vazio em caso de erro
                lojas = [];
                atualizarSelectLojaEdit();
                resolve();
            });
    });
}

// Atualizar select de loja no modal de edição
function atualizarSelectLojaEdit() {
    const editSaidaLoja = document.getElementById("editSaidaLoja");
    if (editSaidaLoja) {
        const currentValue = editSaidaLoja.value;
        editSaidaLoja.innerHTML =
            '<option value="">Selecione...</option>' +
            lojas
                .map((loja) => `<option value="${loja.nome}">${loja.nome}</option>`)
                .join("");
        
        // Manter o valor selecionado se ainda existir
        if (currentValue && lojas.some(l => l.nome === currentValue)) {
            editSaidaLoja.value = currentValue;
        }
    }
}

// Toggle de parcelamento no modal de edição de saída
function inicializarToggleParcelamentoEdit() {
    const editSaidaPagamento = document.getElementById("editSaidaPagamento");
    const editCamposParcelamento = document.getElementById("editCamposParcelamento");
    
    if (editSaidaPagamento && editCamposParcelamento) {
        function toggleParcelamentoEdit() {
            if (editSaidaPagamento.value === "Crédito") {
                editCamposParcelamento.classList.remove("hidden");
            } else {
                editCamposParcelamento.classList.add("hidden");
                // Resetar parcelas para 1x quando não for crédito
                document.getElementById("editSaidaParcelas").value = "1";
                document.getElementById("editSaidaParcelaAtual").value = "1";
            }
        }
        
        // Inicializar estado
        toggleParcelamentoEdit();
        
        // Adicionar event listener
        editSaidaPagamento.removeEventListener("change", toggleParcelamentoEdit);
        editSaidaPagamento.addEventListener("change", toggleParcelamentoEdit);
    }
}

// Função editSaida atualizada para usar selects dinâmicos
function editSaida(saida) {
    // Primeiro, populamos os selects e depois definimos os valores
    Promise.all([
        carregarCategoriasSaidaModal(),
        carregarTiposPagamentoModal(),
        carregarLojasModal()
    ]).then(() => {
        // Agora os selects estão populados, podemos definir os valores
        document.getElementById("editSaidaId").value = saida.id;
        document.getElementById("editSaidaLoja").value = saida.loja || "";
        document.getElementById("editSaidaCategoria").value = saida.categoria || "";
        document.getElementById("editSaidaDescricao").value = saida.descricao || "";
        document.getElementById("editSaidaValor").value = saida.valor;
        document.getElementById("editSaidaPagamento").value = saida.tipo_pagamento || "PIX";
        document.getElementById("editSaidaData").value = saida.data;
        document.getElementById("editSaidaParcelas").value = saida.parcelas || 1;
        document.getElementById("editSaidaParcelaAtual").value = saida.parcela_atual || 1;

        const modal = document.getElementById("modalEditarSaida");
        modal.classList.remove("hidden");
        modal.classList.add("flex");

        // Inicializar visibilidade dos campos de parcelamento
        inicializarToggleParcelamentoEdit();
    }).catch(err => {
        console.error("Erro ao carregar dados do modal:", err);
        // Mesmo com erro, abre o modal
        document.getElementById("editSaidaId").value = saida.id;
        document.getElementById("editSaidaLoja").value = saida.loja || "";
        document.getElementById("editSaidaCategoria").value = saida.categoria || "";
        document.getElementById("editSaidaDescricao").value = saida.descricao || "";
        document.getElementById("editSaidaValor").value = saida.valor;
        document.getElementById("editSaidaPagamento").value = saida.tipo_pagamento || "PIX";
        document.getElementById("editSaidaData").value = saida.data;
        document.getElementById("editSaidaParcelas").value = saida.parcelas || 1;
        document.getElementById("editSaidaParcelaAtual").value = saida.parcela_atual || 1;

        const modal = document.getElementById("modalEditarSaida");
        modal.classList.remove("hidden");
        modal.classList.add("flex");

        // Inicializar visibilidade dos campos de parcelamento
        inicializarToggleParcelamentoEdit();
    });
}

// ========== Filtros Dinâmicos para Tabela de Saídas ==========

// Carregar valores únicos para os filtros da tabela de saídas
async function carregarFiltrosDinamicosTabela() {
    // Usar todas as saídas (não filtradas por período) para ter todas as opções disponíveis
    const todasSaidas = saidas;
    
    // Extrair valores únicos para cada campo
    const lojasUnicas = [...new Set(todasSaidas.map(s => s.loja).filter(Boolean))].sort();
    const categoriasUnicas = [...new Set(todasSaidas.map(s => s.categoria).filter(Boolean))].sort();
    const tiposPagamentoUnicos = [...new Set(todasSaidas.map(s => s.tipo_pagamento).filter(Boolean))].sort();
    
    // Preencher select de Lojas
    const selectLoja = document.getElementById('filtroLoja');
    if (selectLoja) {
        const valorAtual = selectLoja.value;
        selectLoja.innerHTML = '<option value="">Todas as Lojas</option>' +
            lojasUnicas.map(loja => `<option value="${loja}">${loja}</option>`).join('');
        selectLoja.value = valorAtual;
    }
    
    // Preencher select de Categorias
    const selectCategoria = document.getElementById('filtroCategoria');
    if (selectCategoria) {
        const valorAtual = selectCategoria.value;
        selectCategoria.innerHTML = '<option value="">Todas as Categorias</option>' +
            categoriasUnicas.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        selectCategoria.value = valorAtual;
    }
    
    // Preencher select de Tipos de Pagamento
    const selectTipoPagamento = document.getElementById('filtroTipoPagamento');
    if (selectTipoPagamento) {
        const valorAtual = selectTipoPagamento.value;
        selectTipoPagamento.innerHTML = '<option value="">Todos os Tipos de Pgto</option>' +
            tiposPagamentoUnicos.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('');
        selectTipoPagamento.value = valorAtual;
    }
    
    // Preencher select de Fatura (apenas para cartão de crédito)
    const selectFatura = document.getElementById('filtroFatura');
    if (selectFatura) {
        const valorAtual = selectFatura.value;
        
        // Extrair meses únicos das saídas com cartão de crédito
        const creditoSaidas = todasSaidas.filter(s => {
            const tipo = (s.tipo_pagamento || '').toLowerCase();
            return tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
        });
        
        const mesesCredito = [...new Set(creditoSaidas.map(s => {
            if (s.data) return s.data.substring(0, 7); // YYYY-MM
            return null;
        }).filter(Boolean))].sort().reverse();
        
        // Criar opções formatadas
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const options = '<option value="">Todas as Faturas</option>' +
            mesesCredito.map(monthStr => {
                const [year, month] = monthStr.split('-');
                const displayName = `${monthNames[parseInt(month) - 1]}/${year}`;
                return `<option value="${monthStr}">${displayName}</option>`;
            }).join('');
        
        selectFatura.innerHTML = options;
        selectFatura.value = valorAtual;
    }
    
    // Carregar cartões para o filtro de cartão
    await carregarCartoes();
}

// Carregar todos os cartões do banco de dados
async function carregarCartoes() {
    try {
        const res = await fetch('http://localhost:3000/cartao');
        const result = await res.json();
        cartoes = result.data || [];
        
        const selectCartao = document.getElementById('filtroCartao');
        if (selectCartao && cartoes.length > 0) {
            const valorAtual = selectCartao.value;
            selectCartao.innerHTML = '<option value="">Selecione o cartão...</option>' +
                cartoes.map(cartao => `<option value="${cartao.id}">${cartao.nome_cartao} (Venc: ${cartao.dia_vencimento})</option>`).join('');
            selectCartao.value = valorAtual;
        }
    } catch (error) {
        console.error('Erro ao carregar cartões:', error);
    }
}

// Verificar se a seleção de fatura requer seleção de cartão
function verificarExibicaoFiltroCartao() {
    const selectFatura = document.getElementById('filtroFatura');
    const selectCartao = document.getElementById('filtroCartao');
    
    if (!selectFatura || !selectCartao) return;
    
    const faturaSelecionada = selectFatura.value;
    
    if (faturaSelecionada) {
        // Mostrar dropdown de cartão
        selectCartao.classList.remove('hidden');
        
        // Se ainda não tem cartão selecionado, selecionar o primeiro
        if (!selectCartao.value && cartoes.length > 0) {
            selectCartao.value = cartoes[0].id;
        }
    } else {
        // Esconder dropdown de cartão
        selectCartao.classList.add('hidden');
        selectCartao.value = '';
    }
}

// Aplicar filtros na tabela de saídas
async function aplicarFiltrosTabela() {
    // Obter valores dos selects
    filtroTabelaLoja = document.getElementById('filtroLoja')?.value || '';
    filtroTabelaCategoria = document.getElementById('filtroCategoria')?.value || '';
    filtroTabelaTipoPagamento = document.getElementById('filtroTipoPagamento')?.value || '';
    const filtroFatura = document.getElementById('filtroFatura')?.value || '';
    const filtroCartaoId = document.getElementById('filtroCartao')?.value || '';
    
    // Verificar se deve mostrar/esconder o dropdown de cartão
    verificarExibicaoFiltroCartao();
    
    // Renderizar tabela com filtros aplicados
    renderTabelaSaidas(filtroFatura, filtroCartaoId);
    
    // Atualizar contagem
    await atualizarContagemFiltrada(filtroFatura, filtroCartaoId);
}

// Limpar filtros da tabela de saídas
function limparFiltrosTabela() {
    filtroTabelaLoja = '';
    filtroTabelaCategoria = '';
    filtroTabelaTipoPagamento = '';
    
    // Limpar selects
    const selectLoja = document.getElementById('filtroLoja');
    const selectCategoria = document.getElementById('filtroCategoria');
    const selectTipoPagamento = document.getElementById('filtroTipoPagamento');
    const selectFatura = document.getElementById('filtroFatura');
    const selectCartao = document.getElementById('filtroCartao');
    
    if (selectLoja) selectLoja.value = '';
    if (selectCategoria) selectCategoria.value = '';
    if (selectTipoPagamento) selectTipoPagamento.value = '';
    if (selectFatura) selectFatura.value = '';
    if (selectCartao) {
        selectCartao.value = '';
        selectCartao.classList.add('hidden');
    }
    
    // Renderizar tabela sem filtros
    renderTabelaSaidas();
    
    // Atualizar contagem
    atualizarContagemFiltrada();
}

// Atualizar contagem de registros filtrados
async function atualizarContagemFiltrada(filtroFatura = '', filtroCartaoId = '') {
    const total = filteredSaidas.length;
    
    // Calcular filtrados
    let filtrados = filteredSaidas;
    
    if (filtroTabelaLoja) {
        filtrados = filtrados.filter(s => s.loja === filtroTabelaLoja);
    }
    if (filtroTabelaCategoria) {
        filtrados = filtrados.filter(s => s.categoria === filtroTabelaCategoria);
    }
    if (filtroTabelaTipoPagamento) {
        filtrados = filtrados.filter(s => s.tipo_pagamento === filtroTabelaTipoPagamento);
    }
    if (filtroFatura && filtroCartaoId) {
        // Filtrar por mês de fatura E cartão selecionado (considerando dia de vencimento)
        const cartao = cartoes.find(c => c.id == filtroCartaoId);
        const diaVencimento = cartao ? parseInt(cartao.dia_vencimento) : 10;
        
        const [year, month] = filtroFatura.split('-');
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month) - 1;
        
        const startDate = new Date(selectedYear, selectedMonth, diaVencimento + 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, diaVencimento);
        
        filtrados = filtrados.filter(s => {
            const tipo = (s.tipo_pagamento || '').toLowerCase();
            const isCredito = tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
            if (!isCredito) return false;
            if (s.data) {
                const date = new Date(s.data + 'T00:00:00');
                return date >= startDate && date <= endDate;
            }
            return false;
        });
    } else if (filtroFatura) {
        filtrados = filtrados.filter(s => {
            const tipo = (s.tipo_pagamento || '').toLowerCase();
            const isCredito = tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
            if (!isCredito) return false;
            if (s.data && s.data.startsWith(filtroFatura)) return true;
            return false;
        });
    }
    
    document.getElementById('contagemTotal').textContent = total;
    document.getElementById('contagemFiltrada').textContent = filtrados.length;
}

