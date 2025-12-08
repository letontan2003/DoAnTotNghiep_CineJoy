import React, { useEffect, useMemo, useState } from "react";
import { Table, Spin, Typography, DatePicker, Button } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import useAppStore from "@/store/app.store";
import ExcelJS from "exceljs";
import { getAllOrders } from "@/apiservice/apiOrder";

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface OrderLite {
  _id: string;
  orderCode: string;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  totalAmount: number;
  finalAmount: number;
  customerInfo: {
    fullName: string;
    email: string;
  };
  movieId: {
    title: string;
  };
  theaterId: {
    name: string;
  };
  room: string;
  showDate: string;
  showTime: string;
  seats?: Array<{
    seatId: string;
    type: string;
    price: number;
  }>;
  foodCombos?: Array<{
    comboId: {
      name: string;
    };
    quantity: number;
    price: number;
  }>;
  paymentInfo?: {
    paymentDate?: Date;
  };
  returnInfo?: {
    reason?: string;
    returnDate?: Date;
  };
}

interface RowData {
  key: string;
  stt: number;
  orderCode: string;
  customerName: string;
  orderDate: string;
  paymentTime: string;
  paymentMethod: string;
  returnTime: string;
  returnReason: string;
  product: string;
  showtime: string;
  tickets: string;
  concessions: string;
  totalAmount: number;
  finalAmount: number;
  revenueBeforeDiscount: number;
  discount: number;
  revenueAfterDiscount: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  isFirstInGroup?: boolean;
  groupIndex?: number;
}

const RefundReport: React.FC = () => {
  const navigate = useNavigate();
  useAppStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [maxDate, setMaxDate] = useState<dayjs.Dayjs | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getAllOrders(1, 1000);
        const returned = (res.orders || []).filter(
          (o: OrderLite) => o.orderStatus === "RETURNED"
        );
        setOrders(returned as OrderLite[]);
        // Tính min/max ngày giao dịch
        if (returned.length > 0) {
          const ds = returned.map((o) => dayjs(o.createdAt));
          const min = ds
            .reduce((a, b) => (b.isBefore(a) ? b : a), ds[0])
            .startOf("day");
          const max = ds
            .reduce((a, b) => (b.isAfter(a) ? b : a), ds[0])
            .endOf("day");
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
      const startDay = start.startOf("day");
      const endDay = end.endOf("day");
      list = list.filter((o) => {
        const d = dayjs(o.createdAt);
        return (
          d.isSame(startDay) ||
          d.isSame(endDay) ||
          (d.isAfter(startDay) && d.isBefore(endDay)) ||
          d.isBetween(startDay, endDay, undefined, "[]")
        );
      });
    }
    return list;
  }, [orders, dateRange]);

  const rows: RowData[] = useMemo(() => {
    // Nhóm theo khách hàng (email)
    const groups: Record<string, OrderLite[]> = {};
    for (const order of filteredOrders) {
      const email = (order.customerInfo?.email || "").toLowerCase();
      const key = email || "UNKNOWN_CUSTOMER";
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    }

    const sortedKeys = Object.keys(groups).sort();
    const result: RowData[] = [];
    let stt = 0;
    const grandTotal = { total: 0, discount: 0, final: 0 };

    for (const key of sortedKeys) {
      const ordersOfCustomer = groups[key];
      // Tăng số thứ tự nhóm một lần cho mỗi khách hàng
      stt += 1;
      const subtotal = { total: 0, discount: 0, final: 0 };
      let firstInGroup = true;

      for (const order of ordersOfCustomer) {
        const product = order.movieId?.title || "";
        const theaterName = order.theaterId?.name || "";
        const showtime =
          theaterName && order.room && order.showDate && order.showTime
            ? `${theaterName} | ${order.room} | ${dayjs(order.showDate).format(
                "DD/MM/YYYY"
              )} ${order.showTime}`
            : "";
        const tickets = order.seats?.map((s) => s.seatId).join(", ") || "";
        const concessions =
          order.foodCombos
            ?.map((c) => `${c.comboId?.name || "Combo"} (${c.quantity})`)
            .join(", ") || "";
        const discount = order.totalAmount - order.finalAmount;

        subtotal.total += order.totalAmount || 0;
        subtotal.discount += discount;
        subtotal.final += order.finalAmount || 0;
        grandTotal.total += order.totalAmount || 0;
        grandTotal.discount += discount;
        grandTotal.final += order.finalAmount || 0;

        result.push({
          key: order._id,
          stt, // số thứ tự nhóm
          orderCode: order.orderCode,
          customerName: order.customerInfo?.fullName || "",
          orderDate: dayjs(order.createdAt).format("DD/MM/YYYY"),
          paymentTime: order.paymentInfo?.paymentDate
            ? dayjs(order.paymentInfo.paymentDate).format("HH:mm DD/MM/YYYY")
            : "",
          paymentMethod: order.paymentMethod || "",
          returnTime: order.returnInfo?.returnDate
            ? dayjs(order.returnInfo.returnDate).format("HH:mm DD/MM/YYYY")
            : "",
          returnReason: order.returnInfo?.reason || "",
          product,
          showtime,
          tickets,
          concessions,
          totalAmount: order.totalAmount || 0,
          finalAmount: order.finalAmount || 0,
          revenueBeforeDiscount: order.totalAmount || 0,
          discount,
          revenueAfterDiscount: order.finalAmount || 0,
          isFirstInGroup: firstInGroup,
          groupIndex: stt,
        });
        firstInGroup = false;
      }

      // Dòng tổng cộng theo khách hàng
      result.push({
        key: `subtotal-${key}`,
        stt: 0,
        orderCode: "",
        customerName: "",
        orderDate: "",
        paymentTime: "",
        paymentMethod: "",
        returnTime: "",
        returnReason: "",
        product: "",
        showtime: "",
        tickets: "",
        concessions: "",
        totalAmount: subtotal.total,
        finalAmount: subtotal.final,
        revenueBeforeDiscount: subtotal.total,
        discount: subtotal.discount,
        revenueAfterDiscount: subtotal.final,
        isSubtotal: true,
      });
    }

    // Tổng cộng cuối bảng
    if (result.length > 0) {
      result.push({
        key: "grand-total",
        stt: 0,
        orderCode: "",
        customerName: "",
        orderDate: "",
        paymentTime: "",
        paymentMethod: "",
        returnTime: "",
        returnReason: "",
        product: "",
        showtime: "",
        tickets: "",
        concessions: "",
        totalAmount: grandTotal.total,
        finalAmount: grandTotal.final,
        revenueBeforeDiscount: grandTotal.total,
        discount: grandTotal.discount,
        revenueAfterDiscount: grandTotal.final,
        isGrandTotal: true,
      });
    }

    return result;
  }, [filteredOrders]);

  const currency = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bảng Kê Trả Vé");

    const fmt = (n: number) => (n ?? 0).toLocaleString("vi-VN");

    const currentDate = dayjs().format("DD/MM/YYYY HH:mm");
    const storeState = (
      useAppStore as unknown as {
        getState?: () => { user?: { fullName?: string } };
      }
    ).getState?.();
    const userName = storeState?.user?.fullName || "Admin";
    const adminUser = `Admin ${userName}`;

    let fromDate = "";
    let toDate = "";
    if (dateRange && dateRange[0] && dateRange[1]) {
      fromDate = dateRange[0].format("DD/MM/YYYY");
      toDate = dateRange[1].format("DD/MM/YYYY");
    } else if (minDate && maxDate) {
      fromDate = minDate.format("DD/MM/YYYY");
      toDate = maxDate.format("DD/MM/YYYY");
    }

    worksheet.mergeCells("A1:Q1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "BẢNG KÊ CHI TIẾT ĐƠN VÉ TRẢ";
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:Q2");
    const infoCell2 = worksheet.getCell("A2");
    infoCell2.value = `Thời gian xuất báo cáo : ${currentDate}`;
    infoCell2.alignment = { horizontal: "left", vertical: "middle" };

    worksheet.mergeCells("A3:Q3");
    const infoCell3 = worksheet.getCell("A3");
    infoCell3.value = `User xuất báo cáo : ${adminUser}`;
    infoCell3.alignment = { horizontal: "left", vertical: "middle" };

    worksheet.mergeCells("A4:Q4");
    const infoCell4 = worksheet.getCell("A4");
    infoCell4.value = `Từ ngày: ${fromDate}         Đến ngày: ${toDate}`;
    infoCell4.alignment = { horizontal: "left", vertical: "middle" };

    const headers = [
      "STT",
      "Mã hóa đơn",
      "Tên khách hàng",
      "Ngày đặt",
      "Thời gian thanh toán",
      "Phương thức thanh toán",
      "Thời gian trả",
      "Lý do trả",
      "Sản Phẩm",
      "Suất chiếu",
      "Vé",
      "Concession",
      "Thành tiền",
      "Tổng cộng",
      "Doanh số trước CK",
      "Chiết khấu",
      "Doanh số sau CK",
    ];
    const headerRow = worksheet.getRow(6);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6F3FF" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Ghi dữ liệu & chuẩn bị merge cột STT theo nhóm
    let currentGroupStart: number | null = null;
    let currentGroupStt: number | null = null;
    rows.forEach((r, i) => {
      const excelRow = 7 + i;
      const row = worksheet.getRow(excelRow);
      if (r.isGrandTotal) {
        row.values = [
          "Tổng cộng",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          fmt(r.totalAmount),
          fmt(r.finalAmount),
          fmt(r.revenueBeforeDiscount),
          fmt(r.discount),
          fmt(r.revenueAfterDiscount),
        ];
        row.font = { bold: true };
        [1, 13, 14, 15, 16, 17].forEach((col) => {
          const c = row.getCell(col);
          c.font = { bold: true, color: { argb: "FFFF0000" } };
        });
        // Kết thúc nhóm cuối cùng nếu còn mở
        if (currentGroupStart !== null && currentGroupStt !== null) {
          worksheet.mergeCells(`A${currentGroupStart}:A${excelRow - 1}`);
          const c = worksheet.getCell(`A${currentGroupStart}`);
          c.value = currentGroupStt;
          c.alignment = {
            horizontal: "center",
            vertical: "middle",
          } as unknown as ExcelJS.Alignment;
          currentGroupStart = null;
          currentGroupStt = null;
        }
      } else if (r.isSubtotal) {
        row.values = [
          "",
          "",
          "Tổng cộng",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          fmt(r.totalAmount),
          fmt(r.finalAmount),
          fmt(r.revenueBeforeDiscount),
          fmt(r.discount),
          fmt(r.revenueAfterDiscount),
        ];
        row.font = { bold: true };
        // Kết thúc nhóm: merge cột STT cho các dòng data của nhóm
        if (currentGroupStart !== null && currentGroupStt !== null) {
          worksheet.mergeCells(`A${currentGroupStart}:A${excelRow - 1}`);
          const c = worksheet.getCell(`A${currentGroupStart}`);
          c.value = currentGroupStt;
          c.alignment = {
            horizontal: "center",
            vertical: "middle",
          } as unknown as ExcelJS.Alignment;
          currentGroupStart = null;
          currentGroupStt = null;
        }
      } else {
        row.values = [
          "",
          r.orderCode,
          r.customerName,
          r.orderDate,
          r.paymentTime,
          r.paymentMethod,
          r.returnTime,
          r.returnReason,
          r.product,
          r.showtime,
          r.tickets,
          r.concessions,
          fmt(r.totalAmount),
          fmt(r.finalAmount),
          fmt(r.revenueBeforeDiscount),
          fmt(r.discount),
          fmt(r.revenueAfterDiscount),
        ];
        // Bắt đầu nhóm mới nếu là dòng đầu nhóm
        if (r.isFirstInGroup) {
          currentGroupStart = excelRow;
          currentGroupStt = r.stt;
        }
      }
      row.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      } as unknown as ExcelJS.Alignment;
    });
    // Phòng hờ: nếu không có subtotal thì vẫn merge đến dòng cuối
    if (currentGroupStart !== null && currentGroupStt !== null) {
      const last = 7 + rows.length - 1;
      worksheet.mergeCells(`A${currentGroupStart}:A${last}`);
      const c = worksheet.getCell(`A${currentGroupStart}`);
      c.value = currentGroupStt;
      c.alignment = {
        horizontal: "center",
        vertical: "middle",
      } as unknown as ExcelJS.Alignment;
    }

    worksheet.columns = [
      { width: 10 },
      { width: 18 },
      { width: 20 },
      { width: 12 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 25 },
      { width: 25 },
      { width: 35 },
      { width: 20 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 18 },
      { width: 15 },
      { width: 18 },
    ];

    // Ensure STT column doesn't wrap
    const sttCol = worksheet.getColumn(1);
    sttCol.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: false,
    } as unknown as ExcelJS.Alignment;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BANG KE CHI TIET DON VE TRA ${fromDate} - ${toDate}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 110,
      align: "center" as const,
      fixed: "left" as const,
      render: (_: unknown, record: RowData) => {
        // Hàng tổng cộng: hiển thị 'Tổng cộng' màu đỏ, cột khác rỗng
        if (record.isGrandTotal) {
          return (
            <span style={{ color: "red", fontWeight: 700 }}>Tổng cộng</span>
          );
        }
        if (record.isSubtotal) return "";
        // Chỉ hiển thị số thứ tự cho dòng đầu của mỗi khách hàng
        return record.isFirstInGroup ? record.stt : "";
      },
    },
    {
      title: "Mã hóa đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      width: 150,
      fixed: "left" as const,
      render: (text: string, r: RowData) => {
        if (r.isSubtotal || r.isGrandTotal) return "";
        return text;
      },
    },
    {
      title: "Tên khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      width: 180,
      render: (t: string, r: RowData) => {
        if (r.isGrandTotal) return "";
        if (r.isSubtotal)
          return <span style={{ fontWeight: 700 }}>Tổng cộng</span>;
        return t || "";
      },
    },
    {
      title: "Ngày đặt",
      dataIndex: "orderDate",
      key: "orderDate",
      width: 120,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Thời gian thanh toán",
      dataIndex: "paymentTime",
      key: "paymentTime",
      width: 170,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Phương thức thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 180,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Thời gian trả",
      dataIndex: "returnTime",
      key: "returnTime",
      width: 170,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Lý do trả",
      dataIndex: "returnReason",
      key: "returnReason",
      width: 250,
      ellipsis: true,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Sản Phẩm",
      dataIndex: "product",
      key: "product",
      width: 250,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Suất chiếu",
      dataIndex: "showtime",
      key: "showtime",
      width: 300,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Vé",
      dataIndex: "tickets",
      key: "tickets",
      width: 200,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Concession",
      dataIndex: "concessions",
      key: "concessions",
      width: 250,
      render: (text: string, r: RowData) =>
        r.isSubtotal || r.isGrandTotal ? "" : text,
    },
    {
      title: "Thành tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right" as const,
      render: (value: number, r: RowData) => {
        if (r.isGrandTotal)
          return (
            <span style={{ color: "red", fontWeight: 700 }}>
              {value.toLocaleString("vi-VN")}
            </span>
          );
        return typeof value === "number" ? value.toLocaleString("vi-VN") : "";
      },
    },
    {
      title: "Tổng cộng",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 140,
      align: "right" as const,
      render: (value: number, r: RowData) => {
        if (r.isGrandTotal)
          return (
            <span style={{ color: "red", fontWeight: 700 }}>
              {value.toLocaleString("vi-VN")}
            </span>
          );
        return typeof value === "number" ? value.toLocaleString("vi-VN") : "";
      },
    },
    {
      title: "Doanh số trước CK",
      dataIndex: "revenueBeforeDiscount",
      key: "revenueBeforeDiscount",
      width: 150,
      align: "right" as const,
      render: (value: number, r: RowData) => {
        if (r.isGrandTotal)
          return (
            <span style={{ color: "red", fontWeight: 700 }}>
              {value.toLocaleString("vi-VN")}
            </span>
          );
        return typeof value === "number" ? value.toLocaleString("vi-VN") : "";
      },
    },
    {
      title: "Chiết khấu",
      dataIndex: "discount",
      key: "discount",
      width: 140,
      align: "right" as const,
      render: (value: number, r: RowData) => {
        if (r.isGrandTotal)
          return (
            <span style={{ color: "red", fontWeight: 700 }}>
              {value.toLocaleString("vi-VN")}
            </span>
          );
        return typeof value === "number" ? value.toLocaleString("vi-VN") : "";
      },
    },
    {
      title: "Doanh số sau CK",
      dataIndex: "revenueAfterDiscount",
      key: "revenueAfterDiscount",
      width: 150,
      align: "right" as const,
      render: (value: number, r: RowData) => {
        if (r.isGrandTotal)
          return (
            <span style={{ color: "red", fontWeight: 700 }}>
              {value.toLocaleString("vi-VN")}
            </span>
          );
        return typeof value === "number" ? value.toLocaleString("vi-VN") : "";
      },
    },
  ];

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
            onClick={() => navigate("/admin", { state: { tab: "statistics" } })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
          >
            <ArrowLeftOutlined className="text-sm" />
            <span>Quay lại</span>
          </button>
          <div className="text-center mt-2">
            <Title level={2} className="mb-0 text-gray-800">
              BẢNG KÊ CHI TIẾT ĐƠN VÉ TRẢ
            </Title>
          </div>
          <div className="flex items-center">
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={exportExcel}
            >
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
          columns={columns}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
          rowClassName={(record: RowData) =>
            record.isSubtotal || record.isGrandTotal ? "total-row" : ""
          }
          className="refund-report-table"
        />
      </div>

      <style>{`
        .refund-report-table .ant-table-thead > tr > th {
          background-color: #e6f3ff !important;
          font-weight: bold !important;
          text-align: center !important;
          border: 1px solid #d9d9d9 !important;
        }
        .refund-report-table .ant-table-thead > tr > th.ant-table-cell-fix-left {
          position: sticky !important;
          z-index: 11 !important;
          background-color: #e6f3ff !important;
        }
        .refund-report-table .ant-table-thead > tr > th.ant-table-cell-fix-left-first {
          left: 0 !important;
        }
        .refund-report-table .ant-table-thead > tr > th.ant-table-cell-fix-left-last {
          z-index: 12 !important;
        }
        .refund-report-table .ant-table-tbody > tr > td.ant-table-cell-fix-left {
          position: sticky !important;
          z-index: 10 !important;
          background-color: white !important;
        }
        .refund-report-table .ant-table-tbody > tr > td.ant-table-cell-fix-left-first {
          left: 0 !important;
        }
        .refund-report-table .ant-table-tbody > tr.total-row > td.ant-table-cell-fix-left {
          background-color: #fafafa !important;
        }
        .refund-report-table .ant-table-tbody > tr:hover > td.ant-table-cell-fix-left {
          background-color: #f5f5f5 !important;
        }
        .refund-report-table .ant-table-tbody > tr > td {
          border: 1px solid #d9d9d9 !important;
          text-align: center !important;
        }
        .refund-report-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5 !important;
        }
        .refund-report-table .ant-table-tbody > tr.total-row > td {
          font-weight: bold !important;
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  );
};

export default RefundReport;
