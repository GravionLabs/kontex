import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from './server.js';
import { createEmbeddingProvider } from './services/embedding-provider.js';

const embeddingProvider = createEmbeddingProvider();
const server = createServer(process.cwd(), embeddingProvider);
await server.connect(new StdioServerTransport());
