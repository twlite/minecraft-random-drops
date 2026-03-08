import { chalk, PluginContext } from 'ecmacraft';
import { Server } from 'ecmacraft/spigot';

export class DropScaler {
  private amountMultiplier = 1;
  private multiplierInterval: ReturnType<typeof setInterval> | null = null;
  private server: Server;

  public constructor(ctx: PluginContext) {
    this.server = ctx.getPlugin().getServer();
  }

  public start() {
    this.stop();
    this.amountMultiplier = 1;
  }

  public schedule(intervalMs: number, maxMultiplier: number) {
    this.multiplierInterval = setInterval(() => {
      this.amountMultiplier = Math.min(
        this.amountMultiplier * 2,
        maxMultiplier,
      );

      this.server.broadcastMessage(
        chalk.yellow`Random drops multiplier increased to ${this.amountMultiplier}x!`,
      );

      if (this.amountMultiplier >= maxMultiplier) {
        this.server.broadcastMessage(
          chalk.green`Random drops multiplier reached maximum value of ${this.amountMultiplier}x!`,
        );

        this.stop();
      }
    }, intervalMs);
  }

  public stop() {
    if (!this.multiplierInterval) return;

    clearInterval(this.multiplierInterval);
    this.multiplierInterval = null;
  }

  public reset() {
    this.amountMultiplier = 1;
  }

  public getScaledAmount(maxAmount: number) {
    return Math.min(this.amountMultiplier, maxAmount);
  }
}
