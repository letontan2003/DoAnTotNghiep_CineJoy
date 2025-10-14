import { useEffect, useState } from "react";
import clsx from 'clsx';
import dayjs from "dayjs";
import { Spin, Modal } from "antd";
import { getVouchers } from "@/apiservice/apiVoucher";
import { getMyVouchersApi, redeemVoucherApi, fetchAccountApi } from "@/services/api";
import useAppStore from "@/store/app.store";

const VoucherTab = () => {
    const [vouchers, setVouchers] = useState<IVoucher[]>([]);
    const [loadingVoucher, setLoadingVoucher] = useState(false);
    const [loadingMyVouchers, setLoadingMyVouchers] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<IUserVoucher | null>(null);
    const [modalType, setModalType] = useState<'redeem' | 'showCode' | null>(null);
    const [voucherCode, setVoucherCode] = useState<string | null>(null);
    const [myVouchers, setMyVouchers] = useState<IUserVoucher[]>([]);
    const [loadingRedeem, setLoadingRedeem] = useState(false);
    const { isDarkMode, user, setIsModalOpen, setUser } = useAppStore();

    const fetchVouchers = async () => {
        setLoadingVoucher(true);
        try {
            const data = await getVouchers();
            setVouchers(data);
        } catch {
            setVouchers([]);
        }
        setLoadingVoucher(false);
    };

    useEffect(() => {
        const fetchMyVouchers = async () => {
            setLoadingMyVouchers(true);
            try {
                const res = await getMyVouchersApi();
                if (res.status && res.data) {
                    setMyVouchers(res.data || []);
                } else {
                    setMyVouchers([]);
                }
            } catch {
                setMyVouchers([]);
            }
            setLoadingMyVouchers(false);
        };
        fetchMyVouchers();
    }, []);

    useEffect(() => {
        fetchVouchers();
    }, []);

    // Khi bấm Đổi ngay
    const handleRedeemVoucher = (voucher: IVoucher) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSelectedVoucher(voucher as any);
        setModalType('redeem');
        setIsModalVisible(true);
    };

    // Khi bấm Sử dụng
    const handleShowCode = (voucher: IUserVoucher) => {
        setSelectedVoucher(voucher);
        setVoucherCode(voucher.code || '');
        setModalType('showCode');
        setIsModalVisible(true);
    };

    const handleConfirmRedeem = async () => {
        if (!selectedVoucher) return;
        try {
            setLoadingRedeem(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const voucherId = (selectedVoucher as any)._id || (selectedVoucher as any).voucherId?._id;
            // Nếu selectedVoucher là entry line, nó sẽ có detailId; nếu là header (IUserVoucher) thì không
            const detailId: string | undefined = (selectedVoucher as any).detailId;
            const res = await redeemVoucherApi(voucherId, detailId);
            if (res.status) {
                setIsModalVisible(false);
                setSelectedVoucher(null);
                setIsModalOpen(false);
                setModalType(null);
                // Lấy tiêu đề mô tả ưu tiên từ line đầu
                const v = vouchers.find(v => v._id === voucherId);
                // Nếu có detailId thì lấy đúng line; ngược lại fallback line đầu
                const firstLine = detailId
                    ? (v?.lines || []).find(l => (l as any)?.detail?._id?.toString?.() === detailId)
                    : (Array.isArray(v?.lines) ? v!.lines[0] : undefined);
                const title: string = ((firstLine as unknown as { detail?: { description?: string } } | undefined)?.detail?.description) || v?.name || '';
                Modal.success({
                    title: 'Thành công!',
                    content: `Bạn đã đổi thành công voucher "${title}"\nMã sử dụng: ${res.data?.code || ''}`,
                    okText: 'Đóng',
                });
                const myVouchersRes = await getMyVouchersApi();
                const accountRes = await fetchAccountApi();
                if (accountRes.status && accountRes.data?.user) {
                    setUser(accountRes.data.user);
                }
                setMyVouchers(myVouchersRes.data || []);
                await fetchVouchers();
            } else {
                setIsModalVisible(false);
                setSelectedVoucher(null);
                setIsModalOpen(false);
                setModalType(null);
                Modal.error({
                    title: 'Lỗi!',
                    content: res.message || 'Có lỗi xảy ra khi đổi voucher. Vui lòng thử lại.',
                    okText: 'Đóng'
                });
            }
        } catch {
            setTimeout(() => {
                Modal.error({
                    title: 'Lỗi!',
                    content: 'Có lỗi xảy ra khi đổi voucher. Vui lòng thử lại.',
                    okText: 'Đóng'
                });
            }, 300);
        } finally {
            setLoadingRedeem(false);
        }
    };

    const handleCancelModal = () => {
        setIsModalVisible(false);
        setSelectedVoucher(null);
        setIsModalOpen(false);
        setModalType(null);
        setVoucherCode(null);
    };

    return (
        <>
            <div className="w-full max-w-6xl mx-auto mt-2">
                <h2 className="text-2xl font-bold text-center mb-6" style={{ color: isDarkMode ? '#fff' : '#a05a1c' }}>Voucher của tôi</h2>
                {loadingMyVouchers ? (
                    <div className="flex items-center justify-center py-8">
                        <Spin />
                    </div>
                ) : (() => {
                    const validMyVouchers = myVouchers.filter((voucher) => {
                        const statusOk = voucher.status === 'unused';
                        const end = voucher?.voucherId?.validityPeriod?.endDate as unknown as string | Date | undefined;
                        // Nếu không có endDate thì vẫn cho hiển thị (fallback hiếm gặp)
                        const dateOk = !end || dayjs(end).isAfter(dayjs());
                        return statusOk && dateOk;
                    });
                    if (validMyVouchers.length === 0) {
                        return <div className="text-center text-lg text-gray-400 py-6">Bạn chưa có voucher nào.</div>;
                    }
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 mt-4">
                            {validMyVouchers.map(voucher => {
                                const isExpired = voucher.status === 'expired' || dayjs().isAfter(dayjs(voucher.voucherId?.validityPeriod?.endDate));
                                // Tiêu đề ưu tiên description; nếu voucherId là string (sub-id) thì tra ngược từ danh sách vouchers
                                let title = (voucher as any)?.voucherId?.description || voucher.voucherId?.name || 'Voucher';
                                let endDate: string | Date | undefined = voucher.voucherId?.validityPeriod?.endDate as unknown as string | Date | undefined;
                                const maybeId = (voucher as any)?.voucherId as unknown as string | { _id?: string } | undefined;
                                if (!voucher.voucherId || typeof maybeId === 'string') {
                                    const detailId = typeof maybeId === 'string' ? maybeId : undefined;
                                    let owner = detailId
                                      ? vouchers.find(v => Array.isArray(v.lines) && v.lines.some(l => (l as any)?.detail?._id?.toString?.() === detailId))
                                      : undefined;
                                    let line = owner?.lines?.find(l => (l as any)?.detail?._id?.toString?.() === detailId) as any;
                                    let desc = line?.detail?.description;
                                    if (!desc) {
                                      // Fallback: nếu không xác định được theo sub-id, lấy voucher khả dụng đầu tiên (thường chỉ có 1)
                                      owner = owner ?? vouchers[0];
                                      line = owner?.lines?.[0] as any;
                                      desc = line?.detail?.description;
                                    }
                                    if (desc) title = desc;
                                    endDate = line?.validityPeriod?.endDate || owner?.endDate;
                                }
                                return (
                                    <div key={voucher._id} className={clsx(
                                        'rounded-xl shadow-lg p-5 flex flex-col gap-2 relative',
                                        isExpired
                                            ? (isDarkMode
                                                ? 'bg-gray-800 border border-gray-700 text-gray-500'
                                                : 'bg-[#e9ecef] border border-gray-300 text-gray-500')
                                            : (isDarkMode
                                                ? 'bg-[#23272f] border border-gray-700 text-white'
                                                : 'bg-white border border-orange-200 text-gray-900')
                                    )}>
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-bold text-lg flex-1 mr-2">🎟️ {title}</span>
                                            <span className={clsx(
                                                "text-xs px-2 py-1 rounded font-semibold flex-shrink-0",
                                                isExpired
                                                    ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                                    : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                            )}>
                                                {isExpired ? "Hết hạn" : "Còn hạn"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                            <span className="font-semibold">Hạn dùng:</span>
                                            <span>{endDate ? dayjs(endDate).format('DD/MM/YYYY') : ''}</span>
                                        </div>
                                        <button
                                            disabled={isExpired}
                                            onClick={() => handleShowCode(voucher)}
                                            className={clsx(
                                                "mt-2 px-4 py-2 rounded font-bold transition",
                                                isExpired
                                                    ? "bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    : "bg-gradient-to-r from-green-400 to-green-600 text-white hover:brightness-110 shadow-lg cursor-pointer"
                                            )}
                                        >
                                            {isExpired ? "Đã hết hạn" : "Sử dụng"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
                <h2 className="text-2xl font-bold text-center mb-1" style={{ color: isDarkMode ? '#fff' : '#a05a1c' }}>Danh sách Voucher</h2>
                {loadingVoucher ? (
                    <div className="flex items-center justify-center py-8">
                        <Spin />
                    </div>
                ) : (() => {
                    // Tạo danh sách entries theo từng line để hiển thị tất cả voucher-lines
                    const availableEntries = vouchers.flatMap((voucher: IVoucher) => {
                        const lines = Array.isArray(voucher.lines) ? voucher.lines : [];
                        return lines
                            .filter((line) => (line as IPromotionLine)?.promotionType === 'voucher') // Chỉ hiển thị voucher type
                            .map((line, index) => {
                            const validity = (line as IPromotionLine)?.validityPeriod || {
                                startDate: (voucher as unknown as { startDate?: string | Date })?.startDate,
                                endDate: (voucher as unknown as { endDate?: string | Date })?.endDate,
                            };
                            const quantity = (line as unknown as { detail?: { quantity?: number } } | undefined)?.detail?.quantity ?? (voucher.quantity ?? 0);
                            const pointToRedeem = (line as unknown as { detail?: { pointToRedeem?: number } } | undefined)?.detail?.pointToRedeem ?? (voucher.pointToRedeem ?? 0);
                            const maxDiscountValue = (line as unknown as { detail?: { maxDiscountValue?: number } } | undefined)?.detail?.maxDiscountValue as number | undefined;
                            const title = (line as unknown as { detail?: { description?: string } } | undefined)?.detail?.description || voucher.name;
                            return {
                                key: `${voucher._id}-${index}`,
                                voucher,
                                line,
                                index,
                                validity,
                                quantity: Number(quantity) || 0,
                                pointToRedeem: Number(pointToRedeem) || 0,
                                maxDiscountValue,
                                title,
                            };
                        });
                    }).filter((entry) => {
                        const withinDate = dayjs(entry.validity?.startDate).isBefore(dayjs()) && dayjs(entry.validity?.endDate).isAfter(dayjs());
                        const active = entry.voucher.status === 'hoạt động' && (entry.line.status === 'hoạt động');
                        return entry.quantity > 0 && active && withinDate;
                    });

                    if (availableEntries.length === 0) {
                        return <div className="text-center text-lg text-gray-400 py-6">Hiện chưa có voucher nào khả dụng.</div>;
                    }
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 justify-center">
                            {availableEntries.map((entry) => {
                                const { voucher, quantity, validity, pointToRedeem, maxDiscountValue, title } = entry;
                                const enoughPoint = (user?.point ?? 0) >= pointToRedeem;
                                return (
                                    <div key={entry.key} className={clsx(
                                        'rounded-xl shadow-lg p-5 flex flex-col gap-2 relative',
                                        isDarkMode
                                            ? 'bg-[#23272f] border border-gray-700 text-white'
                                            : 'bg-white border border-orange-200 text-gray-900')
                                    }>
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-bold text-lg flex-1 mr-2">🎟️ {title}</span>
                                            <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 font-semibold flex-shrink-0">Còn lại: {quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                            <span className="font-semibold">Thời hạn:</span>
                                            <span>{dayjs(validity?.startDate).format('DD/MM/YYYY')} - {dayjs(validity?.endDate).format('DD/MM/YYYY')}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Điểm cần:</span>
                                                <span className="text-orange-500 font-bold">{pointToRedeem} điểm</span>
                                            </div>
                                            {typeof maxDiscountValue === 'number' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Giảm tối đa:</span>
                                                    <span className="text-green-600 dark:text-green-400 font-semibold">{maxDiscountValue.toLocaleString('vi-VN')} VNĐ</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1" />
                                        <button
                                            disabled={!enoughPoint || quantity <= 0}
                                            onClick={() => handleRedeemVoucher({ ...(voucher as any), detailId: (entry.line as any)?.detail?._id })}
                                            className={clsx(
                                                'mt-2 px-4 py-2 rounded font-bold transition',
                                                enoughPoint && quantity > 0
                                                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:brightness-110 shadow-lg cursor-pointer'
                                                    : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed')
                                            }
                                        >
                                            {enoughPoint ? 'Đổi ngay' : 'Không đủ điểm'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            <Modal
                title={<div className="w-full text-center font-bold">{modalType === 'redeem' ? 'Xác nhận đổi voucher' : 'Mã voucher của bạn'}</div>}
                open={isModalVisible}
                onOk={modalType === 'redeem' ? handleConfirmRedeem : handleCancelModal}
                onCancel={handleCancelModal}
                okText={modalType === 'redeem' ? 'Xác nhận' : 'Đóng'}
                cancelText={modalType === 'redeem' ? 'Hủy' : ''}
                okButtonProps={{
                    className: "bg-orange-500 hover:bg-orange-600 border-orange-500"
                }}
                getContainer={false}
                centered
                footer={modalType === 'showCode' ? null : undefined}
                confirmLoading={modalType === 'redeem' ? loadingRedeem : false}
            >
                {modalType === 'redeem' && (
                    <p>Bạn có chắc chắn muốn đổi voucher này không?</p>
                )}
                {modalType === 'showCode' && (
                    <div className="flex flex-col items-center justify-center py-3">
                        <span className="text-2xl font-mono bg-gray-100 dark:bg-gray-800 px-6 py-3 rounded-lg border border-dashed border-orange-400 text-orange-600 dark:text-orange-300 select-all">
                            {voucherCode}
                        </span>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default VoucherTab;