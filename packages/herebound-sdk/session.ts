import { applyCommand, decodeAccount, newAccount } from './engine';
import type { Account, Command, GameRegistry, Persistence, Snapshot } from './types';

/** Serializes writes; a failed write cannot become visible as a completed trade. */
export class Session {
  private tail: Promise<unknown> = Promise.resolve();
  private account: Account | null = null;
  constructor(private registry: GameRegistry, private persistence: Persistence) {}
  private queue<T>(work: () => Promise<T>): Promise<T> {
    const pending = this.tail.then(work);
    this.tail = pending.catch(() => undefined);
    return pending;
  }
  load() { return this.queue(async () => {
    const raw = await this.persistence.read();
    this.account = raw === null ? null : decodeAccount(raw);
    return this.account;
  }); }
  create(name: string) { return this.queue(async () => {
    if (await this.persistence.read() !== null) throw new Error('Det finnes allerede en figur på denne enheten.');
    const account = newAccount(name);
    await this.persistence.write(JSON.stringify(account)); this.account = account; return account;
  }); }
  dispatch(command: Command): Promise<Snapshot> { return this.queue(async () => {
    if (!this.account) throw new Error('Opprett en figur først.');
    const next = applyCommand(this.account, this.registry, command);
    if (next.account !== this.account) await this.persistence.write(JSON.stringify(next.account));
    this.account = next.account; return next;
  }); }
}
