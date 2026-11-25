import React from "react";

/**
 * Loading skeleton for SpaceListScreen (< 150 lines)
 */
const SpaceListSkeleton = () => (
  <div className="flex flex-col gap-[24px]" data-testid="spaces-loading">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="doc-card h-[149px] p-[24px] flex justify-between animate-pulse bg-gray-50"
      >
        <div className="w-2/3 space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="w-24 flex flex-col items-end justify-between">
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-10 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export default SpaceListSkeleton;
