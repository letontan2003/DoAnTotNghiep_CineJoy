/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { CheckCircleOutlined, HomeOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import useAppStore from '@/store/app.store';

const { Title, Text } = Typography;

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isDarkMode } = useAppStore();
  const [orderInfo, setOrderInfo] = useState<any>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const resultCode = searchParams.get('resultCode');
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    const transId = searchParams.get('transId');

    // Kiểm tra success từ cả MoMo (resultCode=0) và VNPay (status=success)
    const isSuccess = (orderId && amount && resultCode === '0') || (orderId && status === 'success');

    if (isSuccess) {
      setOrderInfo({
        orderId,
        amount: amount ? parseInt(amount) : 0,
        transId,
        message: decodeURIComponent(message || ''),
        success: true
      });
    } else {
      // Nếu gateway trả về không thành công, điều hướng sang trang thất bại
      navigate(`/payment/cancel${location.search}`);
    }
  }, [searchParams, navigate, location.search]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewOrders = () => {
    navigate('/booking-history');
  };

  if (!orderInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang xử lý thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-360px)] flex items-center justify-center py-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 w-full">
         <Result
           status="success"
           icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: '64px' }} />}
           title={
             <Title level={2} style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
               Thanh toán thành công!
             </Title>
           }
           subTitle={
             <Text style={{ 
               fontSize: '18px', 
               color: isDarkMode ? '#d1d5db' : '#6b7280' 
             }}>
               Cảm ơn bạn đã sử dụng dịch vụ của CineJoy. Vé xem phim đã được đặt thành công.
             </Text>
           }
          extra={
            <Space size="large">
              <Button 
                type="primary" 
                size="large" 
                icon={<HomeOutlined />}
                onClick={handleGoHome}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Về trang chủ
              </Button>
              <Button 
                size="large" 
                icon={<FileTextOutlined />}
                onClick={handleViewOrders}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Xem đơn vé
              </Button>
            </Space>
          }
        />
        
      </div>
    </div>
  );
};

export default PaymentSuccess;
