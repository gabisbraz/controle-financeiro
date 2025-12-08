export type TipoTransacao = 'entrada' | 'saida';

export interface Transacao {
  id: number;
  tipo: TipoTransacao;
  categoria: string;
  valor: number;
  data: string;
}


