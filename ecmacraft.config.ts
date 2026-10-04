import { defineConfig } from 'ecmacraft/config';

export default defineConfig({
  development: {
    paperVersion: '26.2',
    serverProperties: {
      'online-mode': true,
      'spawn-protection': 0
    }
  },
  production: {
    paperVersion: '26.2'
  }
});
