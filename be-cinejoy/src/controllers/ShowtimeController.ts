import { Request, Response } from "express";
import ShowtimeService from "../services/ShowtimeService";
import SchedulerService from "../services/SchedulerService";

const showtimeService = new ShowtimeService();
const schedulerService = new SchedulerService();

export default class ShowtimeController {
  async getShowtimes(req: Request, res: Response): Promise<void> {
    try {
      const showtimes = await showtimeService.getShowtimes();
      res.status(200).json(showtimes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching showtimes", error });
    }
  }

  // API lấy tất cả showtime cho admin (bao gồm cả active và inactive)
  async getAllShowtimesForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const showtimes = await showtimeService.getAllShowtimesForAdmin();
      res.status(200).json(showtimes);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error getting all showtimes for admin", error });
    }
  }

  // API tự động cập nhật trạng thái showtime đã quá ngày
  async updateExpiredShowtimes(req: Request, res: Response): Promise<void> {
    try {
      const result = await showtimeService.updateExpiredShowtimes();
      res.status(200).json({
        status: true,
        error: 0,
        message: `Đã cập nhật ${result.updatedCount} suất chiếu đã quá ngày`,
        data: result,
      });
    } catch (error) {
      console.error("Error updating expired showtimes:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server khi cập nhật suất chiếu đã quá ngày",
        data: null,
      });
    }
  }

  // API manual trigger cập nhật trạng thái showtime đã quá ngày (cho admin)
  async manualUpdateExpiredShowtimes(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const result = await schedulerService.runManualExpiredUpdate();
      res.status(200).json({
        status: true,
        error: 0,
        message: `Đã cập nhật thủ công ${result.updatedCount} suất chiếu đã quá ngày`,
        data: result,
      });
    } catch (error) {
      console.error("Error in manual update expired showtimes:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server khi cập nhật thủ công suất chiếu đã quá ngày",
        data: null,
      });
    }
  }

  // API kiểm tra xem showtime có ghế đã đặt không
  async checkOccupiedSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await showtimeService.checkShowtimeOccupiedSeats(id);
      res.status(200).json({
        status: true,
        error: 0,
        message: "Kiểm tra ghế đã đặt thành công",
        data: result,
      });
    } catch (error) {
      console.error("Error checking occupied seats:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server khi kiểm tra ghế đã đặt",
        data: null,
      });
    }
  }

  // API kiểm tra từng suất chiếu có ghế đã đặt không
  async checkEachShowtimeOccupiedSeats(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const result = await showtimeService.checkEachShowtimeOccupiedSeats(id);
      res.status(200).json({
        status: true,
        error: 0,
        message: "Kiểm tra từng suất chiếu thành công",
        data: result,
      });
    } catch (error) {
      console.error("Error checking each showtime occupied seats:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server khi kiểm tra từng suất chiếu",
        data: null,
      });
    }
  }

  // API lấy thông tin ghế với trạng thái reservation
  async getSeatsWithReservationStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { showtimeId, date, startTime, room, fromPaymentReturn } =
        req.query;
      const userId = (req as any).user?.id; // Từ middleware auth

      if (!showtimeId || !date || !startTime || !room) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
        return;
      }

      const seats = await showtimeService.getSeatsWithReservationStatus(
        showtimeId as string,
        date as string,
        startTime as string,
        room as string,
        userId,
        fromPaymentReturn === "true"
      );

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy thông tin ghế thành công",
        data: seats,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // API tạm giữ ghế khi user chọn ghế
  async reserveSeats(req: Request, res: Response): Promise<void> {
    try {
      const { showtimeId, date, startTime, room, seatIds } = req.body;
      const userId = (req as any).user?.id;

      if (
        !showtimeId ||
        !date ||
        !startTime ||
        !room ||
        !Array.isArray(seatIds) ||
        !userId
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
        return;
      }

      // Kiểm tra giới hạn tối đa 8 ghế
      if (seatIds.length > 8) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Bạn chỉ có thể đặt tối đa 8 ghế",
          data: null,
        });
        return;
      }

      await showtimeService.setSeatsStatus(
        showtimeId,
        date,
        startTime,
        room,
        seatIds,
        "reserved",
        undefined,
        userId
      );

      res.status(200).json({
        status: true,
        error: 0,
        message: "Tạm giữ ghế thành công (8 phút)",
        data: { seatIds, reservedUntil: new Date(Date.now() + 8 * 60 * 1000) },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // API giải phóng ghế theo userId
  async releaseSeatsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { showtimeId, date, startTime, room, seatIds } = req.body;
      const userId = (req as any).user?.id; // Lấy userId từ auth middleware

      if (
        !showtimeId ||
        !date ||
        !startTime ||
        !room ||
        !Array.isArray(seatIds)
      ) {
        res
          .status(400)
          .json({
            status: false,
            error: 400,
            message: "Thiếu thông tin bắt buộc",
            data: null,
          });
        return;
      }

      if (!userId) {
        res
          .status(401)
          .json({
            status: false,
            error: 401,
            message: "User chưa đăng nhập",
            data: null,
          });
        return;
      }

      console.log(`🔓 User ${userId} requesting to release seats:`, seatIds);

      // Ủy quyền cho service dùng reservedBy để kiểm tra quyền
      const result = await showtimeService.setSeatsStatus(
        showtimeId,
        date,
        startTime,
        room,
        seatIds,
        "available",
        userId // Chỉ cho phép release ghế mà user này đã reserve
      );

      console.log(
        `✅ Successfully released seats for user ${userId}:`,
        seatIds
      );
      res
        .status(200)
        .json({
          status: true,
          error: 0,
          message: "Đã giải phóng ghế",
          data: result,
        });
    } catch (error) {
      console.error(`❌ Error releasing seats:`, error);
      res
        .status(500)
        .json({
          status: false,
          error: 500,
          message: error instanceof Error ? error.message : "Lỗi server",
          data: null,
        });
    }
  }
  async getShowtimeById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const showtime = await showtimeService.getShowtimeById(id);
      if (!showtime) {
        res.status(404).json({ message: "Showtime not found" });
        return;
      }
      res.status(200).json(showtime);
    } catch (error) {
      res.status(500).json({ message: "Error fetching showtime", error });
    }
  }

  async addShowtime(req: Request, res: Response): Promise<void> {
    try {
      const newShowtime = await showtimeService.addShowtime(req.body);
      res.status(201).json(newShowtime);
    } catch (error: any) {
      console.error("Error in addShowtime controller:", error);
      // Trả về message cụ thể từ error nếu có, nếu không thì dùng message mặc định
      const errorMessage = error?.message || "Error adding showtime";
      res.status(400).json({ message: errorMessage, error: error?.message });
    }
  }

  async updateShowtime(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const updatedShowtime = await showtimeService.updateShowtime(
        id,
        req.body
      );
      if (!updatedShowtime) {
        res.status(404).json({ message: "Showtime not found" });
        return;
      }

      // Populate room data before returning
      const populatedShowtime = await showtimeService.getShowtimeById(id);
      res.status(200).json(populatedShowtime);
    } catch (error: any) {
      console.error("Error in updateShowtime controller:", error);

      // Xử lý lỗi occupied seats
      if (error?.message && error.message.includes("đã có ghế được đặt")) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Không thể cập nhật vì suất chiếu này đã có ghế được đặt",
          data: null,
        });
        return;
      }

      // Trả về message cụ thể từ error nếu có, nếu không thì dùng message mặc định
      const errorMessage = error?.message || "Error updating showtime";
      res.status(400).json({
        status: false,
        error: 400,
        message: errorMessage,
        data: null,
      });
    }
  }

  async deleteShowtime(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const deletedShowtime = await showtimeService.deleteShowtime(id);
      if (!deletedShowtime) {
        res.status(404).json({ message: "Showtime not found" });
        return;
      }
      res.status(200).json({ message: "Showtime deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting showtime", error });
    }
  }

  async getShowtimesByTheaterMovie(req: Request, res: Response): Promise<void> {
    const { theaterId, movieId } = req.query;
    if (!theaterId || !movieId) {
      res
        .status(400)
        .json({ message: "Missing theaterId, movieId, or showDate" });
      return;
    }
    try {
      const showtimes = await showtimeService.getShowtimesByTheaterMovie(
        theaterId as string,
        movieId as string
      );
      res.status(200).json(showtimes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching showtimes", error });
    }
  }

  async getShowtimesByTheater(req: Request, res: Response): Promise<void> {
    const { theaterId } = req.params;
    if (!theaterId) {
      res.status(400).json({ message: "Missing theaterId" });
      return;
    }
    try {
      const showtimes = await showtimeService.getShowtimesByTheater(
        theaterId as string
      );
      res.status(200).json(showtimes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching showtimes", error });
    }
  }

  async getShowtimesByRoomAndDate(req: Request, res: Response): Promise<void> {
    const { roomId, date } = req.query as { roomId?: string; date?: string };
    if (!roomId || !date) {
      res.status(400).json({ message: "Missing roomId or date" });
      return;
    }
    try {
      const list = await showtimeService.getShowtimesByRoomAndDate(
        roomId,
        date
      );
      res.status(200).json(list);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching showtimes by room/date", error });
    }
  }

  // Lấy danh sách ghế theo suất chiếu cụ thể
  async getSeatsForShowtime(req: Request, res: Response): Promise<void> {
    try {
      const { id: showtimeId } = req.params;
      const { date, startTime, room } = req.query;

      if (!showtimeId) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin showtimeId",
          data: null,
        });
        return;
      }

      if (!date || !startTime) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin date hoặc startTime",
          data: null,
        });
        return;
      }

      console.log(`🔍 getSeatsForShowtime called with:`, {
        showtimeId,
        date,
        startTime,
        room,
      });

      const seats = await showtimeService.getSeatsForShowtime(
        showtimeId as string,
        date as string,
        startTime as string,
        room as string
      );

      console.log(`📋 getSeatsForShowtime response:`, seats);

      if (!seats) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy suất chiếu",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy danh sách ghế thành công",
        data: seats,
      });
    } catch (error) {
      console.error("Get seats for showtime error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Đặt ghế (cập nhật trạng thái ghế) - API cũ cho admin
  async bookSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id: showtimeId } = req.params;
      const { date, startTime, room, seats } = req.body;

      if (
        !showtimeId ||
        !date ||
        !startTime ||
        !seats ||
        !Array.isArray(seats)
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
        return;
      }

      const result = await showtimeService.bookSeats(
        showtimeId,
        date,
        startTime,
        room as string,
        seats.map((seat: any) => seat.seatNumber)
      );

      if (!result) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không thể đặt ghế",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Đặt ghế thành công",
        data: result,
      });
    } catch (error) {
      console.error("Book seats error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // API mới cho frontend - đặt ghế với trạng thái selected (giữ ghế 5 phút)
  async bookSeatsForFrontend(req: Request, res: Response): Promise<void> {
    try {
      const { showtimeId, date, startTime, room, seatIds, userId } = req.body;

      if (
        !showtimeId ||
        !date ||
        !startTime ||
        !room ||
        !seatIds ||
        !Array.isArray(seatIds)
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
        return;
      }

      // Kiểm tra giới hạn tối đa 8 ghế
      if (seatIds.length > 8) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Bạn chỉ có thể đặt tối đa 8 ghế",
          data: null,
        });
        return;
      }

      const result = await showtimeService.bookSeats(
        showtimeId,
        date,
        startTime,
        room,
        seatIds,
        "selected",
        userId
      );

      if (!result) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không thể đặt ghế",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Đặt ghế thành công. Bạn có 5 phút để hoàn tất thanh toán.",
        data: result,
      });
    } catch (error) {
      console.error("Book seats for frontend error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // Khởi tạo ghế cho showtime
  async initializeSeats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { date, startTime, room } = req.body;

      if (!date || !startTime) {
        res.status(400).json({
          status: false,
          error: 1,
          message: "Thiếu thông tin ngày và giờ bắt đầu",
          data: null,
        });
        return;
      }

      const result = await showtimeService.initializeSeatsForShowtime(
        id,
        date,
        startTime,
        room
      );

      res.status(200).json({
        status: true,
        error: 0,
        message: "Khởi tạo ghế thành công",
        data: { initialized: result },
      });
    } catch (error: any) {
      console.error("Error initializing seats:", error);
      res.status(500).json({
        status: false,
        error: 1,
        message: error.message || "Lỗi khởi tạo ghế",
        data: null,
      });
    }
  }

  // Release expired reservations (8 minutes hold)
  async releaseExpired(req: Request, res: Response): Promise<void> {
    try {
      const result = await schedulerService.runCleanupNow();
      res.status(200).json({
        status: true,
        error: 0,
        message: `Released ${result.released} expired reservations`,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: 500,
        message: "Release expired error",
        data: null,
      });
    }
  }

  // Endpoint backfill seats cho toàn bộ showtimes (chỉ dùng dev/admin)
  async backfillSeats(req: Request, res: Response): Promise<void> {
    try {
      const result = await showtimeService.backfillAllShowtimeSeats(
        Boolean(req.query.force === "true")
      );
      res
        .status(200)
        .json({
          status: true,
          error: 0,
          message: "Backfill completed",
          data: result,
        });
    } catch (error) {
      res
        .status(500)
        .json({
          status: false,
          error: 500,
          message: "Backfill error",
          data: null,
        });
    }
  }

  // API giải phóng tất cả ghế tạm giữ của user khi chọn suất chiếu mới
  async releaseUserReservedSeats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id; // Lấy userId từ auth middleware

      if (!userId) {
        res
          .status(401)
          .json({
            status: false,
            error: 401,
            message: "User chưa đăng nhập",
            data: null,
          });
        return;
      }

      console.log(`🔄 User ${userId} requesting to release all reserved seats`);

      const result = await showtimeService.releaseUserReservedSeats(userId);

      console.log(
        `✅ Successfully released ${result.released} seats for user ${userId}`
      );
      res.status(200).json({
        status: true,
        error: 0,
        message: `Đã giải phóng ${result.released} ghế tạm giữ`,
        data: result,
      });
    } catch (error) {
      console.error(`❌ Error releasing user reserved seats:`, error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // TEST ENDPOINT: Cập nhật ghế thành occupied thủ công (để test)
  async testUpdateSeatsToOccupied(req: Request, res: Response): Promise<void> {
    try {
      const { showtimeId, date, startTime, room, seatIds } = req.body;

      if (
        !showtimeId ||
        !date ||
        !startTime ||
        !room ||
        !seatIds ||
        !Array.isArray(seatIds)
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message:
            "Missing required fields: showtimeId, date, startTime, room, seatIds",
          data: null,
        });
        return;
      }

      console.log(`🧪 TEST: Updating seats to occupied:`, {
        showtimeId,
        date,
        startTime,
        room,
        seatIds,
      });

      await showtimeService.setSeatsStatus(
        showtimeId,
        date,
        startTime,
        room,
        seatIds,
        "occupied"
      );

      console.log(
        `✅ TEST: Successfully updated ${seatIds.length} seats to occupied status`
      );
      res.status(200).json({
        status: true,
        error: 0,
        message: `Đã cập nhật ${seatIds.length} ghế thành occupied`,
        data: { showtimeId, date, startTime, room, seatIds },
      });
    } catch (error) {
      console.error(`❌ TEST: Error updating seats to occupied:`, error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }
}
