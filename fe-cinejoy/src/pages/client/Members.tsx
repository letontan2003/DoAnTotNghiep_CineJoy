import { useEffect, useState } from 'react';
import { FaSave, FaUpload } from 'react-icons/fa';
import { Input, Select, DatePicker, Button, Form, Tabs } from 'antd';
import type { FormProps } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import MemberCard from '@/components/card/memberCard';
import VoucherTab from '@/components/voucher';
import CNJPointsTab from '@/components/cnjPoints';
import ModalChangePassword from '@/components/modal/auth/changePassword';
import useAppStore from '@/store/app.store';
import { updateUserApi, uploadAvatarApi } from '@/services/api';
import { useAlertContextApp } from '@/context/alert.context';
import 'styles/members.css';

type FieldType = {
  email: string;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
};

const MembersPage = () => {
  const [form] = Form.useForm();
  const [isSubmit, setIsSubmit] = useState<boolean>(false);
  const [isUploadSubmit, setIsUploadSubmit] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<string>('1');
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const { user, setUser, isDarkMode, setIsModalOpen } = useAppStore();
  const { messageApi } = useAlertContextApp();

  // Reset login modal state khi vào trang members
  useEffect(() => {
    setIsModalOpen(false);
  }, [setIsModalOpen]);
  
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth) : undefined,
        gender: user.gender || '',
      });
    }
  }, [user, form]);

  if (!user) {
    return (
      <div className={clsx("flex flex-col items-center justify-center min-h-[60vh]", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
        <div className={clsx("text-2xl font-semibold mb-4", isDarkMode ? "text-white" : "text-black")}>Bạn chưa đăng nhập!</div>
        <div className={clsx("text-gray-500", isDarkMode ? "text-white" : "text-black")}>Vui lòng đăng nhập để xem thông tin này.</div>
      </div>
    );
  }

  const handleSubmit: FormProps<FieldType>['onFinish'] = async (values) => {
    setIsSubmit(true);
    try {
      const payload = {
        fullName: values.fullName,
        phoneNumber: values.phoneNumber,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? dayjs(values.dateOfBirth).format('YYYY-MM-DD') : undefined,
      };
      const res = await updateUserApi(user._id, payload);
      if (res?.data) {
        setUser(res.data);
        messageApi?.open({
          type: 'success',
          content: res.message,
        });
      } else {
        messageApi?.open({
          type: 'error',
          content: res.message,
        });
      }
    } catch (error) {
      console.error(error);
      messageApi?.open({
        type: 'error',
        content: 'Có lỗi xảy ra!',
      });
    }
    setIsSubmit(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setPreviewImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveImage = async () => {
    if (!selectedImage) return;
    setIsUploadSubmit(true);
    try {
      const uploadRes = await uploadAvatarApi(selectedImage);
      if (uploadRes?.data?.url) {
        const updateRes = await updateUserApi(user._id, { avatar: uploadRes.data.url });
        if (updateRes?.data) {
          setUser(updateRes.data);
          messageApi?.open({
            type: 'success',
            content: 'Cập nhật ảnh đại diện thành công!',
          });
        } else {
          messageApi?.open({
            type: 'error',
            content: updateRes?.message || 'Cập nhật ảnh đại diện thất bại!',
          });
        }
      } else {
        messageApi?.open({
          type: 'error',
          content: uploadRes?.message || 'Tải ảnh lên thất bại!',
        });
      }
    } catch {
      messageApi?.open({
        type: 'error',
        content: 'Có lỗi xảy ra khi cập nhật ảnh!',
      });
    }
    setIsUploadSubmit(false);
    setSelectedImage(null);
    setPreviewImage(null);
  };

  return (
    <div className={clsx("pt-5 pb-10", isDarkMode ? "bg-[#181c24]" : "bg-white")}>
      <div className="flex justify-center w-full mb-7">
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          tabBarGutter={16}
          className={clsx("mb-8 cinejoy-profile-tabs", isDarkMode && "darkmode")}
          items={[
            { key: '1', label: <span style={{ fontWeight: 600, color: isDarkMode ? activeTabKey === '1' ? '#fff' : '#bbb' : '' }}>Thông tin cá nhân</span> },
            { key: '2', label: <span style={{ fontWeight: 600, color: isDarkMode ? activeTabKey === '2' ? '#fff' : '#bbb' : '' }}>Thẻ thành viên</span> },
            { key: '3', label: <span style={{ fontWeight: 600, color: isDarkMode ? activeTabKey === '3' ? '#fff' : '#bbb' : '' }}>Voucher</span> },
            { key: '4', label: <span style={{ fontWeight: 600, color: isDarkMode ? activeTabKey === '4' ? '#fff' : '#bbb' : '' }}>Điểm CNJ</span> },
          ]}
        />
      </div>
  
      <div className={clsx("min-h-[50vh] flex flex-col items-center", isDarkMode ? "bg-[#181c24]" : "bg-white") }>
        {activeTabKey === '1' ? (
          <div
            className={clsx(
              "w-full max-w-2xl rounded-2xl shadow-xl p-8 mx-2",
              isDarkMode ? "text-white" : "text-[#0f1b4c]"
            )}
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #23272f 0%, #23272f 60%, #23272f 100%)'
                : 'linear-gradient(180deg, #e0f7fa 0%, #b2ebf2 100%)'
            }}
          >
            <h2 className="text-2xl font-bold text-left mb-6" style={{ color: isDarkMode ? '#fff' : '#a05a1c' }}>Thông tin cá nhân</h2>
            <div className="flex flex-col items-center mb-6">
              <img
                src={previewImage || user.avatar}
                alt="Avatar"
                className={clsx("w-30 h-30 rounded-full object-cover border-3 shadow-lg mb-4", isDarkMode ? "border-gray-700" : "border-white")}
              />
              <div className="flex gap-2">
                <label style={{ cursor: 'pointer' }}>
                  <div
                    className={clsx(
                      'flex items-center justify-center gap-2 rounded font-semibold',
                      'transition-colors duration-150 select-none',
                      'shadow',
                      isDarkMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white',
                    )}
                    style={{ fontWeight: 600, borderRadius: 6, userSelect: 'none', minWidth: 140, height: 38, fontSize: 17, padding: '0 20px' }}
                  >
                    <FaUpload className="inline mr-1" /> Tải ảnh lên
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </label>
                {selectedImage && (
                  <Button
                    type="primary"
                    icon={<FaSave />}
                    style={{ background: isDarkMode ? '#27ae60' : '#43a047', borderColor: isDarkMode ? '#27ae60' : '#43a047', fontWeight: 600, borderRadius: 6, minWidth: 140, height: 38, fontSize: 17, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={handleSaveImage}
                    loading={isUploadSubmit}
                  >
                    Lưu ảnh
                  </Button>
                )}
              </div>
            </div>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6"
            >
              <Form.Item
                label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Email</span>}
                name="email"
                style={{ marginBottom: 0, gridColumn: 'span 2' }}
                rules={[
                  { required: true, message: "Vui lòng nhập email!" },
                  { type: "email", message: "Email không hợp lệ!" },
                  { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: "Email không được chứa ký tự đặc biệt và không được có dấu!" },
                ]}
              >
                <Input
                  size="large"
                  disabled
                  style={isDarkMode
                    ? { backgroundColor: '#2d323b', color: '#e0e0e0', borderColor: '#666', opacity: 1 }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb', opacity: 1 }
                  }
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Họ tên</span>}
                name="fullName"
                rules={[
                  { required: true, message: "Vui lòng nhập họ và tên!" },
                  { whitespace: true, message: "Họ và tên không được chỉ chứa khoảng trắng!" },
                  { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự!" },
                  { pattern: /^[^\d]*$/, message: "Họ và tên không được chứa số!" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  size="large"
                  style={isDarkMode
                    ? { backgroundColor: '#23272f', color: '#fff', borderColor: '#666', opacity: 1 }
                    : undefined
                  }
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Số điện thoại</span>}
                name="phoneNumber"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại!" },
                  { pattern: /^0[0-9]{9}$/, message: "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  size="large"
                  style={isDarkMode
                    ? { backgroundColor: '#23272f', color: '#fff', borderColor: '#666', opacity: 1 }
                    : undefined
                  }
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Ngày sinh</span>}
                name="dateOfBirth"
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  size="large"
                  disabled
                  className={isDarkMode ? 'disabled-datepicker-dark' : 'disabled-datepicker-light'}
                  style={isDarkMode
                    ? { width: '100%', backgroundColor: '#2d323b', color: '#e0e0e0', borderColor: '#666', opacity: 1 }
                    : { width: '100%', backgroundColor: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb', opacity: 1 }
                  }
                  allowClear={false}
                  popupStyle={isDarkMode ? { background: '#23272f', color: '#fff' } : undefined}
                />
              </Form.Item>
              <Form.Item
                label={<span style={{ color: isDarkMode ? '#fff' : undefined }}>Giới tính</span>}
                name="gender"
                rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
                style={{ marginBottom: 0 }}
              >
                <Select
                  size="large"
                  className={isDarkMode ? 'cinejoy-dark-select' : ''}
                  style={isDarkMode
                    ? { width: '100%', color: '#fff', borderColor: '#666', opacity: 1 }
                    : { width: '100%' }
                  }
                  dropdownStyle={isDarkMode ? { background: '#23272f', color: '#fff', border: '1px solid #666' } : undefined}
                  optionLabelProp="label"
                  getPopupContainer={trigger => trigger.parentNode}
                >
                  <Select.Option
                    value="Nam"
                    label="Nam"
                    style={isDarkMode ? { color: '#fff', background: '#23272f' } : {}}
                  >
                    <span style={isDarkMode ? { color: '#fff' } : {}}>Nam</span>
                  </Select.Option>
                  <Select.Option
                    value="Nữ"
                    label="Nữ"
                    style={isDarkMode ? { color: '#fff', background: '#23272f' } : {}}
                  >
                    <span style={isDarkMode ? { color: '#fff' } : {}}>Nữ</span>
                  </Select.Option>
                  <Select.Option
                    value="Khác"
                    label="Khác"
                    style={isDarkMode ? { color: '#fff', background: '#23272f' } : {}}
                  >
                    <span style={isDarkMode ? { color: '#fff' } : {}}>Khác</span>
                  </Select.Option>
                </Select>
              </Form.Item>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className={clsx(
                    "text-sm hover:underline cursor-pointer",
                    isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                  )}
                  style={{ cursor: 'pointer' }}
                >
                  Đổi mật khẩu?
                </button>
              </div>
              <Form.Item className="md:col-span-2 flex justify-center mt-2 mb-0" style={{ marginBottom: 0 }}>
                <Button type="primary" size="large" style={{ padding: '0px 32px' }} className="font-semibold px-8 text-lg" htmlType="submit" loading={isSubmit}>
                  Cập nhật
                </Button>
              </Form.Item>
            </Form>
          </div>
        ) : activeTabKey === '2' ? (
          <MemberCard user={user} />
        ) : activeTabKey === '3' ? (
          <VoucherTab />
        ) : activeTabKey === '4' ? (
          <CNJPointsTab />
        ) : (
          <div className={clsx("text-center py-10 text-xl font-semibold uppercase", isDarkMode ? "text-white" : "text-black")}>Đang phát triển tính năng</div>
        )}
      </div>
      <ModalChangePassword
        isOpen={isChangePasswordModalOpen}
        onClose={(value) => setIsChangePasswordModalOpen(value)}
      />
    </div>
  );
};

export default MembersPage; 