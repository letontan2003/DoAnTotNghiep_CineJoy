import React, { useEffect, useState } from 'react';
import { Table, Card, Spin, Typography, Button } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getVouchers, getAmountBudgetUsedApi, getItemBudgetUsedApi, getPercentBudgetUsedApi } from '@/apiservice/apiVoucher';
import dayjs from 'dayjs';

const { Title } = Typography;

interface PromotionReportData {
  key: string;
  code: string; // Mã CTKM
  name: string; // Tên CTKM (description)
  startDate: string; // Ngày bắt đầu
  endDate: string; // Ngày kết thúc
  productCode?: string; // Mã SP tặng (rewardItemId)
  productName?: string; // Tên SP tặng (rewardItem)
  giftQuantity?: number; // SL tặng
  unit: string; // Đơn vị tính
  discountValue?: number; // Số tiền chiết khấu
  totalBudget: number; // Ngân sách tổng
  usedBudget: number; // Ngân sách đã dùng
  remainingBudget: number; // Ngân sách còn lại
  promotionType: 'item' | 'amount' | 'percent' | 'voucher';
  voucherId: string;
  lineIndex: number;
}

const PromotionReport: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<PromotionReportData[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const vouchers = await getVouchers();
      
      const allPromotions: PromotionReportData[] = [];
      
      for (const voucher of vouchers) {
        if (!voucher.lines || voucher.lines.length === 0) continue;
        
        for (let i = 0; i < voucher.lines.length; i++) {
          const line = voucher.lines[i];
          const detail = line.detail as any;
          
          // Tính ngân sách đã dùng
          let usedBudget = 0;
          try {
            if (line.promotionType === 'amount') {
              const result = await getAmountBudgetUsedApi(voucher._id, i);
              usedBudget = result;
            } else if (line.promotionType === 'item') {
              const result = await getItemBudgetUsedApi(voucher._id, i);
              usedBudget = result;
            } else if (line.promotionType === 'percent') {
              const result = await getPercentBudgetUsedApi(voucher._id, i);
              usedBudget = result;
            } else if (line.promotionType === 'voucher') {
              // Với voucher: ngân sách đã dùng = totalQuantity - quantity
              const totalQuantity = detail?.totalQuantity || detail?.quantity || 0;
              const remainingQuantity = detail?.quantity || 0;
              usedBudget = totalQuantity - remainingQuantity;
            }
          } catch (error) {
            console.error(`Error fetching budget for ${line.promotionType}:`, error);
          }
          
          // Tính ngân sách tổng và còn lại
          let totalBudget = 0;
          let remainingBudget = 0;
          
          if (line.promotionType === 'voucher') {
            totalBudget = detail?.totalQuantity || detail?.quantity || 0;
            remainingBudget = detail?.quantity || 0;
          } else {
            totalBudget = detail?.totalBudget || 0;
            remainingBudget = totalBudget - usedBudget;
          }
          
          // Chuẩn bị dữ liệu cho từng cột
          const reportItem: PromotionReportData = {
            key: `${voucher._id}-${i}`,
            code: line.code || 'N/A',
            name: detail?.description || 'Không có mô tả',
            startDate: dayjs(line.validityPeriod.startDate).format('DD/MM/YYYY'),
            endDate: dayjs(line.validityPeriod.endDate).format('DD/MM/YYYY'),
            voucherId: voucher._id,
            lineIndex: i,
            promotionType: line.promotionType,
            totalBudget,
            usedBudget,
            remainingBudget
          };
          
          // Điền thông tin theo loại khuyến mãi
          if (line.promotionType === 'item') {
            reportItem.productCode = detail?.rewardItemId || '';
            reportItem.productName = detail?.rewardItem || '';
            reportItem.giftQuantity = detail?.rewardQuantity || 0;
            reportItem.unit = 'sản phẩm';
            reportItem.discountValue = undefined; // Không có cho khuyến mãi hàng
          } else if (line.promotionType === 'voucher') {
            reportItem.giftQuantity = detail?.totalQuantity || detail?.quantity || 0;
            reportItem.unit = 'sản phẩm';
            reportItem.discountValue = detail?.discountPercent || 0;
          } else if (line.promotionType === 'percent') {
            reportItem.unit = 'phần trăm';
            reportItem.discountValue = detail?.comboDiscountPercent || detail?.ticketDiscountPercent || 0;
          } else if (line.promotionType === 'amount') {
            reportItem.unit = 'VND';
            reportItem.discountValue = detail?.discountValue || 0;
          }
          
          allPromotions.push(reportItem);
        }
      }
      
      setReportData(allPromotions);
    } catch (error) {
      console.error('Error fetching promotion report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã CTKM',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => text || 'N/A'
    },
    {
      title: 'Tên CTKM',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => text || 'Không có mô tả'
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120
    },
    {
      title: 'Mã SP tặng',
      dataIndex: 'productCode',
      key: 'productCode',
      width: 120,
      render: (text: string) => text || ''
    },
    {
      title: 'Tên SP tặng',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      render: (text: string) => text || ''
    },
    {
      title: 'SL tặng',
      dataIndex: 'giftQuantity',
      key: 'giftQuantity',
      width: 100,
      render: (value: number) => typeof value === 'number' ? value : ''
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (text: string) => text || ''
    },
    {
      title: 'Số tiền chiết khấu',
      dataIndex: 'discountValue',
      key: 'discountValue',
      width: 150,
      render: (value: number, record: PromotionReportData) => {
        if (typeof value !== 'number') return '';
        if (record.promotionType === 'percent' || record.promotionType === 'voucher') {
          return `${value}%`;
        } else if (record.promotionType === 'amount') {
          return `${value.toLocaleString('vi-VN')}`;
        }
        return '';
      }
    },
    {
      title: 'Ngân sách tổng',
      dataIndex: 'totalBudget',
      key: 'totalBudget',
      width: 150,
      render: (value: number, record: PromotionReportData) => {
        if (typeof value !== 'number') return '';
        if (record.promotionType === 'voucher') {
          return value.toString();
        } else {
          return `${value.toLocaleString('vi-VN')}`;
        }
      }
    },
    {
      title: 'Ngân sách đã dùng',
      dataIndex: 'usedBudget',
      key: 'usedBudget',
      width: 150,
      render: (value: number, record: PromotionReportData) => {
        if (typeof value !== 'number') return '';
        if (record.promotionType === 'voucher') {
          return value.toString();
        } else {
          return `${value.toLocaleString('vi-VN')}`;
        }
      }
    },
    {
      title: 'Ngân sách còn lại',
      dataIndex: 'remainingBudget',
      key: 'remainingBudget',
      width: 150,
      render: (value: number, record: PromotionReportData) => {
        if (typeof value !== 'number') return '';
        if (record.promotionType === 'voucher') {
          return value.toString();
        } else {
          return `${value.toLocaleString('vi-VN')}`;
        }
      }
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin')}
            className="text-gray-600 hover:text-gray-800"
          >
            Quay lại
          </Button>
          <div className="flex items-center space-x-3">
            <FileTextOutlined className="text-2xl text-blue-600" />
            <Title level={2} className="mb-0 text-gray-800">
              BÁO CÁO TỔNG KẾT CTKM
            </Title>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <div>Thời gian xuất báo cáo: {dayjs().format('DD/MM/YYYY HH:mm')}</div>
          <div>User xuất báo cáo: Admin</div>
        </div>
      </div>

      {/* Report Table */}
      <Table
        columns={columns}
        dataSource={reportData}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} chương trình khuyến mãi`,
          className: 'mt-4'
        }}
        scroll={{ x: 1500 }}
        size="middle"
        bordered
        className="promotion-report-table w-full"
      />

      {/* Custom styles */}
      <style jsx>{`
        .promotion-report-table {
          width: 100% !important;
        }
        
        .promotion-report-table .ant-table-thead > tr > th {
          background-color: #e6f3ff !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #d9d9d9 !important;
        }
        
        .promotion-report-table .ant-table-tbody > tr > td {
          border: 1px solid #d9d9d9 !important;
          text-align: center !important;
        }
        
        .promotion-report-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
        
        .promotion-report-table .ant-table-container {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default PromotionReport;
