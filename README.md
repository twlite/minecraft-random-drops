# Minecraft Random Drops

A Minecraft Spigot plugin built with [ecmacraft](https://github.com/twlite/ecmacraft) that replaces block and mob drops with random outcomes. Each block type and mob type gets a fixed outcome based on the world seed, with an automatic 5% chance of a cursed bonus alongside it.

## Features

- **Seeded drops:** The same world seed produces the same block and mob mappings across runs, regardless of discovery order. Mappings are generated in a fixed order with a seeded `java.util.Random`. Worlds with the same seed share a resolver; different seeds use separate resolvers.
- **Tool requirements:** A block produces a random outcome only when the server's loot rules allow a drop with the player's held item, including tool type and harvest tier.
- **Random mob drops:** Player kills replace the mob's default loot with its mapped outcome.
- **Progression drops:** Essential early-game resources and a Nether blaze rod source remain assigned to accessible source pools for each seed.
- **Spawn egg support:** A mapped spawn egg spawns its corresponding mob instead of dropping the egg.
- **Automatic cursed bonuses:** Every eligible block break or player mob kill has a 5% chance to add the opposite kind of outcome. An item drop can also spawn a random mob; a mob outcome can also drop a random item. The normal outcome is always retained. Bonus mobs are selected from allowed spawn eggs with living, spawnable entity types.
- **Independent scaling:** Both the normal outcome and any bonus use the current multiplier, each with its own cap: 4000 items or 256 mobs. The chance is rolled once per break or kill, regardless of quantity, and bonuses do not trigger additional bonus rolls.
- **Drop scaling:** Amounts start at 1x and double every 5 minutes, up to the caps. A server-wide broadcast announces each multiplier increase.
- **Operator-only command:** Toggle the plugin on/off with `/randomdrops <on|off>` (requires OP).
- **Blacklisted materials:** Unobtainable/problematic items (air, barriers, command blocks, legacy items, etc.) are excluded from the random pool.

For example, if dirt maps to iron ingots, each eligible dirt break drops iron. On a cursed roll, it also spawns a random mob. At a 512x multiplier, that break drops 512 ingots and spawns 256 mobs because the mob cap applies independently.

Repeatability assumes the same plugin version, material blacklist, and Minecraft material/entity catalog. Cursed rolls use a separate seeded generator, so they never change the fixed mappings. Their sequence depends on the order of eligible events and restarts when random drops are enabled for a new run or the plugin restarts. Turning the mode off and on reproduces the mappings and restarts the multiplier and bonus sequence; it does not choose a new seed.

## Commands

| Command            | Description                  | Permission |
| ------------------ | ---------------------------- | ---------- |
| `/randomdrops on`  | Enable random drops          | OP         |
| `/randomdrops off` | Disable and reset the scaler | OP         |

## Configuration

Constants can be adjusted in `src/random-drops/constants.ts`:

| Constant                | Default         | Description                                    |
| ----------------------- | --------------- | ---------------------------------------------- |
| `MAX_RANDOM_DROPS`      | `4000`          | Maximum item drop multiplier                   |
| `MAX_MOB_SPAWN`         | `256`           | Maximum mob spawn multiplier (for spawn eggs)  |
| `SCALE_INTERVAL_MS`     | `300000` (5min) | Interval between multiplier doublings          |
| `CURSED_CHANCE`         | `0.05` (5%)    | Bonus probability per eligible break or kill    |
| `BLACKLISTED_MATERIALS` | _(see file)_    | Material name substrings to exclude from drops |

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Build the plugin (production):

   ```bash
   pnpm run build
   ```

3. Run the development server (development):

   ```bash
   pnpm run dev
   ```

## Validation

```bash
pnpm exec tsc --noEmit
pnpm run build
```

An actual Minecraft server is needed for in-game integration testing.

## License

MIT
