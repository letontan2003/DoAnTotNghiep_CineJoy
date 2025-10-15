  import React, { useEffect, useState, useMemo } from 'react';
import { Spin, Typography, Button, Radio, DatePicker, Space, Card, Row, Col } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllOrders } from '@/apiservice/apiOrder';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle
);

const { Title } = Typography;
const { RangePicker } = DatePicker;

type TimeFilter = 'day' | 'week' | 'month' | 'year';

interface IOrder {
  _id: string;
  totalAmount: number;
  finalAmount: number;
  orderStatus: string;
  createdAt: string;
  theaterId?: {
    name?: string;
    theaterCode?: string;
  } | string;
}

interface ChartDataItem {
  label: string;
  revenue: number;
  orders: number;
}

const SalesChartReport: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const allOrders: IOrder[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await getAllOrders(page, 100);
        allOrders.push(...response.orders);
        hasMore = page < response.totalPages;
        page++;
      }

      // Chỉ lấy orders đã confirmed
      const confirmedOrders = allOrders.filter(order => order.orderStatus === 'CONFIRMED');
      setOrders(confirmedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!dateRange) return orders;
    const [start, end] = dateRange;
    return orders.filter(order => {
      const orderDate = dayjs(order.createdAt);
      return orderDate.isBetween(start, end, null, '[]');
    });
  }, [orders, dateRange]);

  // Process data based on time filter
  const chartData = useMemo(() => {
    const dataMap = new Map<string, ChartDataItem>();

    filteredOrders.forEach(order => {
      const orderDate = dayjs(order.createdAt);
      let key = '';
      let label = '';

      switch (timeFilter) {
        case 'day': {
          key = orderDate.format('YYYY-MM-DD');
          label = orderDate.format('DD/MM/YYYY');
          break;
        }
        case 'week': {
          const weekNum = orderDate.week();
          const year = orderDate.year();
          key = `${year}-W${weekNum}`;
          label = `Tuần ${weekNum}/${year}`;
          break;
        }
        case 'month':
          key = orderDate.format('YYYY-MM');
          label = orderDate.format('MM/YYYY');
          break;
        case 'year':
          key = orderDate.format('YYYY');
          label = orderDate.format('YYYY');
          break;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { label, revenue: 0, orders: 0 });
      }

      const item = dataMap.get(key)!;
      item.revenue += order.finalAmount;
      item.orders += 1;
    });

    // Convert to array and sort
    const result = Array.from(dataMap.values()).sort((a, b) => {
      return a.label.localeCompare(b.label);
    });

    // Return all data (biểu đồ có scroll ngang nên không cần giới hạn)
    return result;
  }, [filteredOrders, timeFilter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.totalAmount - order.finalAmount), 0);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalDiscount,
    };
  }, [filteredOrders]);

  // Pie chart data - Revenue by Theater
  const pieChartData = useMemo(() => {
    const theaterMap = new Map<string, number>();

    filteredOrders.forEach(order => {
      const theater = typeof order.theaterId === 'object' ? order.theaterId : null;
      const theaterName = theater?.name || 'Không xác định';
      
      if (!theaterMap.has(theaterName)) {
        theaterMap.set(theaterName, 0);
      }
      theaterMap.set(theaterName, theaterMap.get(theaterName)! + order.finalAmount);
    });

    const labels = Array.from(theaterMap.keys());
    const data = Array.from(theaterMap.values());

    // Generate colors
    const colors = [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#C9CBCF',
      '#4BC0C0',
      '#FF6384',
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Doanh thu',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };
  }, [filteredOrders]);

  // Bar chart data - Revenue over time
  const barChartData = useMemo(() => {
    return {
      labels: chartData.map(item => item.label),
      datasets: [
        {
          label: 'Doanh thu (VNĐ)',
          data: chartData.map(item => item.revenue),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          borderRadius: 5,
          barThickness: 40,
        },
        {
          label: 'Số đơn hàng',
          data: chartData.map(item => item.orders * 10000), // Scale for visibility
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          borderRadius: 5,
          barThickness: 40,
        },
      ],
    };
  }, [chartData]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
          labels: {
            padding: 15,
            font: {
              size: 12,
              weight: 500,
            },
            usePointStyle: true,
            pointStyle: 'circle' as const,
            boxWidth: 12,
            boxHeight: 12,
          },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('vi-VN')} VNĐ (${percentage}%)`;
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          font: {
            size: 13,
            weight: 500,
          },
          usePointStyle: true,
          pointStyle: 'rectRounded' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.datasetIndex === 0) {
                label += context.parsed.y.toLocaleString('vi-VN') + ' VNĐ';
              } else {
                label += Math.round(context.parsed.y / 10000) + ' đơn hàng';
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function(value: any) {
            return value.toLocaleString('vi-VN');
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin', { state: { tab: 'statistics' } })}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg transition-colors duration-200 text-gray-700 hover:text-gray-900 font-medium shadow-sm cursor-pointer"
          >
            <ArrowLeftOutlined className="text-sm" />
            <span>Quay lại</span>
          </button>

          <div className="text-center">
            <Title level={2} className="mb-0 text-gray-800">
              THỐNG KÊ DOANH THU THEO BIỂU ĐỒ
            </Title>
          </div>

          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchOrders}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Tải lại
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <Row gutter={[16, 16]} align="middle">
            <Col>
              <Space>
                <span className="font-medium text-gray-700">Xem theo:</span>
                <Radio.Group
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="day">Ngày</Radio.Button>
                  <Radio.Button value="week">Tuần</Radio.Button>
                  <Radio.Button value="month">Tháng</Radio.Button>
                  <Radio.Button value="year">Năm</Radio.Button>
                </Radio.Group>
              </Space>
            </Col>

            <Col flex="auto">
              <Space>
                <span className="font-medium text-gray-700">Khoảng thời gian:</span>
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
                  style={{ width: 300 }}
                />
                {dateRange && (
                  <Button onClick={() => setDateRange(null)}>Xóa lọc</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">Tổng doanh thu</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.totalRevenue.toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">Tổng đơn hàng</div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.totalOrders.toLocaleString('vi-VN')}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">Giá trị TB/đơn</div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(statistics.avgOrderValue).toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">Tổng chiết khấu</div>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.totalDiscount.toLocaleString('vi-VN')} ₫
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} className="mb-6">
        {/* Bar Chart */}
        <Col xs={24} lg={14}>
          <Card 
            title="Biểu đồ doanh thu theo thời gian"
            className="shadow-md"
          >
            <div style={{ height: '400px', overflowX: 'auto', overflowY: 'hidden' }}>
              <div style={{ 
                minWidth: chartData.length > 7 ? `${chartData.length * 100}px` : '100%', 
                height: '100%',
                paddingBottom: '10px'
              }}>
                <Bar data={barChartData} options={barOptions} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Pie Chart */}
        <Col xs={24} lg={10}>
          <Card 
            title="Doanh thu theo rạp chiếu"
            className="shadow-md"
          >
            <div style={{ height: '400px' }}>
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Data Table Summary */}
      <Card 
        title="Chi tiết dữ liệu"
        className="shadow-md mt-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border">
                  Số đơn hàng
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                  Doanh thu (VNĐ)
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">
                  Giá trị TB/đơn
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 border">{item.label}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700 border">
                    {item.orders}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border">
                    {item.revenue.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700 border">
                    {Math.round(item.revenue / item.orders).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              {chartData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Custom Styles for Scrollbar */}
      <style>{`
        .shadow-md > div > div::-webkit-scrollbar {
          height: 8px;
        }
        
        .shadow-md > div > div::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .shadow-md > div > div::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        
        .shadow-md > div > div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default SalesChartReport;

