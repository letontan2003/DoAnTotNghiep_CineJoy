import chatbotService from "../services/chatbotService";

const ChatbotController = {

    //Chatbot ứng dụng web
    getChatResponse: async (req: any, res: any) => {
        const { message, sessionId = "default" } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Tin nhắn không được để trống." });
        }

        // Lấy userId từ req.user nếu có (khi đã authenticate)
        // Hoặc từ req.body nếu frontend gửi trực tiếp
        const userId = (req as any).user?._id?.toString() || req.body.userId;
        
        // Debug logging
        console.log('🔍 Chatbot Request Debug:');
        console.log('- Has req.user:', !!req.user);
        console.log('- User ID:', userId);
        console.log('- User name:', req.user?.fullName || 'N/A');
        console.log('- Auth header:', req.headers.authorization ? 'Present' : 'Missing');

        const response = await chatbotService.getResponse(message, sessionId, userId);
        res.json({ reply: response });
    },

    // Xử lý upload poster phim (Multi-modal)
    uploadPoster: async (req: any, res: any) => {
        try {
            const { imageBase64, mimeType = "image/jpeg", sessionId = "default", userMessage } = req.body;

            if (!imageBase64) {
                return res.status(400).json({ 
                    success: false,
                    error: "Hình ảnh không được để trống." 
                });
            }

            // Lấy userId từ req.user nếu có (khi đã authenticate)
            const userId = (req as any).user?._id?.toString() || req.body.userId;

            // Xử lý poster
            const result = await chatbotService.processPosterUpload(
                imageBase64,
                mimeType,
                {
                    userId,
                    userMessage
                }
            );

            // Lưu tin nhắn vào lịch sử
            chatbotService.saveMessage(sessionId, {
                sender: "user",
                text: userMessage?.trim()?.length ? userMessage.trim() : "[Đã upload poster phim]",
            });

            chatbotService.saveMessage(sessionId, {
                sender: "bot",
                text: result.message,
            });

            res.json({
                success: result.success,
                reply: result.message,
                movie: result.movie,
                showtimes: result.showtimes,
                movieTitle: result.movieTitle,
            });
        } catch (error: any) {
            console.error("Error in uploadPoster:", error);
            res.status(500).json({
                success: false,
                error: "Đã có lỗi xảy ra khi xử lý poster. Vui lòng thử lại sau.",
                details: error.message,
            });
        }
    },



    //Trên Faceboook
    // Xác thực webhook từ Facebook
    verifyWebhook: (req: any, res: any) => {
        const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('Webhook verified!');
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        }
    },

    // Xử lý tin nhắn từ Facebook Messenger
    handleWebhook: async (req: any, res: any) => {
        console.log("Webhook event received:", JSON.stringify(req.body, null, 2));
        if (req.body.object === 'page') {
            for (const entry of req.body.entry) {
                for (const webhookEvent of entry.messaging) {
                    const senderPsid = webhookEvent.sender.id;
                    console.log("Sender PSID:", senderPsid);
                    if (webhookEvent.message) {
                        const userMessage = webhookEvent.message.text;
                        console.log("User message:", userMessage);
                        if (userMessage) {
                            const response = await chatbotService.getResponse(userMessage, senderPsid);
                            console.log("Bot response:", response);
                            await chatbotService.sendMessage(senderPsid, response as string);
                        }
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } else {
            res.sendStatus(404);
        }
    }
};

export default ChatbotController;
