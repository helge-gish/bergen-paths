import { prepareCharacter } from './character';
import { applyCommand, decodeAccount, newAccount } from './engine';
import type { Account, Command, GameRegistry, Persistence, PositionFix, Snapshot } from './types';

/** Serializes writes; a failed write cannot become visible as a completed trade. */
export class Session {
  private tail: Promise<unknown> = Promise.resolve();
  private arEncounter: { id: string; gameId: string | null; until: number } | null = null;
  openArEncounter(id: string) { this.arEncounter = { id, gameId: this.account?.currentGame ?? null, until: Date.now() + 5 * 60_000 }; }
  closeArEncounter() { this.arEncounter = null; }
  private physicalFix: PositionFix | null = null;
  setPosition(fix: PositionFix | null) { this.physicalFix = fix ? { ...fix } : null; }
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
    if (this.account) prepareCharacter(this.account, this.registry);
    return this.account;
  }); }
  create(name: string) { return this.queue(async () => {
    if (await this.persistence.read() !== null) throw new Error('Det finnes allerede en figur på denne enheten.');
    const account = newAccount(name); prepareCharacter(account, this.registry);
    await this.persistence.write(JSON.stringify(account)); this.account = account; return account;
  }); }
  dispatch(command: Command): Promise<Snapshot> { return this.queue(async () => {
    if (!this.account) throw new Error('Opprett en figur først.');
    const next = applyCommand(this.account, this.registry, command, Date.now(), this.physicalFix, this.arEncounter && this.arEncounter.gameId === this.account.currentGame && this.arEncounter.until >= Date.now() ? this.arEncounter.id : null);
    if (next.account !== this.account) await this.persistence.write(JSON.stringify(next.account));
    this.account = next.account; if (command.action.type === 'enter' || command.action.type === 'leave' || command.action.type === 'abandon') this.arEncounter = null; return next;
  }); }
}
