import chatbotService, {
  generatePosterQuestionReply,
} from "../services/chatbotService";

const ChatbotController = {
  //Chatbot ứng dụng web
  getChatResponse: async (req: any, res: any) => {
    const {
      message = "",
      imageBase64,
      mimeType = "image/jpeg",
      sessionId = "default",
    } = req.body;

    if (!message.trim() && !imageBase64) {
      return res.status(400).json({ error: "Tin nhắn không được để trống." });
    }

    const userId = (req as any).user?._id?.toString() || req.body.userId;
    let finalReply = "";

    try {
      let imageResult: {
        success: boolean;
        movieTitle?: string;
        movie?: any;
        showtimes?: any[];
        message: string;
      } | null = null;

      if (imageBase64) {
        imageResult = await chatbotService.processPosterUpload(
          imageBase64,
          mimeType,
          userId
        );

        chatbotService.saveMessage(sessionId, {
          sender: "user",
          text: "[Đã gửi hình ảnh]",
        });

        if (!message.trim()) {
          chatbotService.saveMessage(sessionId, {
            sender: "bot",
            text: imageResult.message,
          });
          finalReply = imageResult.message;
        }
      }

      if (message.trim()) {
        chatbotService.saveMessage(sessionId, {
          sender: "user",
          text: message,
        });

        let responseText = "";

        if (imageResult) {
          const posterReply = await generatePosterQuestionReply({
            posterInfo: imageResult,
            question: message,
            sessionId,
            userId,
          });

          // Response có thể là string hoặc object với movie/showtimes
          if (
            posterReply &&
            typeof posterReply === "object" &&
            "text" in posterReply
          ) {
            const replyObj = posterReply as {
              text: string;
              movie?: any;
              showtimes?: any[];
              targetDate?: string;
              dateRange?: { start: string; end: string };
            };
            responseText = replyObj.text || "";
            // Nếu có movie/showtimes trong response, lưu lại
            if (replyObj.movie || replyObj.showtimes) {
              imageResult = {
                success: true,
                movie: replyObj.movie || imageResult.movie,
                showtimes: replyObj.showtimes || [],
                message: responseText,
              };
            }
          } else {
            responseText = typeof posterReply === "string" ? posterReply : "";
          }
        } else {
          const response = await chatbotService.getResponse(
            message,
            sessionId,
            userId
          );

          // Response có thể là string hoặc object với movie/showtimes
          if (
            typeof response === "object" &&
            response !== null &&
            "text" in response
          ) {
            const responseObj = response as {
              text: string;
              movie?: any;
              showtimes?: any[];
            };
            responseText = responseObj.text || "";
            // Nếu có movie/showtimes trong response, lưu lại
            if (responseObj.movie || responseObj.showtimes) {
              imageResult = {
                success: true,
                movie: responseObj.movie,
                showtimes: responseObj.showtimes,
                message: responseText,
              };
            }
          } else {
            responseText =
              typeof response === "string"
                ? response
                : response && typeof response.toString === "function"
                ? response.toString()
                : "";
          }

          chatbotService.saveMessage(sessionId, {
            sender: "bot",
            text: responseText,
          });
        }

        finalReply = responseText;
      }

      if (!finalReply && imageResult) {
        finalReply = imageResult.message;
      }

      res.json({
        reply: finalReply,
        movie: imageResult?.movie,
        showtimes: imageResult?.showtimes,
        movieTitle: imageResult?.movieTitle,
      });
    } catch (error) {
      console.error("Error handling chatbot message:", error);
      res.status(500).json({
        error: "Đã có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.",
      });
    }
  },

  // Xử lý upload poster phim (Multi-modal)
  uploadPoster: async (req: any, res: any) => {
    try {
      const {
        imageBase64,
        mimeType = "image/jpeg",
        sessionId = "default",
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: "Hình ảnh không được để trống.",
        });
      }

      // Lấy userId từ req.user nếu có (khi đã authenticate)
      const userId = (req as any).user?._id?.toString() || req.body.userId;

      // Xử lý poster
      const result = await chatbotService.processPosterUpload(
        imageBase64,
        mimeType,
        userId
      );

      // Lưu tin nhắn vào lịch sử
      chatbotService.saveMessage(sessionId, {
        sender: "user",
        text: "[Đã upload poster phim]",
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

  // Xác thực webhook từ Facebook
  verifyWebhook: (req: any, res: any) => {
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verified!");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  },

  // Xử lý tin nhắn từ Facebook Messenger
  handleWebhook: async (req: any, res: any) => {
    console.log("Webhook event received:", JSON.stringify(req.body, null, 2));
    if (req.body.object === "page") {
      for (const entry of req.body.entry) {
        for (const webhookEvent of entry.messaging) {
          const senderPsid = webhookEvent.sender.id;
          console.log("Sender PSID:", senderPsid);
          if (webhookEvent.message) {
            const userMessage = webhookEvent.message.text;
            console.log("User message:", userMessage);
            if (userMessage) {
              const response = await chatbotService.getResponse(
                userMessage,
                senderPsid
              );
              console.log("Bot response:", response);
              await chatbotService.sendMessage(senderPsid, response as string);
            }
          }
        }
      }
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  },
};

export default ChatbotController;
