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
      const token = await AsyncStorage.getItem("accessToken");
      const chatbotEnabledStr = await AsyncStorage.getItem("chatbotEnabled");
      const chatbotEnabled = chatbotEnabledStr
        ? JSON.parse(chatbotEnabledStr)
        : false;

      if (!token) {
        return { user: null, isAuthenticated: false, chatbotEnabled };
      }

      const res = await fetchAccountApi();

      if (res.data) {
        // Lưu current_user_id vào AsyncStorage (tương đương sessionStorage ở web)
        await AsyncStorage.setItem("current_user_id", res.data.user._id);
        return {
          user: res.data.user,
          isAuthenticated: true,
          isDarkMode: res.data.user.settings.darkMode,
          chatbotEnabled,
        };
      } else {
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("current_user_id");
        return { user: null, isAuthenticated: false, chatbotEnabled };
      }
    } catch (err: any) {
      console.error("Fetch account error:", err);
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("current_user_id");
      const chatbotEnabledStr = await AsyncStorage.getItem("chatbotEnabled");
      const chatbotEnabled = chatbotEnabledStr
        ? JSON.parse(chatbotEnabledStr)
        : false;
      return rejectWithValue({ error: err, chatbotEnabled });
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
      .addCase(fetchAccount.rejected, (state) => {
        state.isAppLoading = false;
        state.user = null;
        state.isAuthenticated = false;
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
