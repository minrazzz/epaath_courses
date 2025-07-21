const useScreenWindow = (screens, currentScreenIndex, windowSize = 2) => {
  const start = Math.max(0, currentScreenIndex - windowSize);
  const end = Math.min(screens.length, currentScreenIndex + windowSize + 1);
  return {
    start,
    end,
  };
};

export default useScreenWindow;
