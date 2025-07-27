import React, { useEffect, useState, useCallback, useRef } from "react";
import useScreenWindow from "../hooks/useScreenWindow";
import { preloadManager } from "@/core/performance/preloadManager";

const VirtualScreenRenderer = ({
  screens,
  currentScreenIndex,
  onScreenComplete,
}) => {
  const [loadedComponents, setLoadedComponents] = useState({});
  const [loadingErrors, setLoadingErrors] = useState({});
  const { start, end } = useScreenWindow(screens, currentScreenIndex, 2);
  const currentLoadRef = useRef(null);

  useEffect(() => {
    const loadId = Date.now();
    currentLoadRef.current = loadId;

    const preloadScreens = async () => {
      const loadPromises = [];
      const componentMap = {};

      for (let i = start; i < end; i++) {
        const screen = screens[i];

        if (!screen?.componentID) continue;

        const priority = i === currentScreenIndex ? "high" : "normal";
        const screenPath = `${screen?.componentCategoryPath}/${screen?.componentID}`;

        const loadPromise = preloadManager
          .preloadComponent(screenPath, priority)
          .then((module) => {
            console.log("successfully preloaded", screenPath);
            if (currentLoadRef.current === loadId) {
              componentMap[screen.componentID] = module.default || module;
            }
          })
          .catch((error) => {
            console.log("successfully preloaded", screenPath);
            if (currentLoadRef.current === loadId) {
              console.warn(
                `Failed to preload component: ${screen.componentPath}`,
                error
              );
              setLoadingErrors((prev) => ({
                ...prev,
                [screen.componentID]: error,
              }));
            }
          });

        loadPromises.push(loadPromise);
      }

      try {
        await Promise.allSettled(loadPromises);

        if (currentLoadRef.current === loadId) {
          setLoadedComponents((prev) => ({
            ...prev,
            ...componentMap,
          }));
        }
      } catch (error) {
        console.warn("Error in preload batch:", error);
      }
    };

    preloadScreens();

    // return () => {
    //   if (currentLoadRef.current === loadId) {
    //     currentLoadRef.current = null;
    //   }
    // };
  }, [currentScreenIndex, screens, start, end]);

  const renderScreens = useCallback(() => {
    return screens.slice(start, end).map((screen, idx) => {
      const actualIndex = start + idx;
      const isVisible = actualIndex === currentScreenIndex;
      const Component = loadedComponents[screen.componentID];
      const hasError = loadingErrors[screen.componentID];

      if (!Component && isVisible && !hasError) {
        return (
          <div
            key={screen.id}
            className="screen-container flex-1 flex flex-col items-center justify-center"
          >
            <div>Loading...</div>
          </div>
        );
      }

      if (hasError && isVisible) {
        return (
          <div
            key={screen.id}
            className="screen-container flex-1 flex flex-col items-center justify-center text-red-500"
          >
            <div>Failed to load component</div>
          </div>
        );
      }

      if (!Component) return null;

      return (
        <div
          key={screen.id}
          className={`screen-container flex-1 flex flex-col ${
            isVisible ? "visible" : "hidden"
          }`}
          style={{
            display: isVisible ? "block" : "none",
            visibility: isVisible ? "visible" : "hidden",
            position: isVisible ? "relative" : "absolute",
          }}
        >
          <Component
            {...screen.props}
            currentScreenIndex={actualIndex}
            onScreenComplete={() => onScreenComplete(actualIndex)}
          />
        </div>
      );
    });
  }, [
    screens,
    start,
    end,
    currentScreenIndex,
    loadedComponents,
    loadingErrors,
    onScreenComplete,
  ]);

  return <>{renderScreens()}</>;
};

export default VirtualScreenRenderer;
