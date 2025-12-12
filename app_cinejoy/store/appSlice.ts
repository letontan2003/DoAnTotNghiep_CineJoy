import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchAccountApi } from "@/services/api";
import { IUser } from "@/types/api";

interface AppState {
  user: IUser | null;
  isAuthenticated: boolean;
  isAppLoading: boolean;
  isModalOpen: boolean;
  isDarkMode: boolean;
  chatbotEnabled: boolean;
  isChatbotScreenOpen: boolean;
  currentScreen: string | null;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isAppLoading: true,
  isModalOpen: false,
  isDarkMode: false,
  chatbotEnabled: false,
  isChatbotScreenOpen: false,
  currentScreen: "LoadingScreen", // Set mặc định là LoadingScreen vì initialRouteName là LoadingScreen
};

// Async thunk để fetch account
export const fetchAccount = createAsyncThunk(
  "app/fetchAccount",
  async (_, { rejectWithValue }) => {
    try {
      let chatbotEnabled = false;
      try {
        const chatbotEnabledStr = await AsyncStorage.getItem("chatbotEnabled");
        chatbotEnabled = chatbotEnabledStr
          ? JSON.parse(chatbotEnabledStr)
          : false;
      } catch (storageError) {
        console.warn(
          "Error reading chatbotEnabled from storage:",
          storageError
        );
      }

      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem("accessToken");
      } catch (storageError) {
        console.warn("Error reading accessToken from storage:", storageError);
      }

      if (!token) {
        return { user: null, isAuthenticated: false, chatbotEnabled };
      }

      try {
        const res = await fetchAccountApi();

        // Check if response is valid
        if (res && res.data && res.data.user) {
          try {
            // Lưu current_user_id vào AsyncStorage (tương đương sessionStorage ở web)
            await AsyncStorage.setItem("current_user_id", res.data.user._id);
          } catch (storageError) {
            console.warn("Error saving current_user_id:", storageError);
          }
          return {
            user: res.data.user,
            isAuthenticated: true,
            isDarkMode: res.data.user.settings?.darkMode ?? false,
            chatbotEnabled,
          };
        } else {
          // Invalid response, clear tokens
          try {
            await AsyncStorage.removeItem("accessToken");
            await AsyncStorage.removeItem("current_user_id");
          } catch (storageError) {
            console.warn("Error clearing tokens:", storageError);
          }
          return { user: null, isAuthenticated: false, chatbotEnabled };
        }
      } catch (apiError: any) {
        console.error("API call error:", apiError);
        // Clear tokens on API error
        try {
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("current_user_id");
        } catch (storageError) {
          console.warn("Error clearing tokens:", storageError);
        }
        return { user: null, isAuthenticated: false, chatbotEnabled };
      }
    } catch (err: any) {
      console.error("Fetch account unexpected error:", err);
      // Try to clear tokens, but don't fail if it errors
      try {
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("current_user_id");
      } catch (storageError) {
        console.warn("Error clearing tokens in catch:", storageError);
      }

      let chatbotEnabled = false;
      try {
        const chatbotEnabledStr = await AsyncStorage.getItem("chatbotEnabled");
        chatbotEnabled = chatbotEnabledStr
          ? JSON.parse(chatbotEnabledStr)
          : false;
      } catch (storageError) {
        console.warn("Error reading chatbotEnabled in catch:", storageError);
      }

      return rejectWithValue({
        error: err?.message || "Unknown error",
        chatbotEnabled,
      });
    }
  }
);

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IUser | null>) => {
      state.user = action.payload;
    },
    setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setIsAppLoading: (state, action: PayloadAction<boolean>) => {
      state.isAppLoading = action.payload;
    },
    setIsModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setChatbotEnabled: (state, action: PayloadAction<boolean>) => {
      state.chatbotEnabled = action.payload;
      AsyncStorage.setItem("chatbotEnabled", JSON.stringify(action.payload));
    },
    setChatbotScreenOpen: (state, action: PayloadAction<boolean>) => {
      state.isChatbotScreenOpen = action.payload;
    },
    setCurrentScreen: (state, action: PayloadAction<string | null>) => {
      state.currentScreen = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isModalOpen = false;
      AsyncStorage.removeItem("accessToken");
      AsyncStorage.removeItem("current_user_id");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccount.pending, (state) => {
        state.isAppLoading = true;
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.isAppLoading = false;
        if (action.payload.user) {
          state.user = action.payload.user;
          state.isAuthenticated = action.payload.isAuthenticated;
          state.isDarkMode = action.payload.isDarkMode ?? false;
          state.chatbotEnabled = action.payload.chatbotEnabled ?? false;
        } else {
          state.user = null;
          state.isAuthenticated = false;
          state.chatbotEnabled = action.payload.chatbotEnabled ?? false;
        }
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.isAppLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        // Preserve chatbotEnabled even on error
        if (
          action.payload &&
          typeof action.payload === "object" &&
          "chatbotEnabled" in action.payload
        ) {
          state.chatbotEnabled =
            (action.payload as any).chatbotEnabled ?? false;
        }
      });
  },
});

export const {
  setUser,
  setIsAuthenticated,
  setIsAppLoading,
  setIsModalOpen,
  setIsDarkMode,
  setChatbotEnabled,
  setChatbotScreenOpen,
  setCurrentScreen,
  logout,
} = appSlice.actions;

export default appSlice.reducer;
