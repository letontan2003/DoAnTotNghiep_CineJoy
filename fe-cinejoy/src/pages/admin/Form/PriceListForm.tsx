import React, { useState, useEffect, useMemo, useRef } from "react";
import type { InputRef } from 'antd';
import { Modal, Form, Input, DatePicker, Button, message } from "antd";

// CSS để ẩn scrollbar
const hideScrollbarStyle = `
  .hide-scrollbar .ant-modal-body::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar .ant-modal-body {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Thêm CSS vào head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = hideScrollbarStyle;
  document.head.appendChild(style);
}
// (icons removed - không dùng trong modal này)
import dayjs from "dayjs";
import { getAllPriceLists, type IPriceList } from "@/apiservice/apiPriceList";

const { RangePicker } = DatePicker;

interface PriceListFormProps {
  priceList?: IPriceList;
  onSubmit: (priceListData: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    lines?: unknown[];
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const PriceListForm: React.FC<PriceListFormProps> = ({
  priceList,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
  
  const [existingPriceLists, setExistingPriceLists] = useState<IPriceList[]>([]);
  const hasActivePriceList = useMemo(() => existingPriceLists.some(pl => pl.status === 'active'), [existingPriceLists]);
  const today = useMemo(() => dayjs().startOf('day'), []);
  const lockStartToday = useMemo(() => !priceList && !hasActivePriceList, [priceList, hasActivePriceList]);
  const codeInputRef = useRef<InputRef>(null);

  // Không tải danh sách sản phẩm tại đây nữa. Việc thêm/sửa chi tiết giá sẽ làm ở trang chi tiết.

  // Load existing price lists for date validation (used for both add and edit)
  useEffect(() => {
    const loadExistingPriceLists = async () => {
      try {
        const data = await getAllPriceLists();
        setExistingPriceLists(data);
      } catch (error) {
        console.error("Error loading existing price lists:", error);
      }
    };

    loadExistingPriceLists();
  }, [priceList]);

  // Không khởi tạo danh sách giá mặc định trong modal thêm/sửa header.

  // Initialize form with default values
  useEffect(() => {
    if (priceList) {
      // Editing existing price list
      form.setFieldsValue({
        code: priceList.code,
        name: priceList.name,
        description: priceList.description || '',
        dateRange: [dayjs(priceList.startDate), dayjs(priceList.endDate)],
      });
    } else {
      // Creating new price list
      const defaultStart = hasActivePriceList ? today.add(1, 'day') : today;
      const defaultEnd = defaultStart.add(1, 'month');
      form.setFieldsValue({
        code: "",
        name: "",
        description: "",
        dateRange: [defaultStart, defaultEnd],
      });
    }
  }, [priceList, form, hasActivePriceList, today]);

  // Focus mã bảng giá khi mở modal Thêm
  useEffect(() => {
    if (!priceList) {
      const t = setTimeout(() => {
        codeInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [priceList]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate code field
      if (!values.code || values.code.trim() === '') {
        message.error("Vui lòng nhập mã bảng giá");
        return;
      }
      
      // Validate name field
      if (!values.name || values.name.trim() === '') {
        message.error("Vui lòng nhập tên bảng giá");
        return;
      }
      
      // Validate date range
      if (!values.dateRange || values.dateRange.length !== 2) {
        message.error("Vui lòng chọn thời gian hiệu lực");
        return;
      }
      
      // Validate that endDate >= startDate
      if (values.dateRange[1] < values.dateRange[0]) {
        message.error("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        return;
      }


      const submitData: { code: string; name: string; description?: string; startDate: string; endDate: string; lines?: unknown[] } = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
      };

      // Khi tạo mới (không có priceList), backend yêu cầu có 'lines' → gửi mảng rỗng
      if (!priceList) {
        submitData.lines = [];
      }

      onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting price list:", error);
      message.error("Vui lòng kiểm tra lại thông tin");
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', fontSize: '18px' }}>
          {priceList ? "Sửa bảng giá" : "Thêm bảng giá mới"}
        </div>
      }
      open={true}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          {priceList ? "Cập nhật" : "Tạo mới"}
        </Button>,
      ]}
      width={800}
      centered
      bodyStyle={{ 
        maxHeight: '70vh', 
        overflowY: 'auto',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
      className="hide-scrollbar"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã bảng giá"
          rules={[
            { required: true, message: "Vui lòng nhập mã bảng giá" },
            { min: 6, message: "Mã bảng giá phải có ít nhất 6 ký tự" },
            { max: 20, message: "Mã bảng giá không được quá 20 ký tự" }
          ]}
        >
          <Input 
            placeholder="Ví dụ: BG0001" 
            disabled={!!priceList}
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => {
              if (!priceList) { // Chỉ auto uppercase khi tạo mới
                e.target.value = e.target.value.toUpperCase();
              }
            }}
            ref={codeInputRef}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên bảng giá"
          rules={[{ required: true, message: "Vui lòng nhập tên bảng giá" }]}
        >
          <Input placeholder="Ví dụ: Bảng giá T10/2025" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
        >
          <Input.TextArea 
            placeholder="Mô tả về bảng giá (tùy chọn)"
            rows={3}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Thời gian hiệu lực"
          rules={[{ required: true, message: "Vui lòng chọn thời gian hiệu lực" }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder={['Ngày bắt đầu', 'Ngày kết thúc (có thể cùng ngày)']}
            allowClear={false}
            inputReadOnly={lockStartToday}
            onCalendarChange={(dates) => {
              if (!dates) return;
              if (lockStartToday) {
                const end = dates[1] && dayjs(dates[1]);
                const clampedEnd = end && end.isAfter(today, 'day') ? end : (dates[0] && dayjs(dates[0]).isAfter(today, 'day') ? dayjs(dates[0]) : today.add(7, 'day'));
                // Giữ start = hôm nay, chỉ cho thay đổi end
                form.setFieldsValue({ dateRange: [today, clampedEnd || today.add(1, 'day')] });
              }
            }}
            onChange={(dates) => {
              if (!dates) return;
              if (lockStartToday) {
                const end = dates[1] || dates[0];
                form.setFieldsValue({ dateRange: [today, end || today.add(1, 'day')] });
              }
            }
            }
            disabledDate={(current) => {
              if (!current) return false;
              
              // When editing: allow selecting any day within the original range of this price list
              if (priceList) {
                const originalStart = dayjs(priceList.startDate).startOf('day');
                const originalEnd = dayjs(priceList.endDate).endOf('day');
                if (
                  current.isSame(originalStart, 'day') ||
                  current.isSame(originalEnd, 'day') ||
                  (current.isAfter(originalStart, 'day') && current.isBefore(originalEnd, 'day'))
                ) {
                  return false;
                }
              }

              // Disable past dates
              if (current < today) {
                return true;
              }

              // For creating new price list: if there is no active list, allow selecting today; otherwise disable today
              if (!priceList) {
                if (hasActivePriceList && current <= today) return true;
                // Nếu đang khóa theo quy tắc "bắt đầu hôm nay", đảm bảo không thể chọn start khác hôm nay
                if (lockStartToday && current.isSame(today, 'day')) return false;
              }
              
              // Check conflicts with existing price lists (for both add and edit)
              if (existingPriceLists.length > 0) {
                return existingPriceLists.some(pl => {
                  // When editing, ignore the current price list's own range
                  if (priceList && pl._id === priceList._id) return false;
                  const existingStart = dayjs(pl.startDate).startOf('day');
                  const existingEnd = dayjs(pl.endDate).endOf('day');
                  return current.isSame(existingStart, 'day') ||
                         current.isSame(existingEnd, 'day') ||
                         (current.isAfter(existingStart, 'day') && current.isBefore(existingEnd, 'day'));
                });
              }
              
              return false;
            }}
          />
        </Form.Item>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>Lưu ý:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {!priceList && !hasActivePriceList && (
                <li>
                  Hiện chưa có bảng giá đang hoạt động: Ngày bắt đầu được đặt cố định là
                  <span style={{ fontWeight: 600 }}> hôm nay</span> và không thể chỉnh sửa (chỉ chọn ngày kết thúc).
                </li>
              )}
              <li>Chi tiết danh sách giá sẽ được thêm trong phần xem chi tiết sau khi tạo.</li>
              <li>Trạng thái mặc định là "Chờ hiệu lực" (Scheduled)</li>
              <li>Không thêm danh sách giá trong modal này.</li>
              {!priceList && (
                <li>Ngày trong quá khứ và ngày trùng với bảng giá hiện có sẽ bị vô hiệu hóa.</li>
              )}
            </ul>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default PriceListForm;
