# 💰 Controle Financeiro Pessoal

Sistema web completo para gerenciamento de finanças pessoais, permitindo registrar entradas e saídas de dinheiro com visualização em dashboards interativos.

## ✅ Funcionalidades Implementadas

### Página Principal (Registros)
- ✅ Formulário para cadastro de **Entradas** (receitas)
  - Categoria (Salário, 13º Salário, Bônus, Pagamento, Freelance, Investimentos, Outros)
  - Valor
  - Data
  - Descrição (opcional)
  
- ✅ Formulário para cadastro de **Saídas** (despesas)
  - Loja/Estabelecimento
  - Categoria (Transporte, Alimentação, Autocuidado, Moradia, Saúde, Educação, Lazer, Vestuário, Outros)
  - Descrição
  - Valor
  - Tipo de Pagamento (PIX, Crédito, Débito, Dinheiro, Boleto)
  - Data

- ✅ Cartões resumo com:
  - Total de Entradas
  - Total de Saídas
  - Saldo atual

- ✅ Tabela de Entradas com visualização completa
- ✅ Tabela de Saídas com visualização completa
- ✅ Exclusão de registros com modal de confirmação
- ✅ Notificações toast para feedback das ações

### Página de Dashboard
- ✅ Filtros por período:
  - Todos os registros
  - Este mês
  - Este trimestre
  - Este ano
  - Período personalizado (datas inicial e final)

- ✅ Cartões resumo com:
  - Total de Entradas
  - Total de Saídas
  - Saldo
  - Taxa de Economia

- ✅ **Gráficos interativos:**
  - 📊 Entradas vs Saídas por Mês (barras)
  - 📈 Fluxo de Caixa Acumulado (linha)
  - 🍩 Saídas por Categoria (donut)
  - 🍩 Entradas por Categoria (donut)
  - 🥧 Saídas por Tipo de Pagamento (pizza)
  - 📊 Top 10 Lojas com Mais Gastos (barras horizontais)

- ✅ Tabela com últimas 15 transações

## 📁 Estrutura do Projeto

```
/
├── index.html          # Página principal (registros)
├── dashboard.html      # Página de dashboards
├── css/
│   └── style.css       # Estilos customizados
├── js/
│   ├── main.js         # JavaScript da página principal
│   └── dashboard.js    # JavaScript do dashboard
└── README.md           # Documentação
```

## 🔗 URIs Funcionais

| Página | Caminho | Descrição |
|--------|---------|-----------|
| Registros | `/index.html` | Página principal para cadastro e visualização |
| Dashboard | `/dashboard.html` | Gráficos e análises financeiras |

## 📊 Modelos de Dados

### Tabela: `entradas`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| categoria | text | Categoria da entrada |
| valor | number | Valor monetário |
| data | datetime | Data da entrada |
| descricao | text | Descrição opcional |

### Tabela: `saidas`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | ID único |
| loja | text | Nome da loja |
| categoria | text | Categoria da saída |
| descricao | text | Descrição da compra |
| valor | number | Valor monetário |
| tipo_pagamento | text | Tipo de pagamento |
| data | datetime | Data da saída |

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **Tailwind CSS** - Framework CSS utilitário
- **JavaScript ES6+** - Lógica e interatividade
- **Chart.js** - Gráficos interativos
- **Font Awesome** - Ícones
- **Google Fonts (Inter)** - Tipografia

## 🚀 Como Usar

1. Acesse a página principal (`index.html`)
2. Use os formulários para registrar entradas e saídas
3. Visualize os registros nas tabelas abaixo dos formulários
4. Clique em "Dashboard" no menu para ver os gráficos
5. Use os filtros de período para analisar diferentes intervalos de tempo

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile

## 🔜 Próximos Passos (Melhorias Futuras)

- [ ] Edição de registros existentes
- [ ] Exportação de dados (CSV/PDF)
- [ ] Metas financeiras mensais
- [ ] Categorias personalizadas
- [ ] Importação de extratos bancários
- [ ] Gráfico de evolução patrimonial
- [ ] Alertas de gastos por categoria
- [ ] Modo escuro

## 📝 Licença

Este projeto é de uso pessoal e livre para modificações.
