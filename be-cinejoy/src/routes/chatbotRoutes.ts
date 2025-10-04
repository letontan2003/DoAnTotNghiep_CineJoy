import express from 'express';
import ChatbotController from '../controllers/chatbotController';

const router = express.Router();

// Route để nhận tin nhắn và trả về phản hồi từ chatbot
router.post('/chat', ChatbotController.getChatResponse);

// Facebook Messenger Webhook routes
router.get('/webhook', ChatbotController.verifyWebhook);
router.post('/webhook', ChatbotController.handleWebhook);

export default router; 