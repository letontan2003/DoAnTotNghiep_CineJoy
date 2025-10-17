import { Button, Input, Modal, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import type { FormProps, InputRef } from 'antd';
import ModalRegister from 'components/modal/auth/register';
import ModalForgotPassword from 'components/modal/auth/forgotPassword';
import { loginApi } from '@/services/api';
import useAppStore from '@/store/app.store';
import { useAlertContextApp } from '@/context/alert.context';

type FieldType = {
    email: string;
    password: string;
};

interface IProps {
    isOpen: boolean;
    onOpen: (value: boolean) => void;
    onClose: (value: boolean) => void;
};  

const ModalLogin = (props: IProps) => {
    const [form] = Form.useForm();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
    const [isForgotPasswordModalOpen, setIsForgotPasswordOpen] = useState<boolean>(false);
    const [isSubmit, setIsSubmit] = useState<boolean>(false);
    const { setUser, setIsAuthenticated, setIsDarkMode } = useAppStore();
    const { messageApi } = useAlertContextApp();

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

    const handleOpenRegisterModal = () => {
        setIsRegisterModalOpen(true);
        props.onClose(true);
    };

    const handleCloseRegisterModal = () => {
        setIsRegisterModalOpen(false);
        props.onClose(false);
    };

    const handleOpenForgotPasswordModal = () => {
        setIsForgotPasswordOpen(true);
        props.onClose(true);
    };

    const handleCloseForgotPasswordModal = () => {
        setIsForgotPasswordOpen(false);
        props.onClose(false);
    };

    const handleSubmit: FormProps<FieldType>['onFinish'] = async (values) => {
        setIsSubmit(true);
        const { email, password } = values;
        const res = await loginApi({
            email,
            password,
        });
        if (res.data) {
            localStorage.setItem("accessToken", res.data.accessToken);
            sessionStorage.setItem("current_user_id", res.data.user._id);
            setUser(res.data.user);
            setIsAuthenticated(true);
            setIsDarkMode(res.data.user.settings.darkMode);
            messageApi!.open({
                type: "success",
                content: "Đăng nhập thành công!",
            });
            props.onClose(false);
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
                onCancel={() => props.onClose(false)}
                footer={null}
                centered
                width={450}
                getContainer={false}
                zIndex={10000}
            >
                <div className="text-center font-semibold text-xl text-[#0f1b4c] mt-4 mb-6 select-none">Đăng nhập</div>

                <Form layout="vertical" form={form} onFinish={handleSubmit} style={{ padding: '5px 20px 0 20px' }}>
                    <Form.Item<FieldType>
                        label="Nhập Email"
                        name="email"
                        rules={[
                            { required: true, message: "Vui lòng nhập email!" },
                            { type: "email", message: "Email không hợp lệ!" },
                        ]}
                    >
                        <Input ref={inputRef} style={{ padding: '6px 10px' }} placeholder="Nhập email" />
                    </Form.Item>

                    <Form.Item<FieldType>
                        label="Mật khẩu"
                        name="password"
                        rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
                    >
                        <Input.Password style={{ padding: '6px 10px' }} placeholder="Nhập mật khẩu" />
                    </Form.Item>

                    <Form.Item<FieldType>>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            className="bg-blue-600 hover:bg-blue-700"
                            size='large'
                            loading={isSubmit}
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>

                <div className="text-center text-gray-500 text-md select-none">Hoặc đăng nhập bằng</div>

                <div className="flex items-center justify-center space-x-6 text-2xl mt-3">
                    <FcGoogle size={40} className="cursor-pointer" />
                    <FaFacebook size={37} className="text-blue-600 cursor-pointer" />
                </div>

                <div className="text-center text-sm mt-3">
                    <button className="text-blue-600 cursor-pointer hover:underline" onClick={handleOpenForgotPasswordModal}>
                        Quên mật khẩu?
                    </button>
                </div>

                <div className="text-center text-sm mt-3 mb-4">
                    Bạn chưa có tài khoản?{" "}
                    <button className="text-blue-600 cursor-pointer hover:underline" onClick={handleOpenRegisterModal}>
                        Đăng ký
                    </button>
                </div>
            </Modal>

            <ModalRegister isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} onLoginModalOpen={() => props.onOpen(true)} />
            <ModalForgotPassword isOpen={isForgotPasswordModalOpen} onClose={handleCloseForgotPasswordModal} onLoginModalOpen={() => props.onOpen(true)} />
        </>
    );
};

export default ModalLogin;