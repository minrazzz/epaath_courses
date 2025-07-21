import { createStore, createPersistStore } from "zustand-plus";

export const useCounterStore = createStore({ count: 0 }, (set, _get) => {
  function get() {
    return { ..._get(), ...methods }; // 🎯 Key pattern
  }

  const methods = {
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),

    // ✨ Now you can call other methods!
    doubleIncrement: () => {
      get().increment();
      get().increment();
    },

    incrementAndReset: () => {
      get().increment();
      setTimeout(() => get().reset(), 1000);
    },

    smartIncrement: () => {
      const { count } = get();
      if (count < 10) {
        get().increment();
      } else {
        get().reset();
      }
    },
  };

  return methods;
});
