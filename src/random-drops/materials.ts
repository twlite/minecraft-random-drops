import { EntityType, Material } from 'ecmacraft/spigot';
import { BLACKLISTED_MATERIALS, CURSED_CHANCE } from './constants.js';

type JavaRandom = {
  nextInt(bound: number): number;
  nextLong(): number;
  nextDouble(): number;
  setSeed(seed: number): void;
};

type JavaRandomClass = new (seed: number) => JavaRandom;

type ProgressionSource =
  | { kind: 'block'; value: Material }
  | { kind: 'entity'; value: EntityType };

const Random = Java.type<JavaRandomClass>('java.util.Random');

export class MaterialResolver {
  private readonly random: JavaRandom;
  private readonly cursedRandom: JavaRandom;
  private blockToMaterialMap = new Map<Material, Material>();
  private entityToMaterialMap = new Map<EntityType, Material>();
  private materialList: Material[] | null = null;
  private materialDeck: Material[] = [];
  private reservedMaterials = new Set<Material>();
  private progressionInitialized = false;
  private cursedItems: Material[] = [];
  private cursedSpawnEggs: Material[] = [];

  public constructor(private readonly seed: number) {
    this.random = new Random(seed);
    this.cursedRandom = new Random(this.random.nextLong());
  }

  public clearCache() {
    this.blockToMaterialMap.clear();
    this.entityToMaterialMap.clear();
    this.materialList = null;
    this.materialDeck = [];
    this.reservedMaterials.clear();
    this.progressionInitialized = false;
    this.cursedItems = [];
    this.cursedSpawnEggs = [];
    this.random.setSeed(this.seed);
    this.cursedRandom.setSeed(this.random.nextLong());
  }

  public getRandomMaterialForBlock(blockType: Material) {
    this.ensureProgressionMappings();

    const existing = this.blockToMaterialMap.get(blockType);
    if (existing) return existing;

    const randomMaterial = this.drawMaterial();

    this.blockToMaterialMap.set(blockType, randomMaterial);

    return randomMaterial;
  }

  public getRandomMaterialForEntity(entityType: EntityType) {
    this.ensureProgressionMappings();

    const existing = this.entityToMaterialMap.get(entityType);
    if (existing) return existing;

    const randomMaterial = this.drawMaterial();

    this.entityToMaterialMap.set(entityType, randomMaterial);

    return randomMaterial;
  }

  public getRandomMaterial() {
    this.ensureProgressionMappings();
    return this.drawMaterial();
  }

  public getCursedBonus(normalMaterial: Material): Material | null {
    this.ensureProgressionMappings();
    if (this.cursedRandom.nextDouble() >= CURSED_CHANCE) return null;

    const choices = this.isSpawnEgg(normalMaterial)
      ? this.cursedItems
      : this.cursedSpawnEggs;

    if (choices.length === 0) return null;
    return choices[this.cursedRandom.nextInt(choices.length)];
  }

  public isSpawnEgg(material: Material) {
    return this.getMaterialName(material).includes('spawn_egg');
  }

  public getEntityTypeFromSpawnEgg(material: Material) {
    const entityTypeName = this.getMaterialName(material)
      .replace('_spawn_egg', '')
      .toUpperCase();

    return (EntityType[entityTypeName as keyof typeof EntityType] as EntityType | undefined) ?? null;
  }

  private ensureProgressionMappings() {
    if (this.progressionInitialized) return;

    const earlySources = this.shuffle<ProgressionSource>([
      { kind: 'block', value: Material.DIRT },
      { kind: 'block', value: Material.GRASS_BLOCK },
      { kind: 'block', value: Material.SAND },
      { kind: 'block', value: Material.GRAVEL },
      { kind: 'block', value: Material.OAK_LOG },
      { kind: 'block', value: Material.BIRCH_LOG },
      { kind: 'block', value: Material.SPRUCE_LOG },
      { kind: 'block', value: Material.JUNGLE_LOG },
      { kind: 'block', value: Material.ACACIA_LOG },
      { kind: 'block', value: Material.DARK_OAK_LOG },
      { kind: 'entity', value: EntityType.COW },
      { kind: 'entity', value: EntityType.PIG },
      { kind: 'entity', value: EntityType.SHEEP },
      { kind: 'entity', value: EntityType.CHICKEN },
    ]);

    const earlyDrops = this.shuffle([
      Material.OAK_LOG,
      Material.COBBLESTONE,
      Material.COAL,
      this.getRandomFood(),
      Material.IRON_INGOT,
      Material.DIAMOND,
      Material.ENDER_PEARL,
    ]);

    this.assignProgressionDrops(earlySources, earlyDrops);

    const netherSources = this.shuffle<ProgressionSource>([
      { kind: 'block', value: Material.NETHERRACK },
      { kind: 'block', value: Material.SOUL_SAND },
      { kind: 'block', value: Material.SOUL_SOIL },
      { kind: 'block', value: Material.BLACKSTONE },
      { kind: 'block', value: Material.NETHER_QUARTZ_ORE },
      { kind: 'block', value: Material.NETHER_GOLD_ORE },
      { kind: 'entity', value: EntityType.BLAZE },
      { kind: 'entity', value: EntityType.PIGLIN },
      { kind: 'entity', value: EntityType.MAGMA_CUBE },
      { kind: 'entity', value: EntityType.WITHER_SKELETON },
    ]);

    this.assignProgressionDrops(netherSources, [Material.BLAZE_ROD]);

    this.refillMaterialDeck();

    // Assign every source before gameplay so discovery order cannot change its drop.
    const blocks = this.sortByName(
      Material.values().filter(
        (material) => !material.isLegacy() && material.isBlock(),
      ),
    );
    for (const block of blocks) {
      if (!this.blockToMaterialMap.has(block)) {
        this.blockToMaterialMap.set(block, this.drawMaterial());
      }
    }

    for (const entity of this.sortByName(EntityType.values())) {
      if (!this.entityToMaterialMap.has(entity)) {
        this.entityToMaterialMap.set(entity, this.drawMaterial());
      }
    }

    this.cursedItems = this.getMaterialList().filter(
      (material) => !this.isSpawnEgg(material),
    );
    this.cursedSpawnEggs = this.getMaterialList().filter((material) => {
      if (!this.isSpawnEgg(material)) return false;
      const entityType = this.getEntityTypeFromSpawnEgg(material);
      return entityType !== null && entityType.isAlive() && entityType.isSpawnable();
    });
    this.progressionInitialized = true;
  }

  private assignProgressionDrops(
    sources: ProgressionSource[],
    drops: Material[],
  ) {
    if (sources.length < drops.length) {
      throw new Error('Not enough sources to assign progression drops.');
    }

    for (let i = 0; i < drops.length; i++) {
      const source = sources[i];
      const drop = drops[i];

      if (source.kind === 'block') {
        this.blockToMaterialMap.set(source.value, drop);
      } else {
        this.entityToMaterialMap.set(source.value, drop);
      }

      this.reservedMaterials.add(drop);
    }
  }

  private getRandomFood() {
    return this.getRandomItem([
      Material.COOKED_BEEF,
      Material.COOKED_PORKCHOP,
      Material.COOKED_CHICKEN,
      Material.BREAD,
      Material.BAKED_POTATO,
      Material.COOKED_MUTTON,
      Material.COOKED_COD,
      Material.COOKED_SALMON,
      Material.COOKED_RABBIT,
      Material.BEEF,
      Material.PORKCHOP,
      Material.CHICKEN,
      Material.MUTTON,
      Material.RABBIT,
      Material.COD,
      Material.SALMON,
      Material.TROPICAL_FISH,
      Material.APPLE,
      Material.CARROT,
      Material.POTATO,
      Material.BEETROOT,
      Material.MELON_SLICE,
      Material.SWEET_BERRIES,
      Material.GLOW_BERRIES,
      Material.COOKIE,
      Material.PUMPKIN_PIE,
      Material.MUSHROOM_STEW,
      Material.RABBIT_STEW,
      Material.BEETROOT_SOUP,
    ]);
  }

  private drawMaterial() {
    if (this.materialDeck.length === 0) {
      this.refillMaterialDeck();
    }

    const material = this.materialDeck.pop();

    if (!material) {
      throw new Error('Cannot pick a random material from an empty deck.');
    }

    return material;
  }

  private refillMaterialDeck() {
    this.materialDeck = this.shuffle(
      this.getMaterialList().filter(
        (material) => !this.reservedMaterials.has(material),
      ),
    );
  }

  private getMaterialList() {
    if (!this.materialList) {
      this.materialList = this.sortByName(
        Material.values().filter((material) => {
          if (material.isLegacy()) return false;
          if (!material.isItem()) return false;

          const name = this.getMaterialName(material);

          return !BLACKLISTED_MATERIALS.some((blacklisted) =>
            name.includes(blacklisted),
          );
        }),
      );
    }

    return this.materialList;
  }

  private getMaterialName(material: Material) {
    // @ts-ignore - Spigot enum wrappers expose name() at runtime.
    return (material.name() as string).toLowerCase();
  }

  private sortByName<T>(values: T[]): T[] {
    return [...values].sort((a, b) => {
      const left = String(a);
      const right = String(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }

  private getRandomItem<T>(items: readonly T[]) {
    if (items.length === 0) {
      throw new Error('Cannot pick a random item from an empty list.');
    }

    return items[this.getRandomIndex(items.length)];
  }

  private shuffle<T>(items: readonly T[]) {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.getRandomIndex(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  private getRandomIndex(length: number) {
    if (length <= 0) {
      throw new Error('Cannot pick a random material from an empty list.');
    }

    return this.random.nextInt(length);
  }
}
