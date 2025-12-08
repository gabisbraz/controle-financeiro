import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Transacao } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransacoesService {
  private storageKey = 'transacoes';
  private transacoesSubject = new BehaviorSubject<Transacao[]>([]);
  transacoes$ = this.transacoesSubject.asObservable();

  private nextId = 1;

  constructor() {
    this.load();
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.transacoesSubject.value));
  }

  private load() {
    const raw = localStorage.getItem(this.storageKey);
    let list: Transacao[] = [];

    if (raw) {
      list = JSON.parse(raw);
      const maxId = list.reduce((m, t) => Math.max(m, t.id), 0);
      this.nextId = maxId + 1;
    }

    this.transacoesSubject.next(list);
  }

  limparTudo() {
    this.transacoesSubject.next([]);
    this.nextId = 1;
    this.save();
  }

  listarTransacoes() {
    return [...this.transacoesSubject.value].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }

  adicionarTransacao(t: Omit<Transacao, 'id'>) {
    const nova = { ...t, id: this.nextId++ };
    const lista = [...this.transacoesSubject.value, nova];

    this.transacoesSubject.next(lista);
    this.save();
  }

  removerTransacao(id: number) {
    const lista = this.transacoesSubject.value.filter(t => t.id !== id);
    this.transacoesSubject.next(lista);
    this.save();
  }
}
