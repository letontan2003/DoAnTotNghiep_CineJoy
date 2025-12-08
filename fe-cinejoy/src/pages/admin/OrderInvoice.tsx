import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllOrders } from "@/apiservice/apiOrder";
import dayjs from "dayjs";
import { DatePicker, Modal } from "antd";
import { cancelOrder } from "@/apiservice/apiOrder";
import { toast } from "react-toastify";

const OrderInvoicePage: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [viewOrder, setViewOrder] = useState<IOrder | null>(null);
  const currency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  const formatDate = (d?: string | Date | null) => d ? dayjs(d).format('DD/MM/YYYY') : '—';
  const formatTime = (d?: string | Date | null) => d ? dayjs(d).format('HH:mm DD/MM/YYYY') : '—';
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundTarget, setRefundTarget] = useState<IOrder | null>(null);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const getStatusDisplay = (status: string) => {
    if (status === "CONFIRMED") return "Đã thanh toán";
    if (status === "RETURNED") return "Trả vé";
    if (status === "CANCELLED") return "Đã hủy";
    if (status === "COMPLETED") return "Hoàn thành";
    return status;
  };

  const printOrder = (order: IOrder) => {
    const v: any = order;
    const voucher = order.voucherDiscount || 0;
    const amountDiscountInfo = v?.amountDiscountInfo as { description?: string; amount?: number; discountAmount?: number; discountValue?: number } | undefined;
    const amountDiscountVal = typeof amountDiscountInfo?.discountValue === 'number'
      ? amountDiscountInfo!.discountValue
      : typeof amountDiscountInfo?.discountAmount === 'number'
        ? amountDiscountInfo!.discountAmount
        : (amountDiscountInfo?.amount ?? 0);
    const percentPromotions = (v?.percentPromotions as Array<{ description?: string; amount?: number; discountAmount?: number }>) || [];
    const itemPromotions = (v?.itemPromotions as Array<{ rewardItem?: string; rewardQuantity?: number; description?: string }>) || [];

    const theater = (order.theaterId as any)?.name || '';
    const movieTitle = (order.movieId as any)?.title || '';
    const showDate = dayjs(order.showDate).format('DD/MM/YYYY');
    const seats = order.seats?.map((s: any) => s.seatId).join(', ');

    const hasPromotions = voucher > 0 || amountDiscountVal > 0 || percentPromotions.length > 0 || itemPromotions.length > 0;
    const totalDiscount = (voucher || 0) + (amountDiscountVal || 0) + (percentPromotions.reduce((sum: number, p: any) => {
      const cut = typeof p?.discountAmount === 'number' ? p.discountAmount : (p?.amount || 0);
      return sum + cut;
    }, 0) || 0);

    const html = `
      <html>
      <head>
        <title>Đơn vé ${order.orderCode}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #000; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #ccc; padding: 12px; vertical-align: top; }
          th { background: #f5f5f5; text-align: left; font-weight: bold; }
          .right { text-align: right; }
          .mt { margin-top: 16px; }
          .mb { margin-bottom: 12px; }
          .promo-table { margin-top: 16px; }
          .promo-table th { background: #f9f9f9; }
          .discount-amount { font-weight: bold; color: #000; }
          .total-section { margin-top: 24px; padding-top: 16px; border-top: 2px solid #999; text-align: right; }
          .total-amount { font-size: 18px; font-weight: bold; color: #dc2626; }
        </style>
      </head>
      <body>
        <table class="mb">
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Ngày đặt</th>
              <th>Thời gian thanh toán</th>
              <th>Trạng thái</th>
              <th>Phương thức thanh toán</th>
              <th>Tên khách hàng</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${order.orderCode}</td>
              <td>${formatDate(order.createdAt)}</td>
              <td>${formatTime((order as any)?.paymentInfo?.paymentDate)}</td>
              <td>${getStatusDisplay(order.orderStatus || '')}</td>
              <td>${order.paymentMethod || ''}</td>
              <td>${order.customerInfo?.fullName || ''}</td>
            </tr>
          </tbody>
        </table>
        
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Suất chiếu</th>
              <th>Vé</th>
              <th>Concession(s)</th>
              <th class="right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${movieTitle}</b></td>
              <td>
                <div style="margin-bottom: 4px;">${theater}</div>
                <div style="margin-bottom: 4px;">${order.room}</div>
                <div style="margin-bottom: 4px;">${showDate}</div>
                <div>Từ ${order.showTime}</div>
              </td>
              <td>
                <div style="margin-bottom: 4px;">${order.seats?.[0]?.type || ''}</div>
                <div style="margin-bottom: 4px;">${seats}</div>
                <div><b>${currency(order.seats?.[0]?.price || 0)}</b></div>
              </td>
              <td>
                ${order.foodCombos && order.foodCombos.length ? order.foodCombos.map((c: any) => `<div style="margin-bottom: 8px;"><b>${c.comboId?.name || 'Combo'}</b><br/>${c.quantity} x ${currency(c.price)}</div>`).join('') : '-'}
              </td>
              <td class="right"><b>${currency(order.totalAmount || 0)}</b></td>
            </tr>
          </tbody>
        </table>

        ${hasPromotions ? `
        <table class="promo-table">
          <thead>
            <tr>
              ${amountDiscountVal > 0 ? '<th>Khuyến mãi tiền</th>' : ''}
              ${percentPromotions.length ? '<th>Khuyến mãi chiết khấu</th>' : ''}
              ${itemPromotions.length ? '<th>Khuyến mãi hàng</th>' : ''}
              ${(voucher > 0 || amountDiscountVal > 0 || percentPromotions.length > 0) ? '<th class="right">Tổng tiền giảm</th>' : ''}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${amountDiscountVal > 0 ? `<td><div style="margin-bottom: 4px; font-size: 13px;">${amountDiscountInfo?.description || ''}</div><div class="discount-amount">- ${currency(amountDiscountVal)}</div></td>` : ''}
              ${percentPromotions.length ? `<td>${percentPromotions.map((p: any) => {
                const cut = typeof p.discountAmount === 'number' ? p.discountAmount : (p.amount || 0);
                return `<div style="margin-bottom: 8px;"><div style="font-size: 13px;">${p.description || ''}</div><div class="discount-amount">- ${currency(cut)}</div></div>`;
              }).join('')}</td>` : ''}
              ${itemPromotions.length ? `<td>${itemPromotions.map((it: any) => `<div style="margin-bottom: 8px;"><div style="font-size: 13px;">${it.description || ''}</div><div style="font-weight: bold; color: #16a34a;">+${it.rewardQuantity || 0} ${it.rewardItem || ''}</div></div>`).join('')}</td>` : ''}
              ${(voucher > 0 || amountDiscountVal > 0 || percentPromotions.length > 0) ? `<td class="right"><div class="discount-amount" style="font-size: 16px;">- ${currency(totalDiscount)}</div></td>` : ''}
            </tr>
          </tbody>
        </table>
        ` : ''}

        <div class="total-section">
          <div class="total-amount">Tổng cộng: ${currency(order.finalAmount || 0)}</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 250);
    }
  };

  const promoInfo = useMemo(() => {
    if (!viewOrder) return null as any;
    const v: any = viewOrder;
    const hasVoucher = typeof viewOrder.voucherDiscount === 'number' && viewOrder.voucherDiscount > 0;
    const amountDiscountInfo = v?.amountDiscountInfo as { description?: string; amount?: number; discountAmount?: number; discountValue?: number } | undefined;
    const amountDiscountVal = typeof amountDiscountInfo?.discountValue === 'number'
      ? amountDiscountInfo!.discountValue
      : typeof amountDiscountInfo?.discountAmount === 'number'
        ? amountDiscountInfo!.discountAmount
        : (amountDiscountInfo?.amount ?? 0);
    const hasAmountDiscount = !!amountDiscountInfo && amountDiscountVal > 0;
    const percentPromotions = (v?.percentPromotions as Array<{ description?: string; amount?: number; discountAmount?: number }>) || [];
    const hasPercentPromotions = percentPromotions.length > 0;
    const itemPromotions = (v?.itemPromotions as Array<{ rewardItem?: string; rewardQuantity?: number; description?: string }>) || [];
    const hasItemPromotions = itemPromotions.length > 0;
    return { hasVoucher, amountDiscountInfo, amountDiscountVal, hasAmountDiscount, percentPromotions, hasPercentPromotions, itemPromotions, hasItemPromotions };
  }, [viewOrder]);

  useEffect(() => {
    const load = async () => {
      if (!email) return;
      try {
        setLoading(true);
        const res = await getAllOrders(1, 1000);
        const list: IOrder[] = (res as any)?.orders || (Array.isArray((res as any)) ? (res as any) : []);
        const confirmedForCustomer = list
          .filter((o) => {
            const orderEmail = (o?.customerInfo?.email || "").toLowerCase();
            const targetEmail = decodeURIComponent(email).toLowerCase();
            const status = (o?.orderStatus || "").toUpperCase();
            return orderEmail === targetEmail && (status === "CONFIRMED" || status === "RETURNED");
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(confirmedForCustomer);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [email]);

  const filtered = useMemo(() => {
    const hasFrom = !!filterFrom;
    const hasTo = !!filterTo;
    const fromDate = hasFrom ? new Date(filterFrom) : null;
    const toDate = hasTo ? new Date(filterTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    const within = (d: Date) => {
      if (fromDate && toDate) return d >= fromDate && d <= toDate;
      if (fromDate && !toDate) return d >= fromDate;
      if (!fromDate && toDate) return d <= toDate;
      return true;
    };
    return orders.filter((o) => within(new Date(o.createdAt)));
  }, [orders, filterFrom, filterTo]);

  // Hàm kiểm tra có thể trả vé hay không (trước giờ chiếu 25 phút)
  const canRefundTicket = (order: IOrder) => {
    try {
      const showDate = dayjs(order.showDate);
      const showTime = order.showTime;
      
      // Tạo datetime đầy đủ cho suất chiếu
      const showDateTime = showDate.hour(parseInt(showTime.split(':')[0]))
        .minute(parseInt(showTime.split(':')[1]))
        .second(0);
      
      // Thời gian hiện tại
      const now = dayjs();
      
      // Thời gian giới hạn (25 phút trước giờ chiếu)
      const cutoffTime = showDateTime.subtract(25, 'minute');
      
      // Có thể trả vé nếu thời gian hiện tại < thời gian giới hạn
      return now.isBefore(cutoffTime);
    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      return false; // Mặc định không cho phép trả vé nếu có lỗi
    }
  };

  const rows = useMemo(() => {
    return filtered.map((o) => ({
      id: o._id,
      code: o.orderCode,
      orderDate: dayjs(o.createdAt).format("DD/MM/YYYY"),
      paymentTime: o?.paymentInfo?.paymentDate ? dayjs(o.paymentInfo.paymentDate).format("HH:mm DD/MM/YYYY") : "—",
      status: getStatusDisplay(o.orderStatus || ""),
      method: o.paymentMethod,
      customer: o.customerInfo?.fullName || "",
      raw: o,
      canRefund: canRefundTicket(o),
    }));
  }, [filtered]);

  return (
    <AdminLayout>
      <div>
        {/* Action Bar */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-black leading-tight">Hóa đơn bán</h2>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer shadow-sm"
              onClick={() => navigate(`/admin/orders/returned/${email}`)}
            >
              Hóa đơn trả →
            </button>
            <button
              className="px-3 py-1.5 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer shadow-sm"
              onClick={() => navigate('/admin', { state: { tab: 'orders' } })}
            >
              Quay lại
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3 shadow-sm flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {rows.length > 0 ? `Tổng hóa đơn: ${rows.length}` : ""}
          </div>
          <div className="flex items-center gap-3">
            <DatePicker.RangePicker
              value={[filterFrom ? (dayjs as any)(filterFrom) : null, filterTo ? (dayjs as any)(filterTo) : null] as any}
              onChange={(vals) => {
                const [start, end] = vals || [];
                setFilterFrom(start ? (start as any).format('YYYY-MM-DD') : '');
                setFilterTo(end ? (end as any).format('YYYY-MM-DD') : '');
              }}
              format="DD/MM/YYYY"
            />
            <button
              className="px-3 py-1.5 bg-gray-100 text-black rounded hover:bg-gray-200 cursor-pointer border border-gray-300"
              onClick={() => { setFilterFrom(""); setFilterTo(""); }}
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="bg-white text-black rounded-lg shadow p-6">
          {loading && <div>Đang tải...</div>}
          {!loading && rows.length === 0 && (
            <div>Không tìm thấy đơn đã xác nhận của khách hàng này.</div>
          )}
          {!loading && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 text-black border-b border-gray-200">
                  <tr>
                    <th className="p-3 text-left font-semibold text-black">Mã hóa đơn</th>
                    <th className="p-3 text-left font-semibold text-black">Ngày đặt</th>
                    <th className="p-3 text-left font-semibold text-black">Thời gian thanh toán</th>
                    <th className="p-3 text-left font-semibold text-black">Trạng thái</th>
                    <th className="p-3 text-left font-semibold text-black">Phương thức thanh toán</th>
                    <th className="p-3 text-left font-semibold text-black">Tên khách hàng</th>
                    <th className="p-3 text-left font-semibold text-black">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{r.code}</td>
                      <td className="p-3">{r.orderDate}</td>
                      <td className="p-3">{r.paymentTime}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          r.status === "Trả vé" 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">{r.method}</td>
                      <td className="p-3">{r.customer}</td>
                      <td className="p-3">
                        <button
                          className="px-3 py-1 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer mr-2"
                          onClick={() => setViewOrder(r.raw)}
                        >
                          Xem chi tiết
                        </button>
                        {r.raw.orderStatus !== "RETURNED" && (
                          <button
                            className={`px-3 py-1 rounded border mr-2 ${
                              r.canRefund
                                ? "border-red-300 text-red-700 bg-white hover:bg-red-50 cursor-pointer"
                                : "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                            }`}
                            onClick={() => { 
                              if (r.canRefund) {
                                setRefundTarget(r.raw); 
                                setRefundReason(""); 
                              }
                            }}
                            disabled={!r.canRefund}
                            title={!r.canRefund ? "Không thể trả vé sau 25 phút trước giờ chiếu" : ""}
                          >
                            {r.canRefund ? "Trả vé" : "Hết hạn trả vé"}
                          </button>
                        )}
                        <button
                          className="px-3 py-1 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer"
                          onClick={() => printOrder(r.raw)}
                        >
                          In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal chi tiết hóa đơn */}
        <Modal
          title="Chi tiết đơn vé"
          open={!!viewOrder}
          onCancel={() => setViewOrder(null)}
          footer={null}
          width={1200}
        >
          {viewOrder && (
            <div className="text-black">
              {/* Header giống trang Hóa đơn trả (không có lý do/ thời gian trả) */}
              <div className="mb-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <strong>Mã hóa đơn:</strong> {viewOrder.orderCode}
                </div>
                <div>
                  <strong>Ngày đặt:</strong> {dayjs(viewOrder.createdAt).format('DD/MM/YYYY')}
                </div>
                <div>
                  <strong>Thời gian thanh toán:</strong> {viewOrder?.paymentInfo?.paymentDate ? dayjs(viewOrder.paymentInfo.paymentDate).format('HH:mm DD/MM/YYYY') : '—'}
                </div>
                <div>
                  <strong>Trạng thái:</strong> <span className={`px-2 py-1 rounded-full text-xs ${
                    viewOrder.orderStatus === "RETURNED" 
                      ? "bg-orange-100 text-orange-700" 
                      : "bg-green-100 text-green-700"
                  }`}>{getStatusDisplay(viewOrder.orderStatus || '')}</span>
                </div>
                <div>
                  <strong>Phương thức thanh toán:</strong> {viewOrder.paymentMethod}
                </div>
                <div>
                  <strong>Tên khách hàng:</strong> {viewOrder.customerInfo?.fullName || ''}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left font-semibold border border-gray-300">Sản phẩm</th>
                      <th className="p-3 text-left font-semibold border border-gray-300">Suất chiếu</th>
                      <th className="p-3 text-left font-semibold border border-gray-300">Vé</th>
                      <th className="p-3 text-left font-semibold border border-gray-300">Concession(s)</th>
                      <th className="p-3 text-left font-semibold border border-gray-300">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 font-medium border border-gray-300 align-top">{(viewOrder.movieId as any)?.title || '—'}</td>
                      <td className="p-3 border border-gray-300 align-top">
                        <div className="mb-1">{(viewOrder.theaterId as any)?.name || '—'}</div>
                        <div className="mb-1">{viewOrder.room}</div>
                        <div className="mb-1">{dayjs(viewOrder.showDate).format('DD/MM/YYYY')}</div>
                        <div>Từ {viewOrder.showTime}</div>
                      </td>
                      <td className="p-3 border border-gray-300 align-top">
                        <div className="mb-1">{viewOrder.seats?.[0]?.type || 'VIP'}</div>
                        <div className="mb-1">{viewOrder.seats?.map((s: any) => s.seatId).join(', ')}</div>
                        <div className="font-semibold">{currency(viewOrder.seats?.[0]?.price || 0)}</div>
                      </td>
                      <td className="p-3 border border-gray-300 align-top">
                        {viewOrder.foodCombos && viewOrder.foodCombos.length > 0 ? (
                          <div className="space-y-2">
                            {viewOrder.foodCombos.map((combo: any, idx: number) => (
                              <div key={idx} className="mb-2">
                                <div className="font-medium">{combo.comboId?.name || 'Food Combo'}</div>
                                <div className="text-sm text-gray-600">{combo.quantity} x {currency(combo.price)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold border border-gray-300 align-top text-right">{currency(viewOrder.totalAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>

                {(promoInfo?.hasAmountDiscount || promoInfo?.hasPercentPromotions || promoInfo?.hasItemPromotions || promoInfo?.hasVoucher) && (
                  <div className="mt-4">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          {promoInfo?.hasAmountDiscount && <th className="p-3 text-left font-semibold border border-gray-300">Khuyến mãi tiền</th>}
                          {promoInfo?.hasPercentPromotions && <th className="p-3 text-left font-semibold border border-gray-300">Khuyến mãi chiết khấu</th>}
                          {promoInfo?.hasItemPromotions && <th className="p-3 text-left font-semibold border border-gray-300">Khuyến mãi hàng</th>}
                          {(promoInfo?.hasVoucher || promoInfo?.hasAmountDiscount || promoInfo?.hasPercentPromotions) && (
                            <th className="p-3 text-left font-semibold border border-gray-300">Tổng tiền giảm</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {promoInfo?.hasAmountDiscount && (
                            <td className="p-3 border border-gray-300 align-top">
                              <div className="mb-1 text-sm">{promoInfo?.amountDiscountInfo?.description}</div>
                              <div className="font-bold text-black">- {currency(promoInfo?.amountDiscountVal || 0)}</div>
                            </td>
                          )}
                          {promoInfo?.hasPercentPromotions && (
                            <td className="p-3 border border-gray-300 align-top">
                              {promoInfo?.percentPromotions.map((p: any, i: number) => {
                                const cut = typeof p?.discountAmount === 'number' ? p.discountAmount : (p?.amount || 0);
                                return (
                                  <div key={i} className={i > 0 ? "mt-2" : ""}>
                                    <div className="mb-1 text-sm">{p?.description}</div>
                                    <div className="font-bold text-black">- {currency(cut)}</div>
                                  </div>
                                );
                              })}
                            </td>
                          )}
                          {promoInfo?.hasItemPromotions && (
                            <td className="p-3 border border-gray-300 align-top">
                              {promoInfo?.itemPromotions.map((it: any, i: number) => (
                                <div key={i} className={i > 0 ? "mt-2" : ""}>
                                  <div className="mb-1 text-sm">{it.description || ''}</div>
                                  <div className="font-semibold text-green-600">+{it.rewardQuantity || 0} {it.rewardItem || ''}</div>
                                </div>
                              ))}
                            </td>
                          )}
                          {(promoInfo?.hasVoucher || promoInfo?.hasAmountDiscount || promoInfo?.hasPercentPromotions) && (
                            <td className="p-3 font-semibold border border-gray-300 align-top text-right">
                              <div className="text-lg font-bold text-black">
                                - {currency(
                                  (viewOrder.voucherDiscount || 0) + 
                                  (promoInfo?.amountDiscountVal || 0) + 
                                  (promoInfo?.percentPromotions?.reduce((sum: number, p: any) => {
                                    const cut = typeof p?.discountAmount === 'number' ? p.discountAmount : (p?.amount || 0);
                                    return sum + cut;
                                  }, 0) || 0)
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t-2 border-gray-400 text-right">
                <div className="text-xl font-bold">Tổng cộng: <span className="text-red-600">{currency(viewOrder.finalAmount || 0)}</span></div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal Trả vé */}
        <Modal
          title="Trả vé"
          open={!!refundTarget}
          onCancel={() => setRefundTarget(null)}
          okText={isRefunding ? 'Đang xử lý...' : 'Xác nhận'}
          okButtonProps={{ disabled: isRefunding || !refundReason.trim() }}
          onOk={async () => {
            if (!refundTarget) return;
            
            // Kiểm tra lại thời gian trước khi xử lý trả vé
            if (!canRefundTicket(refundTarget)) {
              toast.error("Không thể trả vé sau 25 phút trước giờ chiếu!");
              setRefundTarget(null);
              return;
            }
            
            try {
              setIsRefunding(true);
              await cancelOrder(refundTarget._id as any, refundReason.trim());
              setRefundReason("");
              setRefundTarget(null);
              // Loại bỏ đơn vừa trả khỏi danh sách (vì đã chuyển sang RETURNED)
              setOrders(prev => prev.filter(o => o._id !== refundTarget._id));
              // Thông báo thành công
              toast.success("Trả vé thành công!");
            } catch (error: any) {
              console.error("Lỗi khi trả vé:", error);
              toast.error(error?.message || "Không thể trả vé");
            } finally {
              setIsRefunding(false);
            }
          }}
        >
          <div className="text-black">
            <label className="block mb-2">Lý do trả vé</label>
            <textarea
              className="w-full border border-gray-300 rounded p-2"
              rows={4}
              placeholder="Nhập lý do trả vé..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-500">Đơn sẽ được cập nhật trạng thái "Trả vé" sau khi xác nhận.</p>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default OrderInvoicePage;


