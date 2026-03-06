import {
  type PluginContext,
  Event,
  type SpigotEventType,
  Command,
  Autocomplete,
  chalk,
} from 'ecmacraft';
import { CommandSender, ItemStack, Material } from 'ecmacraft/spigot';

const BLACKLISTED_MATERIALS = [
  'spawn_egg',
  'air',
  'barrier',
  'command_block',
  'structure_block',
  'jigsaw',
  'debug_stick',
  'knowledge_book',
  'legacy_',
];

class RandomDrops {
  private isEnabled = false;
  private blockToMaterialMap = new Map<Material, Material>();
  private MATERIAL_LIST: Material[] | null = null;

  private getMaterialList() {
    if (!this.MATERIAL_LIST) {
      this.MATERIAL_LIST = Material.values().filter((f) => {
        if (!f.isItem()) return false;

        // @ts-ignore
        const name: string = f.name().toLowerCase();

        return !BLACKLISTED_MATERIALS.some((blacklisted) =>
          name.includes(blacklisted),
        );
      });
    }

    return this.MATERIAL_LIST;
  }

  public destroy() {
    this.isEnabled = false;
    this.blockToMaterialMap.clear();
    this.MATERIAL_LIST = null;
  }

  @Command('randomdrops')
  public randomDropsCommand(
    sender: CommandSender,
    args: string[],
    label: string,
  ) {
    if (!sender.isOp()) {
      sender.sendMessage(
        chalk.red`You do not have permission to use this command.`,
      );
      return false;
    }

    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'on':
        this.isEnabled = true;
        sender.sendMessage(chalk.green`Random drops enabled!`);
        return true;
      case 'off':
        this.isEnabled = false;
        sender.sendMessage(chalk.yellow`Random drops disabled!`);
        return true;
      default:
        sender.sendMessage(
          chalk.red`Invalid subcommand. Use /${label} <on|off>.`,
        );
        return false;
    }
  }

  @Autocomplete('randomdrops')
  public randomDropsAutocomplete(sender: CommandSender, args: string[]) {
    if (!sender.isOp()) return [];

    const lastArg = args[args.length - 1]?.toLowerCase() ?? '';
    return ['on', 'off'].filter((option) => option.startsWith(lastArg));
  }

  @Event('BlockBreakEvent')
  public onBlockBreakEvent(event: SpigotEventType<'BlockBreakEvent'>) {
    if (!this.isEnabled) return;
    if (!event.getPlayer()) return;

    const block = event.getBlock();
    const drops = block.getDrops();

    event.setDropItems(false);

    if (!drops.length) return;

    const randomMaterial = this.getRandomMaterial(block.getType());
    const dropAmount = Math.floor(Math.random() * 1024) + 1;
    const stack = new ItemStack(randomMaterial, dropAmount);

    block.getWorld().dropItemNaturally(block.getLocation(), stack);
  }

  private getRandomMaterial(blockType: Material) {
    const existing = this.blockToMaterialMap.get(blockType);
    if (existing) return existing;

    const materials = this.getMaterialList();
    const randomMaterial =
      materials[Math.floor(Math.random() * materials.length)];

    this.blockToMaterialMap.set(blockType, randomMaterial);

    return randomMaterial;
  }
}

export default function main(ctx: PluginContext) {
  const handler = new RandomDrops();

  ctx.registerHandlers(handler);

  return () => handler.destroy();
}
