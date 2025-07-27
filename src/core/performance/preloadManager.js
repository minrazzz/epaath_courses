import { componentsRegistry } from "../registries/templatesRegistry";

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
      // const module = await import(/* @vite-ignore */ componentPath);
      const module = await componentsRegistry?.[componentPath]();

      this.cache.set(componentPath, module);
      this.loadingPromises.delete(componentPath);
      return module;
    } catch (error) {
      console.warn(
        `[_loadComponent] Failed to preload component: ${componentPath}`,
        error
      );
      this.loadingPromises.delete(componentPath);
      throw error;
    }
  }

  processQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;
    console.log(`[processQueue] Processing queue...`);

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
        console.warn("[processQueue] Error processing preload queue:", error);
      } finally {
        this.isPreloading = false;
        if (this.preloadQueue.length > 0) {
          this.processQueue();
        } else {
          console.log("[processQueue] Queue is empty. Done.");
        }
      }
    });
  }

  getComponent(componentPath) {
    return this.cache.get(componentPath);
  }

  isLoading(componentPath) {
    const loading = this.loadingPromises.has(componentPath);

    return loading;
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
