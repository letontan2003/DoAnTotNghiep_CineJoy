import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllOrders } from "@/apiservice/apiOrder";
import dayjs from "dayjs";
import { DatePicker, Modal } from "antd";

const ReturnedInvoicePage: React.FC = () => {
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

  const getStatusDisplay = (status: string) => {
    if (status === "CONFIRMED") return "Đã đặt";
    if (status === "RETURNED") return "Trả thành công";
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
    const returnInfo = (v?.returnInfo as { reason?: string; returnDate?: Date } | undefined);

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
        <title>Hóa đơn trả - ${order.orderCode}</title>
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
              <th>Lý do trả</th>
              <th>Thời gian trả</th>
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
              <td>${returnInfo?.reason || '—'}</td>
              <td>${formatTime(returnInfo?.returnDate)}</td>
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
        const returnedForCustomer = list
          .filter((o) => {
            const orderEmail = (o?.customerInfo?.email || "").toLowerCase();
            const targetEmail = decodeURIComponent(email).toLowerCase();
            const status = (o?.orderStatus || "").toUpperCase();
            return orderEmail === targetEmail && status === "RETURNED";
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(returnedForCustomer);
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

  const rows = useMemo(() => {
    return filtered.map((o) => {
      const returnInfo = (o as any)?.returnInfo as { reason?: string; returnDate?: Date } | undefined;
      return {
        id: o._id,
        code: o.orderCode,
        orderDate: dayjs(o.createdAt).format("DD/MM/YYYY"),
        paymentTime: o?.paymentInfo?.paymentDate ? dayjs(o.paymentInfo.paymentDate).format("HH:mm DD/MM/YYYY") : "—",
        status: getStatusDisplay(o.orderStatus || ""),
        method: o.paymentMethod,
        customer: o.customerInfo?.fullName || "",
        returnReason: returnInfo?.reason || "—",
        returnDate: returnInfo?.returnDate ? dayjs(returnInfo.returnDate).format("HH:mm DD/MM/YYYY") : "—",
        raw: o,
      };
    });
  }, [filtered]);

  return (
    <AdminLayout>
      <div>
        {/* Action Bar */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-black leading-tight">Hóa đơn trả</h2>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer shadow-sm"
              onClick={() => navigate(`/admin/orders/invoice/${email}`)}
            >
              ← Hóa đơn bán
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
            {rows.length > 0 ? `Tổng hóa đơn trả: ${rows.length}` : ""}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Lọc theo ngày đặt:</span>
            <DatePicker.RangePicker
              placeholder={["Từ ngày", "Đến ngày"]}
              format="DD/MM/YYYY"
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setFilterFrom(dates[0].format("YYYY-MM-DD"));
                  setFilterTo(dates[1].format("YYYY-MM-DD"));
                } else {
                  setFilterFrom("");
                  setFilterTo("");
                }
              }}
            />
            {(filterFrom || filterTo) && (
              <button
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                onClick={() => { setFilterFrom(""); setFilterTo(""); }}
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Không có hóa đơn trả</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Mã hóa đơn</th>
                    <th className="text-left p-3 font-medium text-gray-700">Ngày đặt</th>
                    <th className="text-left p-3 font-medium text-gray-700">Thời gian thanh toán</th>
                    <th className="text-left p-3 font-medium text-gray-700">Trạng thái</th>
                    <th className="text-left p-3 font-medium text-gray-700">Phương thức thanh toán</th>
                    <th className="text-left p-3 font-medium text-gray-700">Tên khách hàng</th>
                    <th className="text-left p-3 font-medium text-gray-700">Lý do trả</th>
                    <th className="text-left p-3 font-medium text-gray-700">Thời gian trả</th>
                    <th className="text-left p-3 font-medium text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="text-black divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3">{r.code}</td>
                      <td className="p-3">{r.orderDate}</td>
                      <td className="p-3">{r.paymentTime}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">{r.method}</td>
                      <td className="p-3">{r.customer}</td>
                      <td className="p-3 max-w-xs truncate" title={r.returnReason}>{r.returnReason}</td>
                      <td className="p-3">{r.returnDate}</td>
                      <td className="p-3">
                        <button
                          className="px-3 py-1 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer mr-2"
                          onClick={() => setViewOrder(r.raw)}
                        >
                          Xem chi tiết
                        </button>
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

        {/* Modal chi tiết */}
        <Modal
          title="Chi tiết đơn vé trả"
          open={!!viewOrder}
          onCancel={() => setViewOrder(null)}
          footer={null}
          width={1200}
        >
          {viewOrder && promoInfo && (
            <div className="text-black">
              <div className="mb-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <strong>Mã hóa đơn:</strong> {viewOrder.orderCode}
                </div>
                <div>
                  <strong>Ngày đặt:</strong> {formatDate(viewOrder.createdAt)}
                </div>
                <div>
                  <strong>Thời gian thanh toán:</strong> {formatTime((viewOrder as any)?.paymentInfo?.paymentDate)}
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
                <div>
                  <strong>Lý do trả:</strong> {((viewOrder as any)?.returnInfo as { reason?: string })?.reason || '—'}
                </div>
                <div>
                  <strong>Thời gian trả:</strong> {formatTime(((viewOrder as any)?.returnInfo as { returnDate?: Date })?.returnDate)}
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
      </div>
    </AdminLayout>
  );
};

export default ReturnedInvoicePage;

