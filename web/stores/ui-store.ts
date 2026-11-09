import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set(({ isSidebarCollapsed }) => ({ isSidebarCollapsed: !isSidebarCollapsed })),
    }),
    // Rehydrated after mount so the server and first client render agree
    { name: 'crabfarm-ui', skipHydration: true },
  ),
);
