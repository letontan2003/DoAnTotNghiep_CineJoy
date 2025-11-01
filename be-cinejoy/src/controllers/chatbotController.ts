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
