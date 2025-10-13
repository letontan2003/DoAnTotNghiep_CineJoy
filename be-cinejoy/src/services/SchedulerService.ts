import ShowtimeService from './ShowtimeService';
import pointsService from './PointsService';
import MoviesService from './MoviesService';

class SchedulerService {
  private showtimeService: ShowtimeService;
  private moviesService: MoviesService;
  private pointsService: typeof pointsService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private movieStatusInterval: NodeJS.Timeout | null = null;
  private expiredShowtimeInterval: NodeJS.Timeout | null = null;

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
        console.log('🕐 Starting scheduled cleanup of expired reservations...');
        const result = await this.showtimeService.releaseExpiredReservations();
        
        if (result.released > 0) {
          console.log(`✅ Cleaned up ${result.released} expired reservations`);
        } else {
          console.log('✅ No expired reservations to clean up');
        }
      } catch (error) {
        console.error('❌ Error during scheduled cleanup:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    console.log('🚀 Started scheduled cleanup service (every 2 minutes)');
  }

  // Dừng scheduled job
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped scheduled cleanup service');
    }
  }

  // Bắt đầu scheduled job để cập nhật trạng thái phim
  startMovieStatusScheduler(): void {
    // Chạy mỗi ngày lúc 00:00 để cập nhật trạng thái phim
    this.movieStatusInterval = setInterval(async () => {
      try {
        console.log('🎬 Starting scheduled movie status update...');
        const result = await this.moviesService.updateMovieStatuses();
        
        if (result.updated > 0) {
          console.log(`✅ Updated status for ${result.updated} movies: ${result.message}`);
        } else {
          console.log('✅ No movie statuses to update');
        }
      } catch (error) {
        console.error('❌ Error during scheduled movie status update:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('🚀 Started scheduled movie status update service (daily at 00:00)');
  }

  // Dừng scheduled job cập nhật trạng thái phim
  stopMovieStatusScheduler(): void {
    if (this.movieStatusInterval) {
      clearInterval(this.movieStatusInterval);
      this.movieStatusInterval = null;
      console.log('🛑 Stopped scheduled movie status update service');
    }
  }

  // Bắt đầu scheduled job để cập nhật trạng thái showtime đã quá ngày
  startExpiredShowtimeScheduler(): void {
    console.log('🕐 Starting expired showtime scheduler...');
    
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

    console.log('✅ Expired showtime scheduler started. Will run daily at 00:05');
  }

  // Khởi động scheduler để tự động cập nhật điểm cho order CONFIRMED
  startPointsUpdateScheduler(): void {
    console.log('🕐 Starting points update scheduler...');
    
    // Chạy ngay lập tức khi khởi động
    this.updatePointsForOrders();
    
    // Sau đó chạy mỗi 5 phút
    setInterval(() => {
      this.updatePointsForOrders();
    }, 5 * 60 * 1000); // 5 phút

    console.log('✅ Points update scheduler started. Will run every 5 minutes');
  }

  // Cập nhật điểm cho các order CONFIRMED
  private async updatePointsForOrders(): Promise<void> {
    try {
      console.log('🔄 Running points update...');
      const result = await this.pointsService.updatePointsForConfirmedOrders();
      
      if (result.processedOrders > 0) {
        console.log(`✅ Updated points for ${result.processedOrders} orders: ${result.totalPointsAdded} points added to ${result.updatedUsers.length} users`);
      } else {
        console.log('ℹ️ No new orders to process for points');
      }
    } catch (error) {
      console.error('❌ Error in points update scheduler:', error);
    }
  }

  // Dừng scheduled job cập nhật trạng thái showtime
  stopExpiredShowtimeScheduler(): void {
    if (this.expiredShowtimeInterval) {
      clearInterval(this.expiredShowtimeInterval);
      this.expiredShowtimeInterval = null;
      console.log('⏹️ Expired showtime scheduler stopped');
    }
  }

  // Cập nhật showtime đã quá ngày
  private async updateExpiredShowtimes(): Promise<void> {
    try {
      console.log('🔄 Running expired showtime update...');
      const result = await this.showtimeService.updateExpiredShowtimes();
      
      if (result.updatedCount > 0) {
        console.log(`✅ Updated ${result.updatedCount} expired showtimes`);
      } else {
        console.log('ℹ️ No expired showtimes found');
      }
    } catch (error) {
      console.error('❌ Error in expired showtime scheduler:', error);
    }
  }

  // Chạy cập nhật trạng thái phim ngay lập tức (cho testing)
  async runMovieStatusUpdateNow(): Promise<{ updated: number; message: string }> {
    console.log('🎬 Running manual movie status update...');
    return await this.moviesService.updateMovieStatuses();
  }

  // Chạy manual expired showtime update (cho testing)
  async runManualExpiredUpdate(): Promise<{
    updatedCount: number;
    updatedShowtimes: any[];
  }> {
    try {
      console.log('🔧 Running manual expired showtime update...');
      const result = await this.showtimeService.updateExpiredShowtimes();
      console.log(`✅ Manual update completed: ${result.updatedCount} showtimes updated`);
      return result;
    } catch (error) {
      console.error('❌ Error in manual update:', error);
      throw error;
    }
  }

  // Bắt đầu tất cả scheduled jobs
  startAllSchedulers(): void {
    console.log('🕐 Starting all schedulers...');
    
    this.startCleanupScheduler();
    this.startMovieStatusScheduler();
    this.startExpiredShowtimeScheduler();
    this.startPointsUpdateScheduler();
    
    console.log('✅ All schedulers started');
  }

  // Dừng tất cả scheduled jobs
  stopAllSchedulers(): void {
    this.stopCleanupScheduler();
    this.stopMovieStatusScheduler();
    this.stopExpiredShowtimeScheduler();
    // Note: Points scheduler sử dụng setInterval không cần dừng riêng
    
    console.log('✅ All schedulers stopped');
  }

  // Chạy cleanup ngay lập tức (cho testing)
  async runCleanupNow(): Promise<{ released: number }> {
    console.log('🕐 Running manual cleanup of expired reservations...');
    return await this.showtimeService.releaseExpiredReservations();
  }
}

export default SchedulerService;