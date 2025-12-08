// Finance Control - Main JavaScript

// API Base URL
const API_BASE = 'tables';

// Global state
let entradas = [];
let saidas = [];
let deleteTarget = { type: null, id: null };

// DOM Elements
const formEntrada = document.getElementById('formEntrada');
const formSaida = document.getElementById('formSaida');
const tabelaEntradas = document.getElementById('tabelaEntradas');
const tabelaSaidas = document.getElementById('tabelaSaidas');
const modalDelete = document.getElementById('modalDelete');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entradaData').value = today;
    document.getElementById('saidaData').value = today;

    // Load data
    loadEntradas();
    loadSaidas();

    // Form submissions
    formEntrada.addEventListener('submit', handleEntradaSubmit);
    formSaida.addEventListener('submit', handleSaidaSubmit);

    // Modal buttons
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // Close modal on backdrop click
    modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) closeDeleteModal();
    });
});

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
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300';
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300';
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

// Update summary cards
function updateSummary() {
    const totalEntradas = entradas.reduce((sum, e) => sum + (parseFloat(e.valor) || 0), 0);
    const totalSaidas = saidas.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
    const saldo = totalEntradas - totalSaidas;

    document.getElementById('totalEntradas').textContent = formatCurrency(totalEntradas);
    document.getElementById('totalSaidas').textContent = formatCurrency(totalSaidas);
    
    const saldoEl = document.getElementById('saldo');
    saldoEl.textContent = formatCurrency(saldo);
    saldoEl.className = `text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`;

    document.getElementById('countEntradas').textContent = `${entradas.length} registro${entradas.length !== 1 ? 's' : ''}`;
    document.getElementById('countSaidas').textContent = `${saidas.length} registro${saidas.length !== 1 ? 's' : ''}`;

    // Pulse animation
    document.querySelectorAll('.bg-white.rounded-xl.shadow-md').forEach(card => {
        card.classList.add('pulse-once');
        setTimeout(() => card.classList.remove('pulse-once'), 500);
    });
}

// Load Entradas
async function loadEntradas() {
    try {
        const response = await fetch(`${API_BASE}/entradas?limit=1000&sort=-data`);
        const result = await response.json();
        entradas = result.data || [];
        renderEntradas();
        updateSummary();
    } catch (error) {
        console.error('Erro ao carregar entradas:', error);
        showToast('Erro ao carregar entradas', 'error');
    }
}

// Load Saídas
async function loadSaidas() {
    try {
        const response = await fetch(`${API_BASE}/saidas?limit=1000&sort=-data`);
        const result = await response.json();
        saidas = result.data || [];
        renderSaidas();
        updateSummary();
    } catch (error) {
        console.error('Erro ao carregar saídas:', error);
        showToast('Erro ao carregar saídas', 'error');
    }
}

// Render Entradas table
function renderEntradas() {
    if (entradas.length === 0) {
        tabelaEntradas.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma entrada registrada</p>
                </td>
            </tr>
        `;
        return;
    }

    tabelaEntradas.innerHTML = entradas.map(entrada => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(entrada.data)}</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-emerald-500"></i>
                    ${entrada.categoria}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${entrada.descricao || '-'}</td>
            <td class="px-4 py-3 text-right valor-positivo">${formatCurrency(entrada.valor)}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="openDeleteModal('entrada', '${entrada.id}')" class="btn-delete" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render Saídas table
function renderSaidas() {
    if (saidas.length === 0) {
        tabelaSaidas.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhuma saída registrada</p>
                </td>
            </tr>
        `;
        return;
    }

    tabelaSaidas.innerHTML = saidas.map(saida => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm text-gray-600">${formatDate(saida.data)}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${saida.loja}</td>
            <td class="px-4 py-3">
                <span class="badge-categoria">
                    <i class="fas fa-tag text-red-500"></i>
                    ${saida.categoria}
                </span>
            </td>
            <td class="px-4 py-3">
                <span class="badge badge-${saida.tipo_pagamento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}">
                    ${saida.tipo_pagamento}
                </span>
            </td>
            <td class="px-4 py-3 text-right valor-negativo">${formatCurrency(saida.valor)}</td>
            <td class="px-4 py-3 text-center">
                <button onclick="openDeleteModal('saida', '${saida.id}')" class="btn-delete" title="Excluir">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Handle Entrada form submit
async function handleEntradaSubmit(e) {
    e.preventDefault();
    
    const data = {
        categoria: document.getElementById('entradaCategoria').value,
        valor: parseFloat(document.getElementById('entradaValor').value),
        data: document.getElementById('entradaData').value,
        descricao: document.getElementById('entradaDescricao').value || ''
    };

    try {
        const response = await fetch(`${API_BASE}/entradas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Entrada registrada com sucesso!');
            formEntrada.reset();
            document.getElementById('entradaData').value = new Date().toISOString().split('T')[0];
            loadEntradas();
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao registrar entrada', 'error');
    }
}

// Handle Saída form submit
async function handleSaidaSubmit(e) {
    e.preventDefault();
    
    const data = {
        loja: document.getElementById('saidaLoja').value,
        categoria: document.getElementById('saidaCategoria').value,
        descricao: document.getElementById('saidaDescricao').value,
        valor: parseFloat(document.getElementById('saidaValor').value),
        tipo_pagamento: document.getElementById('saidaTipoPagamento').value,
        data: document.getElementById('saidaData').value
    };

    try {
        const response = await fetch(`${API_BASE}/saidas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Saída registrada com sucesso!');
            formSaida.reset();
            document.getElementById('saidaData').value = new Date().toISOString().split('T')[0];
            loadSaidas();
        } else {
            throw new Error('Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao registrar saída', 'error');
    }
}

// Open delete confirmation modal
function openDeleteModal(type, id) {
    deleteTarget = { type, id };
    modalDelete.classList.remove('hidden');
    modalDelete.classList.add('show');
}

// Close delete modal
function closeDeleteModal() {
    modalDelete.classList.add('hidden');
    modalDelete.classList.remove('show');
    deleteTarget = { type: null, id: null };
}

// Confirm delete
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
            
            if (deleteTarget.type === 'entrada') {
                loadEntradas();
            } else {
                loadSaidas();
            }
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir registro', 'error');
    }
}
