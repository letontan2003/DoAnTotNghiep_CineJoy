import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAccount } from '@/store/appSlice';

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAppLoading, isAuthenticated } = useAppSelector((state) => state.app);

  useEffect(() => {
    const handleFetchAccount = async () => {
      if (isAppLoading && !isAuthenticated) {
        await dispatch(fetchAccount());
      }
    };
    handleFetchAccount();
  }, [dispatch, isAppLoading, isAuthenticated]);

  return <>{children}</>;
};

export default AppProvider;

