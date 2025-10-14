import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Button, Input, InputNumber, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import { getUniqueSeatTypesApi } from '@/apiservice/apiSeat';

// CSS override với độ ưu tiên cao để đảm bảo spacing và scroll
const spacingStyles = `
  .voucher-detail-form .ant-form-item {
    margin-bottom: 32px !important;
  }
  .voucher-detail-form .ant-form-item:last-child {
    margin-bottom: 0 !important;
  }
  .voucher-detail-form .ant-form-vertical .ant-form-item {
    margin-bottom: 32px !important;
  }
  .voucher-detail-form .ant-form-vertical .ant-form-item:last-child {
    margin-bottom: 0 !important;
  }
  .voucher-detail-form .ant-modal-body {
    height: 500px !important;
    overflow-y: auto !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  .voucher-detail-form .ant-modal-body::-webkit-scrollbar {
    display: none !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'voucher-detail-form-spacing';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = spacingStyles;
    document.head.appendChild(style);
  }
}


const { Option } = Select;

interface PromotionDetailFormData {
  promotionType: 'item' | 'amount' | 'percent' | 'voucher';
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  status: 'hoạt động' | 'không hoạt động';
  rule?: {
    stackingPolicy: 'STACKABLE' | 'EXCLUSIVE' | 'EXCLUSIVE_WITH_GROUP';
    exclusionGroup?: string;
  };
  // Chi tiết cho voucher
  voucherDetail?: {
    description?: string;
    pointToRedeem?: number;
    quantity?: number;
    discountPercent?: number;
    maxDiscountValue?: number;
  };
  // Chi tiết cho percent (combo/ticket)
  discountDetail?: {
    applyType?: 'combo' | 'ticket';
    comboName?: string;
    comboId?: string;
    comboDiscountPercent?: number;
    seatType?: 'normal' | 'vip' | 'couple' | '4dx';
    ticketDiscountPercent?: number;
    description?: string;
  };
  // Chi tiết cho amount (khuyến mãi tiền)
  amountDetail?: {
    minOrderValue: number;
    discountValue: number;
    description?: string;
  };
  // Chi tiết cho item (khuyến mãi hàng)
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
    description?: string;
  };
}

interface VoucherDetailFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: PromotionDetailFormData) => void;
  loading?: boolean;
  editingLine?: IPromotionLine | null;
  voucherStatus?: 'hoạt động' | 'không hoạt động'; // Trạng thái của voucher header
  voucherStartDate?: string | Date; // Ngày bắt đầu của voucher header
  voucherEndDate?: string | Date; // Ngày kết thúc của voucher header
}

const VoucherDetailForm: React.FC<VoucherDetailFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  editingLine = null,
  voucherStatus = 'hoạt động',
  voucherStartDate,
  voucherEndDate,
}) => {
  const [form] = Form.useForm();
  const [stackingPolicy, setStackingPolicy] = useState<string | undefined>(undefined);
  const [promotionType, setPromotionType] = useState<string | undefined>(undefined);
  const [foodCombos, setFoodCombos] = useState<IFoodCombo[]>([]);
  const [seatTypes, setSeatTypes] = useState<string[]>([]);
  
  // Danh sách nhóm loại trừ có sẵn - tách riêng theo loại khuyến mãi
  const getExclusionGroups = (promotionType: string) => {
    if (promotionType === 'item') {
      // Nhóm promo cho khuyến mãi hàng
      return [
        'ticket_normal_promo',
        'ticket_vip_promo',
        'ticket_couple_promo',
        'ticket_4dx_promo',
        // Thêm các nhóm từ combo names (promo)
        ...foodCombos
          .filter(combo => combo.type === 'combo')
          .map(combo => `${combo.name} promo`)
      ];
    } else if (promotionType === 'percent') {
      // Nhóm discount cho khuyến mãi chiết khấu
      return [
        'ticket_normal_discount',
        'ticket_vip_discount',
        'ticket_couple_discount',
        'ticket_4dx_discount',
        // Thêm các nhóm từ combo names (discount)
        ...foodCombos
          .filter(combo => combo.type === 'combo')
          .map(combo => `${combo.name} discount`)
      ];
    }
    return [];
  };

  // Bơm CSS ẩn scrollbar một lần nếu chưa có
  useEffect(() => {
    const styleId = 'global-hide-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Load food combos
  useEffect(() => {
    const loadFoodCombos = async () => {
      try {
        const { getFoodCombos } = await import('@/apiservice/apiFoodCombo');
        const data = await getFoodCombos();
        setFoodCombos(data);
      } catch (error) {
        console.error('Error loading food combos:', error);
        setFoodCombos([]);
      }
    };
    loadFoodCombos();
  }, []);

  // Load danh sách loại ghế từ database
  useEffect(() => {
    const loadSeatTypes = async () => {
      try {
        const data = await getUniqueSeatTypesApi();
        setSeatTypes(data);
      } catch (error) {
        console.error('Error loading seat types:', error);
        // Fallback to hardcoded values if API fails
        setSeatTypes(['normal', 'vip', 'couple', '4dx']);
      }
    };
    loadSeatTypes();
  }, []);

  // Populate form khi editing

  useEffect(() => {
    if (editingLine) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = editingLine.detail as any;
      form.setFieldsValue({
        promotionType: editingLine.promotionType,
        startDate: dayjs(editingLine.validityPeriod.startDate),
        endDate: dayjs(editingLine.validityPeriod.endDate),
        status: editingLine.status,
        stackingPolicy: editingLine.rule?.stackingPolicy || 'STACKABLE',
        exclusionGroup: editingLine.rule?.exclusionGroup,
        // Voucher detail fields
        voucherDescription: detail?.description,
        pointToRedeem: detail?.pointToRedeem,
        quantity: detail?.quantity,
        discountPercent: detail?.discountPercent,
        maxDiscountValue: detail?.maxDiscountValue,
        // Discount detail fields
        applyType: detail?.applyType,
        comboName: detail?.comboName,
        comboId: detail?.comboId,
        comboDiscountPercent: detail?.comboDiscountPercent,
        seatType: detail?.seatType,
        ticketDiscountPercent: detail?.ticketDiscountPercent,
        // Amount/Percent shared fields
        minOrderValue: detail?.minOrderValue,
        discountValue: detail?.discountValue,
        totalBudget: detail?.totalBudget,
        // Description field (shared for both percent and amount)
        description: detail?.description,
        // Item detail fields (không duplicate với discount fields)
        buyItem: detail?.buyItem,
        buyQuantity: detail?.buyQuantity,
        rewardItem: detail?.rewardItem,
        rewardItemId: detail?.rewardItemId,
        rewardQuantity: detail?.rewardQuantity,
        rewardType: detail?.rewardType,
        rewardDiscountPercent: detail?.rewardDiscountPercent,
      });
      setStackingPolicy(editingLine.rule?.stackingPolicy || 'STACKABLE');
      setPromotionType(editingLine.promotionType);
    } else if (visible) {
      // Reset form khi mở form mới (không có editingLine)
      form.resetFields();
      setStackingPolicy(undefined);
      setPromotionType(undefined);
      
      // Set trạng thái mặc định dựa trên trạng thái voucher header
      if (voucherStatus === 'không hoạt động') {
        form.setFieldValue('status', 'không hoạt động');
      }
    }
  }, [editingLine, form, visible, voucherStatus, voucherStartDate, voucherEndDate]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Xử lý rule object - luôn gửi stackingPolicy
      const rule = {
        stackingPolicy: values.stackingPolicy as 'STACKABLE' | 'EXCLUSIVE' | 'EXCLUSIVE_WITH_GROUP',
        ...(values.stackingPolicy === 'EXCLUSIVE_WITH_GROUP' && {
          exclusionGroup: Array.isArray(values.exclusionGroup)
            ? (values.exclusionGroup[0] as string)
            : (values.exclusionGroup as string | undefined)
        })
      } as {
        stackingPolicy: 'STACKABLE' | 'EXCLUSIVE' | 'EXCLUSIVE_WITH_GROUP';
        exclusionGroup?: string;
      };
      
      const submitData = {
        ...values,
        rule, // luôn gửi rule để BE lưu
        // Xử lý voucherDetail nếu là kiểu voucher
        ...(values.promotionType === 'voucher' && {
          voucherDetail: {
            description: values.voucherDescription,
            pointToRedeem: values.pointToRedeem,
            quantity: values.quantity,
            discountPercent: values.discountPercent,
            maxDiscountValue: values.maxDiscountValue,
          }
        }),
        // Xử lý discountDetail nếu là kiểu percent
        ...(values.promotionType === 'percent' && {
          discountDetail: {
            applyType: values.applyType,
            comboName: values.comboName,
            comboId: values.comboId,
            comboDiscountPercent: values.comboDiscountPercent,
            seatType: values.seatType,
            ticketDiscountPercent: values.ticketDiscountPercent,
            totalBudget: values.totalBudget,
            description: values.description,
          }
        }),
        // Xử lý amountDetail nếu là kiểu amount
        ...(values.promotionType === 'amount' && {
          amountDetail: {
            minOrderValue: values.minOrderValue,
            discountValue: values.discountValue,
            totalBudget: values.totalBudget,
            description: values.description,
          }
        }),
        // Xử lý itemDetail nếu là kiểu item
            ...(values.promotionType === 'item' && {
              itemDetail: {
                applyType: values.applyType,
                buyItem: values.buyItem,
                comboId: values.comboId,
                buyQuantity: values.buyQuantity,
                rewardItem: values.rewardItem,
                rewardItemId: values.rewardItemId,
                rewardQuantity: values.rewardQuantity,
                rewardType: values.rewardType,
                rewardDiscountPercent: values.rewardDiscountPercent,
            totalBudget: values.totalBudget,
                description: values.description,
              }
            })
      };

      
      
      onSubmit(submitData);
      form.resetFields();
      setStackingPolicy('STACKABLE');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setStackingPolicy('STACKABLE');
    setPromotionType('voucher');
    onCancel();
  };

  return (
    <Modal
      title={<div className="text-center text-xl md:text-xl font-semibold">{editingLine ? "Sửa chi tiết khuyến mãi" : "Thêm chi tiết khuyến mãi"}</div>}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          {editingLine ? 'Cập nhật' : 'Thêm'}
        </Button>,
      ]}
      width={630}
      height={600}
      centered
      destroyOnClose
      style={{ 
        marginTop: '2vh',
        marginBottom: '2vh'
      }}
      bodyStyle={{
        height: '500px',
        overflowY: 'auto',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE và Edge
        padding: '20px'
      }}
      className="hide-scrollbar voucher-detail-form"
    >
      <ConfigProvider
        theme={{
          components: {
            Form: {
              itemMarginBottom: 32, // <-- chỉnh 32 cho thoáng hơn
            },
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{}}
        >
        <Form.Item
          name="promotionType"
          label="Kiểu khuyến mãi"
          rules={[{ required: true, message: 'Vui lòng chọn kiểu khuyến mãi!' }]}
        >
          <Select 
            placeholder="Chọn kiểu khuyến mãi"
            onChange={(value) => {
              setPromotionType(value);
              // Nếu chọn voucher thì tự động set quy tắc áp dụng là "Độc quyền" và khóa trường
              if (value === 'voucher') {
                form.setFieldValue('stackingPolicy', 'EXCLUSIVE');
                setStackingPolicy('EXCLUSIVE');
              } else if (value === 'amount') {
                // Nếu chọn khuyến mãi tiền thì tự động set "Loại trừ theo nhóm" và "order-discount"
                form.setFieldValue('stackingPolicy', 'EXCLUSIVE_WITH_GROUP');
                form.setFieldValue('exclusionGroup', 'order-discount');
                setStackingPolicy('EXCLUSIVE_WITH_GROUP');
              } else if (value === 'item') {
                // Nếu chọn khuyến mãi hàng thì reset để người dùng chọn (chỉ có 2 quy tắc)
                setStackingPolicy(undefined);
                form.setFieldValue('stackingPolicy', undefined);
                form.setFieldValue('exclusionGroup', undefined);
              } else {
                // Nếu chọn kiểu khác thì reset về undefined để người dùng có thể chọn
                setStackingPolicy(undefined);
                form.setFieldValue('stackingPolicy', undefined);
                form.setFieldValue('exclusionGroup', undefined);
              }
            }}
          >
            <Option value="item">Khuyến mãi hàng</Option>
            <Option value="amount">Khuyến mãi tiền</Option>
            <Option value="percent">Khuyến mãi chiết khấu</Option>
            <Option value="voucher">Voucher</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="startDate"
          label="Ngày bắt đầu"
          rules={[
            { required: true, message: 'Vui lòng chọn ngày bắt đầu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || !voucherStartDate || !voucherEndDate) {
                  return Promise.resolve();
                }
                const voucherStart = dayjs(voucherStartDate);
                const voucherEnd = dayjs(voucherEndDate);
                const selectedDate = dayjs(value);
                
                if (selectedDate.isBefore(voucherStart.startOf('day')) || selectedDate.isAfter(voucherEnd.endOf('day'))) {
                  return Promise.reject(new Error(`Ngày bắt đầu phải nằm trong khoảng ${voucherStart.format('DD/MM/YYYY')} - ${voucherEnd.format('DD/MM/YYYY')}`));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày bắt đầu"
            disabledDate={(current) => {
              if (!current || !voucherStartDate || !voucherEndDate) return false;
              const voucherStart = dayjs(voucherStartDate);
              const voucherEnd = dayjs(voucherEndDate);
              return current.isBefore(voucherStart.startOf('day')) || current.isAfter(voucherEnd.endOf('day'));
            }}
          />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="Ngày kết thúc"
          rules={[
            { required: true, message: 'Vui lòng chọn ngày kết thúc!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || !voucherStartDate || !voucherEndDate) {
                  return Promise.resolve();
                }
                const voucherStart = dayjs(voucherStartDate);
                const voucherEnd = dayjs(voucherEndDate);
                const selectedDate = dayjs(value);
                
                if (selectedDate.isBefore(voucherStart.startOf('day')) || selectedDate.isAfter(voucherEnd.endOf('day'))) {
                  return Promise.reject(new Error(`Ngày kết thúc phải nằm trong khoảng ${voucherStart.format('DD/MM/YYYY')} - ${voucherEnd.format('DD/MM/YYYY')}`));
                }
                return Promise.resolve();
              },
            }),
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startDate = getFieldValue('startDate');
                if (!value || !startDate) {
                  return Promise.resolve();
                }
                if (dayjs(value).isBefore(dayjs(startDate))) {
                  return Promise.reject(new Error('Ngày kết thúc không được trước ngày bắt đầu!'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày kết thúc"
            disabledDate={(current) => {
              if (!current || !voucherStartDate || !voucherEndDate) return false;
              const voucherStart = dayjs(voucherStartDate);
              const voucherEnd = dayjs(voucherEndDate);
              const startDate = form.getFieldValue('startDate');
              
              // Khóa ngày ngoài khoảng voucher
              if (current.isBefore(voucherStart.startOf('day')) || current.isAfter(voucherEnd.endOf('day'))) {
                return true;
              }
              
              // Khóa ngày trước startDate nếu đã chọn
              if (startDate && current.isBefore(dayjs(startDate).startOf('day'))) {
                return true;
              }
              
              return false;
            }}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
        >
          <Select 
            placeholder="Chọn trạng thái"
            disabled={voucherStatus === 'không hoạt động'}
          >
            <Option value="hoạt động">Hoạt động</Option>
            <Option value="không hoạt động">Không hoạt động</Option>
          </Select>
        </Form.Item>


        <Form.Item
          name="stackingPolicy"
          label="Quy tắc áp dụng"
          rules={[{ required: true, message: 'Vui lòng chọn quy tắc áp dụng!' }]}
        >
          <Select 
            placeholder="Chọn quy tắc"
            disabled={promotionType === 'voucher' || promotionType === 'amount'}
            onChange={(value) => setStackingPolicy(value)}
          >
            {promotionType !== 'percent' && <Option value="STACKABLE">Cộng dồn</Option>}
            {promotionType !== 'item' && promotionType !== 'percent' && <Option value="EXCLUSIVE">Độc quyền</Option>}
            <Option value="EXCLUSIVE_WITH_GROUP">Loại trừ theo nhóm</Option>
          </Select>
        </Form.Item>

        {stackingPolicy === 'EXCLUSIVE_WITH_GROUP' && (
          <Form.Item
            name="exclusionGroup"
            label="Nhóm loại trừ"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập nhóm loại trừ!' }]}
          >
            <Select
              placeholder="Chọn nhóm loại trừ"
              disabled={promotionType === 'amount'}
              options={getExclusionGroups(promotionType || '').map(group => ({ value: group, label: group }))}
              style={{ width: '100%' }}
              onChange={(value) => {
                // Reset buyItem khi thay đổi nhóm loại trừ
                form.setFieldValue('buyItem', undefined);
                form.setFieldValue('comboId', undefined);
              }}
            />
          </Form.Item>
        )}

        {/* Chi tiết cho voucher */}
        {promotionType && promotionType === 'voucher' && (
          <>
            <div className="border-t pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-4">Chi tiết voucher</h4>
              
              <Form.Item
                name="voucherDescription"
                label="Mô tả"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="VD: Voucher giảm 10% tối đa 30K"
                />
              </Form.Item>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                <Form.Item
                  name="pointToRedeem"
                  label="Điểm đổi"
                  rules={[{ required: true, message: 'Vui lòng nhập điểm đổi!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập điểm đổi"
                    min={0}
                  />
                </Form.Item>

                <Form.Item
                  name="quantity"
                  label="Số lượng"
                  rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập số lượng"
                    min={1}
                  />
                </Form.Item>

                <Form.Item
                  name="discountPercent"
                  label="Phần trăm giảm (%)"
                  rules={[{ required: true, message: 'Vui lòng nhập phần trăm giảm!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập phần trăm giảm"
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </Form.Item>

                <Form.Item
                  name="maxDiscountValue"
                  label="Giảm tối đa (VNĐ)"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập giảm tối đa"
                    min={0}
                    addonAfter="VNĐ"
                  />
                </Form.Item>
              </div>
            </div>
          </>
        )}

        {/* Chi tiết cho amount (khuyến mãi tiền) */}
        {promotionType && promotionType === 'amount' && (
          <>
            <div className="border-t pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-4">Chi tiết khuyến mãi tiền</h4>
              
              <Form.Item
                name="description"
                label="Mô tả khuyến mãi"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả khuyến mãi!' },
                  { max: 200, message: 'Mô tả không được quá 200 ký tự!' }
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập mô tả khuyến mãi tiền"
                />
              </Form.Item>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                <Form.Item
                  name="minOrderValue"
                  label="Giá trị đơn hàng tối thiểu (VNĐ)"
                  rules={[{ required: true, message: 'Vui lòng nhập giá trị đơn hàng tối thiểu!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập giá trị tối thiểu"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="VNĐ"
                  />
                </Form.Item>

                <Form.Item
                  name="discountValue"
                  label="Giá trị giảm (VNĐ)"
                  rules={[{ required: true, message: 'Vui lòng nhập giá trị giảm!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập giá trị giảm"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="VNĐ"
                  />
                </Form.Item>

                <Form.Item
                  name="totalBudget"
                  label="Ngân sách tổng (VNĐ)"
                  tooltip="Tổng ngân sách áp dụng cho khuyến mãi tiền"
                  rules={[{ required: true, message: 'Vui lòng nhập ngân sách tổng!' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập ngân sách tổng"
                    min={0}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                    addonAfter="VNĐ"
                  />
                </Form.Item>
              </div>
            </div>
          </>
        )}

        {/* Chi tiết cho item (khuyến mãi hàng) */}
        {promotionType && promotionType === 'item' && (
          <>
            <div className="border-t pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-4">Chi tiết khuyến mãi hàng</h4>
              
              <Form.Item
                name="description"
                label="Mô tả khuyến mãi hàng"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả khuyến mãi hàng!' },
                  { max: 200, message: 'Mô tả không được quá 200 ký tự!' }
                ]}
              >
                <Input.TextArea
                  placeholder="Ví dụ: Mua 2 vé thường được tặng 1 combo nước"
                  rows={2}
                />
              </Form.Item>

              {/* Ngân sách tổng sẽ hiển thị sau phần 'Loại tặng' để thuận thứ tự nhập */}

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.exclusionGroup !== currentValues.exclusionGroup || prevValues.stackingPolicy !== currentValues.stackingPolicy}>
                {({ getFieldValue }) => {
                  const exclusionGroup = getFieldValue('exclusionGroup');
                  const stackingPolicy = getFieldValue('stackingPolicy');
                  
                  // Kiểm tra validation
                  const canSelectApplyType = () => {
                    // Phải chọn quy tắc áp dụng trước
                    if (!stackingPolicy) {
                      return { canSelect: false, message: 'Vui lòng chọn quy tắc áp dụng trước!' };
                    }
                    
                    // Nếu chọn "Loại trừ theo nhóm" thì phải chọn nhóm loại trừ trước
                    if (stackingPolicy === 'EXCLUSIVE_WITH_GROUP' && !exclusionGroup) {
                      return { canSelect: false, message: 'Vui lòng chọn nhóm loại trừ trước!' };
                    }
                    
                    return { canSelect: true, message: '' };
                  };
                  
                  const validation = canSelectApplyType();
                  
                  return (
                    <Form.Item
                      name="applyType"
                      label="Loại áp dụng"
                      rules={[
                        { required: true, message: 'Vui lòng chọn loại áp dụng!' },
                        {
                          validator: (_, value) => {
                            if (!validation.canSelect) {
                              return Promise.reject(new Error(validation.message));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Select 
                        placeholder={validation.canSelect ? "Chọn loại áp dụng" : validation.message}
                        disabled={!validation.canSelect}
                        onChange={(value) => {
                          // Reset buyItem khi thay đổi applyType
                          form.setFieldValue('buyItem', undefined);
                          form.setFieldValue('comboId', undefined);
                        }}
                      >
                        <Option 
                          value="combo" 
                          disabled={exclusionGroup && exclusionGroup.startsWith('ticket_')}
                        >
                          Combo
                        </Option>
                        <Option 
                          value="ticket" 
                          disabled={exclusionGroup && exclusionGroup.endsWith(' promo')}
                        >
                          Vé
                        </Option>
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType || prevValues.exclusionGroup !== currentValues.exclusionGroup}>
                {({ getFieldValue }) => {
                  const applyType = getFieldValue('applyType');
                  const exclusionGroup = getFieldValue('exclusionGroup');
                  
                  if (applyType === 'combo') {
                    return (
                      <>
                        <Form.Item
                          name="buyItem"
                          label="Mua combo"
                          rules={[
                            { required: true, message: 'Vui lòng chọn combo!' },
                            {
                              validator: (_, value) => {
                                const comboId = form.getFieldValue('comboId');
                                if (value && !comboId) {
                                  return Promise.reject(new Error('Vui lòng chọn lại combo để lấy ID!'));
                                }
                                return Promise.resolve();
                              }
                            }
                          ]}
                        >
                          <Select
                            placeholder="Chọn combo"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={foodCombos.filter(item => item.type === 'combo').map(item => {
                              let isDisabled = false;
                              
                              // Khóa combo không liên quan đến nhóm loại trừ
                              if (exclusionGroup && exclusionGroup.endsWith(' promo')) {
                                const expectedComboName = exclusionGroup.replace(' promo', '');
                                isDisabled = item.name !== expectedComboName;
                              }
                              
                              return {
                                value: item.name,
                                label: item.name,
                                data: item,
                                disabled: isDisabled
                              };
                            })}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={(value, option: any) => {
                              if (option && option.data) {
                                form.setFieldValue('comboId', option.data._id);
                                form.setFieldValue('buyItem', value);
                              }
                            }}
                          />
                        </Form.Item>
                        
                        {/* Hidden field để lưu comboId */}
                        <Form.Item name="comboId" style={{ display: 'none' }}>
                          <Input />
                        </Form.Item>
                      </>
                    );
                  }
                  
                  if (applyType === 'ticket') {
                    return (
                      <Form.Item
                        name="buyItem"
                        label="Loại vé"
                        rules={[{ required: true, message: 'Vui lòng chọn loại vé!' }]}
                      >
                        <Select placeholder="Chọn loại vé">
                          {seatTypes.map(seatType => {
                            const labelMap: Record<string, string> = {
                              'normal': 'Vé thường',
                              'vip': 'Vé VIP',
                              'couple': 'Vé Couple',
                              '4dx': 'Vé 4DX'
                            };
                            
                            // Khóa loại vé không liên quan đến nhóm loại trừ
                            let isDisabled = false;
                            if (exclusionGroup) {
                              if (exclusionGroup === 'ticket_normal_promo' && seatType !== 'normal') {
                                isDisabled = true;
                              } else if (exclusionGroup === 'ticket_vip_promo' && seatType !== 'vip') {
                                isDisabled = true;
                              } else if (exclusionGroup === 'ticket_couple_promo' && seatType !== 'couple') {
                                isDisabled = true;
                              } else if (exclusionGroup === 'ticket_4dx_promo' && seatType !== '4dx') {
                                isDisabled = true;
                              }
                            }
                            
                            return (
                              <Option key={seatType} value={seatType} disabled={isDisabled}>
                                {labelMap[seatType] || seatType}
                              </Option>
                            );
                          })}
                        </Select>
                      </Form.Item>
                    );
                  }
                  
                  return null;
                }}
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType}>
                {({ getFieldValue }) => {
                  const applyType = getFieldValue('applyType');
                  
                  if (applyType) {
                    return (
                      <>
                        <Form.Item
                          name="buyQuantity"
                          label="Số lượng mua"
                          rules={[{ required: true, message: 'Vui lòng nhập số lượng mua!' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập số lượng mua"
                            min={1}
                            max={10}
                          />
                        </Form.Item>

                        <Form.Item
                          name="rewardItem"
                          label="Sản phẩm tặng"
                          rules={[
                            { required: true, message: 'Vui lòng chọn sản phẩm tặng!' },
                            {
                              validator: (_, value) => {
                                const rewardItemId = form.getFieldValue('rewardItemId');
                                if (value && !rewardItemId) {
                                  return Promise.reject(new Error('Vui lòng chọn lại sản phẩm tặng để lấy ID!'));
                                }
                                return Promise.resolve();
                              }
                            }
                          ]}
                        >
                          <Select
                            placeholder="Chọn sản phẩm/combo tặng"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={foodCombos.map(item => ({
                              value: item.name,
                              label: `${item.name} (${item.type === 'combo' ? 'Combo' : 'Sản phẩm'})`,
                              data: item
                            }))}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={(value, option: any) => {
                              if (option && option.data) {
                                form.setFieldValue('rewardItemId', option.data._id);
                                form.setFieldValue('rewardItem', value);
                              }
                            }}
                          />
                        </Form.Item>

                        {/* Hidden field để lưu rewardItemId */}
                        <Form.Item name="rewardItemId" style={{ display: 'none' }}>
                          <Input />
                        </Form.Item>

                        <Form.Item
                          name="rewardQuantity"
                          label="Số lượng tặng"
                          rules={[{ required: true, message: 'Vui lòng nhập số lượng tặng!' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập số lượng tặng"
                            min={1}
                            max={10}
                          />
                        </Form.Item>

                        <Form.Item
                          name="rewardType"
                          label="Loại tặng"
                          rules={[{ required: true, message: 'Vui lòng chọn loại tặng!' }]}
                        >
                          <Select placeholder="Chọn loại tặng">
                            <Option value="free">Miễn phí</Option>
                            <Option value="discount">Giảm giá</Option>
                          </Select>
                        </Form.Item>

                        {/* Ngân sách tổng - đặt ngay sau "Loại tặng" */}
                        <Form.Item
                          name="totalBudget"
                          label="Ngân sách tổng (số sản phẩm tặng)"
                          tooltip="Tổng ngân sách của sản phẩm tặng, ví dụ: 1000 sản phẩm"
                          rules={[{ required: true, message: 'Vui lòng nhập ngân sách tổng!' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập ngân sách tổng"
                            min={0}
                          />
                        </Form.Item>

                        <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.rewardType !== currentValues.rewardType}>
                          {({ getFieldValue }) => {
                            const rewardType = getFieldValue('rewardType');
                            if (rewardType === 'discount') {
                              return (
                                <Form.Item
                                  name="rewardDiscountPercent"
                                  label="Phần trăm giảm"
                                  rules={[{ required: true, message: 'Vui lòng nhập phần trăm giảm!' }]}
                                >
                                  <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="Nhập phần trăm giảm"
                                    min={1}
                                    max={100}
                                    addonAfter="%"
                                  />
                                </Form.Item>
                              );
                            }
                            return null;
                          }}
                        </Form.Item>
                      </>
                    );
                  }
                  
                  return null;
                }}
              </Form.Item>

            </div>
          </>
        )}

        {/* Chi tiết cho percent (combo/ticket) */}
        {promotionType && promotionType === 'percent' && (
          <>
            <div className="border-t pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-4">Chi tiết khuyến mãi chiết khấu</h4>
              
              <Form.Item
                name="description"
                label="Mô tả khuyến mãi"
                rules={[
                  { required: true, message: 'Vui lòng nhập mô tả khuyến mãi!' },
                  { max: 200, message: 'Mô tả không được quá 200 ký tự!' }
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập mô tả khuyến mãi chiết khấu"
                />
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.exclusionGroup !== currentValues.exclusionGroup || prevValues.stackingPolicy !== currentValues.stackingPolicy}>
                {({ getFieldValue }) => {
                  const exclusionGroup = getFieldValue('exclusionGroup');
                  const stackingPolicy = getFieldValue('stackingPolicy');
                  
                  // Kiểm tra validation
                  const canSelectApplyType = () => {
                    // Phải chọn quy tắc áp dụng trước
                    if (!stackingPolicy) {
                      return { canSelect: false, message: 'Vui lòng chọn quy tắc áp dụng trước!' };
                    }
                    
                    // Nếu chọn "Loại trừ theo nhóm" thì phải chọn nhóm loại trừ trước
                    if (stackingPolicy === 'EXCLUSIVE_WITH_GROUP' && !exclusionGroup) {
                      return { canSelect: false, message: 'Vui lòng chọn nhóm loại trừ trước!' };
                    }
                    
                    return { canSelect: true, message: '' };
                  };
                  
                  const validation = canSelectApplyType();
                  
                  return (
                    <Form.Item
                      name="applyType"
                      label="Loại áp dụng"
                      rules={[
                        { required: true, message: 'Vui lòng chọn loại áp dụng!' },
                        {
                          validator: (_, value) => {
                            if (!validation.canSelect) {
                              return Promise.reject(new Error(validation.message));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Select 
                        placeholder={validation.canSelect ? "Chọn loại áp dụng" : validation.message}
                        disabled={!validation.canSelect}
                      >
                        <Option 
                          value="combo" 
                          disabled={exclusionGroup && exclusionGroup.startsWith('ticket_')}
                        >
                          Combo
                        </Option>
                        <Option 
                          value="ticket" 
                          disabled={exclusionGroup && exclusionGroup.endsWith(' discount')}
                        >
                          Vé
                        </Option>
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>

              {/* Ngân sách tổng cho percent */}
              <Form.Item
                name="totalBudget"
                label="Ngân sách tổng (VNĐ)"
                tooltip="Tổng ngân sách áp dụng cho khuyến mãi chiết khấu"
                rules={[{ required: true, message: 'Vui lòng nhập ngân sách tổng!' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Nhập ngân sách tổng"
                  min={0}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                  addonAfter="VNĐ"
                />
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType || prevValues.exclusionGroup !== currentValues.exclusionGroup}>
                {({ getFieldValue }) => {
                  const applyType = getFieldValue('applyType');
                  const exclusionGroup = getFieldValue('exclusionGroup');
                  
                  if (applyType === 'combo') {
                    return (
                      <>
                        <Form.Item
                          name="comboName"
                          label="Tên combo"
                          rules={[{ required: true, message: 'Vui lòng chọn combo!' }]}
                        >
                          <Select
                            placeholder="Chọn combo"
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={foodCombos.filter(item => item.type === 'combo').map(item => {
                              let isDisabled = false;
                              
                              // Khóa combo không liên quan đến nhóm loại trừ
                              if (exclusionGroup && exclusionGroup.endsWith(' discount')) {
                                const expectedComboName = exclusionGroup.replace(' discount', '');
                                isDisabled = item.name !== expectedComboName;
                              }
                              
                              return {
                                value: item.name,
                                label: item.name,
                                data: item,
                                disabled: isDisabled
                              };
                            })}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={(value, option: any) => {
                              if (option && option.data) {
                                console.log('Setting comboId:', option.data._id);
                                form.setFieldValue('comboId', option.data._id);
                                form.setFieldValue('comboName', value);
                              }
                            }}
                          />
                        </Form.Item>

                        {/* Hidden field để lưu comboId */}
                        <Form.Item name="comboId" style={{ display: 'none' }}>
                          <Input />
                        </Form.Item>

                        <Form.Item
                          name="comboDiscountPercent"
                          label="Phần trăm giảm (%)"
                          rules={[{ required: true, message: 'Vui lòng nhập phần trăm giảm!' }]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập phần trăm giảm"
                            min={1}
                            max={100}
                            addonAfter="%"
                          />
                        </Form.Item>
                      </>
                    );
                  }
                  
                  if (applyType === 'ticket') {
                    return (
                      <>
                    <Form.Item
                      name="seatType"
                      label="Loại vé"
                      rules={[{ required: true, message: 'Vui lòng chọn loại vé!' }]}
                    >
                      <Select placeholder="Chọn loại vé">
                        {seatTypes.map(seatType => {
                          const labelMap: Record<string, string> = {
                            'normal': 'Vé thường',
                            'vip': 'Vé VIP',
                            'couple': 'Vé Couple',
                            '4dx': 'Vé 4DX'
                          };
                          
                          // Khóa loại vé không liên quan đến nhóm loại trừ
                          let isDisabled = false;
                          if (exclusionGroup) {
                            if (exclusionGroup === 'ticket_normal_discount' && seatType !== 'normal') {
                              isDisabled = true;
                            } else if (exclusionGroup === 'ticket_vip_discount' && seatType !== 'vip') {
                              isDisabled = true;
                            } else if (exclusionGroup === 'ticket_couple_discount' && seatType !== 'couple') {
                              isDisabled = true;
                            } else if (exclusionGroup === 'ticket_4dx_discount' && seatType !== '4dx') {
                              isDisabled = true;
                            }
                          }
                          
                          return (
                            <Option key={seatType} value={seatType} disabled={isDisabled}>
                              {labelMap[seatType] || seatType}
                            </Option>
                          );
                        })}
                      </Select>
                    </Form.Item>

                        <Form.Item
                          name="ticketDiscountPercent"
                          label="Phần trăm giảm (%)"
                          rules={[{ required: true, message: 'Vui lòng nhập phần trăm giảm!' }]}>
                          <InputNumber
                            style={{ width: '100%' }}
                            placeholder="Nhập phần trăm giảm"
                            min={1}
                            max={100}
                            addonAfter="%"
                          />
                        </Form.Item>
                      </>
                    );
                  }
                  
                  return null;
                }}
              </Form.Item>
            </div>
          </>
        )}
        </Form>
      </ConfigProvider>
    </Modal>
  );
};

export default VoucherDetailForm;
