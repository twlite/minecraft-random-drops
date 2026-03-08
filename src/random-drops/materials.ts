import { EntityType, Material } from 'ecmacraft/spigot';
import { BLACKLISTED_MATERIALS } from './constants.js';

type JavaSecureRandom = {
  nextInt(bound: number): number;
};

type JavaSecureRandomClass = new () => JavaSecureRandom;

const SecureRandom = Java.type<JavaSecureRandomClass>(
  'java.security.SecureRandom',
);

export class MaterialResolver {
  private static readonly RANDOM = new SecureRandom();
  private blockToMaterialMap = new Map<Material, Material>();
  private entityToMaterialMap = new Map<EntityType, Material>();
  private materialList: Material[] | null = null;

  public clearCache() {
    this.blockToMaterialMap.clear();
    this.entityToMaterialMap.clear();
    this.materialList = null;
  }

  public getRandomMaterialForBlock(blockType: Material) {
    const existing = this.blockToMaterialMap.get(blockType);
    if (existing) return existing;

    const randomMaterial = this.getRandomMaterial();

    this.blockToMaterialMap.set(blockType, randomMaterial);

    return randomMaterial;
  }

  public getRandomMaterialForEntity(entityType: EntityType) {
    const existing = this.entityToMaterialMap.get(entityType);
    if (existing) return existing;

    const randomMaterial = this.getRandomMaterial();

    this.entityToMaterialMap.set(entityType, randomMaterial);

    return randomMaterial;
  }

  public getRandomMaterial() {
    const materials = this.getMaterialList();
    return materials[this.getRandomIndex(materials.length)];
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

  private getRandomIndex(length: number) {
    if (length <= 0) {
      throw new Error('Cannot pick a random material from an empty list.');
    }

    return MaterialResolver.RANDOM.nextInt(length);
  }
}
