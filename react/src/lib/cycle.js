// Recorrência: opções da UI alinhadas ao enum CycleType do backend
// (DAILY | WEEKLY | MONTHLY | ANNUAL). O front antigo tinha "biweekly",
// que o backend não suporta — trocado por "annual".
export const TIPOS = ['none', 'DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'];

const ROTULOS = {
  none: 'Não repete',
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  ANNUAL: 'Anual',
};

export function rotuloCiclo(tipo) {
  return ROTULOS[tipo] || 'Sem recorrência';
}
