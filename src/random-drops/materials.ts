import { EntityType, Material } from 'ecmacraft/spigot';
import { BLACKLISTED_MATERIALS } from './constants.js';

type JavaSecureRandom = {
  nextInt(bound: number): number;
};

type JavaSecureRandomClass = new () => JavaSecureRandom;

type ProgressionSource =
  | { kind: 'block'; value: Material }
  | { kind: 'entity'; value: EntityType };

const SecureRandom = Java.type<JavaSecureRandomClass>(
  'java.security.SecureRandom',
);

export class MaterialResolver {
  private static readonly RANDOM = new SecureRandom();
  private blockToMaterialMap = new Map<Material, Material>();
  private entityToMaterialMap = new Map<EntityType, Material>();
  private materialList: Material[] | null = null;
  private materialDeck: Material[] = [];
  private reservedMaterials = new Set<Material>();
  private progressionInitialized = false;

  public clearCache() {
    this.blockToMaterialMap.clear();
    this.entityToMaterialMap.clear();
    this.materialList = null;
    this.materialDeck = [];
    this.reservedMaterials.clear();
    this.progressionInitialized = false;
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

  public isSpawnEgg(material: Material) {
    return this.getMaterialName(material).includes('spawn_egg');
  }

  public getEntityTypeFromSpawnEgg(material: Material) {
    const entityTypeName = this.getMaterialName(material)
      .replace('_spawn_egg', '')
      .toUpperCase();

    return EntityType[entityTypeName as keyof typeof EntityType] ?? null;
  }

  private ensureProgressionMappings() {
    if (this.progressionInitialized) return;

    this.progressionInitialized = true;

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
      this.materialList = Material.values().filter((material) => {
        if (material.isLegacy()) return false;
        if (!material.isItem()) return false;

        const name = this.getMaterialName(material);

        return !BLACKLISTED_MATERIALS.some((blacklisted) =>
          name.includes(blacklisted),
        );
      });
    }

    return this.materialList;
  }

  private getMaterialName(material: Material) {
    // @ts-ignore - Spigot enum wrappers expose name() at runtime.
    return (material.name() as string).toLowerCase();
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

    return MaterialResolver.RANDOM.nextInt(length);
  }
}
