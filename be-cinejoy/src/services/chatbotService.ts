import axios from "axios";
import chatbotConfig from "../chatbot/chatbotConfig";
import { User } from "../models/User";

const { model, cache, conversationCache, PROMPT_CONFIG } = chatbotConfig;

const ChatbotService = {
  // Lưu tin nhắn vào lịch sử trò chuyện
  saveMessage: (sessionId: string, message: any) => {
    const conversationKey = `conversation:${sessionId}`;
    let conversation: any[] = conversationCache.get(conversationKey) || [];

    // Thêm tin nhắn mới vào cuối mảng
    conversation.push(message);

    // Giới hạn lịch sử trò chuyện tối đa 10 tin nhắn để tránh prompt quá dài
    if (conversation.length > PROMPT_CONFIG.MAX_CONVERSATION_LENGTH) {
      conversation = conversation.slice(-PROMPT_CONFIG.MAX_CONVERSATION_LENGTH);
    }

    // Lưu lại vào cache
    conversationCache.set(conversationKey, conversation);

    return conversation;
  },

  // Lấy lịch sử trò chuyện
  getConversation: (sessionId: string) => {
    const conversationKey = `conversation:${sessionId}`;
    return (conversationCache.get(conversationKey) || []) as any[];
  },

  // Lấy thông tin phim từ API
  getMovieInfo: async () => {
    try {
      const response = await axios.get("http://localhost:5000/movies");
      const movies = response.data;

      if (!movies || !Array.isArray(movies)) {
        return "Hiện không có thông tin phim.";
      }

      return movies
        .map(
          (movie) => `
                - Tên phim: ${movie.title || "Chưa có tên"}
                - Thể loại: ${movie.genre?.join(", ") || "Chưa phân loại"}
                - Thời lượng: ${movie.duration || "Chưa cập nhật"} phút
                - Ngày khởi chiếu: ${
                  movie.releaseDate
                    ? new Date(movie.releaseDate).toLocaleDateString("vi-VN")
                    : "Chưa cập nhật"
                }
                - Đạo diễn: ${movie.director || "Chưa cập nhật"}
                - Diễn viên: ${movie.actors?.join(", ") || "Chưa cập nhật"}
                - Ngôn ngữ: ${movie.language?.join(", ") || "Chưa cập nhật"}
                - Độ tuổi: ${movie.ageRating || "Chưa cập nhật"}
                - Trạng thái: ${movie.status || "Chưa cập nhật"}
                - Đánh giá: ${
                  movie.averageRating
                    ? movie.averageRating.toFixed(1) + "/5"
                    : "Chưa có đánh giá"
                }
                - poster: ${movie.posterImage || "Chưa có poster"}
                -hình: ${movie.image || "Chưa có "}
                - Mô tả: ${movie.description || "Chưa có mô tả"}
                -video tra
            `
        )
        .join("\n");
    } catch (error) {
      console.error("Error fetching movies:", error);
      return "Không thể lấy thông tin phim do lỗi hệ thống.";
    }
  },

  // Lấy thông tin rạp chiếu phim
  getTheaterInfo: async () => {
    try {
      const response = await axios.get("http://localhost:5000/theaters");
      const theaters = response.data;
      if (!theaters || !Array.isArray(theaters)) {
        return "Hiện không có thông tin rạp chiếu phim.";
      }
      return theaters
        .map(
          (theater) => `
- Tên rạp: ${theater.name || "Chưa có tên"}
- Địa chỉ: ${theater.location?.address || "Chưa cập nhật"}
- Khu vực: ${theater.location?.city || "Chưa cập nhật"}

        `
        )
        .join("\n");
    } catch (error) {
      console.error("Error fetching theaters:", error);
      return "Không thể lấy thông tin rạp chiếu phim do lỗi hệ thống.";
    }
  },

  getShowtimeInfo: async () => {
    try {
      const response = await axios.get("http://localhost:5000/showtimes");
      const showtimes = response.data;

      if (!showtimes || !Array.isArray(showtimes)) {
        return "Hiện không có thông tin suất chiếu.";
      }

      return showtimes
        .slice(0, 10)
        .map((showtime) => {
          const { movieId, theaterId, showDate, showTimes } = showtime;

          const movieTitle = movieId?.title || "Chưa có";
          const theaterName = theaterId?.name || "Chưa có";
          const dateRange = showDate
            ? `Từ ${new Date(showDate.start).toLocaleDateString(
                "vi-VN"
              )} đến ${new Date(showDate.end).toLocaleDateString("vi-VN")}`
            : "Chưa cập nhật";

          const timesDetails = showTimes
            .map((time: { start: string; end: string; room?: string }) => {
              const startTime = new Date(time.start).toLocaleTimeString(
                "vi-VN"
              );
              const endTime = new Date(time.end).toLocaleTimeString("vi-VN");
              const room = time.room || "Chưa cập nhật";

              return `  - Phòng: ${room}, Giờ: ${startTime} - ${endTime}`;
            })
            .join("\n");

          return `
- Phim: ${movieTitle}
- Rạp: ${theaterName}
- Ngày chiếu: ${dateRange}
Chi tiết giờ chiếu:
${timesDetails}
            `;
        })
        .join("\n");
    } catch (error) {
      console.error("Error fetching showtimes:", error);
      return "Không thể lấy thông tin suất chiếu do lỗi hệ thống.";
    }
  },

  // Lấy thông tin người dùng từ database
  getUserInfo: async (userId?: string) => {
    console.log('🔍 getUserInfo called with userId:', userId);
    if (!userId) {
      console.log('⚠️ No userId provided');
      return null;
    }
    try {
      const user = await User.findById(userId).select('-password -otp -otpExpires');
      if (!user || !user.isActive) {
        console.log('⚠️ User not found or inactive:', userId);
        return null;
      }
      console.log('✅ User found:', user.fullName);
      
      // Tách tên để lấy phần tên chính (tên cuối cùng - tên riêng)
      // VD: "Lê Tôn Tần" -> "Tần", "Nguyễn Văn A" -> "A", "Trần Thị Bích" -> "Bích"
      const fullName = user.fullName || '';
      const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
      let firstName = fullName; // Mặc định dùng tên đầy đủ
      
      if (nameParts.length > 1) {
        // Lấy từ cuối cùng (tên riêng) làm tên chính để gọi thân mật
        firstName = nameParts[nameParts.length - 1]; 
        // VD: "Lê Tôn Tần" -> "Tần"
        // VD: "Nguyễn Văn A" -> "A"
        // VD: "Trần Thị Bích" -> "Bích"
      } else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }
      
      return {
        fullName: fullName || 'Chưa cập nhật',
        firstName: firstName || fullName || 'Chưa cập nhật', // Tên để gọi thân mật
        email: user.email || 'Chưa cập nhật',
        phoneNumber: user.phoneNumber || 'Chưa cập nhật',
        gender: user.gender || 'Chưa cập nhật',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
        point: user.point || 0,
        role: user.role || 'USER'
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  },

  getResponse: async (userMessage: string, sessionId = "default", userId?: string) => {
    const cacheKey = `response:${userMessage}`;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      // Lưu tin nhắn người dùng và phản hồi vào lịch sử
      ChatbotService.saveMessage(sessionId, {
        sender: "user",
        text: userMessage,
      });
      ChatbotService.saveMessage(sessionId, {
        sender: "bot",
        text: cachedResponse,
      });
      return cachedResponse;
    }

    try {
      // Lưu tin nhắn người dùng vào lịch sử
      ChatbotService.saveMessage(sessionId, {
        sender: "user",
        text: userMessage,
      });

      // Lấy thông tin phim
      const movieInfo = await ChatbotService.getMovieInfo();
      // Lấy thông tin rạp chiếu phim
      const theaterInfo = await ChatbotService.getTheaterInfo();
      // Lấy thông tin suất chiếu
      const showtimeInfo = await ChatbotService.getShowtimeInfo();
      // Lấy thông tin người dùng (nếu có)
      const userInfo = await ChatbotService.getUserInfo(userId);
      // Lấy lịch sử trò chuyện
      const pastMessages: any[] = ChatbotService.getConversation(sessionId);
      
      // Kiểm tra xem đây có phải là tin nhắn đầu tiên không (chỉ có tin nhắn từ bot mặc định hoặc chưa có tin nhắn nào từ bot)
      const botMessagesCount = pastMessages.filter(msg => msg.sender === 'bot').length;
      const isFirstResponse = botMessagesCount <= 1; // 0 hoặc 1 (tin nhắn chào mặc định)

      const userInfoText = userInfo 
        ? `
            Thông tin người dùng hiện tại:
            - Tên đầy đủ: ${userInfo.fullName}
            - Tên để gọi (thân mật): ${userInfo.firstName}
            - Email: ${userInfo.email}
            - Số điện thoại: ${userInfo.phoneNumber}
            - Giới tính: ${userInfo.gender}
            - Ngày sinh: ${userInfo.dateOfBirth}
            - Điểm tích lũy: ${userInfo.point} điểm
            - Vai trò: ${userInfo.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
            
            QUAN TRỌNG - Hướng dẫn gọi tên người dùng:
            - Sử dụng tên thân mật "${userInfo.firstName}" thay vì "bạn" hoặc "anh/chị" trong câu trả lời
            - CHỈ CHÀO "Chào ${userInfo.firstName}" ở tin nhắn ĐẦU TIÊN của cuộc hội thoại
            - Ở các tin nhắn tiếp theo, KHÔNG chào lại, chỉ sử dụng tên "${userInfo.firstName}" một cách tự nhiên (ví dụ: "${userInfo.firstName} có thể...", "Dạ ${userInfo.firstName}...")
            - Nếu có thể, hãy cá nhân hóa câu trả lời dựa trên thông tin của họ (giới tính, điểm tích lũy, v.v.)
            `
        : 'Người dùng chưa đăng nhập hoặc thông tin không có sẵn.';

      // Phân tích lịch sử hội thoại để tìm ngữ cảnh
      const contextAnalysis = pastMessages.length > 0
        ? pastMessages
            .slice(-4) // Lấy 4 tin nhắn gần nhất để phân tích ngữ cảnh
            .map((msg) => msg.text)
            .join(" ")
        : "";

      const prompt = `
            Bạn là một chatbot thông minh của rạp chiếu phim CineJoy, được thiết kế để trả lời các câu hỏi của người dùng về phim ảnh và rạp chiếu phim một cách ngắn gọn, chính xác và chuyên nghiệp.
            
            ${userInfoText}
            
            Thông tin về rạp chiếu phim:
            - Có nhiều rạp chiếu phim hiện đại với công nghệ IMAX, 4DX
            - Giá vé dao động từ 50.000đ - 200.000đ tùy loại ghế và suất chiếu
            - Có chương trình khuyến mãi cho thành viên và các ngày lễ
            - Có thể đặt vé online qua website hoặc ứng dụng
            - Có dịch vụ combo đồ ăn và nước uống
            - Có các suất chiếu sớm và đêm muộn
            - Hỗ trợ đặt vé nhóm và tổ chức sự kiện

            Danh sách phim hiện có:
            ${movieInfo}
            Danh sách rạp chiếu phim hiện có:
            ${theaterInfo}
            Danh sách suất chiếu hiện có:
            ${showtimeInfo}
            
            QUAN TRỌNG - Hướng dẫn gọi tên và ngữ cảnh:
            1. CÁCH GỌI TÊN NGƯỜI DÙNG (nếu có thông tin user):
               - CHỈ CHÀO TÊN ở tin nhắn ĐẦU TIÊN khi bắt đầu cuộc hội thoại (ví dụ: "Chào ${userInfo?.firstName}")
               - Ở các tin nhắn tiếp theo, KHÔNG cần chào lại, chỉ cần sử dụng tên một cách tự nhiên trong câu trả lời (ví dụ: "Tần có thể...", "Dạ ${userInfo?.firstName}...")
               - KHÔNG lặp lại "Chào ${userInfo?.firstName}" ở mỗi tin nhắn
               - Nếu đã có lịch sử hội thoại (đã trả lời trước đó), KHÔNG chào lại nữa, chỉ trả lời trực tiếp
            
            2. PHẢI LUÔN LUÔN đọc và hiểu LỊCH SỬ HỘI THOẠI trước khi trả lời
            
            3. Khi người dùng hỏi về "phim đầu tiên", "phim đó", "phim này", "nội dung phim đầu tiên", v.v.:
               - Nếu trong lịch sử hội thoại TRƯỚC ĐÓ bạn đã đề cập đến một DANH SÁCH PHIM cụ thể (ví dụ: "các phim tình cảm", "phim hành động", v.v.), thì "phim đầu tiên" phải là phim ĐẦU TIÊN TRONG DANH SÁCH ĐÓ, KHÔNG PHẢI phim đầu tiên trong toàn bộ danh sách phim
               - Ví dụ: Nếu bạn vừa nói "Các phim tình cảm: Mắt Biếc, Cua lại vợ bầu" và user hỏi "nội dung phim đầu tiên" → phải hiểu là "Mắt Biếc" (phim đầu tiên trong danh sách vừa đề cập)
               - Chỉ khi KHÔNG có danh sách phim nào được đề cập trước đó trong lịch sử hội thoại, thì mới hiểu là "phim đầu tiên trong toàn bộ danh sách phim"
            
            4. Khi người dùng hỏi về "phim đó", "phim này", "phim kia" → phải tham chiếu đến phim VỪA ĐƯỢC ĐỀ CẬP trong lịch sử hội thoại gần nhất
            
            5. LUÔN LUÔN kiểm tra lịch sử hội thoại để hiểu ngữ cảnh trước khi trả lời
            
            Lịch sử hội thoại (ĐỌC KỸ ĐỂ HIỂU NGỮ CẢNH):
            ${
              pastMessages.length > 0
                ? pastMessages
                    .map(
                      (msg, index) =>
                        `${index + 1}. ${msg.sender === "user" ? "Người dùng" : "Chatbot"}: ${
                          msg.text
                        }`
                    )
                    .join("\n")
                : "Không có lịch sử hội thoại."
            }
        
            Câu hỏi hiện tại: ${userMessage}
            
            HƯỚNG DẪN TRẢ LỜI:
            - Đọc kỹ lịch sử hội thoại, đặc biệt là câu trả lời GẦN NHẤT của bạn để xem bạn đã đề cập đến DANH SÁCH PHIM nào
            - Khi người dùng hỏi về "phim đầu tiên", "phim đó", "nội dung phim đầu tiên", v.v., PHẢI tham chiếu đến danh sách phim VỪA ĐƯỢC ĐỀ CẬP trong lịch sử hội thoại
            - Chỉ khi KHÔNG có ngữ cảnh liên quan thì mới dùng phim đầu tiên trong toàn bộ danh sách
            - Trả lời dưới ${PROMPT_CONFIG.MAX_RESPONSE_WORDS} từ
            ${userInfo ? `
            - QUAN TRỌNG VỀ GỌI TÊN:
              * ${isFirstResponse 
                  ? `Đây là lần ĐẦU TIÊN bạn trả lời (chỉ có ${botMessagesCount} tin nhắn từ bot trước đó), nên hãy chào "Chào ${userInfo.firstName}"`
                  : `Đây KHÔNG phải là tin nhắn đầu tiên (đã có ${botMessagesCount} tin nhắn từ bot trước đó), nên KHÔNG chào lại, chỉ sử dụng tên "${userInfo.firstName}" một cách tự nhiên trong câu trả lời (ví dụ: "${userInfo.firstName} có thể...", "Dạ ${userInfo.firstName}...", v.v.)`}
              * Thay vì nói "bạn" hoặc "anh/chị", hãy sử dụng tên "${userInfo.firstName}" một cách tự nhiên và thân thiện, nhưng KHÔNG lặp lại lời chào ở các tin nhắn tiếp theo` : ''}
            `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const botResponse =
        response.text() ||
        "Xin lỗi, tôi không thể trả lời ngay lúc này. Bạn có thể hỏi thêm về phim hoặc rạp chiếu phim không?";

      // Lưu phản hồi vào cache và lịch sử trò chuyện
      cache.set(cacheKey, botResponse);
      ChatbotService.saveMessage(sessionId, {
        sender: "bot",
        text: botResponse,
      });

      return botResponse;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Xin lỗi, tôi không thể trả lời ngay lúc này. Bạn có thể hỏi thêm về phim hoặc rạp chiếu phim không?";
    }
  },

  // Gửi tin nhắn đến Facebook Messenger
  sendMessage: async (recipientId: string, message: string) => {
    // Kiểm tra nếu message là link ảnh (hoặc bạn có logic riêng để phát hiện)
    const imageUrlMatch = message.match(
      /https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif)/i
    );
    if (imageUrlMatch) {
      // Gửi ảnh
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/me/messages`,
          {
            recipient: { id: recipientId },
            message: {
              attachment: {
                type: "image",
                payload: { url: imageUrlMatch[0], is_reusable: true },
              },
            },
          },
          {
            params: {
              access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Error sending image to Facebook:", error);
        throw error;
      }
    } else {
      // Gửi text như cũ
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/me/messages`,
          {
            recipient: { id: recipientId },
            message: { text: message },
          },
          {
            params: {
              access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Error sending message to Facebook:", error);
        throw error;
      }
    }
  },
};

export default ChatbotService;
