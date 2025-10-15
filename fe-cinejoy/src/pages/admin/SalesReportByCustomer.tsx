import React, { useEffect, useMemo, useState } from 'react';
import { Table, Spin, Typography, DatePicker, Button } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import useAppStore from '@/store/app.store';
import ExcelJS from 'exceljs';
import { getAllOrders } from '@/apiservice/apiOrder';

const { Title } = Typography;
const { RangePicker } = DatePicker;

type Nullable<T> = T | null | undefined;

interface UserLite {
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
}

interface FoodComboLite {
  comboId: Nullable<{ _id?: string; name?: string } | string>;
  quantity: number;
}

interface OrderLite {
  _id: string;
  userId: Nullable<string | UserLite>;
  orderStatus: string;
  seats: { seatId: string; type: string }[];
  foodCombos: FoodComboLite[];
  totalAmount: number;
  finalAmount: number;
  createdAt: string;
}

interface RowData {
  key: string;
  stt: number;
  userCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  group: number; // trùng STT
  ticketInfo: React.ReactNode;
  concessionInfo: React.ReactNode;
  ticketText?: string;
  concessionText?: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  date: string;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  isFirstInGroup?: boolean;
  groupIndex?: number;
}

const SalesReportByCustomer: React.FC = () => {
  const navigate = useNavigate();
  useAppStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [maxDate, setMaxDate] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAllOrders(1, 1000);
        const confirmed = (res.orders || []).filter((o: OrderLite) => o.orderStatus === 'CONFIRMED');
        setOrders(confirmed as OrderLite[]);
        // Tính min/max ngày giao dịch
        if (confirmed.length > 0) {
          const ds = confirmed.map(o => dayjs(o.createdAt));
          const min = ds.reduce((a, b) => (b.isBefore(a) ? b : a), ds[0]).startOf('day');
          const max = ds.reduce((a, b) => (b.isAfter(a) ? b : a), ds[0]).endOf('day');
          setMinDate(min);
          setMaxDate(max);
        } else {
          setMinDate(null);
          setMaxDate(null);
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (dateRange) {
      const [start, end] = dateRange;
      const startDay = start.startOf('day');
      const endDay = end.endOf('day');
      list = list.filter((o) => {
        const d = dayjs(o.createdAt);
        return d.isSame(startDay) || d.isSame(endDay) || (d.isAfter(startDay) && d.isBefore(endDay)) || d.isBetween(startDay, endDay, undefined, '[]');
      });
    }
    return list;
  }, [orders, dateRange]);

  const rows: RowData[] = useMemo(() => {
    // Nhóm theo khách hàng (userCode)
    const groups: Record<string, OrderLite[]> = {};
    for (const order of filteredOrders) {
      const u = order.userId as UserLite | string | undefined;
      const userCode = typeof u === 'object' ? (u?._id || '') : (typeof u === 'string' ? u : '');
      const key = userCode || 'UNKNOWN_USER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    }

    const sortedKeys = Object.keys(groups).sort();
    const result: RowData[] = [];
    let stt = 0;
    const grandTotal = { total: 0, discount: 0, final: 0 };

    for (const key of sortedKeys) {
      const ordersOfUser = groups[key];
      // Tăng số thứ tự nhóm một lần cho mỗi khách hàng
      stt += 1;
      const subtotal = { total: 0, discount: 0, final: 0 };
      let firstInGroup = true;
      for (const order of ordersOfUser) {
      const u = order.userId as UserLite | string | undefined;
      const userCode = typeof u === 'object' ? (u?._id || '') : (typeof u === 'string' ? u : '');
      const fullName = (typeof u === 'object' ? u?.fullName : '') || '';
      const email = (typeof u === 'object' ? u?.email : '') || '';
      const phoneNumber = (typeof u === 'object' ? u?.phoneNumber : '') || '';
      const gender = (typeof u === 'object' ? (u?.gender || '') : '');

      const firstType = order.seats && order.seats.length > 0 ? order.seats[0].type : '';
      const seatIds = (order.seats || []).map(s => s.seatId).join(',');
      const ticketInfo = (
        <div>
          <div>{firstType}</div>
          <div>{seatIds}</div>
        </div>
      );

      const concessionInfo = (
        <div>
          {(order.foodCombos || []).map((f, i) => {
            const name = typeof f.comboId === 'object' ? (f.comboId as { name?: string })?.name : '';
            return (
              <div key={i}>{f.quantity} {name}</div>
            );
          })}
        </div>
      );

      const discount = (order.totalAmount || 0) - (order.finalAmount || 0);
      subtotal.total += order.totalAmount || 0;
      subtotal.discount += discount;
      subtotal.final += order.finalAmount || 0;
      grandTotal.total += order.totalAmount || 0;
      grandTotal.discount += discount;
      grandTotal.final += order.finalAmount || 0;

      result.push({
        key: order._id,
        stt, // số thứ tự nhóm
        userCode,
        fullName,
        email,
        phoneNumber,
        gender,
        group: stt,
        ticketInfo,
        concessionInfo,
        ticketText: `${firstType}\n${seatIds}`,
        concessionText: (order.foodCombos || []).map((f) => {
          const name = typeof f.comboId === 'object' ? (f.comboId as { name?: string })?.name : '';
          return `${f.quantity} ${name}`;
        }).join('\n'),
        totalAmount: order.totalAmount || 0,
        discount,
        finalAmount: order.finalAmount || 0,
        date: dayjs(order.createdAt).format('DD/MM/YYYY HH:mm'),
        isFirstInGroup: firstInGroup,
        groupIndex: stt
      });
      firstInGroup = false;
      }

      // Dòng tổng cộng theo khách hàng
      result.push({
        key: `subtotal-${key}`,
        stt: 0,
        userCode: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        gender: '',
        group: 0,
        ticketInfo: <></>,
        concessionInfo: <></>,
        totalAmount: subtotal.total,
        discount: subtotal.discount,
        finalAmount: subtotal.final,
        date: '',
        isSubtotal: true
      });
    }

    // Tổng cộng cuối bảng
    if (result.length > 0) {
      result.push({
        key: 'grand-total',
        stt: 0,
        userCode: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        gender: '',
        group: 0,
        ticketInfo: <></>,
        concessionInfo: <></>,
        totalAmount: grandTotal.total,
        discount: grandTotal.discount,
        finalAmount: grandTotal.final,
        date: '',
        isGrandTotal: true
      });
    }

    return result;
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <div className="mb-6">
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
              DOANH SỐ THEO KHÁCH HÀNG
            </Title>
          </div>
          <div className="flex items-center">
            <Button type="primary" icon={<FileExcelOutlined />} onClick={async () => {
              const workbook = new ExcelJS.Workbook();
              const worksheet = workbook.addWorksheet('Doanh số theo KH');

              const fmt = (n: number) => (n ?? 0).toLocaleString('vi-VN');

              const currentDate = dayjs().format('DD/MM/YYYY HH:mm');
              const storeState = (useAppStore as unknown as { getState?: () => { user?: { fullName?: string } } }).getState?.();
              const userName = storeState?.user?.fullName || 'Admin';
              const adminUser = `Admin ${userName}`;

              let fromDate = '';
              let toDate = '';
              if (dateRange && dateRange[0] && dateRange[1]) {
                fromDate = dateRange[0].format('DD/MM/YYYY');
                toDate = dateRange[1].format('DD/MM/YYYY');
              } else if (minDate && maxDate) {
                fromDate = minDate.format('DD/MM/YYYY');
                toDate = maxDate.format('DD/MM/YYYY');
              }

              worksheet.mergeCells('A1:M1');
              const titleCell = worksheet.getCell('A1');
              titleCell.value = 'DOANH SỐ THEO KHÁCH HÀNG';
              titleCell.font = { bold: true, size: 16 };
              titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

              worksheet.getCell('A2').value = `Thời gian xuất báo cáo : ${currentDate}`;
              worksheet.getCell('A3').value = `User xuất báo cáo : ${adminUser}`;
              worksheet.getCell('A4').value = `Từ ngày: ${fromDate}         Đến ngày: ${toDate}`;

              const headers = [
                'STT','Mã KH','Tên KH','Gmail','SĐT','Giới tính','Nhóm KH','Thời gian giao dịch','Vé','Concession(s)','Doanh số trước CK','Chiết khấu','Doanh số sau CK'
              ];
              const headerRow = worksheet.getRow(6);
              headerRow.values = headers;
              headerRow.font = { bold: true };
              headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
              headerRow.height = 20;
              headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              });

              // Ghi dữ liệu & chuẩn bị merge cột STT theo nhóm
              let currentGroupStart: number | null = null;
              let currentGroupStt: number | null = null;
              rows.forEach((r, i) => {
                const excelRow = 7 + i;
                const row = worksheet.getRow(excelRow);
                if (r.isGrandTotal) {
                  row.values = ['Tổng cộng','','','','','','','','','',fmt(r.totalAmount),fmt(r.discount),fmt(r.finalAmount)];
                  row.font = { bold: true };
                  [1,11,12,13].forEach(col => { const c = row.getCell(col); c.font = { bold: true, color: { argb: 'FFFF0000' } }; });
                  // Kết thúc nhóm cuối cùng nếu còn mở
                  if (currentGroupStart !== null && currentGroupStt !== null) {
                    worksheet.mergeCells(`A${currentGroupStart}:A${excelRow-1}`);
                    const c = worksheet.getCell(`A${currentGroupStart}`);
                    c.value = currentGroupStt;
                    c.alignment = { horizontal: 'center', vertical: 'middle' } as unknown as ExcelJS.Alignment;
                    currentGroupStart = null; currentGroupStt = null;
                  }
                } else if (r.isSubtotal) {
                  row.values = ['', '', '', '', '', '', '', '', '', '', fmt(r.totalAmount), fmt(r.discount), fmt(r.finalAmount)];
                  row.font = { bold: true };
                  // Kết thúc nhóm: merge cột STT cho các dòng data của nhóm
                  if (currentGroupStart !== null && currentGroupStt !== null) {
                    worksheet.mergeCells(`A${currentGroupStart}:A${excelRow-1}`);
                    const c = worksheet.getCell(`A${currentGroupStart}`);
                    c.value = currentGroupStt;
                    c.alignment = { horizontal: 'center', vertical: 'middle' } as unknown as ExcelJS.Alignment;
                    currentGroupStart = null; currentGroupStt = null;
                  }
                } else {
                  row.values = [
                    '', r.userCode, r.fullName, r.email, r.phoneNumber, r.gender, r.stt,
                    r.date, r.ticketText || '', r.concessionText || '', fmt(r.totalAmount), fmt(r.discount), fmt(r.finalAmount)
                  ];
                  // Bắt đầu nhóm mới nếu là dòng đầu nhóm
                  if (r.isFirstInGroup) {
                    currentGroupStart = excelRow;
                    currentGroupStt = r.stt;
                  }
                }
                row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as unknown as ExcelJS.Alignment;
              });
              // Phòng hờ: nếu không có subtotal thì vẫn merge đến dòng cuối
              if (currentGroupStart !== null && currentGroupStt !== null) {
                const last = 7 + rows.length - 1;
                worksheet.mergeCells(`A${currentGroupStart}:A${last}`);
                const c = worksheet.getCell(`A${currentGroupStart}`);
                c.value = currentGroupStt;
                c.alignment = { horizontal: 'center', vertical: 'middle' } as unknown as ExcelJS.Alignment;
              }

              worksheet.columns = [
                { width: 8 }, { width: 18 }, { width: 22 }, { width: 26 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 19 }, { width: 24 }, { width: 24 }, { width: 18 }, { width: 16 }, { width: 18 }
              ];

              const buffer = await workbook.xlsx.writeBuffer();
              const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `DOANH SO THEO KHACH HANG ${fromDate} - ${toDate}.xlsx`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}>
              Xuất báo cáo
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
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
              placeholder={["Từ ngày", "Đến ngày"]}
              style={{ width: 250 }}
              disabledDate={(current) => {
                if (!minDate || !maxDate) return false;
                return current && (current < minDate || current > maxDate);
              }}
            />
            <Button onClick={() => setDateRange(null)}>Xóa lọc</Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          dataSource={rows}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
          sticky={{ offsetHeader: 0 }}
          rowClassName={(record: RowData) => (record.isSubtotal || record.isGrandTotal) ? 'total-row' : ''}
          columns={[
            { 
              title: 'STT', 
              dataIndex: 'stt', 
              key: 'stt', 
              width: 70, 
              render: (_: unknown, record: RowData) => {
                // Hàng tổng cộng: hiển thị 'Tổng cộng' màu đỏ, cột khác rỗng
                if (record.isGrandTotal) {
                  return <span style={{ color: 'red', fontWeight: 700 }}>Tổng cộng</span>;
                }
                if (record.isSubtotal) return '';
                // Chỉ hiển thị số thứ tự cho dòng đầu của mỗi khách hàng
                return record.isFirstInGroup ? record.stt : '';
              }
            },
            { title: 'Mã KH', dataIndex: 'userCode', key: 'userCode', width: 160, render: (_: string, r: RowData) => (r.isSubtotal || r.isGrandTotal) ? '' : (_ || 'N/A') },
            { title: 'Tên KH', dataIndex: 'fullName', key: 'fullName', width: 180 },
            { title: 'Gmail', dataIndex: 'email', key: 'email', width: 220 },
            { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phoneNumber', width: 140 },
            { title: 'Giới tính', dataIndex: 'gender', key: 'gender', width: 100, render: (t: string, r: RowData) => (r.isSubtotal || r.isGrandTotal) ? '' : (t || '') },
            { title: 'Nhóm KH', dataIndex: 'group', key: 'group', width: 100, render: (_: number, r: RowData) => (r.isSubtotal || r.isGrandTotal) ? '' : r.stt },
            { title: 'Thời gian giao dịch', dataIndex: 'date', key: 'date', width: 170 },
            { title: 'Vé', dataIndex: 'ticketInfo', key: 'ticketInfo', width: 200, render: (n: React.ReactNode) => n },
            { title: 'Concession(s)', dataIndex: 'concessionInfo', key: 'concessionInfo', width: 220, render: (n: React.ReactNode) => n },
            { title: 'Doanh số trước CK', dataIndex: 'totalAmount', key: 'totalAmount', width: 160, render: (v: number, r: RowData) => {
              if (r.isGrandTotal) return <span style={{ color: 'red', fontWeight: 700 }}>{v.toLocaleString('vi-VN')}</span>;
              return typeof v === 'number' ? v.toLocaleString('vi-VN') : '';
            } },
            { title: 'Chiết khấu', dataIndex: 'discount', key: 'discount', width: 140, render: (v: number, r: RowData) => {
              if (r.isGrandTotal) return <span style={{ color: 'red', fontWeight: 700 }}>{v.toLocaleString('vi-VN')}</span>;
              return typeof v === 'number' ? v.toLocaleString('vi-VN') : '';
            } },
            { title: 'Doanh số sau CK', dataIndex: 'finalAmount', key: 'finalAmount', width: 160, render: (v: number, r: RowData) => {
              if (r.isGrandTotal) return <span style={{ color: 'red', fontWeight: 700 }}>{v.toLocaleString('vi-VN')}</span>;
              return typeof v === 'number' ? v.toLocaleString('vi-VN') : '';
            } },
          ]}
          className="customer-sales-report-table"
        />
      </div>

      <style>{`
        .customer-sales-report-table .ant-table-thead > tr > th {
          background-color: #e6f3ff !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #d9d9d9 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        .customer-sales-report-table .ant-table-tbody > tr > td {
          border: 1px solid #d9d9d9 !important;
          text-align: center !important;
        }
        .customer-sales-report-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
        .customer-sales-report-table .ant-table-tbody > tr.total-row > td {
          font-weight: bold !important;
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  );
};

export default SalesReportByCustomer;


