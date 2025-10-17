import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Modal, Form, Input, InputNumber, Spin, Select, Button, Card, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';

const { Option } = Select;

interface FoodComboFormProps {
    combo?: IFoodCombo;
    onSubmit: (comboData: Partial<IFoodCombo>) => Promise<void>;
    onCancel: () => void;
}

const FoodComboForm: React.FC<FoodComboFormProps> = ({ combo, onSubmit, onCancel }) => {
    const nameInputRef = useRef<InputRef>(null);
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [productType, setProductType] = useState<'single' | 'combo'>('single');
    const [availableProducts, setAvailableProducts] = useState<IFoodCombo[]>([]);

    useEffect(() => {
        if (combo) {
            const type = combo.type || 'single';
            setProductType(type);
            
            // Xử lý items để đảm bảo productId là string
            const processedItems = (combo.items || []).map((item: IComboItem & { productId: string | { _id: string } }) => ({
                ...item,
                productId: typeof item.productId === 'object' ? (item.productId as { _id: string })._id : item.productId
            }));

            form.setFieldsValue({
                // @ts-expect-error backend supplies code
                code: (combo as any).code,
                name: combo.name,
                description: combo.description,
                type: type,
                items: processedItems,
            });

        }
    }, [combo, form, availableProducts]);

    // Load available single products for combo creation
    useEffect(() => {
        if (productType === 'combo') {
            loadSingleProducts();
        }
    }, [productType]);

    // Load available products when editing combo
    useEffect(() => {
        if (combo && combo.type === 'combo') {
            loadSingleProducts();
        }
    }, [combo]);


    const loadSingleProducts = async () => {
        try {
            const { getSingleProducts } = await import('@/apiservice/apiFoodCombo');
            const products = await getSingleProducts();
            console.log('Available products loaded:', products);
            setAvailableProducts(products);
        } catch (error) {
            console.error('Error loading single products:', error);
            setAvailableProducts([]);
        }
    };


    // Tự động focus vào input tên combo chỉ khi thêm mới (không phải edit)
    useEffect(() => {
        if (!combo) {
            const timer = setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [combo]);

        const handleSubmit = async (values: Partial<IFoodCombo> & { code?: string }) => {
        try {
            setIsLoading(true);
            
            if (productType === 'single') {
                const submitData: Partial<IFoodCombo> = {
                    // @ts-expect-error extend field
                    code: values.code,
                    name: values.name,
                    description: values.description,
                    type: 'single',
                };
                await onSubmit(submitData as any);
            } else {
                // Combo type
                const submitData: Partial<IFoodCombo> = {
                    // @ts-expect-error extend field
                    code: values.code,
                    name: values.name,
                    description: values.description,
                    items: values.items || [],
                    type: 'combo',
                };
                await onSubmit(submitData as any);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Modal
            open
            title={<div className="text-center text-xl md:text-xl font-semibold">
                {combo ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </div>}
            onCancel={onCancel}
            footer={null}
            width={800}
            centered
            destroyOnClose
            style={{ 
                marginTop: '2vh',
                marginBottom: '2vh',
                maxHeight: '96vh'
            }}
            bodyStyle={{
                maxHeight: 'calc(96vh - 110px)',
                overflowY: 'auto',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE và Edge
            }}
            className="hide-scrollbar"
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
            >
                {/* Code */}
                <Form.Item
                    name="code"
                    label={productType === 'single' ? 'Mã sản phẩm' : 'Mã combo'}
                    rules={[
                        { required: true, message: 'Vui lòng nhập mã!' },
                        // Kiểm tra trùng mã tại FE
                        {
                            validator: async (_: unknown, value: string) => {
                                const v = String(value || '').trim();
                                if (!v) return Promise.resolve();
                                try {
                                    const { getFoodCombos } = await import('@/apiservice/apiFoodCombo');
                                    const all = await getFoodCombos();
                                    const currentId = (combo as any)?._id;
                                    const exists = all.some((c: any) => String(c.code).toUpperCase() === v.toUpperCase() && c._id !== currentId);
                                    if (exists) return Promise.reject(new Error('Mã đã tồn tại, vui lòng chọn mã khác'));
                                } catch {}
                                return Promise.resolve();
                            }
                        },
                        {
                            validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                const v = String(value).toUpperCase();
                                const ok = productType === 'single' ? /^SP\d{3,}$/ : /^CB\d{3,}$/;
                                return ok.test(v) ? Promise.resolve() : Promise.reject(new Error(productType === 'single' ? 'Định dạng SPxxx, ví dụ SP001' : 'Định dạng CBxxx, ví dụ CB001'));
                            }
                        }
                    ]}
                >
                    <Input placeholder={productType === 'single' ? 'VD: SP001' : 'VD: CB001'} size="large"/>
                </Form.Item>

                {/* Product Type Selection */}
                <Form.Item
                    name="type"
                    label="Loại sản phẩm"
                    rules={[{ required: true, message: 'Vui lòng chọn loại sản phẩm!' }]}
                    initialValue="single"
                >
                    <Select
                        size="large"
                        placeholder="Chọn loại sản phẩm"
                        onChange={(value) => setProductType(value)}
                        disabled={!!combo} // Disable when editing
                    >
                        <Option value="single">Sản phẩm đơn lẻ</Option>
                        <Option value="combo">Combo</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="name"
                    label={productType === 'single' ? 'Tên sản phẩm' : 'Tên combo'}
                    rules={[
                        { required: true, message: `Vui lòng nhập tên ${productType === 'single' ? 'sản phẩm' : 'combo'}!` },
                        { min: 3, message: `Tên ${productType === 'single' ? 'sản phẩm' : 'combo'} phải có ít nhất 3 ký tự!` },
                        { max: 100, message: `Tên ${productType === 'single' ? 'sản phẩm' : 'combo'} không được quá 100 ký tự!` }
                    ]}
                >
                    <Input
                        ref={nameInputRef}
                        placeholder={`Nhập tên ${productType === 'single' ? 'sản phẩm' : 'combo'}`}
                        size="large"
                    />
                </Form.Item>

                {productType === 'single' && (
                    <Form.Item
                        name="description"
                        label="Mô tả"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mô tả sản phẩm!' },
                            { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' },
                            { max: 500, message: 'Mô tả không được quá 500 ký tự!' }
                        ]}
                    >
                        <Input.TextArea
                            placeholder="Ví dụ: Bắp ngô rang thơm ngon, béo ngậy"
                            rows={4}
                            size="large"
                            showCount
                            maxLength={500}
                        />
                    </Form.Item>
                )}

                {productType === 'combo' && (
                    <>
                        <Divider orientation="left">Thành phần combo</Divider>
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <div>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Card key={key} size="small" className="mb-3">
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'productId']}
                                                    rules={[{ required: true, message: 'Chọn sản phẩm!' }]}
                                                    style={{ flex: 1 }}
                                                >
                                                    <Select
                                                        placeholder="Chọn sản phẩm"
                                                        showSearch
                                                        optionFilterProp="children"
                                                        filterOption={(input, option) =>
                                                            String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        onChange={(value) => {}}
                                                    >
                                                        {availableProducts.map(product => (
                                                            <Option key={product._id} value={product._id}>
                                                                {product.name}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'quantity']}
                                                    rules={[{ required: true, message: 'Nhập số lượng!' }]}
                                                    style={{ width: 120 }}
                                                >
                                                    <InputNumber
                                                        placeholder="Số lượng"
                                                        min={1}
                                                        max={100}
                                                        style={{ width: '100%' }}
                                                    />
                                                </Form.Item>
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(name)}
                                                />
                                            </Space.Compact>
                                        </Card>
                                    ))}
                                    <Button
                                        type="dashed"
                                        onClick={() => add()}
                                        block
                                        icon={<PlusOutlined />}
                                        className="mb-4"
                                    >
                                        Thêm sản phẩm vào combo
                                    </Button>
                                </div>
                            )}
                        </Form.List>


                        <Form.Item
                            name="description"
                            label="Mô tả combo"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mô tả combo!' },
                                { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự!' },
                                { max: 500, message: 'Mô tả không được quá 500 ký tự!' }
                            ]}
                        >
                            <Input.TextArea
                                placeholder="Ví dụ: Combo bắp rang + 2 nước ngọt, tiết kiệm 20%"
                                rows={4}
                                size="large"
                                showCount
                                maxLength={500}
                            />
                        </Form.Item>
                    </>
                )}

                <div className="flex justify-end gap-4 mt-6">
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
                            ? (combo ? 'Đang cập nhật...' : 'Đang thêm...') 
                            : (combo ? 'Cập nhật' : 'Thêm mới')
                        }
                    </motion.button>
                </div>
            </Form>
        </Modal>
    );
};

export default FoodComboForm;
