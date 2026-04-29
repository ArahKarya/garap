import { createBullBoard } from '@bull-board/api';
// Newer @bull-board/api exports drop the `.js` extension on subpaths.
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { allQueues } from './queue.js';

export function createBullBoardRouter(basePath: string) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: allQueues().map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  return serverAdapter.getRouter();
}
