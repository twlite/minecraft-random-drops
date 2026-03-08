import { type PluginContext } from 'ecmacraft';
import { RandomDropsHandler } from './random-drops/handler.js';

export default function main(ctx: PluginContext) {
  const handler = new RandomDropsHandler(ctx);

  ctx.registerHandlers(handler);

  return () => handler.destroy();
}
