
export function cacheFactory<T>(
  cacheLoadFunction: () => Promise<T>,
  msBetweenReloads = 10000,
  initialValue: T | undefined = undefined,
): () => Promise<T> {  
  // Set this to true when we're loading the cache so that we don't
  // issue multiple loads at once.
  let loadPromise: Promise<T> | undefined = undefined;
  // Track how fresh the data in the cache is.
  let currentAsOf: number = 0;
  let cache: T | undefined = initialValue;

  const load = async () => {
    if (loadPromise) {
      // If another call to this function is already loading the cahce,
      // just wait for that call to happen.
      return await loadPromise;
    } else {
      try {
        // Mark the reload as underway so that we don't issue multiple
        // reload requests at the same time
        loadPromise = cacheLoadFunction();
        cache = await loadPromise;

        // Update our recrod of how fresh the data is
        currentAsOf = Date.now();
      } finally {
        // Always set reloadUnderway to false after the load
        // is complete, even if it failed.
        loadPromise = undefined;
      }
    }
    return cache;
  };

  const ensureCacheIsLoaded = async (): Promise<T> => {
    if (typeof(cache) === "undefined") {
      // There is no data in the cache, and so we can't return a result
      // until the cache is loaded.  We must await the result of loadCache.
      return await load();
    } else if (!loadPromise &&
               (currentAsOf + msBetweenReloads < Date.now())
    ) {
      // There is data in the cache, we're not currently loading any fresh data,
      // and it's been there a while since we last updated the cache.
      // We should treat the stale data like a member of congress and replace
      // it as soon as soon as we can.
      // Still, since the client desires a quick response, we'll not wait for the
      // freshest data before sending it.
      // (So the promise returned by loadCache is not awaited)
      load();
    }
    return cache; 
  }
  return ensureCacheIsLoaded;
}