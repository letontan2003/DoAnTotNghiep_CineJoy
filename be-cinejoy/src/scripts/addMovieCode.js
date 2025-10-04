const mongoose = require('mongoose');
const Movie = require('../models/Movies');

// Kết nối đến MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cinejoy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function addMovieCode() {
  try {
    // Lấy tất cả phim chưa có movieCode
    const movies = await Movie.find({ movieCode: { $exists: false } });
    
    console.log(`Tìm thấy ${movies.length} phim cần thêm mã phim`);
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const movieCode = `MV${String(i + 1).padStart(3, '0')}`;
      
      // Cập nhật phim với mã phim mới
      await Movie.findByIdAndUpdate(movie._id, { movieCode });
      console.log(`Đã thêm mã phim ${movieCode} cho phim: ${movie.title}`);
    }
    
    console.log('Hoàn thành việc thêm mã phim cho tất cả phim');
  } catch (error) {
    console.error('Lỗi khi thêm mã phim:', error);
  } finally {
    mongoose.connection.close();
  }
}

addMovieCode();
