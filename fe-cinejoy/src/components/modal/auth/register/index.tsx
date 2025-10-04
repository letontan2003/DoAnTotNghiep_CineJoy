import { Button, Input, Modal, Form, Select, DatePicker } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { FormProps, InputRef } from 'antd';
import { registerApi } from '@/services/api';
import { useAlertContextApp } from '@/context/alert.context';
import dayjs from 'dayjs';
import useAppStore from '@/store/app.store';

type FieldType = {
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    dateOfBirth: string;
    password: string;
    confirmPassword: string;
};

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginModalOpen: () => void;
};

const ModalRegister = (props: IProps) => {
    const [form] = Form.useForm();
    const [isSubmit, setIsSubmit] = useState<boolean>(false);
    const inputRef = useRef<InputRef>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { messageApi } = useAlertContextApp();
    const { setUser, setIsAuthenticated } = useAppStore();

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

    const handleLoginModalOpen = () => {
        props.onClose();
        props.onLoginModalOpen();
    };

    const handleSubmit: FormProps<FieldType>['onFinish'] = async (values) => {
        setIsSubmit(true);
        const { fullName, email, password, dateOfBirth, gender, phoneNumber } = values;
        const res = await registerApi({
            email,
            password,
            fullName,
            dateOfBirth,
            gender,
            phoneNumber,
        });
        if (res.data) {
            localStorage.setItem("accessToken", res.data.accessToken);
            setUser(res.data.user);
            setIsAuthenticated(true);
            messageApi!.open({
                type: "success",
                content: "Đăng ký thành công!",
            });
            props.onClose();
        } else
            messageApi!.open({
                type: "error",
                content: res.message,
            });
        setIsSubmit(false);      
    };

    return (
        <>
            <Modal
                open={props.isOpen}
                onCancel={props.onClose}
                footer={null}
                centered
                width={450}
                getContainer={false}
            >
                <div className="text-center font-semibold text-xl text-[#0f1b4c] mt-2 mb-3 select-none">Đăng ký tài khoản</div>

                <Form layout="vertical" form={form} style={{ padding: '0 20px' }} onFinish={handleSubmit}>
                    <Form.Item<FieldType>
                        label="Họ và tên"
                        name="fullName"
                        rules={[
                            { required: true, message: "Vui lòng nhập họ và tên!" },
                            { whitespace: true, message: "Họ và tên không được chỉ chứa khoảng trắng!" },
                            { min: 2, message: "Họ và tên phải có ít nhất 2 ký tự!" },
                            { pattern: /^[^\d]*$/, message: "Họ và tên không được chứa số!" },
                        ]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                        <Input ref={inputRef} style={{ padding: '6px 10px' }} placeholder="Họ và tên" onKeyDown={(e) => {
                            if (e.key === " " && !(e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                            }
                        }} />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email!" },
                            { type: "email", message: "Email không hợp lệ!" },
                            { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: "Email không được chứa ký tự đặc biệt và không được có dấu!" },
                        ]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                        <Input style={{ padding: '6px 10px' }} placeholder="Email" onKeyDown={(e) => {
                            if (e.key === " " && !(e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                            }
                        }} />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Số điện thoại"
                        name="phoneNumber"
                        rules={[
                            { required: true, message: "Vui lòng nhập số điện thoại!" },
                            { pattern: /^0[0-9]{9}$/, message: "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0!" },
                        ]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                        <Input style={{ padding: '6px 10px' }} placeholder="Số điện thoại" onKeyDown={(e) => {
                            if (e.key === " " && !(e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                            }
                        }} />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Giới tính"
                        name="gender"
                        rules={[{ required: true, message: "Vui lòng chọn giới tính!" }]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                        <Select placeholder="Chọn giới tính">
                            <Select.Option value="Nam">Nam</Select.Option>
                            <Select.Option value="Nữ">Nữ</Select.Option>
                            <Select.Option value="Khác">Khác</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Ngày sinh"
                        name="dateOfBirth"
                        rules={[
                            { required: true, message: "Vui lòng chọn ngày sinh!" },
                            ({ validator(_, value) {
                                if (value && value.isAfter(dayjs())) {
                                    return Promise.reject(new Error('Ngày sinh không được lớn hơn ngày hiện tại!'));
                                }
                                return Promise.resolve();
                            }
                            }),
                        ]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                    <DatePicker
                        format="DD/MM/YYYY"
                        style={{ width: '100%', padding: '6px 10px' }}
                        placeholder="Chọn ngày sinh"
                    />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Mật khẩu"
                        name="password"
                        rules={[
                            { required: true, message: "Vui lòng nhập mật khẩu!" },
                            { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự!" },
                            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, message: "Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt!" },
                        ]}
                        style={{
                            margin: '10px 0'
                        }}
                    >
                        <Input.Password style={{ padding: '6px 10px' }} placeholder="Mật khẩu" onKeyDown={(e) => {
                            if (e.key === " " && !(e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                            }
                        }} />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Nhập lại mật khẩu"
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng nhập lại mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu không khớp!'));
                                }
                            }),
                        ]}
                        style={{ margin: '10px 0' }}
                    >
                        <Input.Password style={{ padding: '6px 10px' }} placeholder="Nhập lại mật khẩu" onKeyDown={(e) => {
                            if (e.key === " " && !(e.target as HTMLInputElement).value.trim()) {
                                e.preventDefault();
                            }
                        }} />
                    </Form.Item>

                    <Form.Item<FieldType>>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            className="bg-blue-600 hover:bg-blue-700 mt-2"
                            size='large'
                            loading={isSubmit}
                        >
                            Đăng ký
                        </Button>
                    </Form.Item>
                </Form>

                <div className="text-center text-sm mt-3 mb-3">
                    Bạn đã có tài khoản?{" "}
                    <button className="text-blue-600 cursor-pointer hover:underline" onClick={handleLoginModalOpen}>
                        Đăng nhập
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default ModalRegister;