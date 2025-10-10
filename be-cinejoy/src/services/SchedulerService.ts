import ShowtimeService from './ShowtimeService';
import MoviesService from './MoviesService';

class SchedulerService {
  private showtimeService: ShowtimeService;
  private moviesService: MoviesService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private movieStatusInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.showtimeService = new ShowtimeService();
    this.moviesService = new MoviesService();
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

  // Chạy cập nhật trạng thái phim ngay lập tức (cho testing)
  async runMovieStatusUpdateNow(): Promise<{ updated: number; message: string }> {
    console.log('🎬 Running manual movie status update...');
    return await this.moviesService.updateMovieStatuses();
  }

  // Bắt đầu tất cả scheduled jobs
  startAllSchedulers(): void {
    this.startCleanupScheduler();
    this.startMovieStatusScheduler();
  }

  // Dừng tất cả scheduled jobs
  stopAllSchedulers(): void {
    this.stopCleanupScheduler();
    this.stopMovieStatusScheduler();
  }

  // Chạy cleanup ngay lập tức (cho testing)
  async runCleanupNow(): Promise<{ released: number }> {
    console.log('🕐 Running manual cleanup of expired reservations...');
    return await this.showtimeService.releaseExpiredReservations();
  }
}

export default SchedulerService;
