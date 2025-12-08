import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Card, Divider, Tag, Alert } from 'antd';
import type { InputRef } from 'antd';
import type { ISeat, ICreateSeatData } from '../../../apiservice/apiSeat';
import type { IRoom } from '../../../apiservice/apiRoom';

interface SeatFormProps {
    seat?: ISeat;
    room?: IRoom;
    rooms: IRoom[];
    regions: Array<{ _id: string; name: string }>;
    onSubmit: (seatData: ICreateSeatData) => void;
    onCancel: () => void;
    loading?: boolean;
}

const SeatForm: React.FC<SeatFormProps> = ({ seat, room, rooms, regions, onSubmit, onCancel, loading = false }) => {
    const seatIdInputRef = useRef<InputRef>(null);
    const [form] = Form.useForm();
    const [selectedRoom, setSelectedRoom] = useState<IRoom | undefined>(room);
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [filteredRooms, setFilteredRooms] = useState(rooms);

    useEffect(() => {
        if (seat) {
            // Find region for the room when editing
            const roomData = rooms.find(r => r._id === seat.room._id);
            if (roomData && roomData.theater) {
                const regionName = roomData.theater.name; // Assuming theater.name contains region info
                const region = regions.find(r => r.name.toLowerCase().includes(regionName.toLowerCase()));
                if (region) {
                    setSelectedRegion(region._id);
                }
            }
            
            form.setFieldsValue({
                seatId: seat.seatId,
                region: roomData && roomData.theater ? regions.find(r => r.name.toLowerCase().includes(roomData.theater.name.toLowerCase()))?._id : '',
                room: seat.room._id,
                row: seat.row,
                number: seat.number,
                type: seat.type,
                price: seat.price,
                status: seat.status,
                positionX: seat.position.x,
                positionY: seat.position.y
            });
            setSelectedRoom(roomData);
        } else {
            form.resetFields();
            setSelectedRegion('');
            setFilteredRooms([]);
            if (room) {
                form.setFieldsValue({ room: room._id });
                setSelectedRoom(room);
            }
        }
    }, [seat, room, rooms, regions, form]);

    // Filter rooms based on selected region
    useEffect(() => {
        if (selectedRegion) {
            const region = regions.find(r => r._id === selectedRegion);
            if (region) {
                const regionRooms = rooms.filter(room => 
                    room.theater && room.theater.name.toLowerCase().includes(region.name.toLowerCase())
                );
                setFilteredRooms(regionRooms);
            }
        } else {
            setFilteredRooms([]);
        }
    }, [selectedRegion, rooms, regions]);

    useEffect(() => {
        if (!seat) {
            const timer = setTimeout(() => {
                if (seatIdInputRef.current) {
                    seatIdInputRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [seat]);

    const handleRegionChange = (regionId: string) => {
        setSelectedRegion(regionId);
        // Reset room selection when region changes
        form.setFieldValue('room', undefined);
        setSelectedRoom(undefined);
    };

    const handleSubmit = async (values: {
        seatId?: string;
        room: string;
        row: string;
        number: number;
        type: 'normal' | 'vip' | 'couple';
        price: number;
        status: 'available' | 'maintenance' | 'blocked';
        positionX: number;
        positionY: number;
    }) => {
        try {
            const submitData: ICreateSeatData = {
                seatId: values.seatId || `${values.row}${values.number}`,
                room: values.room,
                row: values.row,
                number: values.number,
                type: values.type,
                price: values.price,
                status: values.status,
                position: {
                    x: values.positionX,
                    y: values.positionY
                }
            };
            
            onSubmit(submitData);
        } catch (error) {
            console.error('Error submitting seat form:', error);
        }
    };

    const handleRoomChange = (roomId: string) => {
        const room = rooms.find(r => r._id === roomId);
        setSelectedRoom(room);
    };

    const handleRowNumberChange = () => {
        const row = form.getFieldValue('row');
        const number = form.getFieldValue('number');
        if (row && number) {
            form.setFieldsValue({ seatId: `${row}${number}` });
        }
    };

    const seatTypes = [
        { value: 'normal', label: 'Ghế thường', color: '#52c41a' },
        { value: 'vip', label: 'Ghế VIP', color: '#faad14' },
        { value: 'couple', label: 'Ghế đôi', color: '#eb2f96' }
    ];

    const statusOptions = [
        { value: 'available', label: 'Có thể sử dụng', color: '#52c41a' },
        { value: 'maintenance', label: 'Bảo trì', color: '#faad14' },
        { value: 'blocked', label: 'Bị chặn', color: '#f5222d' }
    ];

    const getDefaultPrice = (type: string) => {
        switch (type) {
            case 'vip': return 100000;
            case 'couple': return 150000;
            default: return 75000; // Ghế thường
        }
    };

    const handleTypeChange = (type: string) => {
        const currentPrice = form.getFieldValue('price');
        if (!currentPrice || currentPrice === 0) {
            form.setFieldsValue({ price: getDefaultPrice(type) });
        }
    };

    return (
        <Modal
            open
            title={
                <div className="text-center text-xl font-semibold">
                    {seat ? 'Sửa ghế ngồi' : 'Thêm ghế ngồi mới'}
                </div>
            }
            onCancel={onCancel}
            footer={null}
            width={700}
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
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
            className="hide-scrollbar"
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
            >
                {selectedRoom && (
                    <Card size="small" className="mb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold">{selectedRoom.name}</h4>
                                <p className="text-sm text-gray-600">
                                    {selectedRoom.theater.name} - Sức chứa: {selectedRoom.capacity} ghế
                                </p>
                            </div>
                            <div className="text-right">
                                <Tag color={selectedRoom.roomType === '4DX' ? 'gold' : 'blue'}>
                                    {selectedRoom.roomType}
                                </Tag>
                                <Tag color={selectedRoom.status === 'active' ? 'green' : 'orange'}>
                                    {selectedRoom.status === 'active' ? 'Hoạt động' : 'Bảo trì'}
                                </Tag>
                            </div>
                        </div>
                    </Card>
                )}

                <Form.Item
                    name="region"
                    label="Khu vực"
                    rules={[
                        { required: true, message: 'Vui lòng chọn khu vực!' }
                    ]}
                >
                    <Select
                        placeholder="Chọn khu vực"
                        size="large"
                        onChange={handleRegionChange}
                        options={regions.map(region => ({
                            value: region._id,
                            label: region.name
                        }))}
                    />
                </Form.Item>

                <Form.Item
                    name="room"
                    label="Phòng chiếu"
                    rules={[
                        { required: true, message: 'Vui lòng chọn phòng chiếu!' }
                    ]}
                >
                    <Select
                        placeholder={selectedRegion ? "Chọn phòng chiếu" : "Vui lòng chọn khu vực trước"}
                        size="large"
                        showSearch
                        disabled={!selectedRegion || filteredRooms.length === 0}
                        onChange={handleRoomChange}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={filteredRooms.map(room => ({
                            value: room._id,
                            label: `${room.name} - ${room.theater?.name || ''}`
                        }))}
                    />
                </Form.Item>

                <div className="grid grid-cols-3 gap-4">
                    <Form.Item
                        name="row"
                        label="Hàng ghế"
                        rules={[
                            { required: true, message: 'Vui lòng nhập hàng ghế!' },
                            { pattern: /^[A-Z]$/, message: 'Hàng ghế phải là chữ cái in hoa (A-Z)!' }
                        ]}
                    >
                        <Input
                            placeholder="A, B, C..."
                            size="large"
                            maxLength={1}
                            style={{ textTransform: 'uppercase' }}
                            onChange={handleRowNumberChange}
                        />
                    </Form.Item>

                    <Form.Item
                        name="number"
                        label="Số ghế"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số ghế!' },
                            { type: 'number', min: 1, max: 50, message: 'Số ghế phải từ 1-50!' }
                        ]}
                    >
                        <InputNumber
                            placeholder="1, 2, 3..."
                            size="large"
                            min={1}
                            max={50}
                            style={{ width: '100%' }}
                            onChange={handleRowNumberChange}
                        />
                    </Form.Item>

                    <Form.Item
                        name="seatId"
                        label="Mã ghế"
                        rules={[
                            { required: true, message: 'Mã ghế được tự động tạo!' }
                        ]}
                    >
                        <Input
                            ref={seatIdInputRef}
                            placeholder="A1, B2..."
                            size="large"
                            disabled
                        />
                    </Form.Item>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="type"
                        label="Loại ghế"
                        rules={[
                            { required: true, message: 'Vui lòng chọn loại ghế!' }
                        ]}
                    >
                        <Select
                            placeholder="Chọn loại ghế"
                            size="large"
                            onChange={handleTypeChange}
                            options={seatTypes}
                        />
                    </Form.Item>

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
                            options={statusOptions}
                        />
                    </Form.Item>
                </div>

                <Form.Item
                    name="price"
                    label="Giá ghế"
                    rules={[
                        { required: true, message: 'Vui lòng nhập giá ghế!' },
                        { type: 'number', min: 0, message: 'Giá ghế không được âm!' }
                    ]}
                >
                    <InputNumber
                        placeholder="Nhập giá ghế"
                        size="large"
                        min={0}
                        max={1000000}
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        // @ts-expect-error: Ant Design InputNumber parser type constraint
                        parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                        addonAfter="VNĐ"
                    />
                </Form.Item>

                <Divider>Vị trí trong layout</Divider>

                <Alert
                    message="Vị trí layout"
                    description="Vị trí X (cột) và Y (hàng) để hiển thị ghế trong bố cục phòng chiếu. Bắt đầu từ 0."
                    type="info"
                    className="mb-4"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="positionX"
                        label="Vị trí X (cột)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập vị trí X!' },
                            { type: 'number', min: 0, message: 'Vị trí X không được âm!' }
                        ]}
                    >
                        <InputNumber
                            placeholder="0, 1, 2..."
                            size="large"
                            min={0}
                            max={49}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="positionY"
                        label="Vị trí Y (hàng)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập vị trí Y!' },
                            { type: 'number', min: 0, message: 'Vị trí Y không được âm!' }
                        ]}
                    >
                        <InputNumber
                            placeholder="0, 1, 2..."
                            size="large"
                            min={0}
                            max={49}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <Button
                        type="default"
                        onClick={onCancel}
                        size="large"
                        disabled={loading}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={loading}
                        className="bg-black hover:bg-gray-800"
                    >
                        {seat ? 'Cập nhật' : 'Thêm mới'}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default SeatForm;
