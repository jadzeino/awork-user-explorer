/// <reference lib="webworker" />

import { runGrouping, GroupingRequest } from './grouping.logic';

export type { GroupingRequest };

addEventListener('message', ({ data }: MessageEvent<GroupingRequest & { __id: number }>) => {
  const { __id, ...req } = data;
  const result = runGrouping(req as GroupingRequest);
  postMessage({ ...result, __id });
});
