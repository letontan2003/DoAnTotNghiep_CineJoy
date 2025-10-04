import axiosClient from "./axiosClient";



export const getMovies = async () => {
    try {

        const response = await axiosClient.get<IBackendResponse<IMovie[]>>("/movies");
        return response.data;
    } catch (error) {
        console.error("Error fetching movies:", error);
        throw error;
    }
};
export const getMovieById = async (id: string) => {
    try {
        const response = await axiosClient.get<IMovie>(`/movies/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching movie by ID:", error);
        throw error;
    }
};
export const createMovie = async (movie: IMovie) => {
    try {
        const formData = new FormData();

        // Log movie data for debugging
        console.log('Original movie data:', movie);

        // Thêm các trường dữ liệu vào FormData
        Object.keys(movie).forEach(key => {
            if (key === 'image' || key === 'posterImage') {
                // Xử lý ảnh từ base64 sang file
                if (movie[key] && movie[key].startsWith('data:image')) {
                    try {
                        const base64Data = movie[key].split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteArrays = [];
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteArrays.push(byteCharacters.charCodeAt(i));
                        }
                        const byteArray = new Uint8Array(byteArrays);
                        // Xác định MIME type từ base64 string
                        const mimeType = movie[key].split(';')[0].split(':')[1];
                        const blob = new Blob([byteArray], { type: mimeType });
                        // Lấy extension từ MIME type
                        const extension = mimeType.split('/')[1];
                        const file = new File([blob], `${key}.${extension}`, { type: mimeType });
                        formData.append(key, file);
                        console.log(`Added ${key} to FormData:`, file);
                    } catch (error) {
                        console.error(`Error processing ${key}:`, error);
                    }
                } else {
                    console.log(`Skipping ${key} - not a valid image data`);
                }
            } else if (Array.isArray(movie[key])) {
                const arrayString = JSON.stringify(movie[key]);
                formData.append(key, arrayString);
                console.log(`Added array ${key} to FormData:`, arrayString);
            } else {
                const value = String(movie[key]);
                formData.append(key, value);
                console.log(`Added ${key} to FormData:`, value);
            }
        });

        // Log FormData contents
        console.log('FormData contents:');
        for (const pair of formData.entries()) {
            console.log(pair[0], pair[1]);
        }

        const response = await axiosClient.post<IMovie>("/movies/add", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error creating movie:", error);
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
        }
        throw error;
    }
};

export const updateMovie = async (id: string, movie: IMovie) => {
    try {
        const formData = new FormData();

        // Log movie data for debugging
        console.log('Original movie data for update:', movie);

        // Thêm các trường dữ liệu vào FormData
        Object.keys(movie).forEach(key => {
            if (key === 'image' || key === 'posterImage') {
                // Xử lý ảnh từ base64 sang file
                if (movie[key] && movie[key].startsWith('data:image')) {
                    try {
                        const base64Data = movie[key].split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteArrays = [];
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteArrays.push(byteCharacters.charCodeAt(i));
                        }
                        const byteArray = new Uint8Array(byteArrays);
                        // Xác định MIME type từ base64 string
                        const mimeType = movie[key].split(';')[0].split(':')[1];
                        const blob = new Blob([byteArray], { type: mimeType });
                        // Lấy extension từ MIME type
                        const extension = mimeType.split('/')[1];
                        const file = new File([blob], `${key}.${extension}`, { type: mimeType });
                        formData.append(key, file);
                        console.log(`Added ${key} to FormData:`, file);
                    } catch (error) {
                        console.error(`Error processing ${key}:`, error);
                    }
                } else {
                    console.log(`Skipping ${key} - not a valid image data`);
                }
            } else if (Array.isArray(movie[key])) {
                const arrayString = JSON.stringify(movie[key]);
                formData.append(key, arrayString);
                console.log(`Added array ${key} to FormData:`, arrayString);
            } else {
                const value = String(movie[key]);
                formData.append(key, value);
                console.log(`Added ${key} to FormData:`, value);
            }
        });

        // Log FormData contents
        console.log('FormData contents for update:');
        for (const pair of formData.entries()) {
            console.log(pair[0], pair[1]);
        }

        const response = await axiosClient.put<IMovie>(`/movies/update/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Error updating movie:", error);
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
        }
        throw error;
    }
};

export const deleteMovie = async (id: string) => {
    try {
        const response = await axiosClient.delete<IBackendResponse<IMovie>>(`/movies/delete/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting movie:", error);
        throw error;
    }
};
