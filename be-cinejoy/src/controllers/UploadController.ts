import { Request, Response } from 'express';
import uploadService from '../services/UploadService';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        status: false,
        error: 1,
        message: 'Vui lòng chọn file ảnh',
        data: null,
      });
      return;
    }

    const result = await uploadService.uploadImage(req.file);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: false,
      error: -1,
      message: 'error from server',
      data: null,
    });
  }
};
