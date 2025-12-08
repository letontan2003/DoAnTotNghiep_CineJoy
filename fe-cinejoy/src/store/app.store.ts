import { create } from "zustand";
import { fetchAccountApi } from "@/services/api";

interface AppState {
  user: IUser | null;
  isAuthenticated: boolean;
  isAppLoading: boolean;
  isModalOpen: boolean;
  isDarkMode: boolean;

  setUser: (user: IUser | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setIsAppLoading: (value: boolean) => void;
  setIsModalOpen: (value: boolean) => void;
  setIsDarkMode: (value: boolean) => void;

  fetchAccount: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAppLoading: true,
  isModalOpen: false,
  isDarkMode: false,

  setUser: (user) => set({ user }),
  setIsAuthenticated: (value) => set({ isAuthenticated: value }),
  setIsAppLoading: (value) => set({ isAppLoading: value }),
  setIsModalOpen: (value) => set({ isModalOpen: value }),
  setIsDarkMode: (value) => set({ isDarkMode: value }),

  fetchAccount: async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return set({ isAppLoading: false });

      const res = await fetchAccountApi();
      
      if (res.data) {
        sessionStorage.setItem("current_user_id", res.data.user._id);
        set({ user: res.data.user, isAuthenticated: true, isDarkMode: res.data.user.settings.darkMode });
      } else {
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("current_user_id");
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem("accessToken");
    }
    set({ isAppLoading: false });
  },
}));

export default useAppStore;
