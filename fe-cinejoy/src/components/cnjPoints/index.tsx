import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Card, Button, message } from "antd";
import { GiftOutlined, UserOutlined, ShoppingCartOutlined, CalendarOutlined, StarOutlined } from '@ant-design/icons';
import useAppStore from '@/store/app.store';
import { handleBirthdayPoints, getBirthdayInfo } from '@/services/birthdayService';

const CNJPointsTab = () => {
    const { isDarkMode, user, setUser } = useAppStore();
    const [birthdayInfo, setBirthdayInfo] = useState<{
        birthdayDate: string;
        nextBirthday: string;
        daysUntilBirthday: number;
        isToday: boolean;
    } | null>(null);
    const [isCheckingBirthday, setIsCheckingBirthday] = useState(false);
    const [hasReceivedBirthdayPoints, setHasReceivedBirthdayPoints] = useState(false);

    // Kiểm tra sinh nhật khi component mount
    useEffect(() => {
        if (user?.dateOfBirth) {
            const info = getBirthdayInfo(user.dateOfBirth);
            setBirthdayInfo(info);
            
            // Kiểm tra xem đã nhận điểm sinh nhật hôm nay chưa
            const today = new Date().toISOString().split('T')[0];
            const hasReceivedToday = localStorage.getItem(`birthday_points_${user._id}_${today}`);
            setHasReceivedBirthdayPoints(!!hasReceivedToday);
        }
    }, [user?.dateOfBirth, user?._id]);

    // Hàm xử lý cộng điểm sinh nhật
    const handleBirthdayPointsClick = async () => {
        if (!user?._id || !user?.dateOfBirth) {
            message.error('Không thể xác định thông tin user!');
            return;
        }

        setIsCheckingBirthday(true);
        try {
            const result = await handleBirthdayPoints(user._id, user.dateOfBirth);
            
            if (result.pointsAdded > 0) {
                // Cập nhật user trong store
                setUser({
                    ...user,
                    point: (user.point || 0) + result.pointsAdded
                });
                // Cập nhật state đã nhận điểm
                setHasReceivedBirthdayPoints(true);
                message.success(result.message);
            } else {
                message.info(result.message);
            }
        } catch {
            message.error('Có lỗi xảy ra khi xử lý điểm sinh nhật!');
        } finally {
            setIsCheckingBirthday(false);
        }
    };

    // Các cách thức nhận điểm
    const earningMethods = [
        {
            icon: <UserOutlined className="text-2xl" />,
            title: "Tạo tài khoản / Xác thực",
            points: "+50 điểm",
            description: "Nhận ngay 50 điểm khi tạo tài khoản mới hoặc xác thực tài khoản",
            color: "#1890ff"
        },
        {
            icon: <ShoppingCartOutlined className="text-2xl" />,
            title: "Mua vé hoặc combo",
            points: "+5 điểm/sản phẩm",
            description: "Tích lũy 5 điểm cho mỗi vé xem phim hoặc combo thức ăn",
            color: "#52c41a"
        },
        {
            icon: <CalendarOutlined className="text-2xl" />,
            title: "Sự kiện sinh nhật",
            points: "+100 điểm",
            description: "Nhận 100 điểm đặc biệt trong ngày sinh nhật của bạn",
            color: "#fa8c16"
        }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto mt-2">
            {/* Header với điểm hiện có */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4" style={{ color: isDarkMode ? '#fff' : '#a05a1c' }}>
                    Điểm CNJ của tôi
                </h2>
                <div className="flex justify-center mb-6">
                    <div
                        className={clsx(
                            'px-6 py-3 rounded-full text-lg font-bold flex items-center gap-3',
                            isDarkMode 
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border border-blue-400' 
                                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border border-blue-300'
                        )}
                    >
                        <StarOutlined className="text-xl" style={{ transform: 'translateY(2px)' }} />
                        <span>Điểm hiện có: <span className="ml-2 text-2xl">{(user?.point ?? 0).toLocaleString('vi-VN')} điểm</span></span>
                    </div>
                </div>
            </div>

            {/* Thông báo về cách thức nhận điểm */}
            <div className="mb-8">
                <div
                    className={clsx(
                        'p-4 rounded-lg border flex items-start gap-3',
                        isDarkMode 
                            ? 'bg-[#1f2937] border-[#374151] text-white' 
                            : 'bg-blue-50 border-blue-200 text-blue-800'
                    )}
                    style={{
                        backgroundColor: isDarkMode ? '#1f2937' : '#f0f9ff',
                        borderColor: isDarkMode ? '#374151' : '#bfdbfe'
                    }}
                >
                    <div 
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: '#1890ff' }}
                    >
                        i
                    </div>
                    <div className="flex-1">
                        <div 
                            className="font-semibold mb-1"
                            style={{ color: isDarkMode ? '#ffffff' : '#1e40af' }}
                        >
                            Cách thức nhận điểm CNJ
                        </div>
                        <div 
                            className="text-sm"
                            style={{ color: isDarkMode ? '#d1d5db' : '#1e40af' }}
                        >
                            Tích lũy điểm để đổi voucher và hưởng nhiều ưu đãi hấp dẫn!
                        </div>
                    </div>
                </div>
            </div>

            {/* Thông tin sinh nhật */}
            {birthdayInfo && (
                <div className="mb-8">
                    <Card
                        className={clsx(
                            'text-center',
                            isDarkMode 
                                ? 'bg-gradient-to-r from-pink-900 to-purple-900 border-pink-500' 
                                : 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200'
                        )}
                        style={{
                            backgroundColor: isDarkMode ? '#1a0b2e' : '#fdf2f8',
                            borderColor: isDarkMode ? '#ec4899' : '#f9a8d4'
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <CalendarOutlined 
                                className="text-3xl" 
                                style={{ color: isDarkMode ? '#f472b6' : '#ec4899' }} 
                            />
                            <h3 
                                className="text-xl font-bold"
                                style={{ color: isDarkMode ? '#fff' : '#be185d' }}
                            >
                                {birthdayInfo.isToday 
                                    ? '🎉 Hôm nay là sinh nhật của bạn!' 
                                    : birthdayInfo.daysUntilBirthday === 1
                                        ? '🎂 Ngày mai là sinh nhật!'
                                        : 'Thông tin sinh nhật'
                                }
                            </h3>
                        </div>
                        
                        <div 
                            className="text-base mb-4"
                            style={{ color: isDarkMode ? '#d1d5db' : '#9d174d' }}
                        >
                            {birthdayInfo.isToday 
                                ? (hasReceivedBirthdayPoints 
                                    ? `🎉 Bạn đã nhận thành công 100 điểm CNJ sinh nhật!`
                                    : `Chúc mừng sinh nhật! Bạn có thể nhận 100 điểm CNJ đặc biệt!`
                                )
                                : birthdayInfo.daysUntilBirthday === 1
                                    ? `🎂 Ngày mai là sinh nhật của bạn! Chuẩn bị nhận 100 điểm CNJ đặc biệt nhé!`
                                    : `Sinh nhật của bạn: ${birthdayInfo.birthdayDate} (còn ${birthdayInfo.daysUntilBirthday} ngày)`
                            }
                        </div>

                        {birthdayInfo.isToday && (
                            <Button
                                type="primary"
                                size="large"
                                icon={<CalendarOutlined />}
                                loading={isCheckingBirthday}
                                disabled={hasReceivedBirthdayPoints}
                                onClick={handleBirthdayPointsClick}
                                className="font-semibold"
                                style={{
                                    background: hasReceivedBirthdayPoints 
                                        ? 'linear-gradient(45deg, #10b981, #059669)' 
                                        : 'linear-gradient(45deg, #ff6b6b, #feca57)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    height: '48px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    opacity: hasReceivedBirthdayPoints ? 0.8 : 1,
                                    color: '#ffffff'
                                }}
                            >
                                {isCheckingBirthday 
                                    ? 'Đang xử lý...' 
                                    : hasReceivedBirthdayPoints 
                                        ? ' Đã nhận thành công!' 
                                        : 'Nhận 100 điểm sinh nhật! 🎂'
                                }
                            </Button>
                        )}
                    </Card>
                </div>
            )}

            {/* Danh sách cách thức nhận điểm */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {earningMethods.map((method, index) => (
                    <Card
                        key={index}
                        className={clsx(
                            'h-full transition-all duration-300 hover:shadow-lg',
                            isDarkMode 
                                ? 'bg-[#1f2937] border-[#374151] hover:border-blue-400' 
                                : 'bg-white border-gray-200 hover:border-blue-300'
                        )}
                        style={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb'
                        }}
                    >
                        <div className="text-center">
                            <div 
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{ backgroundColor: `${method.color}20`, color: method.color }}
                            >
                                {method.icon}
                            </div>
                            <h3 
                                className="text-lg font-semibold mb-2"
                                style={{ color: isDarkMode ? '#fff' : '#1f2937' }}
                            >
                                {method.title}
                            </h3>
                            <div 
                                className="text-2xl font-bold mb-3"
                                style={{ color: method.color }}
                            >
                                {method.points}
                            </div>
                            <p 
                                className="text-sm leading-relaxed"
                                style={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}
                            >
                                {method.description}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Thông tin bổ sung */}
            <Card
                className={clsx(
                    'text-center',
                    isDarkMode 
                        ? 'bg-[#1f2937] border-[#374151]' 
                        : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                )}
                style={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#fef3c7',
                    borderColor: isDarkMode ? '#374151' : '#fbbf24'
                }}
            >
                <div className="flex items-center justify-center gap-3 mb-3">
                    <GiftOutlined 
                        className="text-2xl" 
                        style={{ color: isDarkMode ? '#fbbf24' : '#d97706' }} 
                    />
                    <h3 
                        className="text-xl font-bold"
                        style={{ color: isDarkMode ? '#fff' : '#92400e' }}
                    >
                        Đổi điểm lấy voucher
                    </h3>
                </div>
                <p 
                    className="text-base mb-4"
                    style={{ color: isDarkMode ? '#d1d5db' : '#78350f' }}
                >
                    Sử dụng điểm CNJ để đổi lấy các voucher giảm giá hấp dẫn tại trang Voucher
                </p>
                <div 
                    className="text-sm"
                    style={{ color: isDarkMode ? '#9ca3af' : '#a16207' }}
                >
                    💡 Mẹo: Tích lũy điểm thường xuyên để không bỏ lỡ các ưu đãi đặc biệt!
                </div>
            </Card>
        </div>
    );
};

export default CNJPointsTab;
