import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Spin, Tag, Button, Descriptions, Table, Card, Popconfirm, Modal } from 'antd';
import { toast } from 'react-toastify';
import { getVoucherById, addPromotionLine, updatePromotionLine, deletePromotionLine, getAmountBudgetUsedApi, getItemBudgetUsedApi, getPercentBudgetUsedApi } from '@/apiservice/apiVoucher';
import useAppStore from '@/store/app.store';
import VoucherDetailForm from './Form/VoucherDetailForm';
import dayjs from 'dayjs';

type Props = { id?: string };

const VoucherDetail = ({ id: idProp }: Props) => {
  const { id: idFromParams } = useParams<{ id: string }>();
  const id = idProp || idFromParams;
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [voucher, setVoucher] = useState<IVoucher | null>(null);
  const [showDetailForm, setShowDetailForm] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<IPromotionLine | null>(null);
  const [editingLineIndex, setEditingLineIndex] = useState<number>(-1);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['movieManagement']));
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedLine, setSelectedLine] = useState<IPromotionLine | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(-1);

  // Tự động cập nhật trạng thái promotion lines dựa trên ngày hiện tại
  const updatePromotionLineStatuses = (voucherData: IVoucher): IVoucher => {
    if (!voucherData || !Array.isArray(voucherData.lines)) {
      return voucherData;
    }

    const today = dayjs();
    const updatedLines = voucherData.lines.map(line => {
      const startDate = dayjs(line.validityPeriod?.startDate);
      const endDate = dayjs(line.validityPeriod?.endDate);
      
      // Kiểm tra xem ngày hiện tại có nằm trong khoảng thời gian của line không
      const isWithinRange = today.isAfter(startDate.startOf('day')) && today.isBefore(endDate.endOf('day'));
      
      // Chỉ tự động cập nhật thành "không hoạt động" nếu ngày hiện tại nằm ngoài khoảng thời gian
      // Nếu ngày hiện tại nằm trong khoảng thời gian, giữ nguyên trạng thái hiện tại (cho phép người dùng sửa)
      let newStatus: 'hoạt động' | 'không hoạt động';
      
      if (!isWithinRange) {
        // Ngày hiện tại nằm ngoài khoảng thời gian → tự động đổi thành "không hoạt động"
        newStatus = 'không hoạt động';
      } else {
        // Ngày hiện tại nằm trong khoảng thời gian → giữ nguyên trạng thái hiện tại
        newStatus = line.status;
      }
      
      return {
        ...line,
        status: newStatus
      };
    });

    return {
      ...voucherData,
      lines: updatedLines
    };
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const data = await getVoucherById(id);
        const updatedData = updatePromotionLineStatuses(data);
        setVoucher(updatedData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Periodic update để tự động cập nhật trạng thái promotion lines
  useEffect(() => {
    const interval = setInterval(() => {
      if (voucher && Array.isArray(voucher.lines)) {
        const updatedData = updatePromotionLineStatuses(voucher);
        setVoucher(updatedData);
      }
    }, 60000); // Cập nhật mỗi phút

    return () => clearInterval(interval);
  }, [voucher]);

  // Cập nhật trạng thái khi window focus
  useEffect(() => {
    const handleFocus = () => {
      if (voucher && Array.isArray(voucher.lines)) {
        const updatedData = updatePromotionLineStatuses(voucher);
        setVoucher(updatedData);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [voucher]);

  const isEmbedded = Boolean(idProp);
  const { user } = useAppStore();

  const handleEditLine = (line: IPromotionLine, lineIndex: number) => {
    setEditingLine(line);
    setEditingLineIndex(lineIndex);
    setShowDetailForm(true);
  };

  const handleDeleteLine = async (lineIndex: number) => {
    try {
      if (!id) {
        throw new Error('Không tìm thấy ID voucher');
      }

      const updatedVoucher = await deletePromotionLine(id, lineIndex);
      // Cập nhật trạng thái promotion lines dựa trên ngày hiện tại
      const updatedData = updatePromotionLineStatuses(updatedVoucher);
      setVoucher(updatedData);
      
      toast.success('Xóa chi tiết khuyến mãi thành công!');
      
      // Refresh data để đảm bảo đồng bộ
      try {
        const fresh = await getVoucherById(id);
        const freshUpdatedData = updatePromotionLineStatuses(fresh);
        setVoucher(freshUpdatedData);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    } catch (error: unknown) {
      console.error('Error deleting promotion line:', error);
      const errorMessage = error instanceof Error ? error.message : 'Xóa chi tiết khuyến mãi thất bại';
      toast.error(errorMessage);
    }
  };

  const handleUpdateLine = async (values: {
    promotionType: 'item' | 'amount' | 'percent' | 'voucher';
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    status: 'hoạt động' | 'không hoạt động';
    rule?: {
      stackingPolicy: 'STACKABLE' | 'EXCLUSIVE' | 'EXCLUSIVE_WITH_GROUP';
      exclusionGroup?: string;
    };
    voucherDetail?: {
      description?: string;
      pointToRedeem?: number;
      quantity?: number;
      discountPercent?: number;
      maxDiscountValue?: number;
    };
    discountDetail?: {
      applyType?: 'combo' | 'ticket';
      comboName?: string;
      comboId?: string;
      comboDiscountPercent?: number;
      seatType?: 'normal' | 'vip' | 'couple' | '4dx';
      ticketDiscountPercent?: number;
      description?: string;
    };
    amountDetail?: {
      minOrderValue: number;
      discountValue: number;
      description?: string;
    };
    itemDetail?: {
      applyType?: 'combo' | 'ticket';
      buyItem: string;
      comboId?: string;
      buyQuantity: number;
      rewardItem: string;
      rewardItemId?: string;
      rewardQuantity: number;
      rewardType: 'free' | 'discount';
      rewardDiscountPercent?: number;
    };
  }) => {
    setSubmitting(true);
    try {
      if (!id) {
        throw new Error('Không tìm thấy ID voucher');
      }

      const lineData = {
        promotionType: values.promotionType,
        startDate: values.startDate.toDate(),
        endDate: values.endDate.toDate(),
        status: values.status,
        rule: values.rule,
        voucherDetail: values.voucherDetail,
        discountDetail: values.discountDetail,
        amountDetail: values.amountDetail,
        itemDetail: values.itemDetail,
        // Giữ lại code từ editingLine nếu có
        ...(editingLine?.code && { code: editingLine.code })
      };

      const updatedVoucher = await updatePromotionLine(id, editingLineIndex, lineData);
      // Cập nhật trạng thái promotion lines dựa trên ngày hiện tại
      const updatedData = updatePromotionLineStatuses(updatedVoucher);
      setVoucher(updatedData);
      
      // Refresh data để đảm bảo đồng bộ
      try {
        const fresh = await getVoucherById(id);
        const freshUpdatedData = updatePromotionLineStatuses(fresh);
        setVoucher(freshUpdatedData);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
      
      toast.success('Cập nhật chi tiết khuyến mãi thành công!');
      
      setShowDetailForm(false);
      setEditingLine(null);
      setEditingLineIndex(-1);
    } catch (error: unknown) {
      console.error('Error updating promotion line:', error);
      const errorMessage = error instanceof Error ? error.message : 'Cập nhật chi tiết khuyến mãi thất bại';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDetail = async (values: {
    promotionType: 'item' | 'amount' | 'percent' | 'voucher';
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    status: 'hoạt động' | 'không hoạt động';
    rule?: {
      stackingPolicy: 'STACKABLE' | 'EXCLUSIVE' | 'EXCLUSIVE_WITH_GROUP';
      exclusionGroup?: string;
    };
    voucherDetail?: {
      description?: string;
      pointToRedeem?: number;
      quantity?: number;
      discountPercent?: number;
      maxDiscountValue?: number;
    };
    discountDetail?: {
      applyType?: 'combo' | 'ticket';
      comboName?: string;
      comboId?: string;
      comboDiscountPercent?: number;
      seatType?: 'normal' | 'vip' | 'couple' | '4dx';
      ticketDiscountPercent?: number;
      description?: string;
    };
    amountDetail?: {
      minOrderValue: number;
      discountValue: number;
      description?: string;
    };
    itemDetail?: {
      applyType?: 'combo' | 'ticket';
      buyItem: string;
      comboId?: string;
      buyQuantity: number;
      rewardItem: string;
      rewardItemId?: string;
      rewardQuantity: number;
      rewardType: 'free' | 'discount';
      rewardDiscountPercent?: number;
    };
  }) => {
    setSubmitting(true);
    try {
      if (!id) {
        throw new Error('Không tìm thấy ID voucher');
      }

      // Chuẩn bị dữ liệu để gửi API
      const lineData = {
        promotionType: values.promotionType,
        startDate: values.startDate.toDate(),
        endDate: values.endDate.toDate(),
        status: values.status,
        rule: values.rule,
        // Gửi voucherDetail, discountDetail, amountDetail hoặc itemDetail tùy theo promotionType
        voucherDetail: values.voucherDetail,
        discountDetail: values.discountDetail,
        amountDetail: values.amountDetail,
        itemDetail: values.itemDetail
      };

      console.log('Adding promotion detail:', lineData);
      
      // Gọi API thêm chi tiết khuyến mãi
      const updatedVoucher = await addPromotionLine(id, lineData);
      // Cập nhật trạng thái promotion lines dựa trên ngày hiện tại
      const updatedData = updatePromotionLineStatuses(updatedVoucher);
      setVoucher(updatedData);
      // Gọi lại API để đảm bảo state đồng bộ hoàn toàn (tránh vấn đề virtual/lean)
      try {
        const fresh = await getVoucherById(id);
        const freshUpdatedData = updatePromotionLineStatuses(fresh);
        setVoucher(freshUpdatedData);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
      setShowDetailForm(false);
      toast.success('Thêm chi tiết khuyến mãi thành công!');
      // Log an toàn (tránh lỗi length undefined)
      try {
        const linesSafe = Array.isArray(updatedVoucher?.lines) ? updatedVoucher.lines : [];
        const newLineSafe = linesSafe[linesSafe.length - 1];
        console.log('Successfully added promotion line:', {
          voucherId: id,
          newLine: newLineSafe,
          totalLines: linesSafe.length
        });
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    } catch (error: unknown) {
      console.error('Error adding promotion detail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Thêm chi tiết khuyến mãi thất bại';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    const spinner = (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin />
      </div>
    );
    if (isEmbedded) return spinner;
    return (
      <div className="min-h-screen flex font-roboto bg-white">
        <div className="flex-1">
          <header className="bg-black text-white p-4 flex justify-between items-center shadow-md">
            <h1 className="text-xl font-semibold select-none">Admin Dashboard - CineJoy</h1>
            <Link
              to="/"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
            >
              Quay về trang chủ
            </Link>
          </header>
          <main className="p-6">{spinner}</main>
        </div>
      </div>
    );
  }

  if (!voucher) {
    const emptyState = (
      <div className="p-6">
        <div className="mb-4">
          <Button onClick={() => navigate('/admin', { state: { tab: 'vouchers' } })}>Quay lại</Button>
        </div>
        <div>Không tìm thấy khuyến mãi.</div>
      </div>
    );
    if (isEmbedded) return emptyState;
    return (
      <div className="min-h-screen flex font-roboto bg-white">
        <div className="flex-1">
          <header className="bg-black text-white p-4 flex justify-between items-center shadow-md">
            <h1 className="text-xl font-semibold select-none">Admin Dashboard - CineJoy</h1>
            <Link
              to="/"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
            >
              Quay về trang chủ
            </Link>
          </header>
          <main className="p-6">{emptyState}</main>
        </div>
      </div>
    );
  }
  // Hiển thị tất cả lines (không phân trang)
  const allLines: IPromotionLine[] = Array.isArray(voucher.lines) ? voucher.lines : [];

  const content = (
    <div className="p-6">
      {/* Header với buttons */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Chi tiết khuyến mãi</h1>
        <div className="flex gap-2">
          <Button type="primary" onClick={() => setShowDetailForm(true)}>
            Thêm chi tiết khuyến mãi
          </Button>
          <Button onClick={() => navigate('/admin', { state: { tab: 'vouchers' } })}>Quay lại</Button>
        </div>
      </div>

      {/* Thông tin cơ bản */}
      <div className="mb-8">
        <Card 
          title={<span style={{ fontWeight: 700 }}>Thông tin cơ bản</span>}
          className="bg-gray-50"
          style={{ backgroundColor: '#f7f8fa', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          headStyle={{ backgroundColor: '#f7f8fa', borderRadius: 12, borderBottom: '1px solid #e5e7eb' }}
          bodyStyle={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16 }}
        >
          <Descriptions bordered column={2} size="middle" labelStyle={{ fontWeight: 600 }}>
            <Descriptions.Item label={<span style={{ fontWeight: 'bold' }}>Mã khuyến mãi</span>}>
              <span style={{ fontWeight: 'bold' }}>{voucher.promotionalCode}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={voucher.status === 'hoạt động' ? 'green' : 'red'}>
                {voucher.status === 'hoạt động' ? 'Đang hoạt động' : 'Không hoạt động'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tên khuyến mãi">{voucher.name}</Descriptions.Item>
            <Descriptions.Item label="Mô tả">{voucher.description}</Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">
              {voucher.startDate ? new Date(voucher.startDate as string).toLocaleDateString('vi-VN') : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {voucher.endDate ? new Date(voucher.endDate as string).toLocaleDateString('vi-VN') : ''}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      {/* Bảng hiển thị Lines */}
      {allLines.length > 0 && (
        <div className="mb-8">
          <Card 
            title={<span style={{ fontWeight: 700 }}>Ưu đãi áp dụng</span>} 
            className="bg-gray-50" 
            style={{ backgroundColor: '#f7f8fa', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} 
            headStyle={{ backgroundColor: '#f7f8fa', borderRadius: 12, borderBottom: '1px solid #e5e7eb' }} 
            bodyStyle={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12 }}
          >
          <Table
            dataSource={allLines}
            rowKey={(_, index) => index?.toString() || '0'}
            pagination={false}
            size="middle"
            bordered
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Kiểu khuyến mãi',
                dataIndex: 'promotionType',
                key: 'promotionType',
                width: 180,
                render: (type: string) => {
                  const typeMap: { [key: string]: string } = {
                    'item': 'Khuyến mãi hàng',
                    'amount': 'Khuyến mãi tiền', 
                    'percent': 'Khuyến mãi chiết khấu',
                    'voucher': 'Voucher'
                  };
                  return <Tag color="blue">{typeMap[type] || type}</Tag>;
                }
              },
              {
                title: 'Ngày bắt đầu',
                dataIndex: ['validityPeriod', 'startDate'],
                key: 'startDate',
                width: 120,
                render: (date: string | Date) => new Date(date).toLocaleDateString('vi-VN')
              },
              {
                title: 'Ngày kết thúc',
                dataIndex: ['validityPeriod', 'endDate'], 
                key: 'endDate',
                width: 120,
                render: (date: string | Date) => new Date(date).toLocaleDateString('vi-VN')
              },
              {
                title: 'Mô tả',
                key: 'description',
                width: 200,
                render: (_, record: IPromotionLine) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const detail = record.detail as any;
                  if (!detail) return 'Không có mô tả';
                  
                  // Lấy mô tả từ detail tùy theo loại khuyến mãi
                  if (detail.description) {
                    return detail.description;
                  }
                  
                  // Fallback: tạo mô tả ngắn gọn dựa trên loại khuyến mãi
                  switch (record.promotionType) {
                    case 'voucher':
                      return `Voucher giảm ${detail.discountPercent || 0}%`;
                    case 'amount':
                      return `Giảm ${detail.discountValue?.toLocaleString('vi-VN') || 0} VNĐ`;
                    case 'percent':
                      return `Giảm ${detail.comboDiscountPercent || detail.ticketDiscountPercent || 0}%`;
                    case 'item':
                      return `Mua ${detail.buyQuantity || 0} tặng ${detail.rewardQuantity || 0}`;
                    default:
                      return 'Không có mô tả';
                  }
                }
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                width: 140,
                render: (status: string) => (
                  <Tag color={status === 'hoạt động' ? 'green' : 'red'}>
                    {status === 'hoạt động' ? 'Hoạt động' : 'Không hoạt động'}
                  </Tag>
                )
              },

              {
                title: 'Thao tác',
                key: 'action',
                width: 240,
                fixed: 'right',
                render: (_, record: IPromotionLine, index: number) => (
                  <div className="flex gap-2">
                    <Button 
                      size="small"
                      onClick={() => {
                        setSelectedLine(record);
                        setSelectedLineIndex(index);
                        setShowDetailModal(true);
                      }}
                    >
                      Xem chi tiết
                    </Button>
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleEditLine(record, index)}
                    >
                      Sửa
                    </Button>
                    {record.status !== 'hoạt động' && (
                      <Popconfirm
                        title="Xóa chi tiết khuyến mãi"
                        description="Bạn có chắc chắn muốn xóa chi tiết khuyến mãi này?"
                        onConfirm={() => handleDeleteLine(index)}
                        okText="Có"
                        cancelText="Không"
                      >
                        <Button 
                          type="primary" 
                          danger
                          size="small"
                        >
                          Xóa
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                )
              }
            ]}
          />
          </Card>
        </div>
      )}

      {/* Modal hiển thị chi tiết */}
      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="text-xl font-semibold">Thông tin chi tiết</div>
            <Button 
              onClick={() => {
                setShowDetailModal(false);
                setSelectedLine(null);
                setSelectedLineIndex(-1);
              }}
            >
              Đóng
            </Button>
          </div>
        }
        open={showDetailModal}
        onCancel={() => {
          setShowDetailModal(false);
          setSelectedLine(null);
          setSelectedLineIndex(-1);
        }}
        footer={null}
        width={900}
        centered
        destroyOnClose
        closable={false}
        bodyStyle={{
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {selectedLine && (
          <div>
            {/* Header với thông tin line */}
            <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Kiểu khuyến mãi</span>
                  <div className="mt-1">
                    <Tag color="blue">
                      {
                        selectedLine.promotionType === 'voucher' ? 'Voucher' : 
                        selectedLine.promotionType === 'percent' ? 'Khuyến mãi chiết khấu' :
                        selectedLine.promotionType === 'amount' ? 'Khuyến mãi tiền' :
                        selectedLine.promotionType === 'item' ? 'Khuyến mãi hàng' :
                        selectedLine.promotionType
                      }
                    </Tag>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày bắt đầu</span>
                  <div className="mt-1 text-gray-800">{dayjs(selectedLine.validityPeriod.startDate).format('DD/MM/YYYY')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày kết thúc</span>
                  <div className="mt-1 text-gray-800">{dayjs(selectedLine.validityPeriod.endDate).format('DD/MM/YYYY')}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Mô tả</span>
                  <div className="mt-1 text-gray-800">{(selectedLine.detail as VoucherDetail | DiscountDetail | AmountDetail | ItemDetail)?.description || 'Không có mô tả'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Trạng thái: </span>
              
                    <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                      selectedLine.status === 'hoạt động' ? 'bg-green-100 text-green-700' :
                      selectedLine.status === 'không hoạt động' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedLine.status === 'hoạt động' ? 'Hoạt động' : selectedLine.status === 'không hoạt động' ? 'Không hoạt động' : 'Đang chờ'}
                    </span>
    
                </div>
              </div>
            </div>

            {/* Chi tiết ưu đãi áp dụng */}
            <div className="bg-white">
            {selectedLine.promotionType === 'voucher' && selectedLine.detail && (
              <Table
                dataSource={[selectedLine.detail as unknown as { quantity?: number; totalQuantity?: number; pointToRedeem?: number; discountPercent?: number; maxDiscountValue?: number; description?: string }]}
                rowKey={() => 'detail'}
                pagination={false}
                size="middle"
                bordered
                columns={[
                    {
                      title: 'Điểm đổi',
                      dataIndex: 'pointToRedeem',
                      key: 'pointToRedeem',
                      render: (value: number) => value ? `${value} điểm` : 'Không có'
                    },
                    {
                      title: 'Tổng số lượng',
                      dataIndex: 'totalQuantity',
                      key: 'totalQuantity',
                      render: (value: number, record: { quantity?: number }) => {
                        const fallback = typeof record?.quantity === 'number' ? record.quantity : undefined;
                        const finalVal = (typeof value === 'number' ? value : fallback);
                        return typeof finalVal === 'number' ? `${finalVal} cái` : 'Không có';
                      }
                    },
                    {
                      title: 'Số lượng còn lại',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      render: (value: number) => value ? `${value} cái` : 'Không có'
                    },
                    {
                      title: 'Phần trăm giảm',
                      dataIndex: 'discountPercent',
                      key: 'discountPercent',
                      render: (value: number) => value ? `${value}%` : 'Không có'
                    },
                    {
                      title: 'Giảm tối đa',
                      dataIndex: 'maxDiscountValue',
                      key: 'maxDiscountValue',
                      render: (value: number) => value ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                    }
                  ]}
                />
              )}
            {selectedLine.promotionType === 'percent' && selectedLine.detail && (
              <Table
                dataSource={[selectedLine.detail]}
                  rowKey={() => 'detail'}
                  pagination={false}
                  size="middle"
                  bordered
                columns={(() => {
                  const detail = selectedLine.detail as unknown as {
                    applyType?: string;
                    rewardType?: string;
                  };
                  const applyType = detail?.applyType;
                    
                    if (applyType === 'combo') {
                      return [
                        {
                          title: 'Loại áp dụng',
                          dataIndex: 'applyType',
                          key: 'applyType',
                          render: (text: string) => text === 'combo' ? 'Combo' : 'Không có'
                        },
                        {
                          title: 'Tên combo',
                          dataIndex: 'comboName',
                          key: 'comboName',
                          render: (text: string) => text || 'Không có'
                        },
                        {
                          title: 'Phần trăm giảm combo',
                          dataIndex: 'comboDiscountPercent',
                          key: 'comboDiscountPercent',
                          render: (value: number) => value ? `${value}%` : 'Không có'
                        },
                        {
                          title: 'Ngân sách tổng',
                          dataIndex: 'totalBudget',
                          key: 'totalBudget',
                          render: (value: number) => typeof value === 'number' ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                        },
                        {
                          title: 'Ngân sách đã dùng',
                          key: 'usedBudget',
                          render: () => (
                            <AsyncPercentBudget voucherId={id as string} lineIndex={selectedLineIndex} />
                          )
                        },
                      ];
                    } else if (applyType === 'ticket') {
                      return [
                        {
                          title: 'Loại áp dụng',
                          dataIndex: 'applyType',
                          key: 'applyType',
                          render: (text: string) => text === 'ticket' ? 'Vé' : 'Không có'
                        },
                        {
                          title: 'Loại vé',
                          dataIndex: 'seatType',
                          key: 'seatType',
                          render: (text: string) => {
                            const seatTypeMap: Record<string, string> = {
                              'normal': 'Vé thường',
                              'vip': 'Vé VIP',
                              'couple': 'Vé Couple',
                              '4dx': 'Vé 4DX'
                            };
                            return seatTypeMap[text] || 'Không có';
                          }
                        },
                        {
                          title: 'Phần trăm giảm vé',
                          dataIndex: 'ticketDiscountPercent',
                          key: 'ticketDiscountPercent',
                          render: (value: number) => value ? `${value}%` : 'Không có'
                        },
                        {
                          title: 'Ngân sách tổng',
                          dataIndex: 'totalBudget',
                          key: 'totalBudget',
                          render: (value: number) => typeof value === 'number' ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                        },
                        {
                          title: 'Ngân sách đã dùng',
                          key: 'usedBudget',
                          render: () => (
                            <AsyncPercentBudget voucherId={id as string} lineIndex={selectedLineIndex} />
                          )
                        },
                      ];
                    }
                    
                    // Fallback nếu không xác định được applyType
                    return [
                      {
                        title: 'Loại áp dụng',
                        dataIndex: 'applyType',
                        key: 'applyType',
                        render: (text: string) => text === 'combo' ? 'Combo' : text === 'ticket' ? 'Vé' : 'Không có'
                      }
                    ];
                  })()}
                />
              )}
            {selectedLine.promotionType === 'amount' && selectedLine.detail && (
              <Table
                dataSource={[selectedLine.detail]}
                  rowKey={() => 'detail'}
                  pagination={false}
                  size="middle"
                  bordered
                  columns={[
                    {
                      title: 'Giá trị đơn hàng tối thiểu',
                      dataIndex: 'minOrderValue',
                      key: 'minOrderValue',
                      render: (value: number) => value ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                    },
                    {
                      title: 'Giá trị giảm',
                      dataIndex: 'discountValue',
                      key: 'discountValue',
                      render: (value: number) => value ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                    },
                    {
                      title: 'Ngân sách tổng',
                      dataIndex: 'totalBudget',
                      key: 'totalBudget',
                      render: (value: number) => typeof value === 'number' ? `${value.toLocaleString('vi-VN')} VNĐ` : 'Không có'
                    },
                    {
                      title: 'Ngân sách đã dùng',
                      key: 'usedBudget',
                      render: () => (
                        <AsyncUsedBudget voucherId={id as string} lineIndex={selectedLineIndex} />
                      )
                    },
                  ]}
                />
              )}
            {selectedLine.promotionType === 'item' && selectedLine.detail && (
              <Table
                dataSource={[selectedLine.detail]}
                rowKey={() => 'detail'}
                pagination={false}
                size="middle"
                bordered
                columns={(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const detail = selectedLine.detail as any;
                  const applyType = detail?.applyType;
                    
                    if (applyType === 'combo') {
                      const columns = [
                        {
                          title: 'Loại áp dụng',
                          dataIndex: 'applyType',
                          key: 'applyType',
                          render: (text: string) => text === 'combo' ? 'Combo' : 'Không có'
                        },
                        {
                          title: 'Mua combo',
                          dataIndex: 'buyItem',
                          key: 'buyItem',
                          render: (text: string) => text || 'Không có'
                        },
                        {
                          title: 'Số lượng mua',
                          dataIndex: 'buyQuantity',
                          key: 'buyQuantity',
                          render: (value: number) => value || 'Không có'
                        },
                        {
                          title: 'Sản phẩm tặng',
                          dataIndex: 'rewardItem',
                          key: 'rewardItem',
                          render: (text: string) => text || 'Không có'
                        },
                        {
                          title: 'Số lượng tặng',
                          dataIndex: 'rewardQuantity',
                          key: 'rewardQuantity',
                          render: (value: number) => value || 'Không có'
                        },
                        {
                          title: 'Loại tặng',
                          dataIndex: 'rewardType',
                          key: 'rewardType',
                          render: (text: string) => text === 'free' ? 'Miễn phí' : text === 'discount' ? 'Giảm giá' : 'Không có'
                        },
                        {
                          title: 'Ngân sách tổng',
                          dataIndex: 'totalBudget',
                          key: 'totalBudget',
                          render: (value: number) => typeof value === 'number' ? value : 'Không có'
                        },
                        {
                          title: 'Ngân sách đã dùng',
                          key: 'usedBudget',
                          render: () => (
                            <AsyncItemBudget voucherId={id as string} lineIndex={selectedLineIndex} />
                          )
                        }
                      ];

                      // Chỉ thêm cột "Phần trăm giảm" khi loại tặng là "Giảm giá"
                      if (detail?.rewardType === 'discount') {
                        columns.push({
                          title: 'Phần trăm giảm',
                          dataIndex: 'rewardDiscountPercent',
                          key: 'rewardDiscountPercent',
                          render: (text: string) => {
                            const num = Number(text);
                            return Number.isFinite(num) && num > 0 ? `${num}%` : 'Không có';
                          }
                        });
                      }


                      return columns;
                    } else if (applyType === 'ticket') {
                      const columns = [
                        {
                          title: 'Loại áp dụng',
                          dataIndex: 'applyType',
                          key: 'applyType',
                          render: (text: string) => text === 'ticket' ? 'Vé' : 'Không có'
                        },
                        {
                          title: 'Loại vé',
                          dataIndex: 'buyItem',
                          key: 'buyItem',
                          render: (text: string) => {
                            const seatTypeMap: Record<string, string> = {
                              'normal': 'Vé thường',
                              'vip': 'Vé VIP',
                              'couple': 'Vé Couple',
                              '4dx': 'Vé 4DX'
                            };
                            return seatTypeMap[text] || 'Không có';
                          }
                        },
                        {
                          title: 'Số lượng mua',
                          dataIndex: 'buyQuantity',
                          key: 'buyQuantity',
                          render: (value: number) => value || 'Không có'
                        },
                        {
                          title: 'Sản phẩm tặng',
                          dataIndex: 'rewardItem',
                          key: 'rewardItem',
                          render: (text: string) => text || 'Không có'
                        },
                        {
                          title: 'Số lượng tặng',
                          dataIndex: 'rewardQuantity',
                          key: 'rewardQuantity',
                          render: (value: number) => value || 'Không có'
                        },
                        {
                          title: 'Ngân sách tổng',
                          dataIndex: 'totalBudget',
                          key: 'totalBudget',
                          render: (value: number) => typeof value === 'number' ? value : 'Không có'
                        },
                        {
                          title: 'Ngân sách đã dùng',
                          key: 'usedBudget',
                          render: () => (
                            <AsyncItemBudget voucherId={id as string} lineIndex={selectedLineIndex} />
                          )
                        },
                        {
                          title: 'Loại tặng',
                          dataIndex: 'rewardType',
                          key: 'rewardType',
                          render: (text: string) => text === 'free' ? 'Miễn phí' : text === 'discount' ? 'Giảm giá' : 'Không có'
                        }
                      ];

                      // Chỉ thêm cột "Phần trăm giảm" khi loại tặng là "Giảm giá"
                      if (detail?.rewardType === 'discount') {
                      columns.push({
                          title: 'Phần trăm giảm',
                          dataIndex: 'rewardDiscountPercent',
                          key: 'rewardDiscountPercent',
                        render: (text: string) => {
                          const num = Number(text);
                          return Number.isFinite(num) && num > 0 ? `${num}%` : 'Không có';
                        }
                        });
                      }


                      return columns;
                    }
                    
                    // Fallback nếu không xác định được applyType
                    return [
                      {
                        title: 'Loại áp dụng',
                        dataIndex: 'applyType',
                        key: 'applyType',
                        render: (text: string) => text === 'combo' ? 'Combo' : text === 'ticket' ? 'Vé' : 'Không có'
                      }
                    ];
                  })()}
                />
              )}
            {selectedLine.promotionType !== 'voucher' && selectedLine.promotionType !== 'percent' && selectedLine.promotionType !== 'amount' && selectedLine.promotionType !== 'item' && (
              <div className="text-gray-500 italic">
                Chi tiết cho loại {selectedLine.promotionType} sẽ được hiển thị khi có dữ liệu
              </div>
            )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <div className="min-h-screen flex font-roboto bg-white">
      <aside className="w-64 bg-black shadow-lg fixed h-full z-10">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar}
              alt={user?.fullName}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-white mb-0.5 select-none">
                {user?.fullName || 'Admin'}
              </p>
              <p className="text-xs text-gray-400 select-none">Quản trị viên</p>
            </div>
          </div>
        </div>
        <nav className="mt-4">
          <ul>
            {/* Quản lý Phim */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('movieManagement')) {
                    newExpandedMenus.delete('movieManagement');
                  } else {
                    newExpandedMenus.add('movieManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <span>Quản lý Phim</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('movieManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('movieManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                {[
                  { label: "Phim", value: "movies", icon: "🎬" },
                  { label: "Ca chiếu", value: "showSessions", icon: "🎭" },
                  { label: "Suất chiếu", value: "showtimes", icon: "⏰" },
                  { label: "Bảng giá", value: "priceLists", icon: "💰" },
                ].map((subItem) => (
                  <li
                    key={subItem.value}
                    className="px-4 py-2 cursor-pointer flex items-center gap-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    onClick={() => navigate('/admin', { state: { tab: subItem.value } })}
                  >
                    <span className="text-sm">{subItem.icon}</span>
                    {subItem.label}
                  </li>
                ))}
                </ul>
              )}
            </li>

            {/* Quản lý Rạp */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('theaterManagement')) {
                    newExpandedMenus.delete('theaterManagement');
                  } else {
                    newExpandedMenus.add('theaterManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏢</span>
                  <span>Quản lý Rạp</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('theaterManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('theaterManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                {[
                  { label: "Khu vực", value: "regions", icon: "🌏" },
                  { label: "Rạp & Phòng chiếu", value: "theaters", icon: "🏢" },
                ].map((subItem) => (
                  <li
                    key={subItem.value}
                    className="px-4 py-2 cursor-pointer flex items-center gap-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    onClick={() => navigate('/admin', { state: { tab: subItem.value } })}
                  >
                    <span className="text-sm">{subItem.icon}</span>
                    {subItem.label}
                  </li>
                ))}
                </ul>
              )}
            </li>

            {/* Quản lý Bán hàng */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('salesManagement')) {
                    newExpandedMenus.delete('salesManagement');
                  } else {
                    newExpandedMenus.add('salesManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛒</span>
                  <span>Quản lý Bán hàng</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('salesManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('salesManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                {[
                  { label: "Sản phẩm & Combo", value: "foodCombos", icon: "🍿" },
                  { label: "Khuyến mãi", value: "vouchers", icon: "🎫" },
                  { label: "Thống Kê", value: "statistics", icon: "📊" },
                  { label: "Đơn vé", value: "orders", icon: "🧾" },
                ].map((subItem) => (
                  <li
                    key={subItem.value}
                    className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors duration-200 ${
                      subItem.value === 'vouchers'
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                    onClick={() => navigate('/admin', { state: { tab: subItem.value } })}
                  >
                    <span className="text-sm">{subItem.icon}</span>
                    {subItem.label}
                  </li>
                ))}
                </ul>
              )}
            </li>

            {/* Hệ thống & Người dùng */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('systemManagement')) {
                    newExpandedMenus.delete('systemManagement');
                  } else {
                    newExpandedMenus.add('systemManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚙️</span>
                  <span>Hệ thống & Người dùng</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('systemManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('systemManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                {[
                  { label: "Người dùng", value: "users", icon: "👥" },
                  { label: "Blog", value: "blogs", icon: "📰" },
                ].map((subItem) => (
                  <li
                    key={subItem.value}
                    className="px-4 py-2 cursor-pointer flex items-center gap-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    onClick={() => navigate('/admin', { state: { tab: subItem.value } })}
                  >
                    <span className="text-sm">{subItem.icon}</span>
                    {subItem.label}
                  </li>
                ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-black text-white p-4 flex justify-between items-center shadow-md fixed top-0 right-0 left-64 z-20">
          <h1 className="text-xl font-semibold select-none">Admin Dashboard - CineJoy</h1>
          <Link
            to="/"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
          >
            Quay về trang chủ
          </Link>
        </header>
        <main className="p-6 pt-20">{content}</main>
      </div>
      
      <VoucherDetailForm
        visible={showDetailForm}
        onCancel={() => {
          setShowDetailForm(false);
          setEditingLine(null);
          setEditingLineIndex(-1);
        }}
        onSubmit={editingLine ? handleUpdateLine : handleAddDetail}
        loading={submitting}
        editingLine={editingLine}
        voucherStatus={voucher?.status}
        voucherStartDate={voucher?.startDate}
        voucherEndDate={voucher?.endDate}
      />
    </div>
  );
};

export default VoucherDetail;

// Component nhỏ để fetch và hiển thị ngân sách đã dùng cho amount line
import React from 'react';
const AsyncUsedBudget: React.FC<{ voucherId: string; lineIndex: number }> = ({ voucherId, lineIndex }) => {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const used = await getAmountBudgetUsedApi(voucherId, lineIndex);
        if (mounted) setValue(used);
      } catch {
        if (mounted) setValue(0);
      }
    })();
    return () => { mounted = false; };
  }, [voucherId, lineIndex]);

  if (value === null) return <span>...</span>;
  return <span>{value.toLocaleString('vi-VN')} VNĐ</span>;
};

const AsyncItemBudget: React.FC<{ voucherId: string; lineIndex: number }> = ({ voucherId, lineIndex }) => {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const used = await getItemBudgetUsedApi(voucherId, lineIndex);
        if (mounted) setValue(used);
      } catch {
        if (mounted) setValue(0);
      }
    })();
    return () => { mounted = false; };
  }, [voucherId, lineIndex]);

  if (value === null) return <span>...</span>;
  return <span>{value.toLocaleString('vi-VN')}</span>;
};

const AsyncPercentBudget: React.FC<{ voucherId: string; lineIndex: number }> = ({ voucherId, lineIndex }) => {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const used = await getPercentBudgetUsedApi(voucherId, lineIndex);
        if (mounted) setValue(used);
      } catch {
        if (mounted) setValue(0);
      }
    })();
    return () => { mounted = false; };
  }, [voucherId, lineIndex]);

  if (value === null) return <span>...</span>;
  return <span>{value.toLocaleString('vi-VN')} VNĐ</span>;
};


