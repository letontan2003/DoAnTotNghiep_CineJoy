import { Router } from 'express';
import upload from '../configs/cloudconfig';
import { uploadImage } from '../controllers/UploadController';

const router = Router();

router.post('/', upload.single('image'), uploadImage);

export default router; 