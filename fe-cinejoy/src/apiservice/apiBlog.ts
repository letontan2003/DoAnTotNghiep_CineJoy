import axiosClient from "./axiosClient";


export const getBlogs = async (): Promise<IBlog[]> => {
    const res = await axiosClient.get<IBlog[]>("/blogs");
    return res.data;
};

export const getBlogById = async (id: string): Promise<IBlog> => {
    const res = await axiosClient.get<IBlog>(`/blogs/${id}`);
    return res.data;
};

    export const getBlogByCode = async (blogCode: string): Promise<IBlog> => {
    const res = await axiosClient.get<IBlog>(`/blogs/code/${blogCode}`);
    return res.data;
};

export const addBlog = async (blog: IBlog): Promise<IBlog> => {
    const res = await axiosClient.post<IBlog>("/blogs/add", blog);
    return res.data;
};

export const updateBlog = async (id: string, blog: Partial<IBlog>): Promise<IBlog> => {
    const res = await axiosClient.put<IBlog>(`/blogs/update/${id}`, blog);
    return res.data;
};

export const deleteBlog = async (id: string): Promise<{ message: string }> => {
    const res = await axiosClient.delete<{ message: string }>(`/blogs/delete/${id}`);
    return res.data;
};

// Lấy blog hiển thị (cho client)
export const getVisibleBlogs = async (): Promise<IBlog[]> => {
    const res = await axiosClient.get<IBlog[]>("/blogs/visible");
    return res.data;
};

// Lấy blog theo trạng thái
export const getBlogsByStatus = async (status: 'Hiển thị' | 'Ẩn'): Promise<IBlog[]> => {
    const res = await axiosClient.get<IBlog[]>(`/blogs/status/${status}`);
    return res.data;
};

// Cập nhật trạng thái blog
export const updateBlogStatus = async (id: string, status: 'Hiển thị' | 'Ẩn'): Promise<IBlog> => {
    const res = await axiosClient.put<IBlog>(`/blogs/status/${id}`, { status });
    return res.data;
};