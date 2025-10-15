import React, { useEffect, useState } from 'react';
import { Table, Spin, Typography, DatePicker, Button } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllOrders } from '@/apiservice/apiOrder';
import useAppStore from '@/store/app.store';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface SalesReportData {
  key: string;
  stt: number;
  theaterCode: string;
  theaterName: string;
  city: string;
  date: string;
  discount: number;
  totalAmount: number;
  finalAmount: number;
  orderId: string;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

const SalesReportByDay: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportData[]>([]);
  const [filteredData, setFilteredData] = useState<SalesReportData[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [maxDate, setMaxDate] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Lấy tất cả orders với phân trang lớn để lấy hết dữ liệu
      const allOrders: IOrder[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await getAllOrders(page, 100);
        console.log('Orders response:', response);
        allOrders.push(...response.orders);
        hasMore = page < response.totalPages;
        page++;
      }
      
      console.log('Total orders:', allOrders.length);
      console.log('Sample order:', allOrders[0]);
      
      // Lọc chỉ lấy orders có trạng thái CONFIRMED
      const confirmedOrders = allOrders.filter(order => order.orderStatus === 'CONFIRMED');
      
      console.log('Confirmed orders:', confirmedOrders.length);
      
      const salesData: SalesReportData[] = [];
      let stt = 1;
      
      // Nhóm orders theo rạp
      const ordersByTheater = confirmedOrders.reduce((acc: Record<string, IOrder[]>, order: IOrder) => {
        const theater = typeof order.theaterId === 'object' ? order.theaterId : null;
        const theaterKey = theater?.theaterCode || 'UNKNOWN';
        if (!acc[theaterKey]) {
          acc[theaterKey] = [];
        }
        acc[theaterKey].push(order);
        return acc;
      }, {} as Record<string, IOrder[]>);
      
      // Sắp xếp theo theaterCode
      const sortedTheaters = Object.keys(ordersByTheater).sort();
      
      let grandTotalDiscount = 0;
      let grandTotalAmount = 0;
      let grandFinalAmount = 0;
      
      sortedTheaters.forEach(theaterCode => {
        const theaterOrders = ordersByTheater[theaterCode];
        let theaterTotalDiscount = 0;
        let theaterTotalAmount = 0;
        let theaterFinalAmount = 0;
        
        // Sắp xếp orders trong rạp theo ngày
        const sortedOrders = theaterOrders.sort((a, b) => {
          return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
        });
        
        sortedOrders.forEach((order) => {
          const discount = order.totalAmount - order.finalAmount;
          // theaterId có thể là object được populate hoặc string
          const theater = typeof order.theaterId === 'object' ? order.theaterId : null;
          const orderDate = dayjs(order.createdAt).format('DD/MM/YYYY');
          
          console.log('Order theater data:', {
            orderId: order._id,
            theaterId: order.theaterId,
            theater: theater,
            theaterCode: theater?.theaterCode
          });
          
          salesData.push({
            key: `${order._id}`,
            stt: stt++,
            theaterCode: theater?.theaterCode || 'N/A',
            theaterName: theater?.name || 'N/A',
            city: theater?.location?.city || 'N/A',
            date: orderDate,
            discount: discount,
            totalAmount: order.totalAmount,
            finalAmount: order.finalAmount,
            orderId: order._id
          });
          
          theaterTotalDiscount += discount;
          theaterTotalAmount += order.totalAmount;
          theaterFinalAmount += order.finalAmount;
        });
        
        // Thêm dòng tổng cộng cho rạp
        salesData.push({
          key: `subtotal-${theaterCode}`,
          stt: 0,
          theaterCode: '',
          theaterName: '',
          city: '',
          date: 'Tổng cộng',
          discount: theaterTotalDiscount,
          totalAmount: theaterTotalAmount,
          finalAmount: theaterFinalAmount,
          orderId: '',
          isSubtotal: true
        });
        
        grandTotalDiscount += theaterTotalDiscount;
        grandTotalAmount += theaterTotalAmount;
        grandFinalAmount += theaterFinalAmount;
      });
      
      // Thêm dòng tổng cộng cuối cùng
      salesData.push({
        key: 'grand-total',
        stt: 0,
        theaterCode: '',
        theaterName: '',
        city: '',
        date: 'Tổng cộng',
        discount: grandTotalDiscount,
        totalAmount: grandTotalAmount,
        finalAmount: grandFinalAmount,
        orderId: '',
        isGrandTotal: true
      });
      
      console.log('Sales data generated:', salesData.length);
      console.log('Sample sales data:', salesData.slice(0, 3));
      
      setReportData(salesData);
      
      // Tính min/max date từ dữ liệu
      if (confirmedOrders.length > 0) {
        const dates = confirmedOrders.map(order => dayjs(order.createdAt));
        const min = dates.reduce((min, d) => d.isBefore(min) ? d : min, dates[0]);
        const max = dates.reduce((max, d) => d.isAfter(max) ? d : max, dates[0]);
        setMinDate(min);
        setMaxDate(max);
      }
      
    } catch (error) {
      console.error('Error fetching sales report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on date range
  useEffect(() => {
    console.log('Filtering data. Report data length:', reportData.length);
    let filtered = [...reportData];

    // Filter by date range
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      
      // Lọc chỉ lấy các dòng dữ liệu (không phải tổng cộng)
      const dataOnly = reportData.filter(item => !item.isSubtotal && !item.isGrandTotal);
      
      // Lọc theo khoảng ngày
      const filteredData = dataOnly.filter(item => {
        const itemDate = dayjs(item.date, 'DD/MM/YYYY');
        return itemDate.isSameOrAfter(startDate) && itemDate.isSameOrBefore(endDate);
      });
      
      // Nhóm lại theo rạp và tính lại tổng
      const theaterGroups: Record<string, SalesReportData[]> = {};
      filteredData.forEach(item => {
        const key = item.theaterCode;
        if (!theaterGroups[key]) {
          theaterGroups[key] = [];
        }
        theaterGroups[key].push(item);
      });
      
      // Xây dựng lại danh sách với tổng cộng mới
      filtered = [];
      let grandTotalDiscount = 0;
      let grandTotalAmount = 0;
      let grandFinalAmount = 0;
      
      Object.keys(theaterGroups).sort().forEach(theaterCode => {
        const items = theaterGroups[theaterCode];
        let theaterTotalDiscount = 0;
        let theaterTotalAmount = 0;
        let theaterFinalAmount = 0;
        
        items.forEach(item => {
          filtered.push(item);
          theaterTotalDiscount += item.discount;
          theaterTotalAmount += item.totalAmount;
          theaterFinalAmount += item.finalAmount;
        });
        
        // Thêm dòng tổng cộng cho rạp
        filtered.push({
          key: `subtotal-${theaterCode}-filtered`,
          stt: 0,
          theaterCode: '',
          theaterName: '',
          city: '',
          date: 'Tổng cộng',
          discount: theaterTotalDiscount,
          totalAmount: theaterTotalAmount,
          finalAmount: theaterFinalAmount,
          orderId: '',
          isSubtotal: true
        });
        
        grandTotalDiscount += theaterTotalDiscount;
        grandTotalAmount += theaterTotalAmount;
        grandFinalAmount += theaterFinalAmount;
      });
      
      // Thêm dòng tổng cộng cuối
      if (filtered.length > 0) {
        filtered.push({
          key: 'grand-total-filtered',
          stt: 0,
          theaterCode: '',
          theaterName: '',
          city: '',
          date: 'Tổng cộng',
          discount: grandTotalDiscount,
          totalAmount: grandTotalAmount,
          finalAmount: grandFinalAmount,
          orderId: '',
          isGrandTotal: true
        });
      }
    } else {
      filtered = [...reportData];
    }
    
    console.log('Filtered data length:', filtered.length);
    setFilteredData(filtered);
  }, [reportData, dateRange]);

  // Hàm format tiền với dấu chấm phân cách
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('vi-VN');
  };

  const exportToExcel = async () => {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo doanh số');
    
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
      const allDates = reportData
        .filter(item => !item.isSubtotal && !item.isGrandTotal)
        .map(item => dayjs(item.date, 'DD/MM/YYYY'));
      
      if (allDates.length > 0) {
        const min = allDates.reduce((min, d) => d.isBefore(min) ? d : min, allDates[0]);
        const max = allDates.reduce((max, d) => d.isAfter(max) ? d : max, allDates[0]);
        fromDate = min.format('DD/MM/YYYY');
        toDate = max.format('DD/MM/YYYY');
      }
    }
    
    // Add title row (Row 1) - DOANH SỐ BÁN HÀNG THEO NGÀY
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DOANH SỐ BÁN HÀNG THEO NGÀY';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add info rows
    worksheet.getCell('A2').value = `Thời gian xuất báo cáo : ${currentDate}`;
    worksheet.getCell('A3').value = `User xuất báo cáo : ${adminUser}`;
    worksheet.getCell('A4').value = `Từ ngày: ${fromDate}         Đến ngày: ${toDate}`;
    
    // Empty row 5
    
    // Add table headers (Row 6) - IN ĐẬM
    const headers = [
      'STT',
      'Mã Rạp',
      'Tên Rạp',
      'Khu Vực',
      'Ngày',
      'Chiết khấu',
      'Doanh số trước CK',
      'Doanh số sau CK'
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
        fgColor: { argb: 'FFE6F3FF' } // Light blue color
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
      
      // Handle grand total row specially
      if (item.isGrandTotal) {
        row.values = [
          'Tổng cộng',
          '',
          '',
          '',
          '',
          formatCurrency(item.discount),
          formatCurrency(item.totalAmount),
          formatCurrency(item.finalAmount)
        ];
      } else {
        row.values = [
          item.stt || '',
          item.theaterCode,
          item.theaterName,
          item.city,
          item.date,
          formatCurrency(item.discount),
          formatCurrency(item.totalAmount),
          formatCurrency(item.finalAmount)
        ];
      }
      
      // Format for subtotal and grand total rows
      if (item.isSubtotal || item.isGrandTotal) {
        row.font = { bold: true };
        
        // Thêm màu đỏ cho hàng tổng cộng cuối (chỉ chữ đỏ)
        if (item.isGrandTotal) {
          row.font = { bold: true, color: { argb: 'FFFF0000' } }; // Chỉ chữ đỏ
        }
      }
      
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Set column widths
    worksheet.columns = [
      { width: 10 },  // STT
      { width: 15 },  // Mã Rạp
      { width: 25 },  // Tên Rạp
      { width: 20 },  // Khu Vực
      { width: 15 },  // Ngày
      { width: 15 },  // Chiết khấu
      { width: 20 },  // Doanh số trước CK
      { width: 20 }   // Doanh số sau CK
    ];
    
    // Generate filename
    let filename = 'DOANH SỐ BÁN HÀNG THEO NGÀY';
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].format('DD/MM/YYYY');
      const endDate = dateRange[1].format('DD/MM/YYYY');
      filename += ` từ ${startDate} đến ${endDate}`;
    } else {
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
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      width: 60,
      render: (value: number, record: SalesReportData) => {
        if (record.isGrandTotal) {
          return <span style={{ color: 'red', fontWeight: 'bold' }}>Tổng cộng</span>;
        }
        if (record.isSubtotal) {
          return '';
        }
        return value;
      }
    },
    {
      title: 'Mã Rạp',
      dataIndex: 'theaterCode',
      key: 'theaterCode',
      width: 120,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return '';
        }
        return text;
      }
    },
    {
      title: 'Tên Rạp',
      dataIndex: 'theaterName',
      key: 'theaterName',
      width: 200,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return '';
        }
        return text;
      }
    },
    {
      title: 'Khu Vực',
      dataIndex: 'city',
      key: 'city',
      width: 150,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return '';
        }
        return text;
      }
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (text: string, record: SalesReportData) => {
        if (record.isGrandTotal) {
          return '';
        }
        return text;
      }
    },
    {
      title: 'Chiết khấu',
      dataIndex: 'discount',
      key: 'discount',
      width: 120,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== 'number') return '';
        const formattedValue = `${value.toLocaleString('vi-VN')}`;
        if (record.isGrandTotal) {
          return <span style={{ color: 'red', fontWeight: 'bold' }}>{formattedValue}</span>;
        }
        return formattedValue;
      }
    },
    {
      title: 'Doanh số trước CK',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 150,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== 'number') return '';
        const formattedValue = `${value.toLocaleString('vi-VN')}`;
        if (record.isGrandTotal) {
          return <span style={{ color: 'red', fontWeight: 'bold' }}>{formattedValue}</span>;
        }
        return formattedValue;
      }
    },
    {
      title: 'Doanh số sau CK',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      width: 150,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== 'number') return '';
        const formattedValue = `${value.toLocaleString('vi-VN')}`;
        if (record.isGrandTotal) {
          return <span style={{ color: 'red', fontWeight: 'bold' }}>{formattedValue}</span>;
        }
        return formattedValue;
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
              DOANH SỐ BÁN HÀNG THEO NGÀY
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

            {/* Clear filters button */}
            <button
              onClick={() => {
                setDateRange(null);
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
          className="sales-report-table"
          sticky={{ offsetHeader: 0 }}
          rowClassName={(record) => {
            if (record.isSubtotal || record.isGrandTotal) {
              return 'total-row';
            }
            return '';
          }}
        />
      </div>

      {/* Custom styles */}
      <style>{`
        .sales-report-table {
          width: 100% !important;
        }
        
        .sales-report-table .ant-table-thead > tr > th {
          background-color: #e6f3ff !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #d9d9d9 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        
        .sales-report-table .ant-table-tbody > tr > td {
          border: 1px solid #d9d9d9 !important;
          text-align: center !important;
        }
        
        .sales-report-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
        
        .sales-report-table .ant-table-tbody > tr.total-row > td {
          font-weight: bold !important;
          background-color: #f9f9f9 !important;
        }
        
        .sales-report-table .ant-table-tbody > tr.total-row:hover > td {
          background-color: #f0f0f0 !important;
        }
        
        .sales-report-table .ant-table-container {
          width: 100% !important;
        }
        
        .sales-report-table .ant-table-body {
          overflow: auto !important;
          max-height: calc(100vh - 300px) !important;
        }
        
        .sales-report-table .ant-table-content {
          overflow: hidden !important;
        }
        
        .sales-report-table .ant-table {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
};

export default SalesReportByDay;
