import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Select, TimePicker, Input } from "antd";
import dayjs from "dayjs";

interface ShowSessionFormProps {
  showSession?: IShowSession;
  showSessions: IShowSession[]; // Danh sách ca chiếu hiện có để kiểm tra trùng lặp
  onSubmit: (sessionData: Partial<IShowSession>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ShowSessionForm: React.FC<ShowSessionFormProps> = ({
  showSession,
  showSessions,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Danh sách tên ca chiếu mặc định với thời gian gợi ý
  const sessionNameOptions = [
    {
      value: "Ca 1",
      label: "Ca 1",
      suggestedStart: "08:00",
      suggestedEnd: "11:00",
    },
    {
      value: "Ca 2",
      label: "Ca 2",
      suggestedStart: "11:00",
      suggestedEnd: "14:00",
    },
    {
      value: "Ca 3",
      label: "Ca 3",
      suggestedStart: "14:00",
      suggestedEnd: "17:00",
    },
    {
      value: "Ca 4",
      label: "Ca 4",
      suggestedStart: "17:00",
      suggestedEnd: "20:00",
    },
    {
      value: "Ca 5",
      label: "Ca 5",
      suggestedStart: "20:00",
      suggestedEnd: "23:00",
    },
    {
      value: "Ca 6",
      label: "Ca 6",
      suggestedStart: "23:00",
      suggestedEnd: "00:00",
    },
  ];

  // Handler cho việc chọn tên ca chiếu
  const handleSessionNameChange = (value: string) => {
    const selectedOption = sessionNameOptions.find(
      (option) => option.value === value
    );
    if (selectedOption) {
      // Auto-fill thời gian gợi ý
      form.setFieldsValue({
        startTime: dayjs(selectedOption.suggestedStart, "HH:mm"),
        endTime: dayjs(selectedOption.suggestedEnd, "HH:mm"),
      });
    }
  };

  useEffect(() => {
    if (showSession) {
      form.setFieldsValue({
        shiftCode: showSession.shiftCode,
        name: showSession.name,
        startTime: dayjs(showSession.startTime, "HH:mm"),
        endTime: dayjs(showSession.endTime, "HH:mm"),
      });
    } else {
      form.resetFields();
    }
  }, [showSession, form]);

  const handleSubmit = async (values: {
    shiftCode: string;
    name: string;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
  }) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log("Form is already submitting, ignoring duplicate submission");
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData: Partial<IShowSession> = {
        shiftCode: values.shiftCode,
        name: values.name,
        startTime: values.startTime.format("HH:mm"),
        endTime: values.endTime.format("HH:mm"),
      };

      console.log("ShowSessionForm: Calling onSubmit with data:", submitData);
      onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting show session form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation function for time range
  const validateTimeRange = (_: unknown, value: dayjs.Dayjs) => {
    if (!value) {
      return Promise.resolve();
    }

    const startTime = form.getFieldValue("startTime");
    const endTime = form.getFieldValue("endTime");

    if (startTime && endTime) {
      // Xử lý trường hợp ca đêm qua ngày (VD: 21:00 - 00:00 hoặc 00:00 - 01:00)
      const startHour = startTime.hour();
      const endHour = endTime.hour();

      // Nếu bắt đầu sau 20h và kết thúc lúc 0h thì coi như qua ngày
      if (startHour >= 20 && endHour === 0) {
        return Promise.resolve(); // Ca qua ngày là hợp lệ
      }

      // Nếu bắt đầu từ 00:00 và kết thúc sau đó (ca qua ngày)
      if (startHour === 0 && endHour > 0) {
        return Promise.resolve(); // Ca qua ngày là hợp lệ
      }

      // Kiểm tra bình thường cho các ca trong ngày
      if (startTime.isSameOrAfter(endTime)) {
        return Promise.reject(
          new Error("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!")
        );
      }
    }

    return Promise.resolve();
  };

  return (
    <Modal
      open
      title={
        <div className="text-center text-xl font-semibold">
          {showSession ? "Sửa ca chiếu" : "Thêm ca chiếu mới"}
        </div>
      }
      onCancel={onCancel}
      footer={null}
      width={600}
      centered
      destroyOnClose
      style={{
        marginTop: "2vh",
        marginBottom: "2vh",
        maxHeight: "96vh",
      }}
      bodyStyle={{
        maxHeight: "calc(96vh - 110px)",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="hide-scrollbar"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        className="mt-4"
      >
        <Form.Item
          name="shiftCode"
          label="🏷️ Mã ca chiếu"
          rules={[
            { required: true, message: "Vui lòng nhập mã ca chiếu!" },
            {
              pattern: /^CC\d{3}$/,
              message: "Mã ca chiếu phải có định dạng CC001, CC002, ...",
            },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const existingSession = showSessions.find(
                  (s) =>
                    s.shiftCode === value &&
                    (!showSession || s._id !== showSession._id)
                );
                if (existingSession) {
                  return Promise.reject(
                    new Error("Mã ca chiếu này đã tồn tại!")
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input placeholder="CC001, CC002, ..." size="large" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên ca chiếu"
          rules={[{ required: true, message: "Vui lòng chọn tên ca chiếu!" }]}
        >
          <Select
            placeholder="Chọn tên ca chiếu"
            size="large"
            showSearch
            allowClear
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={sessionNameOptions}
            onChange={handleSessionNameChange}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="startTime"
            label="Thời gian bắt đầu"
            rules={[
              { required: true, message: "Vui lòng chọn thời gian bắt đầu!" },
            ]}
          >
            <TimePicker
              placeholder="Chọn thời gian bắt đầu"
              size="large"
              format="HH:mm"
              style={{ width: "100%" }}
              minuteStep={15}
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="Thời gian kết thúc"
            rules={[
              { required: true, message: "Vui lòng chọn thời gian kết thúc!" },
              { validator: validateTimeRange },
            ]}
          >
            <TimePicker
              placeholder="Chọn thời gian kết thúc"
              size="large"
              format="HH:mm"
              style={{ width: "100%" }}
              minuteStep={15}
            />
          </Form.Item>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">
            💡 Hướng dẫn:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • <strong>Ca 1:</strong> 08:00 - 11:00 (3 tiếng)
            </li>
            <li>
              • <strong>Ca 2:</strong> 11:00 - 14:00 (3 tiếng)
            </li>
            <li>
              • <strong>Ca 3:</strong> 14:00 - 17:00 (3 tiếng)
            </li>
            <li>
              • <strong>Ca 4:</strong> 17:00 - 20:00 (3 tiếng)
            </li>
            <li>
              • <strong>Ca 5:</strong> 20:00 - 23:00 (3 tiếng)
            </li>
            <li>
              • <strong>Ca 6:</strong> 23:00 - 00:00 (1 tiếng, qua ngày)
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="default"
            onClick={onCancel}
            size="large"
            disabled={loading || isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading || isSubmitting}
            disabled={loading || isSubmitting}
            className="bg-black hover:bg-gray-800"
          >
            {loading || isSubmitting
              ? showSession
                ? "Đang cập nhật..."
                : "Đang thêm..."
              : showSession
              ? "Cập nhật"
              : "Thêm mới"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ShowSessionForm;
