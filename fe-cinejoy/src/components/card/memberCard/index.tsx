import dayjs from 'dayjs';
import NewsCard from '@/components/card/newCard';
import CardImage from 'assets/member.card.png'
import QRCode from 'assets/QRCodepng.png';

interface MemberCardProps {
    user: IUser;
}

const MemberCard: React.FC<MemberCardProps> = ({ user }) => {
    return (
        <div className="w-full flex flex-col items-center justify-center mt-8">
            <div className="max-w-md w-full">
                <div className="relative">
                    <NewsCard
                        image={CardImage}
                        title={user?.fullName || 'Thành viên CineJoy'}
                        description={
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">Email:</span>
                                    <span>{user?.email}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">Điểm tích lũy:</span>
                                    <span className="text-orange-500 font-bold">{user?.point}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">Ngày hết hạn:</span>
                                    <span>{dayjs(user?.createdAt).add(1, 'year').format('DD/MM/YYYY')}</span>
                                </div>
                            </div>
                        }
                        member
                    />
                    <div
                        className="absolute"
                        style={{
                        top: 17,
                        right: 16,
                        zIndex: 2,
                        }}
                    >
                        <span
                            className="px-4 py-1 rounded-full font-bold text-xs shadow-lg uppercase select-none"
                            style={{
                                background: 'linear-gradient(90deg, #FFD700 60%, #FFB300 100%)',
                                color: '#fff',
                                letterSpacing: 1,
                                boxShadow: '0 2px 8px 0 #ffd70055',
                                border: '2px solid #fff',
                                textShadow: '0 1px 4px #bfa10099',
                            }}
                        >
                            THẺ VIP
                        </span>
                    </div>
                    <img
                        src={QRCode}
                        alt="QR Code"
                        className="absolute right-5 bottom-5 w-14 h-14 rounded-lg shadow-lg border-1 border-white dark:border-gray-700 bg-white p-1"
                        style={{ zIndex: 2 }}
                    />
                </div>
                <div className="mt-6 text-center text-sm text-gray-400 italic">
                    * Thẻ thành viên CineJoy mang lại nhiều ưu đãi hấp dẫn cho bạn!
                </div>
            </div>
        </div>
    );
};

export default MemberCard;