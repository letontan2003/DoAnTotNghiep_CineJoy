/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { CloseCircleOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAppStore from '@/store/app.store';
import { cancelOrder } from '@/apiservice/apiOrder';
import axiosClient from '@/apiservice/axiosClient';

const { Title, Text } = Typography;

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useAppStore();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    // Hủy order đang chờ nếu quay về từ MoMo cancel
    try {
      const oid = sessionStorage.getItem('last_order_id');
      if (oid) {
        cancelOrder(oid).finally(() => {
          try { sessionStorage.removeItem('last_order_id'); } catch (e) {
            console.error('Error removing last_order_id:', e);
          }
        });
        // Trigger release-expired để dọn dẹp các hold quá hạn nếu có
        axiosClient.post('/showtimes/release-expired').catch(() => undefined);
      }
    } catch (e) {
      console.error('Error canceling order:', e);
    }

    // Lấy thông tin từ URL params
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const resultCode = searchParams.get('resultCode');
    const message = searchParams.get('message');
    const transId = searchParams.get('transId');

    setPaymentInfo({
      orderId,
      amount: amount ? parseInt(amount) : null,
      transId,
      message: message ? decodeURIComponent(message) : 'Thanh toán đã bị hủy',
      resultCode
    });
  }, [searchParams]);

  const handleGoHome = () => {
    navigate('/');
  };

  // Đã bỏ thử lại thanh toán và xem phim khác theo yêu cầu

  if (!paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang xử lý thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`py-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4">
        <Result
          status="error"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '64px' }} />}
          title={
            <Title level={2} style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
              Thanh toán thất bại!
            </Title>
          }
          subTitle={
            <Text style={{ 
              fontSize: '18px', 
              color: isDarkMode ? '#d1d5db' : '#6b7280' 
            }}>
              {paymentInfo.message || 'Giao dịch đã bị hủy hoặc thất bại. Vui lòng thử lại.'}
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
            </Space>
          }
        />

      </div>
    </div>
  );
};

export default PaymentCancel;
