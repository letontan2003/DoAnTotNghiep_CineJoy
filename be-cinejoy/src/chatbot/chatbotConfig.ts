import { GoogleGenerativeAI } from "@google/generative-ai";
import NodeCache from "node-cache";

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Cấu hình cache
const cache = new NodeCache({ stdTTL: 600 }); // Cache phản hồi trong 10 phút
const productCache = new NodeCache({ stdTTL: 3600 }); // Cache sản phẩm trong 1 giờ
const conversationCache = new NodeCache({ stdTTL: 3600 * 24 }); // Lưu trữ lịch sử trò chuyện trong 24h

// Cấu hình prompt
const PROMPT_CONFIG = {
  MAX_CONVERSATION_LENGTH: 10,
  MAX_RESPONSE_WORDS: 100,
};

export default {
  model,
  cache,
  productCache,
  conversationCache,
  PROMPT_CONFIG,
};
