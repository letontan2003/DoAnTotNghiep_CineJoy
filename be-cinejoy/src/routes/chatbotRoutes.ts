import express from 'express';
import ChatbotController from '../controllers/chatbotController';
import { optionalVerifyToken } from '../middlewares/AuthMiddleware';

const router = express.Router();

// Route để nhận tin nhắn và trả về phản hồi từ chatbot
// optionalVerifyToken: nếu có token thì lấy user info, không có thì vẫn hoạt động bình thường
router.post('/chat', optionalVerifyToken as express.RequestHandler, ChatbotController.getChatResponse);

// Route để upload poster phim (Multi-modal Assistant)
router.post('/upload-poster', optionalVerifyToken as express.RequestHandler, ChatbotController.uploadPoster);

// Facebook Messenger Webhook routes
router.get('/webhook', ChatbotController.verifyWebhook);
router.post('/webhook', ChatbotController.handleWebhook);

export default router; 