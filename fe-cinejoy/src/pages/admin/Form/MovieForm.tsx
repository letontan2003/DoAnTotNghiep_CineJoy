import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Spin } from 'antd';
import type { InputRef } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface MovieFormProps {
    movie?: IMovie;
    movies?: IMovie[];
    onSubmit: (movieData: Partial<IMovie>) => Promise<void>;
    onCancel: () => void;
}

const MovieForm: React.FC<MovieFormProps> = ({ movie, movies = [], onSubmit, onCancel }) => {
    const titleInputRef = useRef<InputRef>(null);
    const [form] = Form.useForm();
    const [imagePreview, setImagePreview] = useState<string>('');
    const [posterPreview, setPosterPreview] = useState<string>('');
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
    const [posterPreviewUrl, setPosterPreviewUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (movie) {
            form.setFieldsValue({
                movieCode: movie.movieCode,
                title: movie.title,
                image: movie.image,
                posterImage: movie.posterImage,
                releaseDate: movie.releaseDate ? dayjs(movie.releaseDate) : undefined,
                startDate: movie.startDate ? dayjs(movie.startDate) : undefined,
                endDate: movie.endDate ? dayjs(movie.endDate) : undefined,
                duration: movie.duration,
                actors: movie.actors?.join(', '),
                genre: movie.genre || [],
                director: movie.director,
                status: movie.status,
                language: movie.language?.[0],
                description: movie.description,
                trailer: movie.trailer,
                ageRating: movie.ageRating,
            });
            // Set image previews
            setImagePreview(movie.image || '');
            setPosterPreview(movie.posterImage || '');
        }
    }, [movie, form]);

    useEffect(() => {
        if (!movie) {
            const timer = setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [movie]);

    // Cleanup effect for preview URLs
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
            if (posterPreviewUrl) {
                URL.revokeObjectURL(posterPreviewUrl);
            }
        };
    }, [imagePreviewUrl, posterPreviewUrl]);

    const languages = [
        'Vietnamese',
        'English',
        'Korean',
        'Japanese',
        'Chinese',
        'French',
        'German',
        'Spanish'
    ];

    const genres = [
        'Hành động', // Action
        'Phiêu lưu', // Adventure  
        'Hài hước', // Comedy
        'Chính kịch', // Drama
        'Kinh dị', // Horror
        'Khoa học viễn tưởng', // Sci-Fi
        'Lãng mạn', // Romance
        'Giật gân', // Thriller
        'Chiến tranh', // War
        'Miền tây', // Western
        'Hoạt hình', // Animation
        'Tài liệu', // Documentary
        'Gia đình', // Family
        'Tâm lý', // Psychological
        'Tội phạm', // Crime
        'Siêu anh hùng', // Superhero
        'Thể thao', // Sports
        'Âm nhạc', // Musical
        'Học đường', // School
        'Võ thuật' // Martial Arts
    ];

    const ageRestrictions = ['T13+', 'T16+', 'T18+', 'P'];

    const handleSubmit = async (values: {
        movieCode: string;
        title: string;
        image: string;
        posterImage: string;
        releaseDate: dayjs.Dayjs;
        startDate: dayjs.Dayjs;
        endDate: dayjs.Dayjs;
        duration: number;
        actors: string;
        genre: string[];
        director: string;
        status: string;
        language: string;
        description: string;
        trailer: string;
        ageRating: string;
    }) => {
        try {
            setIsLoading(true);
            const submitData = {
                movieCode: values.movieCode,
                title: values.title,
                image: values.image,
                posterImage: values.posterImage,
                releaseDate: values.releaseDate ? values.releaseDate.toISOString() : '',
                startDate: values.startDate ? values.startDate.toISOString() : '',
                endDate: values.endDate ? values.endDate.toISOString() : '',
                duration: values.duration,
                actors: values.actors ? values.actors.split(',').map((item: string) => item.trim()) : [],
                genre: values.genre || [],
                director: values.director,
                status: values.status as 'Phim đang chiếu' | 'Phim sắp chiếu' | 'Suất chiếu đặc biệt' | 'Đã kết thúc',
                language: values.language ? [values.language] : [],
                description: values.description,
                trailer: values.trailer,
                ageRating: values.ageRating,
            };
            
            await onSubmit(submitData);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (fieldName: string) => (info: { file: { originFileObj?: File; }; }) => {
        const file = info.file.originFileObj;
        if (file instanceof File) {
            // Cleanup previous preview URL if exists
            if (fieldName === 'image' && imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            } else if (fieldName === 'posterImage' && posterPreviewUrl) {
                URL.revokeObjectURL(posterPreviewUrl);
            }
            
            // Create preview URL immediately
            const previewUrl = URL.createObjectURL(file);
            
            // Update preview state immediately
            if (fieldName === 'image') {
                setImagePreviewUrl(previewUrl);
                setImagePreview(previewUrl);
            } else if (fieldName === 'posterImage') {
                setPosterPreviewUrl(previewUrl);
                setPosterPreview(previewUrl);
            }
            
            // Convert to base64 for form data
            const reader = new FileReader();
            reader.onloadend = () => {
                const imageUrl = reader.result as string;
                form.setFieldsValue({
                    [fieldName]: imageUrl
                });
                
                // Update preview to base64 URL and cleanup object URL
                if (fieldName === 'image') {
                    setImagePreview(imageUrl);
                    URL.revokeObjectURL(previewUrl);
                    setImagePreviewUrl('');
                } else if (fieldName === 'posterImage') {
                    setPosterPreview(imageUrl);
                    URL.revokeObjectURL(previewUrl);
                    setPosterPreviewUrl('');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Modal
            open
            title={<div className="text-center text-xl md:text-xl font-semibold">{movie ? 'Sửa phim' : 'Thêm phim mới'}</div>}
            onCancel={onCancel}
            footer={null}
            width={900}
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
                    <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="movieCode"
                        label="Mã phim"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mã phim!' },
                            { pattern: /^MV\d{3}$/, message: 'Mã phim phải có định dạng MV001, MV002, ...' },
                            {
                                validator: (_, value) => {
                                    if (!value) return Promise.resolve();
                                    
                                    // Kiểm tra trùng lặp với các phim khác (trừ phim hiện tại nếu đang sửa)
                                    const existingMovie = movies.find(m => 
                                        m.movieCode === value && 
                                        (!movie || m._id !== movie._id)
                                    );
                                    
                                    if (existingMovie) {
                                        return Promise.reject(new Error('Mã phim này đã tồn tại!'));
                                    }
                                    
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input
                            placeholder="MV001, MV002, ..."
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                                name="title"
                        label="Tên phim"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên phim!' },
                            { min: 2, message: 'Tên phim phải có ít nhất 2 ký tự!' },
                            { max: 200, message: 'Tên phim không được quá 200 ký tự!' }
                        ]}
                    >
                        <Input
                            ref={titleInputRef}
                            placeholder="Nhập tên phim"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="director"
                        label="Đạo diễn"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên đạo diễn!' },
                            { min: 2, message: 'Tên đạo diễn phải có ít nhất 2 ký tự!' }
                        ]}
                    >
                        <Input
                            placeholder="Nhập tên đạo diễn"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="duration"
                        label="Thời lượng (phút)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập thời lượng!' },
                            { type: 'number', min: 30, max: 300, message: 'Thời lượng phải từ 30-300 phút!' }
                        ]}
                    >
                        <InputNumber
                            placeholder="Nhập thời lượng"
                            size="large"
                            min={30}
                            max={300}
                            style={{ width: '100%' }}
                            addonAfter="phút"
                        />
                    </Form.Item>

                    <Form.Item
                        name="releaseDate"
                        label="Ngày phát hành"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày phát hành!' }
                        ]}
                    >
                        <DatePicker
                            placeholder="Chọn ngày phát hành"
                            size="large"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                        />
                    </Form.Item>

                    <Form.Item
                        name="startDate"
                        label="Ngày khởi chiếu"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày khởi chiếu!' }
                        ]}
                    >
                        <DatePicker
                            placeholder="Chọn ngày khởi chiếu"
                            size="large"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                        />
                    </Form.Item>

                    <Form.Item
                        name="endDate"
                        label="Ngày kết thúc chiếu"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày kết thúc chiếu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const startDate = getFieldValue('startDate');
                                    if (!value || !startDate || value.isAfter(startDate)) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Ngày kết thúc phải sau ngày khởi chiếu!'));
                                },
                            }),
                        ]}
                    >
                        <DatePicker
                            placeholder="Chọn ngày kết thúc chiếu"
                            size="large"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                        />
                    </Form.Item>

                    <Form.Item
                        name="genre"
                        label="Thể loại"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ít nhất một thể loại!' },
                        ]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Chọn một hoặc nhiều thể loại"
                            size="large"
                            options={genres.map(genre => ({ value: genre, label: genre }))}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            maxTagCount="responsive"
                        />
                    </Form.Item>

                    <Form.Item
                        name="language"
                        label="Ngôn ngữ"
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngôn ngữ!' }
                        ]}
                    >
                        <Select
                            placeholder="Chọn ngôn ngữ"
                            size="large"
                            options={languages.map(lang => ({ value: lang, label: lang }))}
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
                            options={[
                                { value: 'Phim đang chiếu', label: 'Phim đang chiếu' },
                                { value: 'Phim sắp chiếu', label: 'Phim sắp chiếu' },
                                { value: 'Suất chiếu đặc biệt', label: 'Suất chiếu đặc biệt' },
                                { value: 'Đã kết thúc', label: 'Đã kết thúc' }
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="ageRating"
                        label="Độ tuổi"
                        rules={[
                            { required: true, message: 'Vui lòng chọn độ tuổi!' }
                        ]}
                    >
                        <Select
                            placeholder="Chọn độ tuổi"
                            size="large"
                            options={ageRestrictions.map(age => ({ value: age, label: age }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="actors"
                        label="Diễn viên (phân cách bằng dấu phẩy)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập diễn viên!' },
                            { min: 2, message: 'Danh sách diễn viên quá ngắn!' }
                        ]}
                    >
                        <Input
                            placeholder="Ví dụ: Tom Hanks, Leonardo DiCaprio"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="trailer"
                        label="Link trailer"
                        rules={[
                            { required: true, message: 'Vui lòng nhập link trailer!' },
                            { type: 'url', message: 'Link trailer không hợp lệ!' }
                        ]}
                    >
                        <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="image"
                        label="Ảnh thumbnail"
                        rules={[
                            { required: !movie?.image, message: 'Vui lòng tải lên ảnh thumbnail!' }
                        ]}
                    >
                        <div className="space-y-2">
                            {imagePreview && (
                            <div className="flex items-center space-x-4">
                                    <img
                                        src={imagePreview}
                                        alt="Thumbnail preview"
                                        className="w-20 h-20 object-cover rounded border"
                                    />
                                    <span className="text-sm text-gray-600">Ảnh hiện tại</span>
                                </div>
                                )}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleImageChange('image')({ file: { originFileObj: file } });
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                    id="image-input"
                                />
                                <Input
                                    placeholder={imagePreview ? "Chọn ảnh mới" : "Chọn ảnh thumbnail"}
                                    size="large"
                                    suffix={<UploadOutlined />}
                                    readOnly
                                    onClick={() => {
                                        const input = document.getElementById('image-input') as HTMLInputElement;
                                        input?.click();
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="posterImage"
                        label="Ảnh poster"
                        rules={[
                            { required: !movie?.posterImage, message: 'Vui lòng tải lên ảnh poster!' }
                        ]}
                    >
                        <div className="space-y-2">
                            {posterPreview && (
                            <div className="flex items-center space-x-4">
                                    <img
                                        src={posterPreview}
                                        alt="Poster preview"
                                        className="w-20 h-20 object-cover rounded border"
                                    />
                                    <span className="text-sm text-gray-600">Ảnh hiện tại</span>
                                </div>
                                )}
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleImageChange('posterImage')({ file: { originFileObj: file } });
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                    id="poster-input"
                                />
                                <Input
                                    placeholder={posterPreview ? "Chọn ảnh mới" : "Chọn ảnh poster"}
                                    size="large"
                                    suffix={<UploadOutlined />}
                                    readOnly
                                    onClick={() => {
                                        const input = document.getElementById('poster-input') as HTMLInputElement;
                                        input?.click();
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </Form.Item>
                        </div>

                <Form.Item
                    name="description"
                    label="Mô tả"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mô tả phim!' },
                        { min: 20, message: 'Mô tả phải có ít nhất 20 ký tự!' },
                        { max: 1000, message: 'Mô tả không được quá 1000 ký tự!' }
                    ]}
                >
                    <Input.TextArea
                        placeholder="Nhập mô tả phim..."
                            rows={4}
                        size="large"
                        showCount
                        maxLength={1000}
                        />
                </Form.Item>

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
                                ? (movie ? 'Đang cập nhật...' : 'Đang thêm...') 
                                : (movie ? 'Cập nhật' : 'Thêm mới')
                            }
                        </motion.button>
                    </div>
            </Form>
        </Modal>
    );
};

export default MovieForm;