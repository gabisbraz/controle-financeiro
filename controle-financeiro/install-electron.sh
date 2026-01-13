#!/bin/bash

echo "🚀 Instalando dependências do Electron..."

cd backend

# Instalar dependências do Electron
echo "📦 Instalando electron e electron-builder..."
npm install --save-dev electron@28.0.0 electron-builder@24.9.1

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📋 Como usar:"
echo ""
echo "1. Para ABRIR o app:"
echo "   cd backend && npm run electron:dev"
echo ""
echo "   ⚠️ O servidor backend iniciará automaticamente junto com a janela!"
echo ""
echo "2. Para GERAR o executável (.dmg):"
echo "   cd backend && npm run electron:build"
echo ""
echo "📁 O executável será gerado em:"
echo "   backend/dist/Controle Financeiro.dmg"
echo "   backend/dist/Controle Financeiro.app"
echo ""
echo "💡 Dica: Para distribuir o app, basta enviar o arquivo .dmg!"
echo ""

