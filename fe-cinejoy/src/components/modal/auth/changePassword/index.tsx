import { Button, Input, Modal, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { FormProps, InputRef } from 'antd';
import { verifyCurrentPasswordApi, changePasswordApi } from '@/services/api';
import { useAlertContextApp } from '@/context/alert.context';
import useAppStore from '@/store/app.store';
import clsx from 'clsx';
import 'styles/members.css';

type FieldType = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

interface IProps {
  isOpen: boolean;
  onClose: (value: boolean) => void;
}

const ModalChangePassword = (props: IProps) => {
  const [form] = Form.useForm();
  const [isSubmit, setIsSubmit] = useState<boolean>(false);
  const { messageApi } = useAlertContextApp();
  const { isDarkMode } = useAppStore();
  const inputRef = useRef<InputRef>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (props.isOpen) {
      timeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [props.isOpen]);

  useEffect(() => {
    form.resetFields();
  }, [props.isOpen, form]);

  const handleSubmit: FormProps<FieldType>['onFinish'] = async (values) => {
    setIsSubmit(true);
    try {
      // Kiểm tra mật khẩu mới có trùng với mật khẩu hiện tại không
      if (values.currentPassword === values.newPassword) {
        messageApi?.open({
          type: 'error',
          content: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!',
        });
        setIsSubmit(false);
        return;
      }

      // Xác thực mật khẩu hiện tại
      const verifyRes = await verifyCurrentPasswordApi({
        password: values.currentPassword,
      });

      if (!verifyRes.status || verifyRes.error !== 0) {
        messageApi?.open({
          type: 'error',
          content: verifyRes.message || 'Mật khẩu hiện tại không đúng!',
        });
        setIsSubmit(false);
        return;
      }

      // Đổi mật khẩu
      const changeRes = await changePasswordApi({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (changeRes.status && changeRes.error === 0) {
        messageApi?.open({
          type: 'success',
          content: changeRes.message || 'Đổi mật khẩu thành công!',
        });
        form.resetFields();
        props.onClose(false);
      } else {
        messageApi?.open({
          type: 'error',
          content: changeRes.message || 'Đổi mật khẩu thất bại!',
        });
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      messageApi?.open({
        type: 'error',
        content: error?.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu!',
      });
    }
    setIsSubmit(false);
  };

  return (
    <Modal
      open={props.isOpen}
      onCancel={() => props.onClose(false)}
      footer={null}
      centered
      width={500}
      getContainer={false}
      zIndex={10000}
      className={clsx(isDarkMode && 'dark-modal')}
      styles={{
        content: {
          backgroundColor: isDarkMode ? '#23272f' : '#fff',
        },
        header: {
          backgroundColor: isDarkMode ? '#23272f' : '#fff',
          borderBottom: isDarkMode ? '1px solid #444' : '1px solid #e5e7eb',
        },
        closeIcon: {
          color: isDarkMode ? '#ffffff' : undefined,
        },
      }}
    >
      <div
        className={clsx(
          'text-center font-semibold text-xl mt-4 mb-6 select-none',
          isDarkMode ? 'text-white' : 'text-[#0f1b4c]'
        )}
      >
        MẬT KHẨU ĐĂNG NHẬP
      </div>

      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        style={{ padding: '5px 20px 0 20px' }}
      >
        <Form.Item<FieldType>
          label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Mật khẩu hiện tại</span>}
          name="currentPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
        >
          <Input.Password
            ref={inputRef}
            style={{
              padding: '6px 10px',
              backgroundColor: isDarkMode ? '#2d323b' : '#fff',
              color: isDarkMode ? '#ffffff' : '#000',
              borderColor: isDarkMode ? '#666' : '#d9d9d9',
            }}
            placeholder="Nhập mật khẩu hiện tại"
            className={isDarkMode ? 'dark-password-input' : ''}
          />
        </Form.Item>

        <Form.Item<FieldType>
          label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Mật khẩu mới</span>}
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
            { min: 8, message: 'Mật khẩu phải có tối thiểu 8 ký tự!' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
              message: 'Mật khẩu phải gồm chữ hoa, chữ thường, số và ký tự đặc biệt!',
            },
          ]}
        >
          <Input.Password
            style={{
              padding: '6px 10px',
              backgroundColor: isDarkMode ? '#2d323b' : '#fff',
              color: isDarkMode ? '#ffffff' : '#000',
              borderColor: isDarkMode ? '#666' : '#d9d9d9',
            }}
            placeholder="Nhập mật khẩu mới"
            className={isDarkMode ? 'dark-password-input' : ''}
          />
        </Form.Item>

        <Form.Item<FieldType>
          label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Nhập lại mật khẩu mới</span>}
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu mới!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu nhập lại không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password
            style={{
              padding: '6px 10px',
              backgroundColor: isDarkMode ? '#2d323b' : '#fff',
              color: isDarkMode ? '#ffffff' : '#000',
              borderColor: isDarkMode ? '#666' : '#d9d9d9',
            }}
            placeholder="Nhập lại mật khẩu mới"
            className={isDarkMode ? 'dark-password-input' : ''}
          />
        </Form.Item>

        <div className="mb-4" style={{ color: '#ff4d4f' }}>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            • Mật khẩu phải có tối thiểu 8 ký tự
          </div>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            • Gồm chữ hoa, chữ thường, số và ký tự đặc biệt
          </div>
          <div style={{ fontSize: '13px' }}>
            • Không trùng với mật khẩu hiện tại
          </div>
        </div>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            className="bg-red-600 hover:bg-red-700"
            size="large"
            loading={isSubmit}
            style={{
              fontWeight: 600,
              height: '45px',
            }}
          >
            ĐỔI MẬT KHẨU
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalChangePassword;

