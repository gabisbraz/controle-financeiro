export type TipoTransacao = 'entrada' | 'saida';

export type CategoriaSaida = 'alimentacao' | 'transporte' | 'roupa' | 'autocuidado' | 'presente' | 'pagamento' | string;

export type TipoPagamento = 'credito' | 'debito' | 'pix' | string;

export interface Transacao {
  id?: number;
  tipo: TipoTransacao;
  categoria: string;
  valor: number;
  data: string;
  loja?: string;
  descricao?: string;
  tipoPagamento?: TipoPagamento;
}


