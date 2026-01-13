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
let diaVencimentoCartao = 24; // Dia de vencimento padrão do cartão

// Dados para os selects do modal de edição
let categoriasSaida = [];
let tiposPagamento = [];
let lojas = [];

// Filtros dinâmicos da tabela de saídas
let filtroTabelaLoja = '';
let filtroTabelaCategoria = '';
let filtroTabelaTipoPagamento = '';

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
    await carregarDiaVencimentoCartao(); // Carregar dia de vencimento do cartão
    inicializarTabelaGastosCartao(); // Inicializar tabela de gastos do cartão com a fatura atual
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
    
    // Toggle Tabela de Gastos Cartão Crédito (visible only in 'month' period)
    const tabelaGastosCartaoContainer = document.getElementById('tabelaGastosCartaoContainer');
    if (tabelaGastosCartaoContainer) {
        if (currentPeriod === 'month') {
            tabelaGastosCartaoContainer.classList.remove('hidden');
        } else {
            tabelaGastosCartaoContainer.classList.add('hidden');
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
            case 'last12months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'next12months':
                startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 12, 0, 23, 59, 59);
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
function renderTabelaSaidas() {
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
    
    // Calcular total subtraindo reembolsos APENAS quando filtro de crédito está ativo
    const isCreditoFilter = filtroTabelaTipoPagamento && 
        (filtroTabelaTipoPagamento.toLowerCase().includes('credito') || filtroTabelaTipoPagamento.toLowerCase().includes('crédito'));
    
    let totalFiltrado;
    
    if (isCreditoFilter) {
        // Se filtro de crédito está ativo: subtrair reembolsos do total
        let totalSemReembolso = 0;
        let totalReembolso = 0;
        
        dadosFiltrados.forEach(s => {
            const valor = parseFloat(s.valor) || 0;
            if (s.categoria === 'Reembolso') {
                totalReembolso += valor;
            } else {
                totalSemReembolso += valor;
            }
        });
        
        totalFiltrado = totalSemReembolso - totalReembolso;
    } else {
        // Caso contrário: somar normalmente (incluindo reembolsos como positivo)
        totalFiltrado = dadosFiltrados.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    }
    
    // Atualizar footer com o total
    if (footer && footerTotal) {
        footerTotal.textContent = `- ${formatCurrency(totalFiltrado)}`;
        footer.classList.remove('hidden');
    }
    
    // Sort by date descending
    const sortedSaidas = [...dadosFiltrados].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    tbody.innerHTML = sortedSaidas.map(s => {
        const isReembolso = s.categoria === 'Reembolso';
        return `
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
                <span class="badge-categoria ${isReembolso ? 'reembolso' : ''}">
                    <i class="fas fa-tag ${isReembolso ? 'text-emerald-500' : 'text-red-500'}"></i>
                    ${s.categoria}
                </span>
            </td>
            <td class="px-4 py-3">
                <span class="badge badge-pix">
                    ${s.tipo_pagamento || '-'}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-semibold ${isReembolso ? 'text-emerald-600' : 'text-red-600'} whitespace-nowrap">
                ${isReembolso ? '+ ' : '- '}${formatCurrency(s.valor)}
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
    `}).join('');
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
            onClick: handleCartaoCreditoClick,
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

// Handler de clique no gráfico de Comprometimento Cartão Crédito
function handleCartaoCreditoClick(event, elements) {
    if (elements.length === 0) return;
    
    const index = elements[0].index;
    const chart = charts.cartaoCredito;
    const label = chart.data.labels[index];
    const value = chart.data.datasets[0].data[index];
    
    // Apenas mostrar se houver gastos
    if (value === 0) return;
    
    // Extrair ano e mês do label (ex: "Jan/25 - Fatura" -> 2025, 0)
    // Formato: "Jan/25 - Fatura"
    const match = label.match(/^([A-Za-zéê]+)\/(\d{2})/);
    if (!match) return;
    
    const monthName = match[1];
    const yearShort = match[2];
    const year = 2000 + parseInt(yearShort);
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    
    if (monthIndex === -1) return;
    
    // Obter gastos do cartão para esta fatura
    const gastos = getGastosCartaoCreditoPorFatura(year, monthIndex);
    
    // Mostrar tabela
    mostrarTabelaGastosCartao(gastos, label, year, monthIndex);
}

// Carregar dia de vencimento do cartão de crédito
async function carregarDiaVencimentoCartao() {
    try {
        const response = await fetch('http://localhost:3000/cartao/first');
        if (!response.ok) throw new Error('Erro ao carregar cartão');
        
        const result = await response.json();
        if (result.data && result.data.dia_vencimento) {
            diaVencimentoCartao = result.data.dia_vencimento;
            console.log(`Dia de vencimento do cartão: ${diaVencimentoCartao}`);
        }
    } catch (error) {
        console.error('Erro ao carregar dia de vencimento:', error);
        // Mantém o valor padrão de 24
    }
}

// Obter data de início e fim do período de fatura
function getPeriodoFatura(ano, mes, diaVencimento) {
    // A fatura do mês atual vence no dia X, então:
    // Início: dia X do mês anterior + 1
    // Fim: dia X do mês atual
    
    // Calcular início (dia X do mês anterior)
    let mesInicio = mes - 1;
    let anoInicio = ano;
    if (mesInicio < 0) {
        mesInicio = 11;
        anoInicio = ano - 1;
    }
    // Obter último dia do mês de início para ajustar
    const diasNoMesInicio = new Date(anoInicio, mesInicio + 1, 0).getDate();
    const diaInicioReal = Math.min(diaVencimento, diasNoMesInicio);
    const dataInicio = new Date(anoInicio, mesInicio, diaInicioReal);
    
    // Ajustar: início é dia X+1 do mês anterior
    const dataInicioFatura = new Date(anoInicio, mesInicio, diaInicioReal + 1);
    
    // Calcular fim (dia X do mês atual)
    const diasNoMesFim = new Date(ano, mes + 1, 0).getDate();
    const diaFimReal = Math.min(diaVencimento, diasNoMesFim);
    const dataFimFatura = new Date(ano, mes, diaFimReal, 23, 59, 59);
    
    return {
        inicio: dataInicioFatura,
        fim: dataFimFatura,
        mesFatura: mes,
        anoFatura: ano
    };
}

// Obter gastos de cartão de crédito para uma fatura específica (por período)
function getGastosCartaoCreditoPorFatura(ano, mes) {
    // Filtrar saídas por cartão de crédito
    const creditoSaidas = saidas.filter(s => {
        const tipo = (s.tipo_pagamento || '').toLowerCase();
        return tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
    });
    
    // Obter período da fatura
    const periodo = getPeriodoFatura(ano, mes, diaVencimentoCartao);
    
    // Filtrar por período
    const gastos = creditoSaidas.filter(s => {
        const date = new Date(s.data + 'T00:00:00');
        return date >= periodo.inicio && date <= periodo.fim;
    });
    
    return gastos;
}

// Mostrar tabela de gastos do cartão de crédito
function mostrarTabelaGastosCartao(gastos, label, anoFat, mesFat) {
    const container = document.getElementById('tabelaGastosCartaoContainer');
    const title = document.getElementById('tabelaGastosCartaoTitle');
    const subtitle = document.getElementById('tabelaGastosCartaoSubtitle');
    const tableBody = document.getElementById('tabelaGastosCartaoBody');
    
    if (!container || !title || !tableBody) {
        console.error('Elementos do modal de gastos não encontrados');
        return;
    }
    
    // Obter período da fatura para exibir no subtítulo
    let periodoText = '';
    if (anoFat !== undefined && mesFat !== undefined) {
        const periodo = getPeriodoFatura(anoFat, mesFat, diaVencimentoCartao);
        const inicioStr = periodo.inicio.toLocaleDateString('pt-BR');
        const fimStr = periodo.fim.toLocaleDateString('pt-BR');
        periodoText = `${inicioStr} até ${fimStr}`;
    }
    
    // Atualizar título e subtítulo
    title.textContent = `Gastos no Cartão de Crédito - ${label.replace(' - Fatura', '')}`;
    if (subtitle) {
        subtitle.textContent = `Período: ${periodoText} (Vencimento: dia ${diaVencimentoCartao})`;
        subtitle.classList.remove('hidden');
    }
    
    if (gastos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhum gasto encontrado para este período</p>
                </td>
            </tr>
        `;
        
        // Ocultar footer quando não há dados
        const footer = document.getElementById('tabelaGastosCartaoFooter');
        if (footer) {
            footer.classList.add('hidden');
        }
    } else {
        // Calcular total subtraindo reembolsos (reembolsos são subtraídos do total)
        let totalSemReembolso = 0;
        let totalReembolso = 0;
        
        gastos.forEach(g => {
            const valor = parseFloat(g.valor) || 0;
            if (g.categoria === 'Reembolso') {
                totalReembolso += valor;
            } else {
                totalSemReembolso += valor;
            }
        });
        
        // Total final = gastos normais - reembolsos
        const totalFinal = totalSemReembolso - totalReembolso;
        
        // Renderizar tabela
        const sortedGastos = [...gastos].sort((a, b) => new Date(b.data) - new Date(a.data));
        
        tableBody.innerHTML = sortedGastos.map(g => {
            const isReembolso = g.categoria === 'Reembolso';
            return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">${formatDate(g.data)}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${g.descricao || '-'}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${g.loja || '-'}</td>
                <td class="px-4 py-3 text-sm">
                    ${g.parcelas > 1 
                        ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <i class="fas fa-layer-group mr-1"></i>
                            ${g.parcela_atual}/${g.parcelas}
                           </span>` 
                        : '<span class="text-gray-400">-</span>'}
                </td>
                <td class="px-4 py-3">
                    <span class="badge-categoria ${isReembolso ? 'reembolso' : ''}">
                        <i class="fas fa-tag ${isReembolso ? 'text-emerald-500' : 'text-red-500'}"></i>
                        ${g.categoria}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-semibold ${isReembolso ? 'text-emerald-600' : 'text-red-600'} whitespace-nowrap">
                    ${isReembolso ? '+ ' : '- '}${formatCurrency(g.valor)}
                </td>
                <td class="px-4 py-3 text-center">
                    <button 
                        onclick='editSaida(${JSON.stringify(g).replace(/'/g, "\\'")}); fecharTabelaGastosCartao();'
                        class="text-blue-500 hover:text-blue-700 mr-2 transition"
                        title="Editar"
                    >
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
            `}).join('');
        
        // Adicionar linha de total no footer (subtraindo reembolsos)
        const footer = document.getElementById('tabelaGastosCartaoFooter');
        if (footer) {
            const footerTotal = document.getElementById('totalGastosCartaoFooter');
            footerTotal.textContent = `- ${formatCurrency(totalFinal)}`;
            footer.classList.remove('hidden');
        }
    }
    
    // Mostrar container
    container.classList.remove('hidden');
    
    // Scroll até o container
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Fechar tabela de gastos do cartão de crédito
function fecharTabelaGastosCartao() {
    const container = document.getElementById('tabelaGastosCartaoContainer');
    if (container) {
        container.classList.add('hidden');
    }
}

// Inicializar tabela de gastos do cartão de crédito com o período atual (fatura atual)
function inicializarTabelaGastosCartao() {
    const now = new Date();
    const today = now.getDate();
    const dueDay = diaVencimentoCartao;
    
    // Determinar o ponto de partida para os períodos de fatura (mesmo usado no gráfico)
    let startMonth = now.getMonth();
    let startYear = now.getFullYear();
    
    if (today < dueDay) {
        startMonth = now.getMonth() - 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear = now.getFullYear() - 1;
        }
    }
    
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Encontrar o período de fatura atual (a barra com cor diferente no gráfico)
    let faturaMonth, faturaYear, faturaLabel;
    
    for (let i = 0; i < 12; i++) {
        let month = startMonth + i;
        let year = startYear;
        
        if (month > 11) {
            month = month - 12;
            year = startYear + Math.floor((startMonth + i) / 12);
        }
        
        const periodo = getPeriodoFatura(year, month, diaVencimentoCartao);
        
        // Verificar se hoje cai dentro deste período de fatura
        if (now >= periodo.inicio && now <= periodo.fim) {
            faturaMonth = month;
            faturaYear = year;
            faturaLabel = `${monthNames[month]}/${year.toString().slice(2)} - Fatura`;
            break;
        }
    }
    
    // Se não encontrou (caso edge), usar o primeiro período
    if (faturaMonth === undefined) {
        faturaMonth = startMonth;
        faturaYear = startYear;
        faturaLabel = `${monthNames[startMonth]}/${startYear.toString().slice(2)} - Fatura`;
    }
    
    // Obter gastos para esta fatura
    const gastos = getGastosCartaoCreditoPorFatura(faturaYear, faturaMonth);
    
    // Display the table with current billing period expenses
    mostrarTabelaGastosCartao(gastos, faturaLabel, faturaYear, faturaMonth);
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
        // Ignorar entradas onde a loja é "-"
        if (s.loja === '-') return;
        
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

// Get credit card installment data by due date (grouped by billing period)
function getCartaoCreditoData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Filter only credit card expenses from ALL data (not filtered by period)
    const creditoSaidas = saidas.filter(s => {
        const tipo = (s.tipo_pagamento || '').toLowerCase();
        return tipo.includes('credito') || tipo === 'crédito' || tipo === 'cartao';
    });
    
    // Generate labels and calculate totals for next 12 months (billing periods)
    const labels = [];
    const values = [];
    const backgroundColors = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Determine which month should appear first based on today's date
    // The current billing period is the one that includes today
    // If today is after the due date, we're in the current month's billing period
    // If today is before the due date, we're in the previous month's billing period
    
    const today = new Date();
    const todayDay = today.getDate();
    const dueDay = diaVencimentoCartao;
    
    // Calculate the billing period we're currently in
    let startMonth = currentMonth;
    let startYear = currentYear;
    
    // If we're before the due date, we're in the previous month's billing period
    // (which started in the month before that)
    if (todayDay < dueDay) {
        startMonth = currentMonth - 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear = currentYear - 1;
        }
    }
    
    // Generate 12 billing periods starting from the current/most recent one
    for (let i = 0; i < 12; i++) {
        let month = startMonth + i;
        let year = startYear;
        
        if (month > 11) {
            month = month - 12;
            year = startYear + Math.floor((startMonth + i) / 12);
        }
        
        // Get billing period for this month
        const periodo = getPeriodoFatura(year, month, diaVencimentoCartao);
        
        // Calculate total for this billing period (subtracting reimbursements)
        let totalSemReembolso = 0;
        let totalReembolso = 0;
        
        creditoSaidas.forEach(s => {
            const date = new Date(s.data + 'T00:00:00');
            if (date >= periodo.inicio && date <= periodo.fim) {
                const valor = parseFloat(s.valor) || 0;
                if (s.categoria === 'Reembolso') {
                    totalReembolso += valor;
                } else {
                    totalSemReembolso += valor;
                }
            }
        });
        
        // Total final = gastos normais - reembolsos
        const total = totalSemReembolso - totalReembolso;
        
        // Format label
        const label = `${monthNames[month]}/${year.toString().slice(2)} - Fatura`;
        
        labels.push(label);
        values.push(total);
        
        // Check if today's date falls within this billing period
        const isCurrentPeriod = today >= periodo.inicio && today <= periodo.fim;
        
        // Current billing period (containing today) gets different color (emerald green), others get purple
        if (isCurrentPeriod) {
            backgroundColors.push(colors.emerald[0]);
        } else {
            backgroundColors.push(colors.purple[1]);
        }
    }
    
    return { labels, values, backgroundColors };
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
}

// Aplicar filtros na tabela de saídas
async function aplicarFiltrosTabela() {
    // Obter valores dos selects
    filtroTabelaLoja = document.getElementById('filtroLoja')?.value || '';
    filtroTabelaCategoria = document.getElementById('filtroCategoria')?.value || '';
    filtroTabelaTipoPagamento = document.getElementById('filtroTipoPagamento')?.value || '';
    
    // Renderizar tabela com filtros aplicados
    renderTabelaSaidas();
    
    // Atualizar contagem
    await atualizarContagemFiltrada();
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
    
    if (selectLoja) selectLoja.value = '';
    if (selectCategoria) selectCategoria.value = '';
    if (selectTipoPagamento) selectTipoPagamento.value = '';
    
    // Renderizar tabela sem filtros
    renderTabelaSaidas();
    
    // Atualizar contagem
    atualizarContagemFiltrada();
}

// Atualizar contagem de registros filtrados
async function atualizarContagemFiltrada() {
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
    
    document.getElementById('contagemTotal').textContent = total;
    document.getElementById('contagemFiltrada').textContent = filtrados.length;
}

