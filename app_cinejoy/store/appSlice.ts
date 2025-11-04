import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAccountApi } from '@/services/api';
import { IUser } from '@/types/api';

interface AppState {
  user: IUser | null;
  isAuthenticated: boolean;
  isAppLoading: boolean;
  isModalOpen: boolean;
  isDarkMode: boolean;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isAppLoading: true,
  isModalOpen: false,
  isDarkMode: false,
};

// Async thunk để fetch account
export const fetchAccount = createAsyncThunk(
  'app/fetchAccount',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        return { user: null, isAuthenticated: false };
      }

      const res = await fetchAccountApi();

      if (res.data) {
        // Lưu current_user_id vào AsyncStorage (tương đương sessionStorage ở web)
        await AsyncStorage.setItem('current_user_id', res.data.user._id);
        return {
          user: res.data.user,
          isAuthenticated: true,
          isDarkMode: res.data.user.settings.darkMode,
        };
      } else {
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('current_user_id');
        return { user: null, isAuthenticated: false };
      }
    } catch (err) {
      console.error('Fetch account error:', err);
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('current_user_id');
      return rejectWithValue(err);
    }
  }
);

const appSlice = createSlice({
  name: 'app',
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
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isModalOpen = false;
      AsyncStorage.removeItem('accessToken');
      AsyncStorage.removeItem('current_user_id');
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
        } else {
          state.user = null;
          state.isAuthenticated = false;
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
  logout,
} = appSlice.actions;

export default appSlice.reducer;

