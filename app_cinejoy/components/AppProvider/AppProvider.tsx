import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAccount } from "@/store/appSlice";

interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAppLoading, isAuthenticated } = useAppSelector(
    (state) => state.app
  );

  useEffect(() => {
    const handleFetchAccount = async () => {
      if (isAppLoading && !isAuthenticated) {
        try {
          const result = await dispatch(fetchAccount());
          // Check if the action was rejected
          if (fetchAccount.rejected.match(result)) {
            console.warn(
              "AppProvider: fetchAccount was rejected, but app will continue"
            );
          }
        } catch (error) {
          // Silently handle error - fetchAccount already handles errors internally
          console.error(
            "AppProvider: Unexpected error fetching account:",
            error
          );
        }
      }
    };
    handleFetchAccount();
  }, [dispatch, isAppLoading, isAuthenticated]);

  return <>{children}</>;
};

export default AppProvider;
