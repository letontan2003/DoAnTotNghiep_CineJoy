import axios from "axios";
import chatbotConfig from "../chatbot/chatbotConfig";
import { User } from "../models/User";
import { Movie } from "../models/Movies";
import ShowtimeService from "./ShowtimeService";
import { removeAccents } from "../utils/removeAccents";
import priceListService from "./PriceListService";
import VoucherService from "./VoucherService";
import UserVoucherService from "./UserVoucherService";
import OrderService from "./OrderService";

const { model, cache, conversationCache, PROMPT_CONFIG } = chatbotConfig;
const showtimeService = new ShowtimeService();
const voucherService = new VoucherService();
const userVoucherService = new UserVoucherService();

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
                  movie.startDate
                    ? new Date(movie.startDate).toLocaleDateString("vi-VN")
                    : "Chưa cập nhật"
                }
                - Ngày phát hành: ${
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

  // Lấy thông tin giá vé và combo từ bảng giá đang hoạt động
  getPriceInfo: async () => {
    try {
      const priceList = await priceListService.getCurrentPriceList();

      if (!priceList) {
        return "Hiện không có bảng giá đang hoạt động.";
      }

      if (!priceList.lines || priceList.lines.length === 0) {
        return "Bảng giá hiện tại chưa có thông tin giá.";
      }

      // Phân loại các loại giá
      const ticketPrices: { seatType: string; price: number }[] = [];
      const comboPrices: { name: string; price: number }[] = [];
      const singleProductPrices: { name: string; price: number }[] = [];

      priceList.lines.forEach((line) => {
        if (line.type === "ticket" && line.seatType) {
          const seatTypeName =
            line.seatType === "normal"
              ? "Ghế thường"
              : line.seatType === "vip"
              ? "Ghế VIP"
              : line.seatType === "couple"
              ? "Ghế đôi"
              : line.seatType === "4dx"
              ? "Ghế 4DX"
              : line.seatType;
          ticketPrices.push({
            seatType: seatTypeName,
            price: line.price,
          });
        } else if (line.type === "combo" && line.productName) {
          comboPrices.push({
            name: line.productName,
            price: line.price,
          });
        } else if (line.type === "single" && line.productName) {
          singleProductPrices.push({
            name: line.productName,
            price: line.price,
          });
        }
      });

      let priceInfo = `Bảng giá hiện tại: ${priceList.name || "Chưa có tên"}\n`;

      if (priceList.description) {
        priceInfo += `Mô tả: ${priceList.description}\n`;
      }

      priceInfo += `\nGiá vé theo loại ghế:\n`;
      if (ticketPrices.length > 0) {
        ticketPrices.forEach((ticket) => {
          priceInfo += `- ${ticket.seatType}: ${ticket.price.toLocaleString(
            "vi-VN"
          )}đ\n`;
        });
      } else {
        priceInfo += `- Chưa có thông tin giá vé\n`;
      }

      if (comboPrices.length > 0) {
        priceInfo += `\nCombo đồ ăn/nước uống:\n`;
        comboPrices.forEach((combo) => {
          priceInfo += `- ${combo.name}: ${combo.price.toLocaleString(
            "vi-VN"
          )}đ\n`;
        });
      }

      if (singleProductPrices.length > 0) {
        priceInfo += `\nSản phẩm đơn lẻ:\n`;
        singleProductPrices.forEach((product) => {
          priceInfo += `- ${product.name}: ${product.price.toLocaleString(
            "vi-VN"
          )}đ\n`;
        });
      }

      return priceInfo;
    } catch (error) {
      console.error("Error fetching price info:", error);
      return "Không thể lấy thông tin giá do lỗi hệ thống.";
    }
  },

  // Lấy thông tin các chương trình khuyến mãi đang hoạt động
  getPromotionInfo: async () => {
    try {
      const vouchers = await voucherService.getVouchers();
      const now = new Date();

      // Lọc các voucher đang hoạt động
      const activeVouchers = vouchers.filter((voucher) => {
        const startDate = new Date(voucher.startDate);
        const endDate = new Date(voucher.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        now.setHours(0, 0, 0, 0);

        return (
          voucher.status === "hoạt động" && now >= startDate && now <= endDate
        );
      });

      if (activeVouchers.length === 0) {
        return "Hiện không có chương trình khuyến mãi đang hoạt động.";
      }

      let promotionInfo = `Các chương trình khuyến mãi đang hoạt động:\n\n`;
      let promotionIndex = 1;

      activeVouchers.forEach((voucher) => {
        // Lọc các promotion lines đang hoạt động
        if (
          voucher.lines &&
          Array.isArray(voucher.lines) &&
          voucher.lines.length > 0
        ) {
          const activeLines = voucher.lines.filter((line) => {
            if (line.status !== "hoạt động") return false;

            const lineStart = new Date(line.validityPeriod.startDate);
            const lineEnd = new Date(line.validityPeriod.endDate);
            lineStart.setHours(0, 0, 0, 0);
            lineEnd.setHours(23, 59, 59, 999);

            return now >= lineStart && now <= lineEnd;
          });

          if (activeLines.length > 0) {
            activeLines.forEach((line) => {
              const detail = line.detail as any;

              // Xác định loại khuyến mãi
              let promotionType = "";
              if (line.promotionType === "voucher") {
                promotionType = "Voucher đổi điểm";
              } else if (line.promotionType === "percent") {
                promotionType = "Giảm giá theo phần trăm";
              } else if (line.promotionType === "amount") {
                promotionType = "Giảm giá cố định";
              } else if (line.promotionType === "item") {
                promotionType = "Mua tặng";
              }

              // Lấy mô tả
              let description = "";
              if (detail.description) {
                description = detail.description;
              } else if (voucher.description) {
                description = voucher.description;
              }

              if (promotionType) {
                promotionInfo += `${promotionIndex}. Loại: ${promotionType}\n`;
                if (description) {
                  promotionInfo += `   Mô tả: ${description}\n`;
                }
                promotionInfo += `\n`;
                promotionIndex++;
              }
            });
          }
        }
      });

      if (promotionInfo === `Các chương trình khuyến mãi đang hoạt động:\n\n`) {
        return "Hiện không có chương trình khuyến mãi đang hoạt động.";
      }

      return promotionInfo;
    } catch (error) {
      console.error("Error fetching promotion info:", error);
      return "Không thể lấy thông tin khuyến mãi do lỗi hệ thống.";
    }
  },

  // Lấy thông tin điểm và voucher của người dùng
  getUserPointsAndVouchers: async (userId?: string) => {
    try {
      if (!userId) {
        return "Bạn cần đăng nhập để xem điểm và voucher của mình.";
      }

      // Lấy thông tin user để lấy điểm
      const user = await User.findById(userId).select("point");
      if (!user) {
        return "Không tìm thấy thông tin người dùng.";
      }

      const userPoints = user.point || 0;

      // Lấy voucher chưa sử dụng của user
      const vouchersResult = await userVoucherService.getUnusedUserVouchers(
        userId
      );
      let vouchersInfo = "";

      if (
        vouchersResult.status &&
        vouchersResult.data &&
        Array.isArray(vouchersResult.data)
      ) {
        const vouchers = vouchersResult.data;
        console.log(
          `🔍 getUserPointsAndVouchers: Found ${vouchers.length} unused user vouchers`
        );

        // Lọc voucher chưa hết hạn
        const now = new Date();
        const activeVouchers = vouchers.filter((uv: any) => {
          const voucher = uv.voucherId as any;
          if (!voucher) {
            console.log(`⚠️ Voucher ${uv._id} has no voucherId (skipped)`);
            return false;
          }

          console.log(
            `✅ Checking voucher ${uv._id}, voucherId: ${voucher._id || "N/A"}`
          );

          // Kiểm tra thời gian hiệu lực từ voucher hoặc lines
          let endDate: Date | null = null;

          // Ưu tiên kiểm tra validityPeriod từ lines (nếu có)
          if (
            voucher.lines &&
            Array.isArray(voucher.lines) &&
            voucher.lines.length > 0
          ) {
            // Lấy line đầu tiên có validityPeriod
            const lineWithPeriod = voucher.lines.find(
              (l: any) => l.validityPeriod?.endDate
            );
            if (lineWithPeriod?.validityPeriod?.endDate) {
              endDate = new Date(lineWithPeriod.validityPeriod.endDate);
              console.log(
                `   Found endDate from line: ${endDate.toLocaleDateString(
                  "vi-VN"
                )}`
              );
            }
          }

          // Fallback: kiểm tra validityPeriod của voucher
          if (!endDate && voucher.validityPeriod?.endDate) {
            endDate = new Date(voucher.validityPeriod.endDate);
            console.log(
              `   Found endDate from voucher.validityPeriod: ${endDate.toLocaleDateString(
                "vi-VN"
              )}`
            );
          }

          // Fallback: kiểm tra endDate của voucher
          if (!endDate && voucher.endDate) {
            endDate = new Date(voucher.endDate);
            console.log(
              `   Found endDate from voucher.endDate: ${endDate.toLocaleDateString(
                "vi-VN"
              )}`
            );
          }

          // Nếu có endDate, kiểm tra còn hạn không
          if (endDate) {
            // Reset giờ về cuối ngày để so sánh chính xác
            const endDateEndOfDay = new Date(endDate);
            endDateEndOfDay.setHours(23, 59, 59, 999);
            const isValid = now <= endDateEndOfDay;
            console.log(
              `   Voucher ${
                isValid ? "VALID" : "EXPIRED"
              } (now: ${now.toLocaleDateString(
                "vi-VN"
              )} ${now.toLocaleTimeString(
                "vi-VN"
              )}, endDate: ${endDate.toLocaleDateString("vi-VN")})`
            );
            return isValid;
          }

          // Nếu không có thông tin thời gian, giả sử còn hạn (để tránh lọc nhầm)
          console.log(`   No endDate found, assuming valid`);
          return true;
        });

        console.log(`✅ Found ${activeVouchers.length} active vouchers`);

        if (activeVouchers.length > 0) {
          vouchersInfo = `Voucher của bạn (${activeVouchers.length} voucher):\n`;

          activeVouchers.forEach((uv: any, index: number) => {
            const voucher = uv.voucherId as any;
            if (!voucher) {
              console.log(`⚠️ Skipping voucher ${uv._id} - no voucherId`);
              return;
            }

            console.log(`📝 Processing voucher ${index + 1}:`, {
              voucherId: voucher._id,
              hasLines: !!voucher.lines,
              linesCount: voucher.lines?.length || 0,
            });

            // Lấy thông tin giảm giá từ voucher
            let discountInfo = "";
            if (
              voucher.lines &&
              Array.isArray(voucher.lines) &&
              voucher.lines.length > 0
            ) {
              // Tìm line có promotionType = 'voucher'
              const voucherLine = voucher.lines.find(
                (l: any) => l.promotionType === "voucher"
              );
              if (voucherLine) {
                const detail = voucherLine.detail as any;
                console.log(
                  `   Found voucher line, detail:`,
                  JSON.stringify(detail, null, 2)
                );
                if (detail && detail.discountPercent) {
                  discountInfo = `Giảm ${detail.discountPercent}%`;
                  if (detail.maxDiscountValue) {
                    discountInfo += ` tối đa ${detail.maxDiscountValue.toLocaleString(
                      "vi-VN"
                    )}đ`;
                  }
                }
              }

              // Nếu không tìm thấy line 'voucher' hoặc không có discountPercent, thử lấy từ line đầu tiên
              if (!discountInfo) {
                const firstLine = voucher.lines[0];
                if (firstLine) {
                  const detail = firstLine.detail as any;
                  console.log(
                    `   Using first line, detail:`,
                    JSON.stringify(detail, null, 2)
                  );
                  if (detail && detail.discountPercent) {
                    discountInfo = `Giảm ${detail.discountPercent}%`;
                    if (detail.maxDiscountValue) {
                      discountInfo += ` tối đa ${detail.maxDiscountValue.toLocaleString(
                        "vi-VN"
                      )}đ`;
                    }
                  }
                }
              }
            }

            // Fallback: kiểm tra discountPercent trực tiếp từ voucher (legacy)
            if (!discountInfo && voucher.discountPercent) {
              discountInfo = `Giảm ${voucher.discountPercent}%`;
              if (voucher.maxDiscountValue) {
                discountInfo += ` tối đa ${voucher.maxDiscountValue.toLocaleString(
                  "vi-VN"
                )}đ`;
              }
            }

            // Nếu vẫn không có thông tin, dùng mặc định
            if (!discountInfo) {
              discountInfo = "Voucher giảm giá";
            }

            // Lấy hạn sử dụng
            let expiryDate = "";
            if (
              voucher.lines &&
              Array.isArray(voucher.lines) &&
              voucher.lines.length > 0
            ) {
              // Lấy line đầu tiên có validityPeriod
              const lineWithPeriod = voucher.lines.find(
                (l: any) => l.validityPeriod?.endDate
              );
              if (lineWithPeriod?.validityPeriod?.endDate) {
                expiryDate = new Date(
                  lineWithPeriod.validityPeriod.endDate
                ).toLocaleDateString("vi-VN");
              }
            } else if (voucher.validityPeriod?.endDate) {
              expiryDate = new Date(
                voucher.validityPeriod.endDate
              ).toLocaleDateString("vi-VN");
            } else if (voucher.endDate) {
              expiryDate = new Date(voucher.endDate).toLocaleDateString(
                "vi-VN"
              );
            }

            vouchersInfo += `${index + 1}. ${
              discountInfo || "Voucher giảm giá"
            }`;
            if (expiryDate) {
              vouchersInfo += ` - Hạn dùng: ${expiryDate}`;
            }
            vouchersInfo += `\n`;
          });
        } else {
          vouchersInfo = "Bạn chưa có voucher nào.";
          console.log(
            `⚠️ No active vouchers found. Total vouchers: ${vouchers.length}`
          );
        }
      } else {
        vouchersInfo = "Bạn chưa có voucher nào.";
      }

      return `Điểm CNJ hiện có: ${userPoints.toLocaleString(
        "vi-VN"
      )} điểm\n\n${vouchersInfo}`;
    } catch (error) {
      console.error("Error fetching user points and vouchers:", error);
      return "Không thể lấy thông tin điểm và voucher do lỗi hệ thống.";
    }
  },

  // Lấy lịch sử giao dịch của người dùng
  getOrderHistory: async (userId?: string, filterDate?: string) => {
    try {
      if (!userId) {
        return "Bạn cần đăng nhập để xem lịch sử giao dịch.";
      }

      // Lấy tất cả orders của user (lấy nhiều để có đủ dữ liệu)
      const result = await OrderService.getOrdersByUserId(userId, 1, 1000);
      const orders = result.orders || [];

      if (orders.length === 0) {
        return "Bạn chưa có đơn hàng nào.";
      }

      // Lọc theo ngày nếu có
      let filteredOrders = orders;
      if (filterDate) {
        // Parse filterDate (có thể là "18/11", "18/11/2024", "2024-11-18", v.v.)
        const dateParts = filterDate.split(/[\/\-]/);
        let targetDate: Date | null = null;

        if (dateParts.length >= 2) {
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const year =
            dateParts.length === 3
              ? parseInt(dateParts[2])
              : new Date().getFullYear();

          targetDate = new Date(year, month, day);
          targetDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);

          filteredOrders = orders.filter((order: any) => {
            const orderDate = new Date(order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate >= targetDate! && orderDate < nextDay;
          });
        }
      }

      if (filteredOrders.length === 0) {
        return filterDate
          ? `Bạn không có đơn hàng nào vào ngày ${filterDate}.`
          : "Bạn chưa có đơn hàng nào.";
      }

      // Tính toán thống kê
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(
        (o: any) => o.orderStatus === "COMPLETED"
      ).length;
      const returnedOrders = filteredOrders.filter(
        (o: any) => o.orderStatus === "RETURNED"
      ).length;
      const confirmedOrders = filteredOrders.filter(
        (o: any) => o.orderStatus === "CONFIRMED"
      ).length;
      const cancelledOrders = filteredOrders.filter(
        (o: any) => o.orderStatus === "CANCELLED"
      ).length;

      // Tính tổng số vé (tổng số ghế trong tất cả orders)
      const totalTickets = filteredOrders.reduce((sum: number, order: any) => {
        return sum + (order.seats?.length || 0);
      }, 0);

      // Format thông tin
      let historyInfo = "";

      if (filterDate) {
        historyInfo = `Lịch sử giao dịch ngày ${filterDate}:\n\n`;
      } else {
        historyInfo = `Lịch sử giao dịch của bạn:\n\n`;
      }

      historyInfo += `Tổng số đơn hàng: ${totalOrders}\n`;
      historyInfo += `Tổng số vé đã mua: ${totalTickets} vé\n`;
      historyInfo += `- Đơn hàng đã hoàn tất: ${completedOrders}\n`;
      historyInfo += `- Đơn hàng đã xác nhận: ${confirmedOrders}\n`;
      historyInfo += `- Đơn hàng đã trả: ${returnedOrders}\n`;
      historyInfo += `- Đơn hàng đã hủy: ${cancelledOrders}\n\n`;

      // Chi tiết từng đơn hàng
      historyInfo += `Chi tiết đơn hàng:\n`;
      filteredOrders.forEach((order: any, index: number) => {
        const orderDate = new Date(order.createdAt).toLocaleDateString("vi-VN");
        const orderTime = new Date(order.createdAt).toLocaleTimeString(
          "vi-VN",
          { hour: "2-digit", minute: "2-digit" }
        );
        const movie = order.movieId as any;
        const theater = order.theaterId as any;
        const movieTitle = movie?.title || "Không rõ";
        const theaterName = theater?.name || "Không rõ";
        const seatCount = order.seats?.length || 0;
        const seatIds = order.seats?.map((s: any) => s.seatId).join(", ") || "";

        // Trạng thái đơn hàng
        let statusText = "";
        switch (order.orderStatus) {
          case "COMPLETED":
            statusText = "Đã hoàn tất";
            break;
          case "CONFIRMED":
            statusText = "Đã xác nhận";
            break;
          case "RETURNED":
            statusText = "Đã trả vé";
            break;
          case "CANCELLED":
            statusText = "Đã hủy";
            break;
          case "PENDING":
            statusText = "Đang chờ";
            break;
          default:
            statusText = order.orderStatus || "Không rõ";
        }

        historyInfo += `${index + 1}. Mã đơn: ${order.orderCode}\n`;
        historyInfo += `   Phim: ${movieTitle}\n`;
        historyInfo += `   Rạp: ${theaterName}\n`;
        historyInfo += `   Ngày chiếu: ${order.showDate} lúc ${order.showTime}\n`;
        historyInfo += `   Phòng: ${order.room}\n`;
        historyInfo += `   Ghế: ${seatIds} (${seatCount} vé)\n`;
        historyInfo += `   Trạng thái: ${statusText}\n`;
        historyInfo += `   Tổng tiền: ${order.finalAmount.toLocaleString(
          "vi-VN"
        )}đ\n`;
        historyInfo += `   Ngày đặt: ${orderDate} ${orderTime}\n`;
        historyInfo += `\n`;
      });

      return historyInfo;
    } catch (error) {
      console.error("Error fetching order history:", error);
      return "Không thể lấy lịch sử giao dịch do lỗi hệ thống.";
    }
  },

  // Kiểm tra câu hỏi có phải ngoài lề (off-topic) không
  isOffTopicQuestion: async (userMessage: string): Promise<boolean> => {
    try {
      const offTopicPrompt = `
Bạn là một hệ thống phân loại câu hỏi cho chatbot của rạp chiếu phim CineJoy.

Nhiệm vụ của bạn: Xác định xem câu hỏi của người dùng có liên quan đến rạp chiếu phim CineJoy hay không.

CÁC CHỦ ĐỀ ĐƯỢC CHẤP NHẬN (ON-TOPIC):
- Phim ảnh: thông tin phim, thể loại, diễn viên, đạo diễn, nội dung phim, đánh giá phim
- Rạp chiếu phim: địa chỉ rạp, thông tin rạp, cơ sở vật chất
- Suất chiếu: lịch chiếu, giờ chiếu, phòng chiếu
- Đặt vé: cách đặt vé, giá vé, combo, khuyến mãi
- Dịch vụ: combo đồ ăn, nước uống, dịch vụ của rạp
- Câu hỏi chào hỏi thông thường: xin chào, cảm ơn, tạm biệt
- Câu hỏi về tài khoản: điểm tích lũy, thông tin cá nhân, lịch sử giao dịch, đơn hàng, vé đã mua (nếu có trong hệ thống)
- Câu hỏi về thông tin liên hệ: email, hotline, số điện thoại, cách liên hệ với CineJoy

CÁC CHỦ ĐỀ KHÔNG ĐƯỢC CHẤP NHẬN (OFF-TOPIC):
- Toán học: phép tính, giải bài tập toán
- Lịch sử, địa lý: câu hỏi về lịch sử, địa lý
- Khoa học: vật lý, hóa học, sinh học
- Công nghệ: lập trình, phần mềm (trừ khi hỏi về ứng dụng/website CineJoy)
- Tin tức, thời sự: tin tức ngoài lĩnh vực phim ảnh
- Thể thao: kết quả bóng đá, thể thao
- Sức khỏe, y tế: câu hỏi về sức khỏe
- Giáo dục: bài tập, học tập (trừ khi liên quan đến phim giáo dục)
- Bất kỳ câu hỏi nào KHÔNG liên quan đến phim ảnh, rạp chiếu phim, hoặc dịch vụ của CineJoy

Câu hỏi của người dùng: "${userMessage}"

Hãy trả lời CHỈ bằng một từ:
- "YES" nếu câu hỏi LIÊN QUAN đến rạp chiếu phim CineJoy (on-topic)
- "NO" nếu câu hỏi KHÔNG liên quan đến rạp chiếu phim CineJoy (off-topic)

Trả lời:`;

      const result = await model.generateContent(offTopicPrompt);
      const response = await result.response;
      const answer = response.text().trim().toUpperCase();

      // Trả lời "NO" nghĩa là câu hỏi ngoài lề (off-topic)
      return answer.includes("NO") || answer === "KHÔNG";
    } catch (error) {
      console.error("Error checking off-topic question:", error);
      // Nếu có lỗi, sử dụng keyword-based fallback
      return ChatbotService.isOffTopicByKeywords(userMessage);
    }
  },

  // Phương thức dự phòng: kiểm tra bằng từ khóa
  isOffTopicByKeywords: (userMessage: string): boolean => {
    const message = userMessage.toLowerCase().trim();

    // Kiểm tra phép tính toán học trước (pattern: số + số hoặc số - số, v.v.)
    // Pattern này bắt: "1 + 1", "567 - 333", "2*3", "10/2", v.v.
    const mathPattern =
      /^\d+\s*[+\-*/×÷]\s*\d+\s*(bằng\s*(mấy|bao\s*nhiêu|gì))?$/i;
    const simpleMathPattern = /^\d+\s*[+\-*/×÷=]\s*\d+$/;

    if (mathPattern.test(message) || simpleMathPattern.test(message)) {
      return true; // Đây là câu hỏi toán học, off-topic
    }

    // Kiểm tra các câu hỏi toán học với từ khóa tiếng Việt
    if (
      /bằng\s*(mấy|bao\s*nhiêu|gì)/i.test(message) &&
      /\d+\s*[+\-*/×÷]/.test(message)
    ) {
      return true; // Off-topic
    }

    // Từ khóa chỉ chấp nhận (on-topic)
    const onTopicKeywords = [
      "phim",
      "movie",
      "rạp",
      "theater",
      "cinema",
      "chiếu",
      "showtime",
      "vé",
      "ticket",
      "booking",
      "đặt",
      "combo",
      "suất",
      "giờ chiếu",
      "diễn viên",
      "actor",
      "đạo diễn",
      "director",
      "thể loại",
      "genre",
      "đánh giá",
      "rating",
      "review",
      "nội dung",
      "mô tả",
      "description",
      "cinejoy",
      "chào",
      "hello",
      "hi",
      "xin chào",
      "cảm ơn",
      "thank",
      "tạm biệt",
      "goodbye",
      "bye",
      "điểm",
      "point",
      "tích lũy",
      "giá",
      "price",
      "bảng giá",
      "pricing",
      "giá vé",
      "ticket price",
      "sản phẩm",
      "product",
      "đồ ăn",
      "food",
      "nước uống",
      "drink",
      "khuyến mãi",
      "promotion",
      "voucher",
      "giảm giá",
      "discount",
      "ưu đãi",
      "mã giảm giá",
      "coupon",
      "chương trình",
      "campaign",
      "voucher của tôi",
      "điểm của tôi",
      "điểm hiện có",
      "voucher hiện có",
      "tôi có bao nhiêu điểm",
      "tôi có voucher gì",
      "điểm tích lũy",
      "lịch sử",
      "giao dịch",
      "vé đã mua",
      "đơn hàng",
      "lịch sử giao dịch",
      "số vé đã mua",
      "số lượng vé hoàn tất",
      "số lượng vé trả",
      "vé của tôi",
      "đơn hàng của tôi",
      "tôi đã mua vé nào",
      "ngày",
      "mua vé",
      "liên hệ",
      "thông tin liên hệ",
      "email",
      "hotline",
      "số điện thoại",
      "cách liên hệ",
      "email của cinejoy",
      "hotline của cinejoy",
      "contact",
    ];

    // Từ khóa từ chối (off-topic)
    const offTopicKeywords = [
      // Toán học
      "bằng mấy",
      "bằng bao nhiêu",
      "tính",
      "cộng",
      "trừ",
      "nhân",
      "chia",
      "toán",
      "math",
      "giải bài toán",
      "phép tính",
      // Khoa học
      "vật lý",
      "physics",
      "hóa học",
      "chemistry",
      "sinh học",
      "biology",
      // Giáo dục
      "bài tập",
      "homework",
      "học",
      "study",
      "giải bài",
      // Thời sự
      "tin tức",
      "news",
      "thời sự",
      // Thể thao
      "bóng đá",
      "football",
      "thể thao",
      "sport",
      // Sức khỏe
      "sức khỏe",
      "health",
      "bệnh",
      "disease",
      "y tế",
      "medical",
    ];

    // Kiểm tra từ khóa off-topic
    const hasOffTopicKeyword = offTopicKeywords.some((keyword) =>
      message.includes(keyword)
    );

    if (hasOffTopicKeyword) {
      return true; // Off-topic
    }

    // Nếu có từ khóa on-topic, coi như on-topic
    const hasOnTopicKeyword = onTopicKeywords.some((keyword) =>
      message.includes(keyword)
    );

    if (hasOnTopicKeyword) {
      return false; // On-topic
    }

    // Mặc định: nếu không chắc, cho phép (false = không phải off-topic)
    // Để Gemini AI xử lý trong prompt chính
    return false;
  },

  // Lấy thông tin người dùng từ database
  getUserInfo: async (userId?: string) => {
    console.log("🔍 getUserInfo called with userId:", userId);
    if (!userId) {
      console.log("⚠️ No userId provided");
      return null;
    }
    try {
      const user = await User.findById(userId).select(
        "-password -otp -otpExpires"
      );
      if (!user || !user.isActive) {
        console.log("⚠️ User not found or inactive:", userId);
        return null;
      }
      console.log("✅ User found:", user.fullName);

      // Tách tên để lấy phần tên chính (tên cuối cùng - tên riêng)
      // VD: "Lê Tôn Tần" -> "Tần", "Nguyễn Văn A" -> "A", "Trần Thị Bích" -> "Bích"
      const fullName = user.fullName || "";
      const nameParts = fullName
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0);
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
        fullName: fullName || "Chưa cập nhật",
        firstName: firstName || fullName || "Chưa cập nhật", // Tên để gọi thân mật
        email: user.email || "Chưa cập nhật",
        phoneNumber: user.phoneNumber || "Chưa cập nhật",
        gender: user.gender || "Chưa cập nhật",
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toLocaleDateString("vi-VN")
          : "Chưa cập nhật",
        point: user.point || 0,
        role: user.role || "USER",
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  },

  getResponse: async (
    userMessage: string,
    sessionId = "default",
    userId?: string
  ) => {
    // Kiểm tra câu hỏi ngoài lề TRƯỚC KHI xử lý
    const isOffTopic = await ChatbotService.isOffTopicQuestion(userMessage);

    if (isOffTopic) {
      // Lấy thông tin người dùng và lịch sử hội thoại để cá nhân hóa thông báo từ chối
      const userInfo = await ChatbotService.getUserInfo(userId);
      const pastMessages = ChatbotService.getConversation(sessionId);
      const botMessagesCount = pastMessages.filter(
        (msg) => msg.sender === "bot"
      ).length;
      const isFirstMessage = botMessagesCount <= 1;

      const userName = userInfo?.firstName || "bạn";

      // Tạo thông báo từ chối phù hợp
      let rejectionMessage: string;
      if (userInfo && isFirstMessage) {
        // Tin nhắn đầu tiên, có thông tin user -> chào tên
        rejectionMessage = `Chào ${userName}, tôi là CineJoy Assistant - trợ lý ảo của rạp chiếu phim CineJoy. Tôi chỉ có thể hỗ trợ ${userName} về các vấn đề liên quan đến phim ảnh, rạp chiếu phim, đặt vé, suất chiếu và dịch vụ của CineJoy. ${userName} có câu hỏi nào về phim hoặc rạp chiếu phim không ạ?`;
      } else if (userInfo && !isFirstMessage) {
        // Đã có hội thoại trước, có thông tin user -> không chào lại
        rejectionMessage = `${userName} ơi, tôi chỉ có thể hỗ trợ ${userName} về các vấn đề liên quan đến phim ảnh, rạp chiếu phim, đặt vé, suất chiếu và dịch vụ của CineJoy. ${userName} có câu hỏi nào về phim hoặc rạp chiếu phim không ạ?`;
      } else if (!userInfo && isFirstMessage) {
        // Tin nhắn đầu tiên, không có thông tin user -> chào chung
        rejectionMessage = `Xin chào, tôi là CineJoy Assistant - trợ lý ảo của rạp chiếu phim CineJoy. Tôi chỉ có thể hỗ trợ bạn về các vấn đề liên quan đến phim ảnh, rạp chiếu phim, đặt vé, suất chiếu và dịch vụ của CineJoy. Bạn có câu hỏi nào về phim hoặc rạp chiếu phim không ạ?`;
      } else {
        // Đã có hội thoại trước, không có thông tin user -> không chào lại
        rejectionMessage = `Tôi chỉ có thể hỗ trợ bạn về các vấn đề liên quan đến phim ảnh, rạp chiếu phim, đặt vé, suất chiếu và dịch vụ của CineJoy. Bạn có câu hỏi nào về phim hoặc rạp chiếu phim không ạ?`;
      }

      // Lưu tin nhắn người dùng và phản hồi từ chối vào lịch sử
      ChatbotService.saveMessage(sessionId, {
        sender: "user",
        text: userMessage,
      });
      ChatbotService.saveMessage(sessionId, {
        sender: "bot",
        text: rejectionMessage,
      });

      return rejectionMessage;
    }

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
      // Lấy thông tin giá vé và combo
      const priceInfo = await ChatbotService.getPriceInfo();
      // Lấy thông tin khuyến mãi đang hoạt động
      const promotionInfo = await ChatbotService.getPromotionInfo();
      // Lấy thông tin người dùng (nếu có)
      const userInfo = await ChatbotService.getUserInfo(userId);
      // Lấy thông tin điểm và voucher của người dùng (nếu có userId)
      const userPointsAndVouchers = userId
        ? await ChatbotService.getUserPointsAndVouchers(userId)
        : null;

      // Kiểm tra xem user có hỏi về ngày cụ thể không
      let filterDate: string | undefined = undefined;
      const datePattern =
        /(?:ngày|vào ngày|hôm|ngày)\s*(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i;
      const dateMatch = userMessage.match(datePattern);
      if (dateMatch && dateMatch[1]) {
        filterDate = dateMatch[1];
      }

      // Lấy lịch sử giao dịch của người dùng (nếu có userId)
      const orderHistory = userId
        ? await ChatbotService.getOrderHistory(userId, filterDate)
        : null;
      // Lấy lịch sử trò chuyện
      const pastMessages: any[] = ChatbotService.getConversation(sessionId);

      // Kiểm tra xem đây có phải là tin nhắn đầu tiên không (chỉ có tin nhắn từ bot mặc định hoặc chưa có tin nhắn nào từ bot)
      const botMessagesCount = pastMessages.filter(
        (msg) => msg.sender === "bot"
      ).length;
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
            - Vai trò: ${
              userInfo.role === "ADMIN" ? "Quản trị viên" : "Khách hàng"
            }
            
            QUAN TRỌNG - Hướng dẫn gọi tên người dùng:
            - Sử dụng tên thân mật "${
              userInfo.firstName
            }" thay vì "bạn" hoặc "anh/chị" trong câu trả lời
            - CHỈ CHÀO "Chào ${
              userInfo.firstName
            }" ở tin nhắn ĐẦU TIÊN của cuộc hội thoại
            - Ở các tin nhắn tiếp theo, KHÔNG chào lại, chỉ sử dụng tên "${
              userInfo.firstName
            }" một cách tự nhiên (ví dụ: "${
            userInfo.firstName
          } có thể...", "Dạ ${userInfo.firstName}...")
            - Nếu có thể, hãy cá nhân hóa câu trả lời dựa trên thông tin của họ (giới tính, điểm tích lũy, v.v.)
            `
        : "Người dùng chưa đăng nhập hoặc thông tin không có sẵn.";

      // Phân tích lịch sử hội thoại để tìm ngữ cảnh
      const contextAnalysis =
        pastMessages.length > 0
          ? pastMessages
              .slice(-4) // Lấy 4 tin nhắn gần nhất để phân tích ngữ cảnh
              .map((msg) => msg.text)
              .join(" ")
          : "";

      const prompt = `
            Bạn là một chatbot thông minh của rạp chiếu phim CineJoy, được thiết kế để trả lời các câu hỏi của người dùng về phim ảnh và rạp chiếu phim một cách ngắn gọn, chính xác và chuyên nghiệp.
            
            QUY TẮC QUAN TRỌNG - CHỈ TRẢ LỜI CÂU HỎI LIÊN QUAN ĐẾN CINEJOY:
            - Bạn CHỈ được trả lời các câu hỏi liên quan đến: phim ảnh, rạp chiếu phim, suất chiếu, đặt vé, combo, dịch vụ của CineJoy, và chào hỏi thông thường
            - TUYỆT ĐỐI KHÔNG trả lời các câu hỏi ngoài lề như: toán học, lịch sử, địa lý, khoa học, thể thao, tin tức, sức khỏe, bài tập, hoặc bất kỳ chủ đề nào KHÔNG liên quan đến phim ảnh và rạp chiếu phim
            - Nếu người dùng hỏi về chủ đề ngoài lề, bạn PHẢI từ chối một cách lịch sự và nhắc nhở họ rằng bạn chỉ hỗ trợ về phim ảnh và rạp chiếu phim CineJoy
            - Ví dụ câu hỏi ngoài lề cần từ chối: "1 + 1 bằng mấy", "567 - 333", "Thủ đô của Việt Nam là gì", "Giải bài tập toán", v.v.
            
            ${userInfoText}
            
            Thông tin về rạp chiếu phim:
            - Có nhiều rạp chiếu phim hiện đại với công nghệ IMAX, 4DX
            - Giá vé dao động từ 50.000đ - 200.000đ tùy loại ghế và suất chiếu
            - Có chương trình khuyến mãi cho thành viên và các ngày lễ
            - Có thể đặt vé online qua website hoặc ứng dụng
            - Có dịch vụ combo đồ ăn và nước uống
            - Có các suất chiếu sớm và đêm muộn
            - Hỗ trợ đặt vé nhóm và tổ chức sự kiện
            
            Thông tin liên hệ của CineJoy:
            - Email: cinejoy@gmail.com
            - Hotline: 1900 1999

            Danh sách phim hiện có:
            ${movieInfo}
            Danh sách rạp chiếu phim hiện có:
            ${theaterInfo}
            Danh sách suất chiếu hiện có:
            ${showtimeInfo}
            Thông tin giá vé và combo hiện tại:
            ${priceInfo}
            Thông tin các chương trình khuyến mãi đang hoạt động:
            ${promotionInfo}
            ${
              userPointsAndVouchers
                ? `Thông tin điểm và voucher của người dùng:\n${userPointsAndVouchers}`
                : ""
            }
            ${
              orderHistory
                ? `Lịch sử giao dịch của người dùng:\n${orderHistory}`
                : ""
            }
            
            QUAN TRỌNG - Hướng dẫn trả lời về lịch sử giao dịch:
            - Khi người dùng hỏi về "lịch sử giao dịch", "vé đã mua", "đơn hàng của tôi", "số vé đã mua", "số lượng vé hoàn tất", "số lượng vé trả", "vào ngày X tôi đã mua vé nào", "ngày X tôi mua gì", v.v., bạn PHẢI sử dụng thông tin từ "Lịch sử giao dịch của người dùng" ở trên (chỉ có khi người dùng đã đăng nhập)
            - Trả lời chính xác số vé đã mua, số đơn hàng đã hoàn tất (COMPLETED), số đơn hàng đã trả (RETURNED) từ thông tin lịch sử
            - Khi người dùng hỏi về một ngày cụ thể (ví dụ: "vào ngày 18/11 tôi đã mua vé nào"), hãy tìm trong lịch sử và liệt kê các đơn hàng trong ngày đó, bao gồm: tên phim, rạp, giờ chiếu, ghế, trạng thái đơn hàng
            - Nếu người dùng hỏi về trạng thái vé, hãy giải thích: "Đã hoàn tất" (COMPLETED), "Đã xác nhận" (CONFIRMED), "Đã trả vé" (RETURNED), "Đã hủy" (CANCELLED), "Đang chờ" (PENDING)
            - Nếu người dùng chưa đăng nhập, hãy nhắc họ cần đăng nhập để xem lịch sử giao dịch
            - Nếu người dùng không có đơn hàng nào, hãy thông báo rõ ràng
            
            QUAN TRỌNG - Hướng dẫn trả lời về giá vé và combo:
            - Khi người dùng hỏi về giá vé, giá combo, bảng giá, hoặc sản phẩm, bạn PHẢI sử dụng thông tin từ "Thông tin giá vé và combo hiện tại" ở trên
            - Trả lời chính xác giá vé theo từng loại ghế (Ghế thường, Ghế VIP, Ghế đôi, Ghế 4DX) như đã được liệt kê trong thông tin giá
            - Trả lời chính xác giá của các combo và sản phẩm đơn lẻ như đã được liệt kê trong thông tin giá
            - Nếu người dùng hỏi "giá vé bao nhiêu", "combo giá bao nhiêu", "bảng giá", "giá ghế VIP", "giá combo", v.v., hãy trả lời dựa trên thông tin giá đã được cung cấp ở trên
            - Hiển thị giá theo định dạng đã có trong thông tin (ví dụ: 50.000đ, 100.000đ) - KHÔNG tự ý thay đổi định dạng
            - Nếu người dùng hỏi về một combo hoặc sản phẩm cụ thể, hãy tìm trong danh sách combo/sản phẩm và trả lời giá tương ứng
            
            QUAN TRỌNG - Hướng dẫn trả lời về khuyến mãi:
            - Khi người dùng hỏi về khuyến mãi, giảm giá, voucher, mã giảm giá, chương trình khuyến mãi, hoặc ưu đãi, bạn PHẢI sử dụng thông tin từ "Thông tin các chương trình khuyến mãi đang hoạt động" ở trên
            - Trả lời đầy đủ thông tin về các chương trình khuyến mãi đang hoạt động, bao gồm: tên chương trình, mã khuyến mãi, mô tả, thời gian hiệu lực, và chi tiết khuyến mãi (giảm giá bao nhiêu %, giảm bao nhiêu tiền, mua tặng gì, v.v.)
            - Nếu người dùng hỏi "có khuyến mãi gì không", "chương trình khuyến mãi", "mã giảm giá", v.v., hãy liệt kê tất cả các chương trình khuyến mãi đang hoạt động
            - Nếu người dùng hỏi về một loại khuyến mãi cụ thể (ví dụ: "giảm giá combo", "giảm giá vé", "mua tặng"), hãy tìm trong danh sách khuyến mãi và trả lời chi tiết
            - Nếu không có khuyến mãi đang hoạt động, hãy thông báo rõ ràng cho người dùng
            
            QUAN TRỌNG - Hướng dẫn trả lời về điểm và voucher của người dùng:
            - Khi người dùng hỏi về "điểm của tôi", "điểm hiện có", "tôi có bao nhiêu điểm", "voucher của tôi", "voucher hiện có", "tôi có voucher gì", v.v., bạn PHẢI sử dụng thông tin từ "Thông tin điểm và voucher của người dùng" ở trên (chỉ có khi người dùng đã đăng nhập)
            - Trả lời chính xác số điểm hiện có của người dùng (định dạng: X.XXX điểm)
            - Liệt kê đầy đủ các voucher của người dùng, bao gồm: thông tin giảm giá (ví dụ: "Giảm 15% tối đa 35.000đ") và hạn sử dụng
            - Nếu người dùng chưa đăng nhập, hãy nhắc họ cần đăng nhập để xem điểm và voucher
            - Nếu người dùng không có voucher nào, hãy thông báo rõ ràng và có thể gợi ý cách đổi điểm lấy voucher
            
            QUAN TRỌNG - Hướng dẫn trả lời về thông tin liên hệ:
            - Khi người dùng hỏi về "thông tin liên hệ", "email", "hotline", "số điện thoại", "liên hệ", "cách liên hệ", "email của cinejoy", "hotline của cinejoy", "số điện thoại của cinejoy", v.v., bạn PHẢI sử dụng thông tin từ "Thông tin liên hệ của CineJoy" ở trên
            - Trả lời chính xác: Email: cinejoy@gmail.com và Hotline: 1900 1999
            - Nếu người dùng hỏi "làm sao để liên hệ", "cách liên hệ với cinejoy", v.v., hãy cung cấp đầy đủ thông tin liên hệ (email và hotline)
            - Có thể gợi ý người dùng liên hệ qua email hoặc gọi hotline tùy theo nhu cầu của họ
            
            QUAN TRỌNG - Hướng dẫn gọi tên và ngữ cảnh:
            1. CÁCH GỌI TÊN NGƯỜI DÙNG (nếu có thông tin user):
               - CHỈ CHÀO TÊN ở tin nhắn ĐẦU TIÊN khi bắt đầu cuộc hội thoại (ví dụ: "Chào ${
                 userInfo?.firstName
               }")
               - Ở các tin nhắn tiếp theo, KHÔNG cần chào lại, chỉ cần sử dụng tên một cách tự nhiên trong câu trả lời (ví dụ: "Tần có thể...", "Dạ ${
                 userInfo?.firstName
               }...")
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
                        `${index + 1}. ${
                          msg.sender === "user" ? "Người dùng" : "Chatbot"
                        }: ${msg.text}`
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
            - QUAN TRỌNG VỀ FORMATTING: 
              - KHÔNG sử dụng markdown formatting (KHÔNG dùng dấu **, KHÔNG dùng *, KHÔNG dùng __, KHÔNG dùng bất kỳ ký tự markdown nào)
              - Chỉ trả lời bằng văn bản thuần túy, không có định dạng đặc biệt, KHÔNG dùng dấu * ở bất kỳ đâu
              - Khi liệt kê phim hoặc suất chiếu, chỉ dùng dấu - hoặc số thứ tự, KHÔNG dùng dấu * để liệt kê
              - Ví dụ đúng: "Thanh gươm diệt quỷ: 18:00 - 20:00" hoặc "- Thanh gươm diệt quỷ: 18:00 - 20:00"
              - Ví dụ sai: "* Thanh gươm diệt quỷ: 18:00 - 20:00" hoặc "**Thanh gươm diệt quỷ:** 18:00 - 20:00"
              - Luôn luôn trả lời bằng văn bản thuần túy, không format đậm, không dùng markdown, KHÔNG dùng dấu * trong bất kỳ trường hợp nào
            ${
              userInfo
                ? `
            - QUAN TRỌNG VỀ GỌI TÊN:
              - ${
                isFirstResponse
                  ? `Đây là lần ĐẦU TIÊN bạn trả lời (chỉ có ${botMessagesCount} tin nhắn từ bot trước đó), nên hãy chào "Chào ${userInfo.firstName}"`
                  : `Đây KHÔNG phải là tin nhắn đầu tiên (đã có ${botMessagesCount} tin nhắn từ bot trước đó), nên KHÔNG chào lại, chỉ sử dụng tên "${userInfo.firstName}" một cách tự nhiên trong câu trả lời (ví dụ: "${userInfo.firstName} có thể...", "Dạ ${userInfo.firstName}...", v.v.)`
              }
              - Thay vì nói "bạn" hoặc "anh/chị", hãy sử dụng tên "${
                userInfo.firstName
              }" một cách tự nhiên và thân thiện, nhưng KHÔNG lặp lại lời chào ở các tin nhắn tiếp theo`
                : ""
            }
            `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let botResponse =
        response.text() ||
        "Xin lỗi, tôi không thể trả lời ngay lúc này. Bạn có thể hỏi thêm về phim hoặc rạp chiếu phim không?";

      // Loại bỏ tất cả dấu * khỏi response để đảm bảo không có markdown formatting
      botResponse = botResponse.replace(/\*\*/g, "").replace(/\*/g, "");

      // Lưu phản hồi vào cache và lịch sử trò chuyện
      cache.set(cacheKey, botResponse);
      ChatbotService.saveMessage(sessionId, {
        sender: "bot",
        text: botResponse,
      });

      return botResponse;
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);

      // Xử lý lỗi API key bị leaked hoặc không hợp lệ
      if (error?.status === 403 && error?.message?.includes("leaked")) {
        console.error(
          "❌ GEMINI API KEY ERROR: API key đã bị báo là leaked. Vui lòng tạo API key mới tại https://makersuite.google.com/app/apikey"
        );
        return "Xin lỗi, hệ thống chatbot đang gặp vấn đề về cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
      }

      // Xử lý lỗi API key không hợp lệ hoặc thiếu
      if (error?.status === 403 || error?.status === 401) {
        console.error(
          "❌ GEMINI API KEY ERROR: API key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra GEMINI_API_KEY trong file .env"
        );
        return "Xin lỗi, hệ thống chatbot đang gặp vấn đề về cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
      }

      return "Xin lỗi, tôi không thể trả lời ngay lúc này. Bạn có thể hỏi thêm về phim hoặc rạp chiếu phim không?";
    }
  },

  // Xử lý image poster với Gemini Vision API
  recognizePosterFromImage: async (
    imageBase64: string,
    mimeType: string = "image/jpeg"
  ): Promise<string | null> => {
    try {
      // Convert base64 to format Gemini expects
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      };

      const prompt = `
Bạn là một hệ thống nhận diện phim chuyên nghiệp. Nhiệm vụ của bạn là xác định tên phim từ BẤT KỲ hình ảnh nào liên quan đến phim (poster, ảnh quảng cáo, ảnh background, ảnh scene, ảnh still, v.v.).

HƯỚNG DẪN NHẬN DIỆN:

1. NẾU LÀ POSTER PHIM:
   - Tìm tên phim trên poster (thường ở vị trí dưới cùng, giữa, hoặc trên cùng)
   - Đọc chính xác tên phim như trên poster

2. NẾU LÀ ẢNH BACKGROUND/STILL/SCENE TỪ PHIM:
   - Phân tích nội dung hình ảnh: nhân vật, bối cảnh, phong cách, trang phục, đạo cụ
   - Dựa vào kiến thức về phim Việt Nam và quốc tế để nhận diện
   - Ví dụ: Nếu thấy 2 người đạp xe trên đường quê, áo dài, có thể là "Mắt Biếc"
   - Ví dụ: Nếu thấy cảnh lịch sử, cổ trang Việt Nam, có thể là các phim cổ trang
   - Ví dụ: Nếu thấy cảnh hiện đại, thành phố, có thể là phim tình cảm đương đại

3. NẾU LÀ ẢNH QUẢNG CÁO:
   - Tìm logo, tên phim, hoặc thông tin phim trên ảnh

QUAN TRỌNG:
- Trả lời CHỈ bằng tên phim CHÍNH XÁC (giữ nguyên dấu, chữ hoa/thường)
- KHÔNG thêm bất kỳ thông tin nào khác (không có dấu ngoặc kép, không có "Tên phim:", không có năm phát hành, v.v.)
- Nếu tên phim có nhiều phần, giữ nguyên cấu trúc (ví dụ: "Tấm Cám Chuyện Chưa Kể" không phải "Tấm Cám")
- Nếu KHÔNG THỂ nhận diện được phim (dù đã phân tích kỹ), hãy trả lời "KHONG_TIM_THAY"

Ví dụ:
- Poster có tên "Mắt Biếc" → Output: Mắt Biếc
- Ảnh scene 2 người đạp xe, áo dài, đường quê → Output: Mắt Biếc
- Poster có tên "Tấm Cám Chuyện Chưa Kể" → Output: Tấm Cám Chuyện Chưa Kể
- Ảnh không liên quan đến phim → Output: KHONG_TIM_THAY

Hãy phân tích kỹ hình ảnh và trả lời CHỈ tên phim (hoặc "KHONG_TIM_THAY" nếu không nhận diện được):`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const movieTitle = response.text().trim();

      // Loại bỏ dấu ngoặc kép và ký tự đặc biệt
      const cleanTitle = movieTitle
        .replace(/^["']|["']$/g, "")
        .replace(/^Tên phim:\s*/i, "")
        .trim();

      if (
        cleanTitle.toUpperCase().includes("KHONG_TIM_THAY") ||
        cleanTitle.length === 0
      ) {
        return null;
      }

      return cleanTitle;
    } catch (error) {
      console.error("Error recognizing poster from image:", error);
      return null;
    }
  },

  // Normalize title để so sánh
  normalizeTitle: (title: string): string => {
    return removeAccents(title)
      .toLowerCase()
      .trim()
      .replace(/[-_]/g, " ") // Thay dấu gạch ngang và gạch dưới bằng khoảng trắng
      .replace(/\s+/g, " ") // Nhiều khoảng trắng thành 1
      .replace(/[^\w\s]/g, "") // Loại bỏ ký tự đặc biệt khác
      .trim();
  },

  // Tính similarity giữa 2 chuỗi (Levenshtein distance)
  calculateSimilarity: (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Tính Levenshtein distance
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1 - distance / maxLen;
  },

  // Tách tên phim thành các từ khóa quan trọng
  extractKeywords: (title: string): string[] => {
    // Normalize và tách từ khóa
    let normalized = removeAccents(title)
      .toLowerCase()
      .trim()
      .replace(/[-_]/g, " ") // Thay dấu gạch ngang và gạch dưới bằng khoảng trắng
      .replace(/\s+/g, " ") // Nhiều khoảng trắng thành 1
      .replace(/[^\w\s]/g, " ") // Thay ký tự đặc biệt bằng khoảng trắng (không xóa)
      .trim();

    // Loại bỏ các từ không quan trọng (stop words)
    const stopWords = [
      "phim",
      "movie",
      "the",
      "a",
      "an",
      "cua",
      "của",
      "va",
      "và",
      "voi",
      "với",
      "cho",
      "tu",
      "từ",
      "tren",
      "trên",
      "trong",
      "cua",
      "của",
    ];
    const words = normalized
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.includes(word));

    // Ưu tiên các từ dài hơn (từ khóa quan trọng hơn)
    return words.sort((a, b) => b.length - a.length);
  },

  // Tính điểm khớp dựa trên từ khóa
  calculateKeywordScore: (inputKeywords: string[], dbTitle: string): number => {
    const dbKeywords = ChatbotService.extractKeywords(dbTitle);
    const dbNormalized = ChatbotService.normalizeTitle(dbTitle);

    let matchCount = 0;
    let totalWeight = 0;

    for (const keyword of inputKeywords) {
      const weight = keyword.length; // Từ dài hơn có trọng số cao hơn
      totalWeight += weight;

      // Kiểm tra keyword có trong DB title không
      if (dbNormalized.includes(keyword)) {
        matchCount += weight;
      }
    }

    if (totalWeight === 0) return 0;
    return matchCount / totalWeight;
  },

  // Tìm phim theo title (fuzzy matching cải tiến với từ khóa)
  findMovieByTitle: async (title: string): Promise<any | null> => {
    try {
      // Normalize title đầu vào
      const normalizedInput = ChatbotService.normalizeTitle(title);
      const inputKeywords = ChatbotService.extractKeywords(title);
      console.log(`🔍 Searching for movie: "${title}"`);
      console.log(`   Normalized: "${normalizedInput}"`);
      console.log(`   Keywords: [${inputKeywords.join(", ")}]`);

      // Escape regex special characters
      const escapeRegex = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      // Bước 1: Tìm chính xác (exact match)
      let movie = await Movie.findOne({
        $or: [
          { title: { $regex: new RegExp(`^${escapeRegex(title)}$`, "i") } },
          {
            titleNoAccent: {
              $regex: new RegExp(`^${escapeRegex(removeAccents(title))}$`, "i"),
            },
          },
        ],
      });

      if (movie) {
        console.log(`✅ Found exact match: "${movie.title}"`);
        return movie;
      }

      // Bước 2: Tìm với normalized title (loại bỏ dấu, ký tự đặc biệt)
      const escapedNormalized = escapeRegex(normalizedInput);
      movie = await Movie.findOne({
        $or: [
          { title: { $regex: new RegExp(escapedNormalized, "i") } },
          { titleNoAccent: { $regex: new RegExp(escapedNormalized, "i") } },
        ],
      });

      if (movie) {
        console.log(`✅ Found normalized match: "${movie.title}"`);
        return movie;
      }

      // Bước 3: Tìm với từng từ khóa (nếu có ít nhất 2 từ khóa)
      if (inputKeywords.length >= 2) {
        // Tìm phim có chứa TẤT CẢ các từ khóa (không cần liên tiếp)
        const keywordRegex = inputKeywords
          .map((k) => escapeRegex(k))
          .join(".*");
        movie = await Movie.findOne({
          $or: [
            { title: { $regex: new RegExp(keywordRegex, "i") } },
            { titleNoAccent: { $regex: new RegExp(keywordRegex, "i") } },
          ],
        });

        if (movie) {
          console.log(
            `✅ Found keyword match (all keywords): "${movie.title}"`
          );
          return movie;
        }

        // Tìm phim có chứa ÍT NHẤT 2 từ khóa quan trọng nhất (từ dài nhất)
        const importantKeywords = inputKeywords.slice(
          0,
          Math.min(2, inputKeywords.length)
        );
        const importantKeywordRegex = importantKeywords
          .map((k) => escapeRegex(k))
          .join(".*");
        movie = await Movie.findOne({
          $or: [
            { title: { $regex: new RegExp(importantKeywordRegex, "i") } },
            {
              titleNoAccent: { $regex: new RegExp(importantKeywordRegex, "i") },
            },
          ],
        });

        if (movie) {
          console.log(
            `✅ Found keyword match (important keywords): "${movie.title}"`
          );
          return movie;
        }
      }

      // Bước 3.5: Tìm với normalized title không có dấu gạch ngang
      const normalizedWithoutHyphens = normalizedInput
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (normalizedWithoutHyphens !== normalizedInput) {
        const escapedNoHyphens = escapeRegex(normalizedWithoutHyphens);
        movie = await Movie.findOne({
          $or: [
            { title: { $regex: new RegExp(escapedNoHyphens, "i") } },
            { titleNoAccent: { $regex: new RegExp(escapedNoHyphens, "i") } },
          ],
        });

        if (movie) {
          console.log(
            `✅ Found match (normalized without hyphens): "${movie.title}"`
          );
          return movie;
        }
      }

      // Bước 4: Tìm tất cả phim và tính điểm dựa trên từ khóa + similarity
      const allMovies = await Movie.find({ isHidden: { $ne: true } });
      console.log(
        `🔍 Searching in ${allMovies.length} movies with keyword + similarity matching...`
      );

      let bestMatch: any = null;
      let bestScore = 0;

      for (const m of allMovies) {
        const normalizedDbTitle = ChatbotService.normalizeTitle(m.title);
        const normalizedDbTitleNoAccent = m.titleNoAccent
          ? ChatbotService.normalizeTitle(m.titleNoAccent)
          : normalizedDbTitle;

        // Tính điểm từ khóa (0-1)
        const keywordScore = ChatbotService.calculateKeywordScore(
          inputKeywords,
          m.title
        );

        // Tính similarity (0-1)
        const similarity1 = ChatbotService.calculateSimilarity(
          normalizedInput,
          normalizedDbTitle
        );
        const similarity2 = ChatbotService.calculateSimilarity(
          normalizedInput,
          normalizedDbTitleNoAccent
        );
        const maxSimilarity = Math.max(similarity1, similarity2);

        // Kết hợp điểm: 60% từ khóa + 40% similarity
        const combinedScore = keywordScore * 0.6 + maxSimilarity * 0.4;

        // Boost nếu là substring
        let finalScore = combinedScore;
        if (
          normalizedInput.includes(normalizedDbTitle) ||
          normalizedDbTitle.includes(normalizedInput)
        ) {
          finalScore = Math.max(finalScore, 0.85);
        }

        // Boost nếu có nhiều từ khóa khớp
        if (keywordScore >= 0.7) {
          finalScore = Math.max(finalScore, 0.8);
        }

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestMatch = m;
        }
      }

      // Chỉ trả về nếu điểm >= 0.6 (60%) - giảm ngưỡng để tìm được nhiều hơn
      if (bestMatch && bestScore >= 0.6) {
        const keywordScore = ChatbotService.calculateKeywordScore(
          inputKeywords,
          bestMatch.title
        );
        console.log(`✅ Found match: "${bestMatch.title}"`);
        console.log(
          `   Combined score: ${(bestScore * 100).toFixed(1)}% (keyword: ${(
            keywordScore * 100
          ).toFixed(1)}%)`
        );
        return bestMatch;
      }

      console.log(
        `❌ No match found for "${title}" (best score: ${(
          bestScore * 100
        ).toFixed(1)}%)`
      );
      return null;
    } catch (error) {
      console.error("Error finding movie by title:", error);
      return null;
    }
  },

  // Lấy showtimes cho một phim
  getShowtimesForMovie: async (movieId: string): Promise<any[]> => {
    try {
      const showtimes = await showtimeService.getShowtimes();

      // Lọc showtimes cho phim cụ thể
      const movieShowtimes = showtimes.filter(
        (st: any) =>
          st.movieId?._id?.toString() === movieId ||
          st.movieId?.toString() === movieId
      );

      return movieShowtimes;
    } catch (error) {
      console.error("Error getting showtimes for movie:", error);
      return [];
    }
  },

  // Xử lý upload poster và trả về thông tin phim + showtimes
  processPosterUpload: async (
    imageBase64: string,
    mimeType: string = "image/jpeg",
    userId?: string
  ): Promise<{
    success: boolean;
    movieTitle?: string;
    movie?: any;
    showtimes?: any[];
    message: string;
  }> => {
    try {
      // Bước 1: Nhận diện poster với Gemini Vision
      const recognizedTitle = await ChatbotService.recognizePosterFromImage(
        imageBase64,
        mimeType
      );

      if (!recognizedTitle) {
        return {
          success: false,
          message:
            "Xin lỗi, tôi không thể nhận diện được poster phim này. Vui lòng thử lại với một poster phim rõ ràng hơn.",
        };
      }

      // Bước 2: Tìm phim trong database
      const movie = await ChatbotService.findMovieByTitle(recognizedTitle);

      if (!movie) {
        return {
          success: false,
          movieTitle: recognizedTitle,
          message: `Tôi đã nhận diện được poster là phim "${recognizedTitle}", nhưng hiện tại phim này chưa có trong hệ thống của CineJoy. Bạn có thể tìm kiếm các phim khác đang chiếu tại rạp.`,
        };
      }

      // Bước 3: Lấy showtimes cho phim
      const showtimes = await ChatbotService.getShowtimesForMovie(
        movie._id.toString()
      );

      // Bước 4: Format response message
      const userInfo = await ChatbotService.getUserInfo(userId);
      const userName = userInfo?.firstName || "bạn";

      let message = `${userName} ơi, tôi đã nhận diện được poster là phim "${movie.title}"!\n\n`;
      message += `📽️ Thông tin phim:\n`;
      message += `- Thể loại: ${movie.genre?.join(", ") || "Chưa cập nhật"}\n`;
      message += `- Thời lượng: ${movie.duration || "Chưa cập nhật"} phút\n`;
      message += `- Độ tuổi: ${movie.ageRating || "Chưa cập nhật"}\n`;
      message += `- Trạng thái: ${movie.status || "Chưa cập nhật"}\n\n`;

      if (showtimes.length === 0) {
        message += `⚠️ Hiện tại phim này chưa có suất chiếu. Vui lòng kiểm tra lại sau.\n\n`;
        message += `💬 ${userName} có muốn:\n`;
        message += `- Tìm hiểu thêm về nội dung phim?\n`;
        message += `- Xem danh sách các phim khác đang chiếu?\n`;
        message += `- Biết thêm về diễn viên hoặc đạo diễn của phim?`;
      } else {
        message += `🎬 Lịch chiếu:\n`;
        showtimes.forEach((st: any, index: number) => {
          const theaterName = st.theaterId?.name || "Chưa có tên";
          message += `\n${index + 1}. Rạp: ${theaterName}\n`;

          // Lấy các suất chiếu sắp tới (trong 7 ngày tới)
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          const upcomingShowtimes = st.showTimes
            .filter((showTime: any) => {
              const showDate = new Date(showTime.date);
              return (
                showDate >= now &&
                showDate <= nextWeek &&
                showTime.status === "active"
              );
            })
            .slice(0, 5); // Chỉ lấy 5 suất gần nhất

          if (upcomingShowtimes.length > 0) {
            upcomingShowtimes.forEach((showTime: any) => {
              const date = new Date(showTime.date).toLocaleDateString("vi-VN");
              const start = new Date(showTime.start).toLocaleTimeString(
                "vi-VN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              const roomName = showTime.room?.name || "Chưa có";
              message += `   📅 ${date} - ${start} (Phòng ${roomName})\n`;
            });
          } else {
            message += `   Chưa có suất chiếu sắp tới\n`;
          }
        });
        message += `\n💡 ${userName} có muốn:\n`;
        message += `- Tìm hiểu thêm về nội dung phim?\n`;
        message += `- Xem các phim cùng thể loại "${
          movie.genre?.[0] || "hành động"
        }"?`;
      }

      return {
        success: true,
        movieTitle: recognizedTitle,
        movie: {
          _id: movie._id,
          title: movie.title,
          genre: movie.genre,
          duration: movie.duration,
          ageRating: movie.ageRating,
          status: movie.status,
          posterImage: movie.posterImage,
          image: movie.image,
        },
        showtimes: showtimes,
        message: message,
      };
    } catch (error) {
      console.error("Error processing poster upload:", error);
      return {
        success: false,
        message:
          "Xin lỗi, đã có lỗi xảy ra khi xử lý poster. Vui lòng thử lại sau.",
      };
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
