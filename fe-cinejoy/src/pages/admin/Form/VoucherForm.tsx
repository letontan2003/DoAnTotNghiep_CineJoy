/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Modal, Form, Input, InputNumber, DatePicker, Spin, Select, message, Popconfirm } from 'antd';
import type { InputRef } from 'antd';
import dayjs from 'dayjs';
import { getFoodCombos } from '@/apiservice/apiFoodCombo';
import { getVouchers } from '@/apiservice/apiVoucher';

interface VoucherFormProps {
    voucher?: IVoucher;
    onSubmit: (voucherData: Partial<IVoucher>) => Promise<void>;
    onCancel: () => void;
}

const VoucherForm: React.FC<VoucherFormProps> = ({ voucher, onSubmit, onCancel }) => {
    const nameInputRef = useRef<InputRef>(null);
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [foodCombos, setFoodCombos] = useState<IFoodCombo[]>([]);
    const [statusLocked, setStatusLocked] = useState<boolean>(false);
    const [existingVouchers, setExistingVouchers] = useState<IVoucher[]>([]);

    // Load danh sách sản phẩm/combo
    useEffect(() => {
        const loadFoodCombos = async () => {
            try {
                const data = await getFoodCombos();
                setFoodCombos(data);
            } catch (error) {
                console.error('Error loading food combos:', error);
                setFoodCombos([]);
            }
        };
        loadFoodCombos();
    }, []);

    // Load danh sách voucher hiện có để kiểm tra trùng lặp
    useEffect(() => {
        const loadExistingVouchers = async () => {
            try {
                const data = await getVouchers();
                setExistingVouchers(data);
            } catch (error) {
                console.error('Error loading existing vouchers:', error);
                setExistingVouchers([]);
            }
        };
        loadExistingVouchers();
    }, []);

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

    useEffect(() => {
        if (voucher) {
            form.setFieldsValue({
                name: voucher.name,
                promotionalCode: voucher.promotionalCode,
                startDate: voucher.startDate ? dayjs(voucher.startDate) : (voucher.validityPeriod?.startDate ? dayjs(voucher.validityPeriod.startDate) : undefined),
                endDate: voucher.endDate ? dayjs(voucher.endDate) : (voucher.validityPeriod?.endDate ? dayjs(voucher.validityPeriod.endDate) : undefined),
                status: voucher.status || 'hoạt động',
                description: voucher.description || '',
            });
            setStatusLocked(false); // Không khóa trạng thái khi edit
        } else {
            setStatusLocked(false); // Không khóa trạng thái khi thêm mới
            // Tự động cập nhật trạng thái ban đầu cho form thêm mới
            const today = dayjs();
            form.setFieldValue('status', 'không hoạt động'); // Mặc định là không hoạt động
        }
    }, [voucher, form]);

    // Tự động focus vào input tên voucher chỉ khi thêm mới (không phải edit)
    useEffect(() => {
        if (!voucher) {
            const timer = setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [voucher]);

    // Tự động cập nhật trạng thái dựa trên ngày
    const updateStatusBasedOnDates = (startDate: dayjs.Dayjs | null, endDate: dayjs.Dayjs | null) => {
        if (!startDate || !endDate) return;
        
        const today = dayjs();
        const isWithinRange = today.isAfter(startDate.startOf('day')) && today.isBefore(endDate.endOf('day'));
        
        if (isWithinRange) {
            form.setFieldValue('status', 'hoạt động');
        } else {
            form.setFieldValue('status', 'không hoạt động');
        }
    };

    // Kiểm tra trùng lặp khoảng thời gian
    const checkDateOverlap = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): boolean => {
        if (!startDate || !endDate) return false;
        
        const currentStart = startDate.startOf('day');
        const currentEnd = endDate.endOf('day');
        
        return existingVouchers.some(existingVoucher => {
            // Bỏ qua voucher hiện tại khi edit
            if (voucher && existingVoucher._id === voucher._id) return false;
            
            const existingStart = dayjs(existingVoucher.startDate).startOf('day');
            const existingEnd = dayjs(existingVoucher.endDate).endOf('day');
            
            // Kiểm tra trùng lặp: (start1 <= end2) && (start2 <= end1)
            return (currentStart.isSameOrBefore(existingEnd) && currentEnd.isSameOrAfter(existingStart));
        });
    };

    // Kiểm tra ngày có bị trùng lặp không
    const isDateInOverlapRange = (date: dayjs.Dayjs): boolean => {
        return existingVouchers.some(existingVoucher => {
            // Bỏ qua voucher hiện tại khi edit
            if (voucher && existingVoucher._id === voucher._id) return false;
            
            const existingStart = dayjs(existingVoucher.startDate).startOf('day');
            const existingEnd = dayjs(existingVoucher.endDate).endOf('day');
            
            return date.isSameOrAfter(existingStart) && date.isSameOrBefore(existingEnd);
        });
    };

    const handleSubmit = async (values: {
        name: string;
        promotionalCode: string;
        startDate: dayjs.Dayjs;
        endDate: dayjs.Dayjs;
        status: 'hoạt động' | 'không hoạt động';
        description: string;
    }) => {
        try {
            setIsLoading(true);
            
            const submitData: any = {
                name: values.name,
                promotionalCode: values.promotionalCode?.toUpperCase().trim(),
                startDate: values.startDate ? values.startDate.toDate() : new Date(),
                endDate: values.endDate ? values.endDate.toDate() : new Date(),
                status: values.status,
                description: values.description,
            };
            
            await onSubmit(submitData);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            open
            title={<div className="text-center text-xl md:text-xl font-semibold">{voucher ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</div>}
            onCancel={onCancel}
            footer={null}
            width={700}
            centered
            destroyOnClose
            style={{ marginTop: '2vh', marginBottom: '2vh' }}
            bodyStyle={{
                maxHeight: '70vh',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
            className="hide-scrollbar"
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"khi mới
            >
                {/* 1.1 Mã khuyến mãi */}
                <Form.Item
                    name="promotionalCode"
                    label="Mã khuyến mãi"
                    tooltip="Mã viết tắt để nhập tay khi áp dụng, vd: KM001, KM002"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mã khuyến mãi!' },
                        { pattern: /^KM\d{3}$/, message: 'Mã khuyến mãi phải có định dạng KM001, KM002, ...' },
                        {
                            validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                const existingVoucher = existingVouchers.find(v =>
                                    v.promotionalCode === value &&
                                    (!voucher || v._id !== voucher._id)
                                );
                                if (existingVoucher) {
                                    return Promise.reject(new Error('Mã khuyến mãi này đã tồn tại!'));
                                }
                                return Promise.resolve();
                            }
                        }
                    ]}
                >
                    <Input placeholder="KM001, KM002, ..." size="large" />
                </Form.Item>

                {/* 1. Tên Khuyến mãi */}
                <Form.Item
                    name="name"
                    label="Tên khuyến mãi"
                    rules={[
                        { required: true, message: 'Vui lòng nhập tên khuyến mãi!' },
                        { min: 3, message: 'Tên khuyến mãi phải có ít nhất 3 ký tự!' },
                        { max: 100, message: 'Tên khuyến mãi không được quá 100 ký tự!' }
                    ]}
                >
                    <Input
                        ref={nameInputRef}
                        placeholder="Ví dụ: Ưu đãi tháng 09"
                        size="large"
                    />
                </Form.Item>

                {/* 2. Startday, 3. Enday */}
                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="startDate"
                        label="Ngày bắt đầu"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày bắt đầu!' }
                        ]}
                    >
                        <DatePicker
                            placeholder="Chọn ngày bắt đầu"
                            size="large"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            disabledDate={(current) => {
                                if (!current) return false;
                                // Khóa ngày trong quá khứ
                                if (current < dayjs().startOf('day')) return true;
                                // Khóa ngày trùng lặp với voucher khác
                                return isDateInOverlapRange(current);
                            }}
                            onChange={(date) => {
                                const endDate = form.getFieldValue('endDate');
                                updateStatusBasedOnDates(date, endDate);
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
                                    const startDate = getFieldValue('startDate');
                                    if (!value || !startDate) {
                                        return Promise.resolve();
                                    }
                                    if (value.isSame(startDate, 'day') || value.isAfter(startDate)) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Ngày kết thúc không được trước ngày bắt đầu!'));
                                },
                            }),
                        ]}
                    >
                        <DatePicker
                            placeholder="Chọn ngày kết thúc"
                            size="large"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            disabledDate={(current) => {
                                if (!current) return false;
                                const startDate = form.getFieldValue('startDate');
                                // Khóa ngày trong quá khứ
                                if (current < dayjs().startOf('day')) return true;
                                // Khóa ngày trước startDate
                                if (startDate && current < startDate) return true;
                                // Khóa ngày trùng lặp với voucher khác
                                return isDateInOverlapRange(current);
                            }}
                            onChange={(date) => {
                                const startDate = form.getFieldValue('startDate');
                                updateStatusBasedOnDates(startDate, date);
                            }}
                        />
                    </Form.Item>
                </div>

                {/* 4. Trạng thái */}
                <Form.Item
                    name="status"
                    label="Trạng thái"
                    rules={[
                        { required: true, message: 'Vui lòng chọn trạng thái!' }
                    ]}
                >
                    <Select
                        placeholder="Chọn trạng thái"
                        size="large"
                        disabled={statusLocked}
                        options={[
                            { value: 'hoạt động', label: 'Hoạt động' },
                            { value: 'không hoạt động', label: 'Không hoạt động' }
                        ]}
                    />
                </Form.Item>

                {/* 6. Mô tả */}
                <Form.Item
                    name="description"
                    label="Mô tả khuyến mãi"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mô tả khuyến mãi!' },
                        { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' },
                        { max: 200, message: 'Mô tả không được quá 200 ký tự!' }
                    ]}
                >
                    <Input.TextArea
                        placeholder="Ví dụ: Tổng hợp ưu đãi trong tháng 09"
                        size="large"
                        rows={3}
                    />
                </Form.Item>

                {/* (Đã loại bỏ) Điểm để đổi / Số lượng */}

                {/* 7.1. Các trường cho ticket/combo */}
                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType}>
                    {({ getFieldValue }) => {
                        const applyType = getFieldValue('applyType');
                        if (applyType !== 'ticket' && applyType !== 'combo') {
                            return null; // Chỉ hiển thị cho ticket và combo
                        }
                        return (
                            <div className="space-y-1">
                                <Form.Item
                                    name={applyType === 'combo' ? "comboName" : "seatType"}
                                    label={applyType === 'combo' ? "Tên combo" : "Loại ghế"}
                                    rules={[
                                        { required: true, message: applyType === 'combo' ? 'Vui lòng chọn combo!' : 'Vui lòng chọn loại ghế!' }
                                    ]}
                                    style={{ marginBottom: '8px' }}
                                >
                                    {applyType === 'combo' ? (
                                        <Select
                                            placeholder="Chọn combo"
                                            size="large"
                                            showSearch
                                            optionFilterProp="children"
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={foodCombos.filter(item => item.type === 'combo').map(item => ({
                                                value: item.name,
                                                label: item.name,
                                                data: item
                                            }))}
                                            onChange={(value, option: any) => {
                                                // Lưu ID của combo được chọn
                                                console.log('Combo selected:', value, option);
                                                if (option && option.data) {
                                                    console.log('Setting comboId:', option.data._id);
                                                    form.setFieldValue('comboId', option.data._id);
                                                    form.setFieldValue('comboName', value);
                                                    // Nếu đã mở phần chi tiết và đã chọn "Mua combo" khác trước đó thì đồng bộ lại
                                                    const buyItem = form.getFieldValue('buyItem');
                                                    if (buyItem && buyItem !== value) {
                                                        form.setFieldValue('buyItem', value);
                                                    }
                                                }
                                            }}
                                        />
                                    ) : (
                                        <Select
                                            placeholder="Chọn loại ghế"
                                            size="large"
                                            options={[
                                                { value: 'normal', label: 'Ghế thường' },
                                                { value: 'vip', label: 'Ghế VIP' },
                                                { value: 'couple', label: 'Ghế đôi' },
                                                { value: '4dx', label: 'Ghế 4DX' }
                                            ]}
                                            onChange={(value) => {
                                                // Đồng bộ loại vé trong chi tiết nếu đang mở
                                                const labelMap: Record<string, string> = {
                                                    normal: 'Vé thường',
                                                    vip: 'Vé Vip',
                                                    couple: 'Vé Cặp đôi',
                                                    '4dx': 'Vé 4DX'
                                                };
                                                if (showDetails) {
                                                    form.setFieldValue('buyItem', labelMap[value]);
                                                }
                                            }}
                                        />
                                    )}
                                </Form.Item>
                                
                                {/* Hidden field để lưu comboId cho combo */}
                                {applyType === 'combo' && (
                                    <Form.Item name="comboId" style={{ display: 'none' }}>
                                        <Input />
                                    </Form.Item>
                                )}

                                {/* Loại giảm giá và Giá trị giảm giá cho ticket */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Form.Item
                                        name="discountType"
                                        label="Loại giảm giá"
                                        style={{ marginBottom: '8px' }}
                                    >
                                        <Select
                                            placeholder="Chọn loại giảm giá"
                                            size="large"
                                            defaultValue="percent"
                                            options={[
                                                { value: 'percent', label: 'Phần trăm (%)' }
                                            ]}
                                            disabled
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="discountValue"
                                        label="Giá trị giảm giá"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập giá trị giảm giá!' },
                                            { type: 'number', min: 0, max: 100, message: 'Giá trị phải từ 0 đến 100!' }
                                        ]}
                                        style={{ marginBottom: '8px' }}
                                    >
                                        <InputNumber
                                            placeholder="Nhập phần trăm"
                                            size="large"
                                            min={0}
                                            max={100}
                                            style={{ width: '100%' }}
                                            addonAfter="%"
                                        />
                                    </Form.Item>
                                </div>

                                {/* Nút Thêm chi tiết - chỉ hiển thị cho ticket */}
                                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType}>
                                    {({ getFieldValue }) => {
                                        const applyType = getFieldValue('applyType');
                                        if ((applyType === 'ticket' || applyType === 'combo') && !showDetails) {
                                            return (
                                                <div className="flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowDetails(true)}
                                                        className="border border-dashed border-gray-300 rounded-md px-4 py-2 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 bg-white"
                                                    >
                                                        <span className="text-sm">+</span>
                                                        <span className="text-sm">Thêm chi tiết</span>
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                </Form.Item>

                                {/* Form chi tiết - chỉ hiển thị cho ticket khi showDetails = true */}
                                <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.applyType !== currentValues.applyType}>
                                    {({ getFieldValue }) => {
                                        const applyType = getFieldValue('applyType');
                                        if ((applyType === 'ticket' || applyType === 'combo') && showDetails) {
                                            return (
                                                <div className="space-y-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="text-base font-medium text-gray-700">Chi tiết quà tặng</h4>
                                                        <Popconfirm
                                                            title="Xóa chi tiết quà tặng"
                                                            description="Bạn có chắc muốn xóa chi tiết quà tặng?"
                                                            okText="Xóa"
                                                            cancelText="Hủy"
                                                            onConfirm={() => {
                                                                setShowDetails(false);
                                                                form.setFieldsValue({
                                                                    buyItem: undefined,
                                                                    buyQuantity: undefined,
                                                                    rewardItem: undefined,
                                                                    rewardItemId: undefined,
                                                                    rewardQuantity: undefined,
                                                                    rewardType: undefined
                                                                });
                                                                message.success('Đã xóa chi tiết quà tặng');
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="text-gray-400 hover:text-red-600 text-lg"
                                                            >
                                                                ×
                                                            </button>
                                                        </Popconfirm>
                                                    </div>
                                                    
                                                    {/* Form cho ticket/combo */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Form.Item shouldUpdate={(prev, cur) => prev.comboName !== cur.comboName || prev.seatType !== cur.seatType}>
                                                            {({ getFieldValue }) => (
                                                                <Form.Item
                                                                    name="buyItem"
                                                                    label={applyType === 'combo' ? "Mua combo" : "Mua sản phẩm"}
                                                                >
                                                                    {applyType === 'combo' ? (
                                                                        <Select
                                                                            placeholder={getFieldValue('comboName') ? "Chọn combo" : "Chọn Tên combo trước"}
                                                                            size="large"
                                                                            showSearch
                                                                            optionFilterProp="children"
                                                                            filterOption={(input, option) =>
                                                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                                            }
                                                                            disabled={!getFieldValue('comboName')}
                                                                            options={foodCombos
                                                                                .filter(item => item.type === 'combo' && (!getFieldValue('comboName') || item.name === getFieldValue('comboName')))
                                                                                .map(item => ({
                                                                                    value: item.name,
                                                                                    label: item.name,
                                                                                    data: item
                                                                                }))}
                                                                            onChange={(value, option: any) => {
                                                                                // Ràng buộc: phải chọn Tên combo trước
                                                                                const selectedComboName = getFieldValue('comboName');
                                                                                if (!selectedComboName) {
                                                                                    message.warning('Vui lòng chọn Tên combo trước.');
                                                                                    // Reset lựa chọn không hợp lệ
                                                                                    form.setFieldValue('buyItem', undefined);
                                                                                    return;
                                                                                }
                                                                                // Ràng buộc: Mua combo phải trùng Tên combo
                                                                                if (value !== selectedComboName) {
                                                                                    message.error('Mua combo phải trùng với Tên combo đã chọn.');
                                                                                    form.setFieldValue('buyItem', selectedComboName);
                                                                                    return;
                                                                                }
                                                                                // Lưu ID của combo được chọn
                                                                                if (option && option.data) {
                                                                                    form.setFieldValue('rewardItemId', option.data._id);
                                                                                    form.setFieldValue('buyItem', value);
                                                                                }
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Select
                                                                            placeholder={getFieldValue('seatType') ? "Chọn loại vé" : "Chọn Loại ghế trước"}
                                                                            size="large"
                                                                            disabled={!getFieldValue('seatType')}
                                                                            options={(function(){
                                                                                const seatType = getFieldValue('seatType');
                                                                                const labelMap: Record<string, string> = {
                                                                                    normal: 'Vé thường',
                                                                                    vip: 'Vé Vip',
                                                                                    couple: 'Vé Cặp đôi',
                                                                                    '4dx': 'Vé 4DX'
                                                                                };
                                                                                if (!seatType) return [];
                                                                                const label = labelMap[seatType as string];
                                                                                return [{ value: label, label }];
                                                                            })()}
                                                                            onChange={(value) => {
                                                                                const seatType = getFieldValue('seatType');
                                                                                const labelMap: Record<string, string> = {
                                                                                    normal: 'Vé thường',
                                                                                    vip: 'Vé Vip',
                                                                                    couple: 'Vé Cặp đôi',
                                                                                    '4dx': 'Vé 4DX'
                                                                                };
                                                                                const expected = seatType ? labelMap[seatType as string] : undefined;
                                                                                if (!seatType) {
                                                                                    message.warning('Vui lòng chọn Loại ghế trước.');
                                                                                    form.setFieldValue('buyItem', undefined);
                                                                                    return;
                                                                                }
                                                                                if (expected && value !== expected) {
                                                                                    message.error('Loại vé phải trùng với Loại ghế đã chọn.');
                                                                                    form.setFieldValue('buyItem', expected);
                                                                                }
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Form.Item>
                                                            )}
                                                        </Form.Item>
                                                        
                                                        

                                                        <Form.Item
                                                            name="buyQuantity"
                                                            label="Số lượng mua"
                                                            rules={[
                                                                { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0!' }
                                                            ]}
                                                        >
                                                            <InputNumber
                                                                placeholder="Nhập số lượng"
                                                                size="large"
                                                                min={1}
                                                                max={10}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </Form.Item>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Form.Item
                                                            name="rewardItem"
                                                            label="Sản phẩm tặng"
                                                        >
                                                            <Select
                                                                placeholder="Chọn sản phẩm/combo"
                                                                size="large"
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
                                                                onChange={(value, option: any) => {
                                                                    // Lưu ID của sản phẩm/combo được chọn
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
                                                            rules={[
                                                                { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0!' }
                                                            ]}
                                                        >
                                                            <InputNumber
                                                                placeholder="Nhập số lượng"
                                                                size="large"
                                                                min={1}
                                                                max={10}
                                                                style={{ width: '100%' }}
                                                            />
                                                        </Form.Item>
                                                    </div>

                                                    <Form.Item
                                                        name="rewardType"
                                                        label="Loại tặng"
                                                    >
                                                        <Select
                                                            placeholder="Chọn loại tặng"
                                                            size="large"
                                                            options={[
                                                                { value: 'free', label: 'Miễn phí' },
                                                                { value: 'discount', label: 'Giảm giá' }
                                                            ]}
                                                            onChange={(value) => {
                                                                if (value !== 'discount') {
                                                                    form.setFieldValue('rewardDiscountPercent', undefined);
                                                                }
                                                            }}
                                                        />
                                                    </Form.Item>

                                                    {/* Phần trăm giảm cho chi tiết khi chọn Giảm giá */}
                                                    <Form.Item shouldUpdate={(prev, cur) => prev.rewardType !== cur.rewardType}>
                                                        {({ getFieldValue }) => {
                                                            const rewardType = getFieldValue('rewardType');
                                                            if (rewardType !== 'discount') return null;
                                                            return (
                                                                <Form.Item
                                                                    name="rewardDiscountPercent"
                                                                    label="Phần trăm giảm cho chi tiết"
                                                                    rules={[{ required: true, message: 'Nhập phần trăm giảm!' }]}
                                                                >
                                                                    <InputNumber
                                                                        placeholder="Nhập phần trăm"
                                                                        size="large"
                                                                        min={1}
                                                                        max={100}
                                                                        style={{ width: '100%' }}
                                                                        addonAfter="%"
                                                                    />
                                                                </Form.Item>
                                                            );
                                                        }}
                                                    </Form.Item>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                </Form.Item>


                            </div>
                        );
                    }}
                </Form.Item>

                {/* (Đã loại bỏ) Loại giảm giá */}

                {/* (Đã loại bỏ) Giảm tối đa */}

                <div className="flex justify-end gap-4 mt-3">
                    <motion.button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Hủy
                    </motion.button>
                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        className={`px-4 py-2 text-white rounded cursor-pointer flex items-center gap-2 ${
                            isLoading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-black hover:bg-gray-800'
                        }`}
                        whileHover={!isLoading ? { scale: 1.05 } : {}}
                        whileTap={!isLoading ? { scale: 0.95 } : {}}
                    >
                        {isLoading && <Spin size="small" />}
                        {isLoading 
                            ? (voucher ? 'Đang cập nhật...' : 'Đang thêm...') 
                            : (voucher ? 'Cập nhật' : 'Thêm mới')
                        }
                    </motion.button>
                </div>
            </Form>
        </Modal>
    );
};

export default VoucherForm;
