const uploadImage = async (imageFile: Express.Multer.File) => {
  try {
    return {
      status: true,
      error: 0,
      message: 'Upload ảnh thành công',
      data: {
        url: imageFile.path,
        filename: imageFile.filename,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error: -1,
      message: 'error from server',
      data: null,
    };
  }
};

export default { uploadImage };
