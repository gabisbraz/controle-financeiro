function formatarData(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return valor;
  const data = new Date((valor - 25569) * 86400 * 1000);
  return data.toISOString().split('T')[0];
}

module.exports = { formatarData };
