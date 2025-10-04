import { createContext, useContext } from "react";
import { message, notification } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import type { NotificationInstance } from "antd/es/notification/interface";
import type { ReactNode } from "react";

const AlertAppContext = createContext<{
    messageApi: MessageInstance | null;
    contextHolder: ReactNode | null;
    notificationApi: NotificationInstance | null;
    contextNotifiHolder: ReactNode | null;
}>({
    messageApi: null,
    contextHolder: null,
    notificationApi: null,
    contextNotifiHolder: null,
});

type TProps = {
    children: React.ReactNode;
}

export const AlertContextProvider = (props: TProps) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationApi, contextNotifiHolder] = notification.useNotification();

  return (
    <>
      <AlertAppContext.Provider
        value={{
          messageApi,
          notificationApi,
          contextHolder,
          contextNotifiHolder,
        }}
      >
        {props.children}
      </AlertAppContext.Provider>
    </>
  );
};

export const useAlertContextApp = () => {
  const alertAppContext = useContext(AlertAppContext);

  if (!alertAppContext) {
    throw new Error(
      "useCurrentApp must be used within <AlertAppContext.Provider>"
    );
  }

  return alertAppContext;
};
