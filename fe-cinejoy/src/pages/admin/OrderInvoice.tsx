import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllOrders } from "@/apiservice/apiOrder";
import dayjs from "dayjs";
import { DatePicker, Modal } from "antd";

const OrderInvoicePage: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [viewOrder, setViewOrder] = useState<IOrder | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!email) return;
      try {
        setLoading(true);
        const res = await getAllOrders(1, 1000);
        const list: IOrder[] = (res as any)?.orders || (Array.isArray((res as any)) ? (res as any) : []);
        const confirmedForCustomer = list
          .filter((o) =>
            (o?.customerInfo?.email || "").toLowerCase() === decodeURIComponent(email).toLowerCase() &&
            (o?.orderStatus || "").toUpperCase() === "CONFIRMED"
          )
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

  const rows = useMemo(() => {
    return filtered.map((o) => ({
      id: o._id,
      code: o.orderCode,
      orderDate: dayjs(o.createdAt).format("DD/MM/YYYY"),
      paymentTime: o?.paymentInfo?.paymentDate ? dayjs(o.paymentInfo.paymentDate).format("HH:mm DD/MM/YYYY") : "—",
      status: (o.orderStatus || "").toUpperCase() === "CONFIRMED" ? "Đã đặt" : (o.orderStatus || ""),
      method: o.paymentMethod,
      customer: o.customerInfo?.fullName || "",
      raw: o,
    }));
  }, [filtered]);

  return (
    <AdminLayout>
      <div>
        {/* Action Bar */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-black leading-tight">Hóa đơn bán</h2>
          <button
            className="px-3 py-1.5 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer shadow-sm"
            onClick={() => navigate('/admin', { state: { tab: 'orders' } })}
          >
            Quay lại
          </button>
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
                      <td className="p-3">{r.status}</td>
                      <td className="p-3">{r.method}</td>
                      <td className="p-3">{r.customer}</td>
                      <td className="p-3">
                        <button
                          className="px-3 py-1 rounded border border-gray-300 text-black bg-white hover:bg-gray-50 cursor-pointer"
                          onClick={() => setViewOrder(r.raw)}
                        >
                          Xem chi tiết
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
          width={900}
        >
          {viewOrder && (
            <div className="text-black">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left font-semibold">Sản phẩm</th>
                      <th className="p-3 text-left font-semibold">Suất chiếu</th>
                      <th className="p-3 text-left font-semibold">Vé</th>
                      <th className="p-3 text-left font-semibold">Concession(s)</th>
                      <th className="p-3 text-left font-semibold">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">{(viewOrder.movieId as any)?.title || '—'}</td>
                      <td className="p-3">
                        <div>{(viewOrder.theaterId as any)?.name || '—'}</div>
                        <div>{viewOrder.room}</div>
                        <div>{dayjs(viewOrder.showDate).format('DD/MM/YYYY')}</div>
                        <div>
                          Từ {viewOrder.showTime}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{viewOrder.seats?.[0]?.type || 'VIP'}</div>
                        <div>{viewOrder.seats?.map((s: any) => s.seatId).join(', ')}</div>
                        <div className="font-semibold">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewOrder.seats?.[0]?.price || 0)}
                        </div>
                      </td>
                      <td className="p-3">
                        {viewOrder.foodCombos && viewOrder.foodCombos.length > 0 ? (
                          <div className="space-y-2">
                            {viewOrder.foodCombos.map((combo: any, idx: number) => (
                              <div key={idx}>
                                <div className="font-medium">{combo.comboId?.name || 'Food Combo'}</div>
                                <div>
                                  {combo.quantity} x {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewOrder.totalAmount || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right font-bold">
                Tổng cộng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewOrder.finalAmount || 0)}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default OrderInvoicePage;


