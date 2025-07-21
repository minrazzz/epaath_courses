class PreloadManager {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = [];
    this.isPreloading = false;
    this.loadingPromises = new Map();
  }

  async preloadComponent(componentPath, priority = "normal") {
    if (this.cache.has(componentPath)) {
      return this.cache.get(componentPath);
    }

    if (this.loadingPromises.has(componentPath)) {
      return this.loadingPromises.get(componentPath);
    }

    const loadPromise = this._loadComponent(componentPath);
    this.loadingPromises.set(componentPath, loadPromise);

    if (priority === "high") {
      return loadPromise;
    } else {
      this.preloadQueue.push({
        path: componentPath,
        promise: loadPromise,
      });
      this.processQueue();
      return loadPromise;
    }
  }

  async _loadComponent(componentPath) {
    try {
      const module = await import(/* @vite-ignore */ componentPath);
      this.cache.set(componentPath, module);
      this.loadingPromises.delete(componentPath);
      return module;
    } catch (error) {
      this.loadingPromises.delete(componentPath);
      console.warn(`Failed to preload component: ${componentPath}`, error);
      throw error;
    }
  }

  processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }
    this.isPreloading = true;

    const scheduleWork = (callback) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(callback);
      } else {
        setTimeout(callback, 0);
      }
    };

    scheduleWork(async () => {
      try {
        const batch = this.preloadQueue.splice(0, 3);
        await Promise.allSettled(batch.map((item) => item?.promise));
      } catch (error) {
        console.warn("Error processing preload queue:", error);
      } finally {
        this.isPreloading = false;
        if (this.preloadQueue.length > 0) {
          this.processQueue();
        }
      }
    });
  }

  getComponent(componentPath) {
    return this.cache.get(componentPath);
  }

  isLoading(componentPath) {
    return this.loadingPromises.has(componentPath);
  }

  clearCache(componentPath) {
    if (componentPath) {
      this.cache.delete(componentPath);
      this.loadingPromises.delete(componentPath);
    } else {
      this.cache.clear();
      this.loadingPromises.clear();
    }
  }
}

export const preloadManager = new PreloadManager();
