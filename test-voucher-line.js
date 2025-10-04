// Test script để kiểm tra việc thêm line vào voucher
const mongoose = require('mongoose');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/cinejoy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const VoucherSchema = new mongoose.Schema({
  name: String,
  promotionalCode: String,
  description: String,
  startDate: Date,
  endDate: Date,
  status: String,
  lines: [{
    promotionType: String,
    startDate: Date,
    endDate: Date,
    status: String,
    detail: mongoose.Schema.Types.Mixed,
    rule: {
      stackingPolicy: String,
      exclusionGroup: String
    }
  }]
}, { timestamps: true });

const Voucher = mongoose.model('Voucher', VoucherSchema);

async function testAddLine() {
  try {
    // Tìm voucher đầu tiên
    const voucher = await Voucher.findOne();
    console.log('Voucher trước khi thêm line:', {
      _id: voucher._id,
      name: voucher.name,
      linesCount: voucher.lines.length,
      lines: voucher.lines
    });

    // Thêm line mới
    const newLine = {
      promotionType: 'voucher',
      startDate: new Date('2025-09-26'),
      endDate: new Date('2025-10-26'),
      status: 'hoạt động',
      detail: {
        description: 'Voucher giảm giá 20%',
        pointToRedeem: 100,
        quantity: 50,
        discountPercent: 20,
        maxDiscountValue: 50000
      },
      rule: {
        stackingPolicy: 'STACKABLE'
      }
    };

    voucher.lines.push(newLine);
    await voucher.save();

    console.log('Voucher sau khi thêm line:', {
      _id: voucher._id,
      name: voucher.name,
      linesCount: voucher.lines.length,
      newLine: voucher.lines[voucher.lines.length - 1]
    });

    console.log('✅ Test thành công! Line đã được thêm vào voucher.');
  } catch (error) {
    console.error('❌ Test thất bại:', error);
  } finally {
    mongoose.disconnect();
  }
}

testAddLine();
