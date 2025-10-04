import { useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { Modal, Button, Typography } from 'antd';
import Header from "components/header";
import Footer from "components/footer";
import Chatbot from "components/chatBot";

const { Title } = Typography;

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('show_timeout_modal');
      if (flag === '1') {
        sessionStorage.removeItem('show_timeout_modal');
        Modal.confirm({
          title: (<Title level={4} style={{ margin: 0, textAlign: 'center', color: '#e74c3c' }}>Hết thời gian đặt vé</Title>),
          content: (<div className="text-[14px] text-center mb-2">Thời gian giữ ghế đã hết. Vui lòng chọn lại suất chiếu để tiếp tục đặt vé!</div>),
          closable: false,
          maskClosable: false,
          footer: (
            <div className="flex justify-center w-full" style={{ marginTop: 5 }}>
              <Button type="primary" onClick={() => Modal.destroyAll()}>OK</Button>
            </div>
          ),
          icon: null,
          centered: true,
        });
      }
    } catch (error) {
      console.error("Error showing timeout modal:", error);
    }
  }, [location.pathname]);

  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <Chatbot />
    </>
  );
}

export default Layout;
