import { Modal, Input, Button, Form } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import type { InputRef } from "antd";
import {
  forgotPasswordApi,
  resetPasswordApi,
  verifyOtpApi,
} from "@/services/api";
import { useAlertContextApp } from "@/context/alert.context";

enum STEP {
  EMAIL = "email",
  OTP = "otp",
  NEW_PASSWORD = "newPassword",
}

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginModalOpen: () => void;
}

interface IEmailForm {
  email: string;
}

interface IOtpForm {
  otp: string;
}

interface INewPasswordForm {
  newPassword: string;
  confirmNewPassword: string;
}

const ModalForgotPassword = (props: IProps) => {
  const [form] = Form.useForm();
  const emailInputRef = useRef<InputRef>(null);
  const otpInputRef = useRef<InputRef>(null);
  const newPasswordInputRef = useRef<InputRef>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentStep, setCurrentStep] = useState<STEP>(STEP.EMAIL);
  const [emailValue, setEmailValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const { messageApi } = useAlertContextApp();

  useEffect(() => {
    if (props.isOpen) {
      form.resetFields();
      setCurrentStep(STEP.EMAIL);
      setEmailValue("");
    }
  }, [props.isOpen, form]);

  useEffect(() => {
    if (props.isOpen) {
      timeoutRef.current = setTimeout(() => {
        if (currentStep === STEP.EMAIL) {
          emailInputRef.current?.focus();
        } else if (currentStep === STEP.OTP) {
          otpInputRef.current?.focus();
        } else if (currentStep === STEP.NEW_PASSWORD) {
          newPasswordInputRef.current?.focus();
        }
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [props.isOpen, currentStep]);

  const handleBtnBack = () => {
    if (currentStep === STEP.EMAIL) {
      props.onClose();
      props.onLoginModalOpen();
    } else if (currentStep === STEP.OTP) {
      setCurrentStep(STEP.EMAIL);
      form.resetFields(); // Reset OTP field
    } else if (currentStep === STEP.NEW_PASSWORD) {
      setCurrentStep(STEP.OTP);
      form.resetFields(); // Reset New Password fields
    }
  };

  const handleSubmit = async (
    values: IEmailForm | IOtpForm | INewPasswordForm
  ) => {
    setLoading(true);
    try {
      if (currentStep === STEP.EMAIL) {
        const emailValues = values as IEmailForm;
        const response = await forgotPasswordApi({ email: emailValues.email });
        if (response.status) {
          setEmailValue(emailValues.email);
          setCurrentStep(STEP.OTP);
          messageApi!.success({ content: response.message, duration: 2 });
          form.resetFields(["otp"]); // Clear OTP field if user goes back and forth
        } else {
          messageApi!.error({ content: response.message, duration: 2 });
        }
      } else if (currentStep === STEP.OTP) {
        const otpValues = values as IOtpForm;
        const response = await verifyOtpApi({
          email: emailValue,
          otp: otpValues.otp,
        });
        if (response.status) {
          setCurrentStep(STEP.NEW_PASSWORD);
          messageApi!.success({ content: response.message, duration: 2 });
          form.resetFields(["newPassword", "confirmNewPassword"]);
        } else {
          messageApi!.error({ content: response.message, duration: 2 });
        }
      } else if (currentStep === STEP.NEW_PASSWORD) {
        const newPasswordValues = values as INewPasswordForm;
        const response = await resetPasswordApi({
          email: emailValue,
          newPassword: newPasswordValues.newPassword,
        });
        if (response.status) {
          messageApi!.success({ content: response.message, duration: 2 });
          props.onClose();
          props.onLoginModalOpen();
        } else {
          messageApi!.error({ content: response.message, duration: 2 });
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      messageApi!.error({
        content: error.response?.data?.message || "Có lỗi xảy ra!",
        duration: 2,
      });
      console.error("Lỗi khi xử lý yêu cầu:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={props.isOpen}
      onCancel={props.onClose}
      footer={null}
      centered
      width={450}
      className="rounded-xl"
      maskClosable={currentStep === STEP.EMAIL}
      closable={currentStep === STEP.EMAIL}
      getContainer={false}
    >
      {/* Header */}
      {currentStep === STEP.EMAIL && (
        <div
          className="flex items-center w-[80px] gap-2 text-sm font-medium text-[#0f1b4c] mb-1 cursor-pointer"
          onClick={handleBtnBack}
        >
          <ArrowLeftOutlined className="cursor-pointer" />
          <span className="cursor-pointer">Quay lại</span>
        </div>
      )}

      <h2
        className={`text-center font-semibold text-xl text-[#0f1b4c] mb-4 ${
          currentStep === STEP.EMAIL ? "" : "mt-2"
        }`}
      >
        {currentStep === STEP.EMAIL && "Quên mật khẩu"}
        {currentStep === STEP.OTP && "Xác minh mã OTP"}
        {currentStep === STEP.NEW_PASSWORD && "Đặt lại mật khẩu mới"}
      </h2>

      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        {currentStep === STEP.EMAIL && (
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              ref={emailInputRef}
              style={{ padding: "6px 10px" }}
              placeholder="Nhập email của bạn"
            />
          </Form.Item>
        )}

        {currentStep === STEP.OTP && (
          <Form.Item
            name="otp"
            rules={[
              { required: true, message: "Vui lòng nhập mã OTP!" },
              { len: 6, message: "Mã OTP phải có 6 chữ số!" },
            ]}
          >
            <Input
              ref={otpInputRef}
              style={{ padding: "6px 10px" }}
              placeholder="Nhập mã OTP của bạn"
            />
          </Form.Item>
        )}

        {currentStep === STEP.NEW_PASSWORD && (
          <>
            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" },
                {
                  pattern:
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message:
                    "Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt!",
                },
              ]}
            >
              <Input.Password
                ref={newPasswordInputRef}
                style={{ padding: "6px 10px" }}
                placeholder="Nhập mật khẩu mới của bạn"
              />
            </Form.Item>

            <Form.Item
              name="confirmNewPassword"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu mới!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Mật khẩu xác nhận không khớp!")
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                style={{ padding: "6px 10px" }}
                placeholder="Xác nhận mật khẩu mới của bạn"
              />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            className="bg-blue-600 hover:bg-blue-700"
            loading={loading}
          >
            {currentStep === STEP.EMAIL && "Gửi yêu cầu"}
            {currentStep === STEP.OTP && "Xác minh OTP"}
            {currentStep === STEP.NEW_PASSWORD && "Đặt lại mật khẩu"}
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center text-gray-500 text-sm select-none">
        {currentStep === STEP.EMAIL && (
          <>
            Hãy kiểm tra email của bạn để nhận mã OTP
            <div className="text-xs mt-2">(Lưu ý: kiểm tra thêm mục spam)</div>
            <div className="text-blue-600 text-sm hover:underline cursor-pointer mt-2 mb-1">
              Liên hệ nếu không nhận được email
            </div>
          </>
        )}
        {currentStep === STEP.OTP && (
          <>
            Mã OTP đã được gửi đến email của bạn: <strong>{emailValue}</strong>.
            <div className="text-xs mt-2">(Mã OTP sẽ hết hạn trong 5 phút)</div>
            <div className="text-blue-600 text-sm hover:underline cursor-pointer mt-2 mb-1">
              Gửi lại mã OTP
            </div>
          </>
        )}
        {currentStep === STEP.NEW_PASSWORD && (
          <div className="mb-1">Vui lòng nhập mật khẩu mới và xác nhận.</div>
        )}
      </div>
    </Modal>
  );
};

export default ModalForgotPassword;
