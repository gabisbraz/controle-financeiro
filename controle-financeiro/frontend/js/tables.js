// Tables Viewer - JavaScript

const API_BASE = 'http://localhost:3000/database';

// State
let tables = [];
let currentTable = null;
let currentData = [];
let currentColumns = [];
let deleteTarget = { table: null, id: null };
let orderDirection = 'DESC';
let currentOffset = 0;
let currentLimit = 100;

// Table configurations
const tableConfigs = {
    entradas: {
        icon: 'fa-arrow-up',
        color: 'emerald',
        title: 'Entradas',
        description: 'Registro de todas as entradas de dinheiro'
    },
    saidas: {
        icon: 'fa-arrow-down',
        color: 'red',
        title: 'Saídas',
        description: 'Registro de todas as saídas de dinheiro'
    },
    cartao_fatura: {
        icon: 'fa-credit-card',
        color: 'blue',
        title: 'Cartões/Fatura',
        description: 'Configuração dos cartões de crédito'
    },
    categorias_saidas: {
        icon: 'fa-tags',
        color: 'orange',
        title: 'Categorias de Saída',
        description: 'Categorias para classificar saídas'
    },
    categorias_entradas: {
        icon: 'fa-tag',
        color: 'green',
        title: 'Categorias de Entrada',
        description: 'Categorias para classificar entradas'
    },
    tipos_pagamento: {
        icon: 'fa-money-bill',
        color: 'purple',
        title: 'Tipos de Pagamento',
        description: 'Métodos de pagamento disponíveis'
    },
    lojas: {
        icon: 'fa-store',
        color: 'pink',
        title: 'Lojas',
        description: 'Lojas cadastradas para registrar compras'
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTables();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadTableData(currentTable);
        }, 300);
    });

    // Field selection
    document.getElementById('searchField').addEventListener('change', () => {
        loadTableData(currentTable);
    });

    // Order by
    document.getElementById('orderBy').addEventListener('change', () => {
        loadTableData(currentTable);
    });

    // Limit
    document.getElementById('limitSelect').addEventListener('change', (e) => {
        currentLimit = parseInt(e.target.value);
        currentOffset = 0;
        loadTableData(currentTable);
    });

    // Delete modal
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
    
    const modalDelete = document.getElementById('modalDelete');
    modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) closeDeleteModal();
    });
}

// Load all tables
async function loadTables() {
    try {
        const response = await fetch(`${API_BASE}/tables`);
        const result = await response.json();
        tables = result.data || [];
        
        renderStatsCards();
        renderTableTabs();
        
        // Select first table if available
        if (tables.length > 0) {
            switchTable(tables[0].name);
        }
    } catch (error) {
        console.error('Erro ao carregar tabelas:', error);
        showToast('Erro ao carregar tabelas', 'error');
    }
}

// Render statistics cards
function renderStatsCards() {
    const container = document.getElementById('statsContainer');
    
    Promise.all(
        tables.map(async (table) => {
            try {
                const response = await fetch(`${API_BASE}/tables/${table.name}/count`);
                const result = await response.json();
                return { name: table.name, count: result.total };
            } catch {
                return { name: table.name, count: 0 };
            }
        })
    ).then(results => {
        container.innerHTML = results.map(({ name, count }) => {
            const config = tableConfigs[name] || { icon: 'fa-table', color: 'gray', title: name };
            const colors = {
                emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                red: 'bg-red-100 text-red-700 border-red-200',
                blue: 'bg-blue-100 text-blue-700 border-blue-200',
                orange: 'bg-orange-100 text-orange-700 border-orange-200',
                green: 'bg-green-100 text-green-700 border-green-200',
                purple: 'bg-purple-100 text-purple-700 border-purple-200',
                pink: 'bg-pink-100 text-pink-700 border-pink-200',
                gray: 'bg-gray-100 text-gray-700 border-gray-200'
            };
            
            return `
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-${config.color}-500 cursor-pointer hover:shadow-md transition"
                     onclick="switchTable('${name}')">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 uppercase">${config.title}</p>
                            <p class="text-2xl font-bold text-gray-800">${count.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// Render table tabs
function renderTableTabs() {
    const container = document.getElementById('tableTabs');
    container.innerHTML = tables.map(table => {
        const config = tableConfigs[table.name] || { icon: 'fa-table', title: table.name };
        const isActive = table.name === currentTable;
        
        return `
            <button onclick="switchTable('${table.name}')"
                    class="tab-btn flex items-center gap-2 px-6 py-4 text-center border-b-2 transition whitespace-nowrap
                           ${isActive 
                               ? 'border-indigo-500 text-indigo-600 bg-indigo-50' 
                               : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
                <i class="fas ${config.icon}"></i>
                <span>${config.title}</span>
            </button>
        `;
    }).join('');
}

// Switch table
async function switchTable(tableName) {
    currentTable = tableName;
    currentOffset = 0;
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.textContent.trim().toLowerCase().includes(tableConfigs[tableName]?.title?.toLowerCase() || tableName);
        if (isActive) {
            btn.classList.add('border-indigo-500', 'text-indigo-600', 'bg-indigo-50');
            btn.classList.remove('border-transparent', 'text-gray-500');
        } else {
            btn.classList.remove('border-indigo-500', 'text-indigo-600', 'bg-indigo-50');
            btn.classList.add('border-transparent', 'text-gray-500');
        }
    });
    
    await loadTableData(tableName);
    renderStatsCards();
}

// Load table data
async function loadTableData(tableName) {
    if (!tableName) return;
    
    const search = document.getElementById('searchInput').value;
    const searchField = document.getElementById('searchField').value;
    const orderBy = document.getElementById('orderBy').value;
    const limit = currentLimit;
    const offset = currentOffset;
    
    try {
        let url = `${API_BASE}/tables/${tableName}?limit=${limit}&offset=${offset}`;
        if (search && searchField) {
            url += `&search=${encodeURIComponent(search)}&searchField=${searchField}`;
        }
        if (orderBy) {
            url += `&orderBy=${orderBy}&order=${orderDirection}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        currentData = result.data || [];
        currentColumns = result.columns || [];
        
        renderTableHeader();
        renderTableBody();
        renderPagination(result.total);
        updateSearchFields();
        
        // Update record info
        const start = offset + 1;
        const end = Math.min(offset + limit, result.total);
        document.getElementById('recordInfo').textContent = 
            result.total > 0 ? `Mostrando ${start}-${end} de ${result.total} registros` : 'Nenhum registro encontrado';
            
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados da tabela', 'error');
    }
}

// Render table header
function renderTableHeader() {
    const thead = document.getElementById('tableHead');
    
    if (currentColumns.length === 0) {
        thead.innerHTML = '<tr><th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sem dados</th></tr>';
        return;
    }
    
    // Get ID column name (could be 'id' or 'cid' or similar)
    const idColumn = currentColumns.find(c => c.name === 'id') || currentColumns[0];
    
    thead.innerHTML = `
        <tr>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-16">#</th>
            ${currentColumns.map(col => `
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">
                    ${formatColumnName(col.name)}
                </th>
            `).join('')}
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-20">Ações</th>
        </tr>
    `;
}

// Render table body
function renderTableBody() {
    const tbody = document.getElementById('tableBody');
    
    if (currentData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${currentColumns.length + 2}" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 block"></i>
                    <p>Nenhum registro encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentData.map((row, index) => {
        const id = row.id || row.cid || Object.values(row)[0];
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3 text-center text-sm text-gray-500">${currentOffset + index + 1}</td>
                ${currentColumns.map(col => `
                    <td class="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        ${formatCellValue(row[col.name], col.type)}
                    </td>
                `).join('')}
                <td class="px-4 py-3 text-center">
                    ${canDelete(currentTable) ? `
                        <button onclick="openDeleteModal('${currentTable}', ${id})"
                                class="text-red-500 hover:text-red-700 transition"
                                title="Excluir">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

// Update search and order fields
function updateSearchFields() {
    const searchField = document.getElementById('searchField');
    const orderBy = document.getElementById('orderBy');
    
    const currentSearchField = searchField.value;
    const currentOrderBy = orderBy.value;
    
    // Build options for searchable/orderable columns (exclude complex types)
    const options = currentColumns
        .filter(col => {
            const type = col.type.toLowerCase();
            return !type.includes('blob') && !type.includes('text');
        })
        .map(col => `<option value="${col.name}">${formatColumnName(col.name)}</option>`)
        .join('');
    
    searchField.innerHTML = '<option value="">Todos os campos</option>' + options;
    orderBy.innerHTML = '<option value="">Padrão (ID)</option>' + options;
    
    // Restore selections
    if (currentSearchField && currentColumns.find(c => c.name === currentSearchField)) {
        searchField.value = currentSearchField;
    }
    if (currentOrderBy && currentColumns.find(c => c.name === currentOrderBy)) {
        orderBy.value = currentOrderBy;
    }
}

// Render pagination
function renderPagination(total) {
    const container = document.getElementById('paginationContainer');
    const totalPages = Math.ceil(total / currentLimit);
    const currentPage = Math.floor(currentOffset / currentLimit) + 1;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let buttons = [];
    
    // Previous button
    buttons.push(`
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}
                class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fas fa-chevron-left"></i>
        </button>
    `);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            buttons.push(`
                <button onclick="goToPage(${i})"
                        class="px-3 py-2 rounded-lg border ${i === currentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'hover:bg-gray-50'}">
                    ${i}
                </button>
            `);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            buttons.push('<span class="px-2">...</span>');
        }
    }
    
    // Next button
    buttons.push(`
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
                class="px-3 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fas fa-chevron-right"></i>
        </button>
    `);
    
    container.innerHTML = buttons.join('');
}

// Go to page
function goToPage(page) {
    const totalPages = Math.ceil((currentData.length > 0 ? (currentData.length + currentOffset) : 0) / currentLimit) || 1;
    if (page < 1 || page > totalPages) return;
    
    currentOffset = (page - 1) * currentLimit;
    loadTableData(currentTable);
}

// Toggle order direction
function toggleOrder() {
    orderDirection = orderDirection === 'DESC' ? 'ASC' : 'DESC';
    document.getElementById('orderIcon').className = 
        orderDirection === 'DESC' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up';
    loadTableData(currentTable);
}

// Format column name
function formatColumnName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase())
        .trim();
}

// Format cell value based on type
function formatCellValue(value, type) {
    if (value === null || value === undefined) return '<span class="text-gray-400">NULL</span>';
    
    const typeLower = type?.toLowerCase() || '';
    
    // Numeric types
    if (typeLower.includes('int') || typeLower.includes('real') || typeLower.includes('float')) {
        const num = parseFloat(value);
        if (typeLower.includes('valor') || nameIncludes(value, ['valor', 'valor', 'amount', 'price'])) {
            return formatCurrency(num);
        }
        return num.toLocaleString('pt-BR');
    }
    
    // Date types
    if (typeLower.includes('date') || typeLower.includes('time')) {
        return formatDate(value);
    }
    
    // Boolean types (stored as 0/1 or 'active', 'ativa', etc.)
    if (typeLower.includes('bool') || nameIncludes(value, ['ativa', 'ativo', 'active', 'enabled'])) {
        return value == 1 || value === '1' || value === true 
            ? '<span class="badge badge-emerald">Sim</span>' 
            : '<span class="badge badge-gray">Não</span>';
    }
    
    // Default string
    return String(value);
}

// Helper to check if value name includes keyword
function nameIncludes(value, keywords) {
    const str = String(value).toLowerCase();
    return keywords.some(k => str.includes(k.toLowerCase()));
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(parseFloat(value) || 0);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

// Check if table can be deleted from
function canDelete(tableName) {
    return ['entradas', 'saidas', 'categorias_saidas', 'categorias_entradas', 'tipos_pagamento', 'lojas'].includes(tableName);
}

// Delete functions
function openDeleteModal(table, id) {
    deleteTarget = { table, id };
    const modal = document.getElementById('modalDelete');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteModal() {
    const modal = document.getElementById('modalDelete');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    deleteTarget = { table: null, id: null };
}

async function confirmDelete() {
    if (!deleteTarget.table || !deleteTarget.id) return;
    
    try {
        const response = await fetch(`${API_BASE}/tables/${deleteTarget.table}/${deleteTarget.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            showToast('Registro excluído com sucesso!');
            closeDeleteModal();
            loadTableData(currentTable);
            renderStatsCards();
        } else {
            throw new Error('Erro ao excluir');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir registro', 'error');
    }
}

// Export to CSV
function exportToCSV() {
    if (currentData.length === 0) {
        showToast('Nenhum dado para exportar', 'error');
        return;
    }
    
    const headers = currentColumns.map(col => formatColumnName(col.name));
    const rows = currentData.map(row => 
        currentColumns.map(col => {
            let value = row[col.name];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentTable}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exportado com sucesso!');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        toastIcon.className = 'fas fa-exclamation-circle';
    }
    
    toast.classList.remove('hidden', 'translate-y-full', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

