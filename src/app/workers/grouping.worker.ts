/// <reference lib="webworker" />

import { runGrouping, GroupingRequest } from './grouping.logic';

export type { GroupingRequest };

addEventListener('message', ({ data }: MessageEvent<GroupingRequest & { __id: number }>) => {
  const { __id, ...req } = data;
  const start = performance.now();
  const result = runGrouping(req as GroupingRequest);
  const elapsed = Math.round(performance.now() - start);
  console.debug(`[GroupingWorker] ${result.totalCount} users grouped in ${elapsed}ms`);
  postMessage({ ...result, __id });
});
