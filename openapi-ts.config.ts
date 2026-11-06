import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: {
    path: 'URL',
    fetch: {
      headers: {
        Authorization: 'Bearer TOKEN',
      },
    },
  },
  output: {
    path: './src/client',
    postProcess: ['prettier'],
  },
  plugins: [
    '@hey-api/schemas',
    {
      dates: true,
      name: '@hey-api/transformers',
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
    {
      name: '@hey-api/sdk',
      transformer: true,
      operations: {
        strategy: 'single',
        containerName: 'TribeCrafterClient',
        methods: 'instance',
      },
    },
  ],
});