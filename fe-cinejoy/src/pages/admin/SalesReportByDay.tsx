import React, { useEffect, useState } from "react";
import { Table, Spin, Typography, DatePicker, Button, Select } from "antd";
import { ArrowLeftOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getAllOrders } from "@/apiservice/apiOrder";
import { getTheaters } from "@/apiservice/apiTheater";
import useAppStore from "@/store/app.store";
import dayjs from "dayjs";
import ExcelJS from "exceljs";

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
  isFirstInGroup?: boolean;
}

const SalesReportByDay: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportData[]>([]);
  const [filteredData, setFilteredData] = useState<SalesReportData[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );
  const [minDate, setMinDate] = useState<dayjs.Dayjs | null>(null);
  const [maxDate, setMaxDate] = useState<dayjs.Dayjs | null>(null);
  const [theaters, setTheaters] = useState<ITheater[]>([]);
  const [selectedTheaterCode, setSelectedTheaterCode] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchReportData();
    fetchTheaters();
  }, []);

  // Debug: Log theaters state changes
  useEffect(() => {
    console.log("Theaters state updated:", theaters);
    console.log("Theaters count:", theaters.length);
  }, [theaters]);

  const fetchTheaters = async () => {
    try {
      console.log("Fetching theaters...");
      const theatersData = await getTheaters();
      console.log("Theaters data received:", theatersData);
      console.log("Is array?", Array.isArray(theatersData));

      if (Array.isArray(theatersData)) {
        setTheaters(theatersData);
        console.log("Theaters set successfully, count:", theatersData.length);
      } else {
        console.warn("Theaters data is not an array:", theatersData);
        setTheaters([]);
      }
    } catch (error) {
      console.error("Error fetching theaters:", error);
      setTheaters([]);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Lấy tất cả orders với phân trang lớn để lấy hết dữ liệu
      const allOrders: IOrder[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await getAllOrders(page, 100);
        console.log("Orders response:", response);
        allOrders.push(...response.orders);
        hasMore = page < response.totalPages;
        page++;
      }

      console.log("Total orders:", allOrders.length);
      console.log("Sample order:", allOrders[0]);

      // Lọc chỉ lấy orders có trạng thái CONFIRMED
      const confirmedOrders = allOrders.filter(
        (order) => order.orderStatus === "CONFIRMED"
      );

      console.log("Confirmed orders:", confirmedOrders.length);

      const salesData: SalesReportData[] = [];
      let stt = 1;

      // Nhóm orders theo rạp
      const ordersByTheater = confirmedOrders.reduce(
        (acc: Record<string, IOrder[]>, order: IOrder) => {
          const theater =
            typeof order.theaterId === "object" ? order.theaterId : null;
          const theaterKey = theater?.theaterCode || "UNKNOWN";
          if (!acc[theaterKey]) {
            acc[theaterKey] = [];
          }
          acc[theaterKey].push(order);
          return acc;
        },
        {} as Record<string, IOrder[]>
      );

      // Sắp xếp theo theaterCode
      const sortedTheaters = Object.keys(ordersByTheater).sort();

      let grandTotalDiscount = 0;
      let grandTotalAmount = 0;
      let grandFinalAmount = 0;

      sortedTheaters.forEach((theaterCode) => {
        const theaterOrders = ordersByTheater[theaterCode];
        let theaterTotalDiscount = 0;
        let theaterTotalAmount = 0;
        let theaterFinalAmount = 0;

        // Sắp xếp orders trong rạp theo ngày
        const sortedOrders = theaterOrders.sort((a, b) => {
          return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
        });

        // Tăng STT một lần cho mỗi rạp
        const theaterStt = stt++;
        let isFirstInGroup = true;

        sortedOrders.forEach((order) => {
          const discount = order.totalAmount - order.finalAmount;
          // theaterId có thể là object được populate hoặc string
          const theater =
            typeof order.theaterId === "object" ? order.theaterId : null;
          const orderDate = dayjs(order.createdAt).format("DD/MM/YYYY");

          console.log("Order theater data:", {
            orderId: order._id,
            theaterId: order.theaterId,
            theater: theater,
            theaterCode: theater?.theaterCode,
          });

          salesData.push({
            key: `${order._id}`,
            stt: theaterStt,
            theaterCode: theater?.theaterCode || "N/A",
            theaterName: theater?.name || "N/A",
            city: theater?.location?.city || "N/A",
            date: orderDate,
            discount: discount,
            totalAmount: order.totalAmount,
            finalAmount: order.finalAmount,
            orderId: order._id,
            isFirstInGroup: isFirstInGroup,
          });

          isFirstInGroup = false;
          theaterTotalDiscount += discount;
          theaterTotalAmount += order.totalAmount;
          theaterFinalAmount += order.finalAmount;
        });

        // Thêm dòng tổng cộng cho rạp
        salesData.push({
          key: `subtotal-${theaterCode}`,
          stt: 0,
          theaterCode: "",
          theaterName: "",
          city: "",
          date: "Tổng cộng",
          discount: theaterTotalDiscount,
          totalAmount: theaterTotalAmount,
          finalAmount: theaterFinalAmount,
          orderId: "",
          isSubtotal: true,
        });

        grandTotalDiscount += theaterTotalDiscount;
        grandTotalAmount += theaterTotalAmount;
        grandFinalAmount += theaterFinalAmount;
      });

      // Thêm dòng tổng cộng cuối cùng
      salesData.push({
        key: "grand-total",
        stt: 0,
        theaterCode: "",
        theaterName: "",
        city: "",
        date: "Tổng cộng",
        discount: grandTotalDiscount,
        totalAmount: grandTotalAmount,
        finalAmount: grandFinalAmount,
        orderId: "",
        isGrandTotal: true,
      });

      console.log("Sales data generated:", salesData.length);
      console.log("Sample sales data:", salesData.slice(0, 3));

      setReportData(salesData);

      // Tính min/max date từ dữ liệu
      if (confirmedOrders.length > 0) {
        const dates = confirmedOrders.map((order) => dayjs(order.createdAt));
        const min = dates
          .reduce((min, d) => (d.isBefore(min) ? d : min), dates[0])
          .startOf("day");
        const max = dates
          .reduce((max, d) => (d.isAfter(max) ? d : max), dates[0])
          .endOf("day");
        setMinDate(min);
        setMaxDate(max);
      }
    } catch (error) {
      console.error("Error fetching sales report data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Filtering data. Report data length:", reportData.length);
    let filtered = [...reportData];
    // Filter by date range and/or theater
    const hasDateFilter = dateRange !== null;
    const hasTheaterFilter = selectedTheaterCode !== null;

    if (hasDateFilter || hasTheaterFilter) {
      // Lọc chỉ lấy các dòng dữ liệu (không phải tổng cộng)
      const dataOnly = reportData.filter(
        (item) => !item.isSubtotal && !item.isGrandTotal
      );

      // Lọc theo khoảng ngày và/hoặc rạp
      let filteredData = dataOnly;

      if (hasDateFilter) {
        const [startDate, endDate] = dateRange!;
        filteredData = filteredData.filter((item) => {
          const itemDate = dayjs(item.date, "DD/MM/YYYY");
          return (
            itemDate.isSameOrAfter(startDate) &&
            itemDate.isSameOrBefore(endDate)
          );
        });
      }

      if (hasTheaterFilter) {
        filteredData = filteredData.filter(
          (item) => item.theaterCode === selectedTheaterCode
        );
      }

      // Nhóm lại theo rạp và tính lại tổng
      const theaterGroups: Record<string, SalesReportData[]> = {};
      filteredData.forEach((item) => {
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

      Object.keys(theaterGroups)
        .sort()
        .forEach((theaterCode) => {
          const items = theaterGroups[theaterCode];
          let theaterTotalDiscount = 0;
          let theaterTotalAmount = 0;
          let theaterFinalAmount = 0;

          items.forEach((item, index) => {
            // Đặt lại isFirstInGroup cho dòng đầu tiên của mỗi nhóm sau khi filter
            filtered.push({
              ...item,
              isFirstInGroup: index === 0,
            });
            theaterTotalDiscount += item.discount;
            theaterTotalAmount += item.totalAmount;
            theaterFinalAmount += item.finalAmount;
          });

          // Thêm dòng tổng cộng cho rạp
          filtered.push({
            key: `subtotal-${theaterCode}-filtered`,
            stt: 0,
            theaterCode: "",
            theaterName: "",
            city: "",
            date: "Tổng cộng",
            discount: theaterTotalDiscount,
            totalAmount: theaterTotalAmount,
            finalAmount: theaterFinalAmount,
            orderId: "",
            isSubtotal: true,
          });

          grandTotalDiscount += theaterTotalDiscount;
          grandTotalAmount += theaterTotalAmount;
          grandFinalAmount += theaterFinalAmount;
        });

      // Thêm dòng tổng cộng cuối
      if (filtered.length > 0) {
        filtered.push({
          key: "grand-total-filtered",
          stt: 0,
          theaterCode: "",
          theaterName: "",
          city: "",
          date: "Tổng cộng",
          discount: grandTotalDiscount,
          totalAmount: grandTotalAmount,
          finalAmount: grandFinalAmount,
          orderId: "",
          isGrandTotal: true,
        });
      }
    } else {
      filtered = [...reportData];
    }

    console.log("Filtered data length:", filtered.length);
    setFilteredData(filtered);
  }, [reportData, dateRange, selectedTheaterCode]);

  // Hàm format tiền với dấu chấm phân cách
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString("vi-VN");
  };

  const exportToExcel = async () => {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Báo cáo doanh số");

    // Prepare header data
    const currentDate = dayjs().format("DD/MM/YYYY HH:mm");
    const userName = user?.fullName || "Admin";
    const adminUser = `Admin ${userName}`;

    // Get date range for report
    let fromDate = "";
    let toDate = "";

    if (dateRange && dateRange[0] && dateRange[1]) {
      fromDate = dateRange[0].format("DD/MM/YYYY");
      toDate = dateRange[1].format("DD/MM/YYYY");
    } else {
      // Use min/max dates from all data
      const allDates = reportData
        .filter((item) => !item.isSubtotal && !item.isGrandTotal)
        .map((item) => dayjs(item.date, "DD/MM/YYYY"));

      if (allDates.length > 0) {
        const min = allDates.reduce(
          (min, d) => (d.isBefore(min) ? d : min),
          allDates[0]
        );
        const max = allDates.reduce(
          (max, d) => (d.isAfter(max) ? d : max),
          allDates[0]
        );
        fromDate = min.format("DD/MM/YYYY");
        toDate = max.format("DD/MM/YYYY");
      }
    }

    // Add title row (Row 1) - DOANH SỐ BÁN HÀNG THEO NGÀY
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "DOANH SỐ BÁN HÀNG THEO NGÀY";
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Add info rows with merged cells to prevent text cutoff
    worksheet.mergeCells("A2:H2");
    const infoCell2 = worksheet.getCell("A2");
    infoCell2.value = `Thời gian xuất báo cáo : ${currentDate}`;
    infoCell2.alignment = { horizontal: "left", vertical: "middle" };

    worksheet.mergeCells("A3:H3");
    const infoCell3 = worksheet.getCell("A3");
    infoCell3.value = `User xuất báo cáo : ${adminUser}`;
    infoCell3.alignment = { horizontal: "left", vertical: "middle" };

    worksheet.mergeCells("A4:H4");
    const infoCell4 = worksheet.getCell("A4");
    infoCell4.value = `Từ ngày: ${fromDate}         Đến ngày: ${toDate}`;
    infoCell4.alignment = { horizontal: "left", vertical: "middle" };

    // Add theater filter info if selected
    if (selectedTheaterCode) {
      const selectedTheater = theaters.find(
        (t) => t.theaterCode === selectedTheaterCode
      );
      const theaterInfo = selectedTheater
        ? `${selectedTheater.theaterCode} - ${selectedTheater.name}`
        : selectedTheaterCode;
      worksheet.mergeCells("A5:H5");
      const infoCell5 = worksheet.getCell("A5");
      infoCell5.value = `Rạp: ${theaterInfo}`;
      infoCell5.alignment = { horizontal: "left", vertical: "middle" };
    }

    // Empty row (5 or 6 depending on theater filter)
    const emptyRow = selectedTheaterCode ? 6 : 5;

    // Add table headers - IN ĐẬM
    const headers = [
      "STT",
      "Mã Rạp",
      "Tên Rạp",
      "Khu Vực",
      "Ngày",
      "Chiết khấu",
      "Doanh số trước CK",
      "Doanh số sau CK",
    ];

    const headerRow = worksheet.getRow(emptyRow);
    headerRow.values = headers;
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 20;

    // Add blue background to header cells
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6F3FF" }, // Light blue color
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    filteredData.forEach((item, index) => {
      const row = worksheet.getRow(emptyRow + 1 + index);

      // Handle grand total row specially
      if (item.isGrandTotal) {
        row.values = [
          "Tổng cộng",
          "",
          "",
          "",
          "",
          formatCurrency(item.discount),
          formatCurrency(item.totalAmount),
          formatCurrency(item.finalAmount),
        ];
      } else {
        row.values = [
          item.isFirstInGroup ? item.stt : "", // Chỉ ghi STT ở dòng đầu
          item.theaterCode,
          item.theaterName,
          item.city,
          item.date,
          formatCurrency(item.discount),
          formatCurrency(item.totalAmount),
          formatCurrency(item.finalAmount),
        ];
      }

      // Format for subtotal and grand total rows
      if (item.isSubtotal || item.isGrandTotal) {
        row.font = { bold: true };

        // Thêm màu đỏ cho hàng tổng cộng cuối (chỉ chữ đỏ)
        if (item.isGrandTotal) {
          row.font = { bold: true, color: { argb: "FFFF0000" } }; // Chỉ chữ đỏ
        }
      }

      row.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Merge STT cells cho cùng 1 nhóm rạp (giống SalesReportByCustomer)
    let currentGroupStart: number | null = null;
    let currentGroupStt: number | null = null;

    filteredData.forEach((item, index) => {
      const rowIndex = emptyRow + 1 + index;

      if (item.isFirstInGroup && !item.isSubtotal && !item.isGrandTotal) {
        // Nếu có nhóm trước đó, merge nó
        if (currentGroupStart !== null && currentGroupStt !== null) {
          const endRow = rowIndex - 1;
          if (endRow > currentGroupStart) {
            worksheet.mergeCells(`A${currentGroupStart}:A${endRow}`);
            const cell = worksheet.getCell(`A${currentGroupStart}`);
            cell.value = currentGroupStt;
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
            } as unknown as ExcelJS.Alignment;
          }
        }
        // Bắt đầu nhóm mới
        currentGroupStart = rowIndex;
        currentGroupStt = item.stt;
      }

      // Nếu gặp subtotal hoặc grand total, kết thúc nhóm hiện tại
      if (
        (item.isSubtotal || item.isGrandTotal) &&
        currentGroupStart !== null &&
        currentGroupStt !== null
      ) {
        const endRow = rowIndex - 1;
        if (endRow > currentGroupStart) {
          worksheet.mergeCells(`A${currentGroupStart}:A${endRow}`);
          const cell = worksheet.getCell(`A${currentGroupStart}`);
          cell.value = currentGroupStt;
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
          } as unknown as ExcelJS.Alignment;
        }
        currentGroupStart = null;
        currentGroupStt = null;
      }
    });

    // Merge nhóm cuối cùng nếu còn
    if (currentGroupStart !== null && currentGroupStt !== null) {
      const lastRow = emptyRow + 1 + filteredData.length - 1;
      if (lastRow > currentGroupStart) {
        worksheet.mergeCells(`A${currentGroupStart}:A${lastRow}`);
        const cell = worksheet.getCell(`A${currentGroupStart}`);
        cell.value = currentGroupStt;
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        } as unknown as ExcelJS.Alignment;
      }
    }

    // Set column widths
    worksheet.columns = [
      { width: 10 }, // STT
      { width: 15 }, // Mã Rạp
      { width: 25 }, // Tên Rạp
      { width: 20 }, // Khu Vực
      { width: 15 }, // Ngày
      { width: 15 }, // Chiết khấu
      { width: 20 }, // Doanh số trước CK
      { width: 20 }, // Doanh số sau CK
    ];

    // Generate filename
    let filename = "DOANH SỐ BÁN HÀNG THEO NGÀY";
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].format("DD/MM/YYYY");
      const endDate = dateRange[1].format("DD/MM/YYYY");
      filename += ` từ ${startDate} đến ${endDate}`;
    } else {
      filename += ` từ ${fromDate} đến ${toDate}`;
    }
    if (selectedTheaterCode) {
      const selectedTheater = theaters.find(
        (t) => t.theaterCode === selectedTheaterCode
      );
      const theaterInfo = selectedTheater
        ? `${selectedTheater.theaterCode} - ${selectedTheater.name}`
        : selectedTheaterCode;
      filename += ` - ${theaterInfo}`;
    }

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: "STT",
      dataIndex: "stt",
      key: "stt",
      width: 60,
      render: (value: number, record: SalesReportData) => {
        if (record.isGrandTotal) {
          return (
            <span style={{ color: "red", fontWeight: "bold" }}>Tổng cộng</span>
          );
        }
        if (record.isSubtotal) {
          return "";
        }
        // Chỉ hiển thị STT ở dòng đầu tiên của mỗi rạp
        return record.isFirstInGroup ? value : "";
      },
    },
    {
      title: "Mã Rạp",
      dataIndex: "theaterCode",
      key: "theaterCode",
      width: 120,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return "";
        }
        return text;
      },
    },
    {
      title: "Tên Rạp",
      dataIndex: "theaterName",
      key: "theaterName",
      width: 200,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return "";
        }
        return text;
      },
    },
    {
      title: "Khu Vực",
      dataIndex: "city",
      key: "city",
      width: 150,
      render: (text: string, record: SalesReportData) => {
        if (record.isSubtotal || record.isGrandTotal) {
          return "";
        }
        return text;
      },
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (text: string, record: SalesReportData) => {
        if (record.isGrandTotal) {
          return "";
        }
        return text;
      },
    },
    {
      title: "Chiết khấu",
      dataIndex: "discount",
      key: "discount",
      width: 120,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== "number") return "";
        const formattedValue = `${value.toLocaleString("vi-VN")}`;
        if (record.isGrandTotal) {
          return (
            <span style={{ color: "red", fontWeight: "bold" }}>
              {formattedValue}
            </span>
          );
        }
        return formattedValue;
      },
    },
    {
      title: "Doanh số trước CK",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 150,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== "number") return "";
        const formattedValue = `${value.toLocaleString("vi-VN")}`;
        if (record.isGrandTotal) {
          return (
            <span style={{ color: "red", fontWeight: "bold" }}>
              {formattedValue}
            </span>
          );
        }
        return formattedValue;
      },
    },
    {
      title: "Doanh số sau CK",
      dataIndex: "finalAmount",
      key: "finalAmount",
      width: 150,
      render: (value: number, record: SalesReportData) => {
        if (typeof value !== "number") return "";
        const formattedValue = `${value.toLocaleString("vi-VN")}`;
        if (record.isGrandTotal) {
          return (
            <span style={{ color: "red", fontWeight: "bold" }}>
              {formattedValue}
            </span>
          );
        }
        return formattedValue;
      },
    },
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
            onClick={() => navigate("/admin", { state: { tab: "statistics" } })}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
          >
            <ArrowLeftOutlined className="text-sm" />
            <span>Quay lại</span>
          </button>
          <div className="text-center mt-2">
            <Title level={2} className="mb-0 text-gray-800">
              DOANH SỐ BÁN HÀNG THEO NGÀY CỦA HỆ THỐNG RẠP
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
                placeholder={["Từ ngày", "Đến ngày"]}
                style={{ width: 250 }}
                disabledDate={(current) => {
                  if (!minDate || !maxDate) return false;
                  return current && (current < minDate || current > maxDate);
                }}
              />
            </div>

            {/* Theater filter */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Rạp:</span>
              <Select
                value={selectedTheaterCode}
                onChange={(value) => setSelectedTheaterCode(value)}
                placeholder="Chọn rạp"
                allowClear
                style={{ width: 250 }}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={
                  theaters && theaters.length > 0
                    ? theaters.map((theater) => ({
                        value: theater.theaterCode,
                        label: `${theater.theaterCode} - ${theater.name}`,
                      }))
                    : []
                }
                notFoundContent={
                  theaters.length === 0
                    ? "Đang tải dữ liệu..."
                    : "Không có dữ liệu"
                }
              />
            </div>

            {/* Clear filters button */}
            <button
              onClick={() => {
                setDateRange(null);
                setSelectedTheaterCode(null);
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
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
          size="middle"
          bordered
          className="sales-report-table"
          sticky={{ offsetHeader: 0 }}
          rowClassName={(record) => {
            if (record.isSubtotal || record.isGrandTotal) {
              return "total-row";
            }
            return "";
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
