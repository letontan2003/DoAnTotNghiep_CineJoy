import React, { useEffect, useState } from 'react';
import { Table, Spin, Typography, DatePicker, Select, Button } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getVouchers, getAmountBudgetUsedApi, getItemBudgetUsedApi, getPercentBudgetUsedApi } from '@/apiservice/apiVoucher';
import useAppStore from '@/store/app.store';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

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
  status: string; // Trạng thái
  voucherId: string;
  lineIndex: number;
}

const PromotionReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<PromotionReportData[]>([]);
  const [filteredData, setFilteredData] = useState<PromotionReportData[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [maxDate, setMaxDate] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const vouchers = await getVouchers();
      
      const allPromotions: PromotionReportData[] = [];
      
      console.log('Raw vouchers data:', JSON.stringify(vouchers, null, 2));
      
      for (const voucher of vouchers) {
        if (!voucher.lines || voucher.lines.length === 0) continue;
        
        for (let i = 0; i < voucher.lines.length; i++) {
          const line = voucher.lines[i];
          console.log(`Line ${i} data:`, JSON.stringify(line, null, 2));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            status: line.status,
            unit: '', // Sẽ được set sau
            totalBudget,
            usedBudget,
            remainingBudget
          };
          
          // Điền thông tin theo loại khuyến mãi
          if (line.promotionType === 'item') {
            reportItem.productCode = detail?.rewardItemId || '';
            reportItem.productName = detail?.rewardItem || '';
            reportItem.giftQuantity = totalBudget; // Lấy từ ngân sách tổng
            reportItem.unit = 'sản phẩm';
            reportItem.discountValue = undefined; // Không có cho khuyến mãi hàng
          } else if (line.promotionType === 'voucher') {
            reportItem.giftQuantity = detail?.totalQuantity || detail?.quantity || 0;
            reportItem.unit = 'Phiếu';
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
      
      // Tính min/max date từ dữ liệu
      if (allPromotions.length > 0) {
        const dates = allPromotions.map(item => ({
          start: dayjs(item.startDate, 'DD/MM/YYYY'),
          end: dayjs(item.endDate, 'DD/MM/YYYY')
        }));
        const minStart = dates.reduce((min, d) => d.start.isBefore(min) ? d.start : min, dates[0].start);
        const maxEnd = dates.reduce((max, d) => d.end.isAfter(max) ? d.end : max, dates[0].end);
        setMinDate(minStart);
        setMaxDate(maxEnd);
      }
    } catch (error) {
      console.error('Error fetching promotion report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on date range and status
  useEffect(() => {
    let filtered = [...reportData];

    // Filter by date range
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      filtered = filtered.filter(item => {
        const itemStart = dayjs(item.startDate, 'DD/MM/YYYY');
        const itemEnd = dayjs(item.endDate, 'DD/MM/YYYY');
        
        // Check if promotion period is completely within filter period
        // Both start and end dates must be within the filter range
        return itemStart.isSameOrAfter(startDate) && itemEnd.isSameOrBefore(endDate);
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    setFilteredData(filtered);
  }, [reportData, dateRange, statusFilter]);

  const exportToExcel = async () => {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo CTKM');
    
    // Prepare header data
    const currentDate = dayjs().format('DD/MM/YYYY HH:mm');
    const userName = user?.fullName || 'Admin';
    const adminUser = `Admin ${userName}`;
    
    // Get date range for report
    let fromDate = '';
    let toDate = '';
    
    if (dateRange && dateRange[0] && dateRange[1]) {
      fromDate = dateRange[0].format('DD/MM/YYYY');
      toDate = dateRange[1].format('DD/MM/YYYY');
    } else {
      // Use min/max dates from all data
      const allDates = reportData.map(item => ({
        start: dayjs(item.startDate, 'DD/MM/YYYY'),
        end: dayjs(item.endDate, 'DD/MM/YYYY')
      }));
      
      if (allDates.length > 0) {
        const minStart = allDates.reduce((min, d) => d.start.isBefore(min) ? d.start : min, allDates[0].start);
        const maxEnd = allDates.reduce((max, d) => d.end.isAfter(max) ? d.end : max, allDates[0].end);
        fromDate = minStart.format('DD/MM/YYYY');
        toDate = maxEnd.format('DD/MM/YYYY');
      }
    }
    
    // Add title row (Row 1) - BÁO CÁO TỔNG KẾT CTKM
    worksheet.mergeCells('A1:N1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'BÁO CÁO TỔNG KẾT CTKM';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add info rows
    worksheet.getCell('A2').value = `Thời gian xuất báo cáo : ${currentDate}`;
    worksheet.getCell('A3').value = `User xuất báo cáo : ${adminUser}`;
    worksheet.getCell('A4').value = `Từ ngày: ${fromDate}         Đến ngày: ${toDate}`;
    
    // Empty row 5
    
    // Add table headers (Row 6) - IN ĐẬM
    const headers = [
      'Mã CTKM',
      'Kiểu khuyến mãi',
      'Tên CTKM',
      'Trạng thái',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Mã SP tặng',
      'Tên SP tặng',
      'SL tặng',
      'Đơn vị tính',
      'Số tiền chiết khấu',
      'Ngân sách tổng',
      'Ngân sách đã dùng',
      'Ngân sách còn lại'
    ];
    
    const headerRow = worksheet.getRow(6);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;
    
    // Add blue background to header cells
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' } // Light blue color matching the image
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add data rows
    filteredData.forEach((item, index) => {
      const row = worksheet.getRow(7 + index);
      row.values = [
        item.code,
        item.promotionType === 'voucher' ? 'Voucher' :
        item.promotionType === 'item' ? 'Khuyến mãi hàng' :
        item.promotionType === 'percent' ? 'Khuyến mãi chiết khấu' :
        item.promotionType === 'amount' ? 'Khuyến mãi tiền' : item.promotionType,
        item.name,
        item.status,
        item.startDate,
        item.endDate,
        item.productCode || '',
        item.productName || '',
        item.giftQuantity || '',
        item.unit,
        item.discountValue || '',
        item.totalBudget,
        item.usedBudget,
        item.remainingBudget
      ];
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Set column widths
    worksheet.columns = [
      { width: 15 },  // Mã CTKM
      { width: 20 },  // Kiểu khuyến mãi
      { width: 30 },  // Tên CTKM
      { width: 15 },  // Trạng thái
      { width: 15 },  // Ngày bắt đầu
      { width: 15 },  // Ngày kết thúc
      { width: 20 },  // Mã SP tặng
      { width: 20 },  // Tên SP tặng
      { width: 10 },  // SL tặng
      { width: 15 },  // Đơn vị tính
      { width: 20 },  // Số tiền chiết khấu
      { width: 15 },  // Ngân sách tổng
      { width: 15 },  // Ngân sách đã dùng
      { width: 15 }   // Ngân sách còn lại
    ];
    
    // Generate filename
    let filename = 'BÁO CÁO TỔNG KẾT CTKM';
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].format('DD/MM/YYYY');
      const endDate = dateRange[1].format('DD/MM/YYYY');
      filename += ` từ ${startDate} đến ${endDate}`;
    } else {
      // Use min/max dates from all data when no filter is applied
      filename += ` từ ${fromDate} đến ${toDate}`;
    }
    
    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
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
      title: 'Kiểu khuyến mãi',
      dataIndex: 'promotionType',
      key: 'promotionType',
      width: 150,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          'voucher': 'Voucher',
          'item': 'Khuyến mãi hàng',
          'percent': 'Khuyến mãi chiết khấu',
          'amount': 'Khuyến mãi tiền'
        };
        return typeMap[type] || type;
      }
    },
    {
      title: 'Tên CTKM',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => text || 'Không có mô tả'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => status || 'hoạt động'
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
    <div className="overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        {/* Top row - Back button and title */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin', { state: { tab: 'statistics' } })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeftOutlined className="text-sm" />
            <span>Quay lại</span>
          </button>
          <div className="text-center mt-2">
            <Title level={2} className="mb-0 text-gray-800">
              BÁO CÁO TỔNG KẾT CTKM
            </Title>
          </div>
          <div className="flex items-center">
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
            >
              Xuất báo cáo
            </Button>
          </div>
        </div>
        
        {/* Filter row */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4">
            {/* Date filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Thời gian:</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  } else {
                    setDateRange(null);
                  }
                }}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
                style={{ width: 250 }}
                disabledDate={(current) => {
                  if (!minDate || !maxDate) return false;
                  return current && (current < minDate || current > maxDate);
                }}
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Trạng thái:</span>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">Tất cả</Option>
                <Option value="hoạt động">Hoạt động</Option>
                <Option value="không hoạt động">Không hoạt động</Option>
              </Select>
            </div>

            {/* Clear filters button */}
            <button
              onClick={() => {
                setDateRange(null);
                setStatusFilter('all');
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors duration-200 text-gray-600"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={false}
          scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
          size="middle"
          bordered
          className="promotion-report-table"
          sticky={{ offsetHeader: 0 }}
        />
      </div>

      {/* Custom styles */}
      <style>{`
        .promotion-report-table {
          width: 100% !important;
        }
        
        .promotion-report-table .ant-table-thead > tr > th {
          background-color: #e6f3ff !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #d9d9d9 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
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
        
        .promotion-report-table .ant-table-body {
          overflow: auto !important;
          max-height: calc(100vh - 300px) !important;
        }
        
        .promotion-report-table .ant-table-content {
          overflow: hidden !important;
        }
        
        .promotion-report-table .ant-table {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
};

export default PromotionReport;
