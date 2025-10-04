import React, { useEffect, useState } from "react";
import { Modal, Form, Input, DatePicker, Button, message } from "antd";
import dayjs from "dayjs";
import { UploadOutlined } from "@ant-design/icons";
import { uploadAvatarApi } from "@/services/api";
import { getBlogByCode } from "@/apiservice/apiBlog";

interface BlogFormProps {
  blog?: IBlog;
  onSubmit: (data: Partial<IBlog>) => Promise<void> | void;
  onCancel: () => void;
}

const BlogForm: React.FC<BlogFormProps> = ({ blog, onSubmit, onCancel }) => {
  const [submitting, setSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [backgroundPreview, setBackgroundPreview] = useState<string>("");

  const [form] = Form.useForm<Partial<IBlog> & { postedDate?: dayjs.Dayjs }>();
  const [checkingCode, setCheckingCode] = useState(false);

  const initialValues: Partial<IBlog> = blog
    ? {
        blogCode: blog.blogCode,
        title: blog.title,
        description: blog.description,
        postedDate: blog.postedDate,
        content: blog.content,
        posterImage: blog.posterImage,
        backgroundImage: blog.backgroundImage,
      }
    : {};

  const handleFinish = async (values: Partial<IBlog> & { postedDate?: dayjs.Dayjs }) => {
    try {
      setSubmitting(true);
      // Không cần check trùng mã nữa theo yêu cầu: blogCode có thể trùng
      // Upload files if selected
      let posterUrl = values.posterImage?.trim();
      let backgroundUrl = values.backgroundImage?.trim();
      if (posterFile) {
        const res = await uploadAvatarApi(posterFile);
        if (!res?.status || !res?.data?.url) throw new Error("Upload ảnh poster thất bại");
        posterUrl = res.data.url;
      }
      if (backgroundFile) {
        const res = await uploadAvatarApi(backgroundFile);
        if (!res?.status || !res?.data?.url) throw new Error("Upload ảnh background thất bại");
        backgroundUrl = res.data.url;
      }
      const payload: Partial<IBlog> = {
        blogCode: values.blogCode?.trim(),
        title: values.title?.trim(),
        description: values.description?.trim(),
        postedDate: blog 
          ? (values.postedDate ? values.postedDate.toISOString() : blog.postedDate) // Giữ nguyên ngày cũ khi sửa
          : new Date().toISOString(), // Luôn là ngày hiện tại khi thêm mới
        content: values.content,
        posterImage: posterUrl,
        backgroundImage: backgroundUrl,
      };
      await onSubmit(payload);
    } catch (e) {
      const err = e as { message?: string };
      message.error(err?.message || "Lưu tin tức thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (posterPreview) URL.revokeObjectURL(posterPreview);
      if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
    };
  }, [posterPreview, backgroundPreview]);

  return (
    <Modal
      open
      title={<div style={{ textAlign: "center", fontSize: 18 }}>{blog ? "Sửa tin tức" : "Thêm tin tức"}</div>}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialValues,
          postedDate: blog ? dayjs(initialValues.postedDate) : dayjs(), // Luôn là ngày hiện tại khi thêm mới
        }}
        onFinish={handleFinish}
      >
        <Form.Item
          label="Mã tin tức"
          name="blogCode"
          rules={[
            { required: true, message: "Vui lòng nhập mã tin tức" },
            {
              validator: async (_, value) => {
                const code = (value || '').trim();
                if (!code) return Promise.resolve();
                if (blog && blog.blogCode === code) return Promise.resolve();
                setCheckingCode(true);
                try {
                  const found = await getBlogByCode(code);
                  if (found && found._id && (!blog || found._id !== blog._id)) {
                    return Promise.reject(new Error('Mã tin đã tồn tại'));
                  }
                  return Promise.resolve();
                } catch (e) {
                  const err = e as { response?: { status?: number } };
                  if (err?.response?.status && err.response.status !== 404) {
                    return Promise.reject(new Error('Không kiểm tra được mã tin'));
                  }
                  return Promise.resolve();
                } finally {
                  setCheckingCode(false);
                }
              }
            }
          ]}
        >
          <Input placeholder="VD: BL001" maxLength={20} />
        </Form.Item>

        <Form.Item label="Tiêu đề" name="title" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
          <Input placeholder="Nhập tiêu đề" />
        </Form.Item>

        <Form.Item 
          label="Mô tả" 
          name="description" 
          rules={[{ required: true, message: "Vui lòng nhập mô tả" }]}
        >
          <Input.TextArea
            placeholder="Nhập mô tả ngắn về tin tức..."
            rows={3}
            style={{ resize: 'none' }}
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item label="Ngày đăng" name="postedDate" rules={[{ required: true, message: "Vui lòng chọn ngày" }]}>
          <DatePicker 
            className="w-full" 
            format="DD/MM/YYYY" 
            disabled={true}
            placeholder={blog ? "Không thể chỉnh sửa ngày đăng" : "Tự động là ngày hiện tại"}
          />
        </Form.Item>

        <Form.Item 
          label="Nội dung"
          name="content"
          rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
          extra="Gợi ý: xuống dòng để tách đoạn; dùng dấu - để tạo đầu dòng."
        >
          <Input.TextArea
            placeholder="Nhập nội dung chi tiết..."
            rows={8}
            style={{ resize: 'none' }}
            showCount
            maxLength={10000}
          />
        </Form.Item>

        <Form.Item
          label="Ảnh poster"
          name="posterImage"
          rules={[{ required: !blog?.posterImage && !posterFile, message: "Vui lòng tải lên ảnh poster!" }]}
        >
          <div className="space-y-2">
            { (posterPreview || blog?.posterImage) && (
              <div className="flex items-center space-x-4">
                <img src={posterPreview || blog?.posterImage || ''} alt="Poster preview" className="w-20 h-20 object-cover rounded border" />
                <span className="text-sm text-gray-600">Ảnh hiện tại</span>
              </div>
            )}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (posterPreview) URL.revokeObjectURL(posterPreview);
                    setPosterFile(f);
                    setPosterPreview(URL.createObjectURL(f));
                  }
                }}
                style={{ display: 'none' }}
                id="blog-poster-input"
              />
              <Input
                placeholder={posterPreview || blog?.posterImage ? "Chọn ảnh mới" : "Chọn ảnh poster"}
                suffix={<UploadOutlined />}
                readOnly
                onClick={() => {
                  const el = document.getElementById('blog-poster-input') as HTMLInputElement;
                  el?.click();
                }}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </Form.Item>

        <Form.Item
          label="Ảnh background"
          name="backgroundImage"
          rules={[{ required: !blog?.backgroundImage && !backgroundFile, message: "Vui lòng tải lên ảnh background!" }]}
        >
          <div className="space-y-2">
            { (backgroundPreview || blog?.backgroundImage) && (
              <div className="flex items-center space-x-4">
                <img src={backgroundPreview || blog?.backgroundImage || ''} alt="Background preview" className="w-20 h-20 object-cover rounded border" />
                <span className="text-sm text-gray-600">Ảnh hiện tại</span>
              </div>
            )}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (backgroundPreview) URL.revokeObjectURL(backgroundPreview);
                    setBackgroundFile(f);
                    setBackgroundPreview(URL.createObjectURL(f));
                  }
                }}
                style={{ display: 'none' }}
                id="blog-background-input"
              />
              <Input
                placeholder={backgroundPreview || blog?.backgroundImage ? "Chọn ảnh mới" : "Chọn ảnh background"}
                suffix={<UploadOutlined />}
                readOnly
                onClick={() => {
                  const el = document.getElementById('blog-background-input') as HTMLInputElement;
                  el?.click();
                }}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={submitting || checkingCode}>
            Lưu
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default BlogForm;


