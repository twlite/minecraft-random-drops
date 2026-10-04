import {
  type SpigotEventType,
  Event,
  Command,
  Autocomplete,
  chalk,
  PluginContext,
} from 'ecmacraft';
import {
  CommandSender,
  EntityType,
  ItemStack,
  Location,
  Material,
  World,
} from 'ecmacraft/spigot';
import {
  MAX_RANDOM_DROPS,
  MAX_MOB_SPAWN,
  SCALE_INTERVAL_MS,
} from './constants.js';
import { MaterialResolver } from './materials.js';
import { DropScaler } from './drop-scaler.js';

export class RandomDropsHandler {
  private isEnabled = false;
  private readonly scaler: DropScaler;
  private readonly materialResolvers = new Map<string, MaterialResolver>();

  public constructor(ctx: PluginContext) {
    this.scaler = new DropScaler(ctx);
  }

  public destroy() {
    this.isEnabled = false;
    this.scaler.stop();
    this.materialResolvers.clear();
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
        if (this.isEnabled) {
          sender.sendMessage(chalk.yellow`Random drops are already enabled.`);
          return true;
        }

        this.isEnabled = true;
        this.materialResolvers.clear();
        this.scaler.start();
        this.scaler.schedule(SCALE_INTERVAL_MS, MAX_RANDOM_DROPS);
        sender.sendMessage(
          chalk.green`Random drops enabled with cursed bonuses! Multiplier starts at 1 and doubles every ${SCALE_INTERVAL_MS / 60000} minutes.`,
        );
        return true;
      case 'off':
        if (!this.isEnabled) {
          sender.sendMessage(chalk.yellow`Random drops are already disabled.`);
          return true;
        }

        this.isEnabled = false;
        this.scaler.stop();
        this.scaler.reset();
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
    if (event.isCancelled()) return;

    const player = event.getPlayer();
    if (!player) return;

    const block = event.getBlock();
    const tool = player.getInventory().getItemInMainHand();
    // Supplying the held item makes the server enforce tool and harvest-tier rules.
    const drops = tool ? block.getDrops(tool) : block.getDrops();

    event.setDropItems(false);

    if (!drops.length) return;

    const world = block.getWorld();
    const resolver = this.getMaterialResolver(world);
    const randomMaterial = resolver.getRandomMaterialForBlock(
      block.getType(),
    );

    this.spawnRandomOutcomes(
      randomMaterial,
      resolver,
      world,
      block.getLocation(),
    );
  }

  @Event('EntityDeathEvent')
  public onEntityDeathEvent(event: SpigotEventType<'EntityDeathEvent'>) {
    if (!this.isEnabled) return;

    const entity = event.getEntity();
    if (!entity) return;
    if (entity.getType() === EntityType.PLAYER) return;

    const killer = entity.getKiller();
    if (!killer) return;

    // @ts-ignore clear() doesnt exist on types but does exist at runtime.
    event.getDrops().clear();
    event.setDroppedExp(0);

    const world = entity.getWorld();
    const resolver = this.getMaterialResolver(world);
    const randomMaterial = resolver.getRandomMaterialForEntity(
      entity.getType(),
    );

    this.spawnRandomOutcomes(
      randomMaterial,
      resolver,
      world,
      entity.getLocation(),
    );
  }

  @Event('EntityDropItemEvent')
  public onEntityDropItemEvent(event: SpigotEventType<'EntityDropItemEvent'>) {
    if (!this.isEnabled) return;

    const entity = event.getEntity();
    if (!entity) return;
    if (!this.isPlayerKillOnNonPlayerEntity(entity)) return;

    event.setCancelled(true);
  }

  private getMaterialResolver(world: World) {
    const seed = world.getSeed();
    const key = String(seed);
    let resolver = this.materialResolvers.get(key);
    if (!resolver) {
      resolver = new MaterialResolver(seed);
      this.materialResolvers.set(key, resolver);
    }
    return resolver;
  }

  private spawnRandomOutcomes(
    randomMaterial: Material,
    resolver: MaterialResolver,
    world: World,
    location: Location,
  ) {
    this.spawnRandomOutcome(randomMaterial, resolver, world, location);

    // One roll per break/kill, not per scaled item or mob. Bonuses never recurse.
    const bonus = resolver.getCursedBonus(randomMaterial);
    if (bonus) this.spawnRandomOutcome(bonus, resolver, world, location);
  }

  private spawnRandomOutcome(
    randomMaterial: Material,
    resolver: MaterialResolver,
    world: World,
    location: Location,
  ) {
    if (resolver.isSpawnEgg(randomMaterial)) {
      const entityType =
        resolver.getEntityTypeFromSpawnEgg(randomMaterial);

      if (!entityType) {
        console.error(
          `EntityType not found for material: ${String(randomMaterial)}`,
        );
        return;
      }

      const spawnAmount = this.scaler.getScaledAmount(MAX_MOB_SPAWN);

      for (let i = 0; i < spawnAmount; i++) {
        world.spawnEntity(location, entityType as EntityType);
      }
      return;
    }

    const dropAmount = this.scaler.getScaledAmount(MAX_RANDOM_DROPS);
    const stack = new ItemStack(randomMaterial, dropAmount);
    world.dropItemNaturally(location, stack);
  }

  private isPlayerKillOnNonPlayerEntity(entity: {
    getType(): EntityType;
    getKiller?(): unknown;
  }) {
    const killer = entity.getKiller?.() ?? null;
    if (!killer) return false;

    return entity.getType() !== EntityType.PLAYER;
  }
}
