import express from "express";
import ChatbotController from "../controllers/chatbotController";
import { optionalVerifyToken } from "../middlewares/AuthMiddleware";

const router = express.Router();

router.post(
  "/chat",
  optionalVerifyToken as express.RequestHandler,
  ChatbotController.getChatResponse
);

// Route để upload poster phim (Multi-modal Assistant)
router.post(
  "/upload-poster",
  optionalVerifyToken as express.RequestHandler,
  ChatbotController.uploadPoster
);

// Facebook Messenger Webhook routes
router.get("/webhook", ChatbotController.verifyWebhook);
router.post("/webhook", ChatbotController.handleWebhook);

export default router;
