import ShowtimeService from "./ShowtimeService";
import pointsService from "./PointsService";
import MoviesService from "./MoviesService";
import OrderService from "./OrderService";

class SchedulerService {
  private showtimeService: ShowtimeService;
  private moviesService: MoviesService;
  private pointsService: typeof pointsService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private movieStatusInterval: NodeJS.Timeout | null = null;
  private expiredShowtimeInterval: NodeJS.Timeout | null = null;
  private cancelExpiredOrdersInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.showtimeService = new ShowtimeService();
    this.moviesService = new MoviesService();
    this.pointsService = pointsService;
  }

  // Bắt đầu scheduled job để cleanup expired reservations
  startCleanupScheduler(): void {
    // Chạy mỗi 2 phút để cleanup expired reservations
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log("🕐 Starting scheduled cleanup of expired reservations...");
        const result = await this.showtimeService.releaseExpiredReservations();

        if (result.released > 0) {
          console.log(`✅ Cleaned up ${result.released} expired reservations`);
        } else {
          console.log("✅ No expired reservations to clean up");
        }
      } catch (error) {
        console.error("❌ Error during scheduled cleanup:", error);
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  // Dừng scheduled job
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("🛑 Stopped scheduled cleanup service");
    }
  }

  // Bắt đầu scheduled job để cập nhật trạng thái phim
  startMovieStatusScheduler(): void {
    // Chạy mỗi ngày lúc 00:00 để cập nhật trạng thái phim
    this.movieStatusInterval = setInterval(async () => {
      try {
        console.log("🎬 Starting scheduled movie status update...");
        const result = await this.moviesService.updateMovieStatuses();

        if (result.updated > 0) {
          console.log(
            `✅ Updated status for ${result.updated} movies: ${result.message}`
          );
        } else {
          console.log("✅ No movie statuses to update");
        }
      } catch (error) {
        console.error("❌ Error during scheduled movie status update:", error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Dừng scheduled job cập nhật trạng thái phim
  stopMovieStatusScheduler(): void {
    if (this.movieStatusInterval) {
      clearInterval(this.movieStatusInterval);
      this.movieStatusInterval = null;
      console.log("🛑 Stopped scheduled movie status update service");
    }
  }

  // Bắt đầu scheduled job để cập nhật trạng thái showtime đã quá ngày
  startExpiredShowtimeScheduler(): void {
    // Chạy ngay lập tức khi khởi động
    this.updateExpiredShowtimes();

    // Sau đó chạy mỗi ngày lúc 00:05 (5 phút sau nửa đêm)
    this.expiredShowtimeInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Chạy vào lúc 00:05 mỗi ngày
      if (hours === 0 && minutes === 5) {
        this.updateExpiredShowtimes();
      }
    }, 60000); // Check mỗi phút
  }

  // Khởi động scheduler để tự động cập nhật điểm cho order CONFIRMED
  startPointsUpdateScheduler(): void {
    // Chạy ngay lập tức khi khởi động
    this.updatePointsForOrders();

    // Sau đó chạy mỗi 5 phút
    setInterval(() => {
      this.updatePointsForOrders();
    }, 5 * 60 * 1000); // 5 phút
  }

  // Cập nhật điểm cho các order CONFIRMED
  private async updatePointsForOrders(): Promise<void> {
    try {
      const result = await this.pointsService.updatePointsForConfirmedOrders();

      if (result.processedOrders > 0) {
        console.log(
          `✅ Updated points for ${result.processedOrders} orders: ${result.totalPointsAdded} points added to ${result.updatedUsers.length} users`
        );
      } else {
      }
    } catch (error) {
      console.error("❌ Error in points update scheduler:", error);
    }
  }

  // Dừng scheduled job cập nhật trạng thái showtime
  stopExpiredShowtimeScheduler(): void {
    if (this.expiredShowtimeInterval) {
      clearInterval(this.expiredShowtimeInterval);
      this.expiredShowtimeInterval = null;
      console.log("⏹️ Expired showtime scheduler stopped");
    }
  }

  // Cập nhật showtime đã quá ngày
  private async updateExpiredShowtimes(): Promise<void> {
    try {
      const result = await this.showtimeService.updateExpiredShowtimes();

      if (result.updatedCount > 0) {
      } else {
      }
    } catch (error) {
      console.error("❌ Error in expired showtime scheduler:", error);
    }
  }

  // Chạy cập nhật trạng thái phim ngay lập tức (cho testing)
  async runMovieStatusUpdateNow(): Promise<{
    updated: number;
    message: string;
  }> {
    console.log("🎬 Running manual movie status update...");
    return await this.moviesService.updateMovieStatuses();
  }

  // Chạy manual expired showtime update (cho testing)
  async runManualExpiredUpdate(): Promise<{
    updatedCount: number;
    updatedShowtimes: any[];
  }> {
    try {
      console.log("🔧 Running manual expired showtime update...");
      const result = await this.showtimeService.updateExpiredShowtimes();
      console.log(
        `✅ Manual update completed: ${result.updatedCount} showtimes updated`
      );
      return result;
    } catch (error) {
      console.error("❌ Error in manual update:", error);
      throw error;
    }
  }

  // Bắt đầu scheduled job để hủy đơn hàng WAITING quá hạn thanh toán
  startCancelExpiredOrdersScheduler(): void {
    // Chạy ngay lập tức khi khởi động
    this.cancelExpiredWaitingOrders();

    // Sau đó chạy mỗi 5 phút
    this.cancelExpiredOrdersInterval = setInterval(() => {
      this.cancelExpiredWaitingOrders();
    }, 5 * 60 * 1000); // 5 phút
  }

  // Hủy đơn hàng WAITING quá hạn thanh toán
  private async cancelExpiredWaitingOrders(): Promise<void> {
    try {
      console.log(
        "⏰ Starting scheduled cancellation of expired WAITING orders..."
      );
      const result = await OrderService.cancelExpiredWaitingOrders();

      if (result.cancelledCount > 0) {
        console.log(
          `✅ Cancelled ${
            result.cancelledCount
          } expired WAITING orders: ${result.cancelledOrderIds.join(", ")}`
        );
      } else {
        console.log("✅ No expired WAITING orders to cancel");
      }
    } catch (error) {
      console.error(
        "❌ Error during scheduled cancellation of expired orders:",
        error
      );
    }
  }

  // Dừng scheduled job hủy đơn hàng quá hạn
  stopCancelExpiredOrdersScheduler(): void {
    if (this.cancelExpiredOrdersInterval) {
      clearInterval(this.cancelExpiredOrdersInterval);
      this.cancelExpiredOrdersInterval = null;
      console.log(
        "🛑 Stopped scheduled cancellation of expired orders service"
      );
    }
  }

  // Bắt đầu tất cả scheduled jobs
  startAllSchedulers(): void {
    this.startCleanupScheduler();
    this.startMovieStatusScheduler();
    this.startExpiredShowtimeScheduler();
    this.startPointsUpdateScheduler();
    this.startCancelExpiredOrdersScheduler();
  }

  // Dừng tất cả scheduled jobs
  stopAllSchedulers(): void {
    this.stopCleanupScheduler();
    this.stopMovieStatusScheduler();
    this.stopExpiredShowtimeScheduler();
    this.stopCancelExpiredOrdersScheduler();
    // Note: Points scheduler sử dụng setInterval không cần dừng riêng

    console.log("✅ All schedulers stopped");
  }

  // Chạy cleanup ngay lập tức (cho testing)
  async runCleanupNow(): Promise<{ released: number }> {
    console.log("🕐 Running manual cleanup of expired reservations...");
    return await this.showtimeService.releaseExpiredReservations();
  }
}

export default SchedulerService;
