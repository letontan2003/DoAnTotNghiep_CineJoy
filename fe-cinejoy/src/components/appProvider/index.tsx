import { useEffect } from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useAlertContextApp } from "@/context/alert.context";
import useAppStore from "@/store/app.store";

interface Props {
  children: React.ReactNode;
}

const AppProvider: React.FC<Props> = ({ children }) => {
  const {
    isAppLoading,
    fetchAccount,
    isAuthenticated,
  } = useAppStore();
  const { contextHolder, contextNotifiHolder } = useAlertContextApp();

  useEffect(() => {
    const handleFetchAccount = async () => {
      if (isAppLoading && !isAuthenticated) {
        await fetchAccount();
      }
    };
    handleFetchAccount();
  }, [isAppLoading, isAuthenticated, fetchAccount]);

  if (isAppLoading) {

    return (
      <>
        {contextHolder}
        {contextNotifiHolder}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-50">
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48, color: "#A51717" }} spin />}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      {contextNotifiHolder}
      {children}
    </>
  );
};

export default AppProvider;
