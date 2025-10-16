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
  LineElement,
  PointElement,
  Filler,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

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
  ChartTitle,
  LineElement,
  PointElement,
  Filler
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

  // Line chart data - Revenue trend with growth rate
  const lineChartData = useMemo(() => {
    const revenueData = chartData.map(item => item.revenue);
    
    // Calculate growth rate
    const growthRates = revenueData.map((value, index) => {
      if (index === 0) return 0;
      const prevValue = revenueData[index - 1];
      if (prevValue === 0) return 0;
      return ((value - prevValue) / prevValue) * 100;
    });

    return {
      labels: chartData.map(item => item.label),
      datasets: [
        {
          label: 'Doanh thu (VNĐ)',
          data: revenueData,
          fill: true,
          borderColor: 'rgb(59, 130, 246)',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
            gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
            return gradient;
          },
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointHoverBorderWidth: 3,
        },
      ],
      growthRates,
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

  const lineOptions = {
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
          pointStyle: 'circle' as const,
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
            const value = context.parsed.y;
            const index = context.dataIndex;
            const growthRate = lineChartData.growthRates[index];
            
            let label = `Doanh thu: ${value.toLocaleString('vi-VN')} VNĐ`;
            
            if (index > 0) {
              const growthIcon = growthRate >= 0 ? '📈' : '📉';
              const growthColor = growthRate >= 0 ? '+' : '';
              label += `\nTăng trưởng: ${growthIcon} ${growthColor}${growthRate.toFixed(1)}%`;
            }
            
            return label.split('\n');
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          padding: 10,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function(value: any) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value.toLocaleString('vi-VN');
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          maxRotation: 45,
          minRotation: 0,
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

      {/* Revenue Trend Line Chart */}
      <Card 
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">Biểu Đồ Theo Dõi Biến Động Doanh Thu</div>
              <div className="text-xs text-gray-500 font-normal">Phân tích xu hướng và tỷ lệ tăng trưởng theo thời gian</div>
            </div>
          </div>
        }
        className="shadow-md"
        style={{ marginTop: '28px' }}
        extra={
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-medium text-blue-700">Hover vào điểm để xem chi tiết tăng trưởng</span>
          </div>
        }
      >

        {/* Line Chart */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 border border-gray-200">
          <div style={{ height: '450px', overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ 
              minWidth: chartData.length > 9 ? `${chartData.length * 120}px` : '100%', 
              height: '100%',
              paddingBottom: '10px'
            }}>
              <Line data={lineChartData} options={lineOptions} />
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1"> Phân Tích Thông Minh</h4>
                <p className="text-sm text-gray-700">
                  {lineChartData.growthRates.filter(rate => rate > 0).length > lineChartData.growthRates.length / 2
                    ? "Xu hướng tích cực! Doanh thu đang có chiều hướng tăng trưởng ổn định. Hãy duy trì các chiến lược hiện tại."
                    : "Cần chú ý! Doanh thu có dấu hiệu biến động. Xem xét điều chỉnh chiến lược kinh doanh và marketing."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-purple-800 mb-1"> Khuyến Nghị</h4>
                <p className="text-sm text-gray-700">
                  Tập trung vào các thời điểm có tăng trưởng cao để tối ưu hóa nguồn lực. 
                  Phân tích sâu hơn về các yếu tố ảnh hưởng đến biến động.
                </p>
              </div>
            </div>
          </div>
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

