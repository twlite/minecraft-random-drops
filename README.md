# Minecraft Random Drops

A Minecraft Spigot plugin built with [ecmacraft](https://github.com/twlite/ecmacraft) that replaces all block and mob drops with random items. Every block type and mob type gets assigned a random item — breaking the same block type or killing the same mob type always yields the same random item within a session.

## Features

- **Random block drops** — Breaking any block drops a random item instead of its default drop. The same block type always drops the same random item.
- **Random mob drops** — Killing any mob drops a random item instead of its default loot. The same mob type always drops the same random item.
- **Spawn egg support** — If the random item is a spawn egg, the corresponding entity is spawned at the drop location instead.
- **Drop scaling** — Drop amounts start at 1x and double every 5 minutes, up to a configurable maximum. A server-wide broadcast announces each multiplier increase.
- **Operator-only command** — Toggle the plugin on/off with `/randomdrops <on|off>` (requires OP).
- **Blacklisted materials** — Unobtainable/problematic items (air, barriers, command blocks, legacy items, etc.) are excluded from the random pool.

## Commands

| Command            | Description                  | Permission |
| ------------------ | ---------------------------- | ---------- |
| `/randomdrops on`  | Enable random drops          | OP         |
| `/randomdrops off` | Disable and reset the scaler | OP         |

## Configuration

Constants can be adjusted in `src/random-drops/constants.ts`:

| Constant                | Default         | Description                                    |
| ----------------------- | --------------- | ---------------------------------------------- |
| `MAX_RANDOM_DROPS`      | `8192`          | Maximum item drop multiplier                   |
| `MAX_MOB_SPAWN`         | `256`           | Maximum mob spawn multiplier (for spawn eggs)  |
| `SCALE_INTERVAL_MS`     | `300000` (5min) | Interval between multiplier doublings          |
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

## License

MIT
