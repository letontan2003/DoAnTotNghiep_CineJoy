import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import QRCode from "qrcode";

const transporter: Transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME as string,
    pass: process.env.EMAIL_PASSWORD as string,
  },
});

const getResetPasswordTemplate = (userName: string, otp: string) => {
  return {
    subject: "Mã xác nhận đặt lại mật khẩu",
    html: `
      <h1>Yêu cầu đặt lại mật khẩu</h1>
      <p>Xin chào ${userName},</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Đây là mã xác nhận của bạn:</p>
      <h2 style="color: #d32f2f;">${otp}</h2>
      <p>Mã này sẽ hết hạn sau 10 phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `,
  };
};

const getWelcomeTemplate = (userName: string) => {
    return {
      subject: "Chào mừng bạn đến với CineJoy – Trải nghiệm điện ảnh tuyệt vời!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e50914; text-align: center;">Chào mừng đến với CineJoy! 🍿</h1>
          <p style="font-size: 16px;">Xin chào <strong>${userName}</strong>,</p>
          <p style="font-size: 16px;">Chúng tôi rất vui mừng chào đón bạn đến với CineJoy – nơi mang đến trải nghiệm xem phim đỉnh cao! Tài khoản của bạn đã được tạo thành công.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="color: #e50914; margin-top: 0;">Với CineJoy, bạn có thể:</h2>
            <ul style="list-style-type: none; padding: 0;">
              <li style="margin: 10px 0;">🎬 Đặt vé xem phim trực tuyến dễ dàng</li>
              <li style="margin: 10px 0;">🍿 Cập nhật nhanh chóng các suất chiếu mới nhất</li>
              <li style="margin: 10px 0;">🎁 Nhận ưu đãi và khuyến mãi hấp dẫn dành riêng cho thành viên</li>
            </ul>
          </div>
          <p style="font-size: 16px;">Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với đội ngũ chăm sóc khách hàng của chúng tôi.</p>
          <p style="font-size: 16px;">Trân trọng,<br>Đội ngũ CineJoy</p>
        </div>
      `,
    };
};

interface PaymentEmailData {
  userName: string;
  orderId: string;
  movieName: string;
  cinema: string;
  room: string;
  roomType?: string; // Thêm roomType
  showtime: string;
  seats: string[];
  ticketPrice: number;
  comboPrice?: number;
  totalAmount: number;
  voucherDiscount?: number;
  voucherCode?: string;
  amountDiscount?: number;
  amountDiscountDescription?: string;
  itemPromotions?: Array<{
    description: string;
    rewardItem: string;
    rewardQuantity: number;
    rewardType: string;
  }>;
  percentPromotions?: Array<{
    description: string;
    comboName: string;
    comboId: string;
    discountPercent: number;
    discountAmount: number;
  }>;
  finalAmount: number;
  qrCodeDataUrl: string;
  foodCombos?: Array<{
    comboName: string;
    quantity: number;
    price: number;
  }>;
}

const getPaymentSuccessTemplate = (data: PaymentEmailData) => {
  const { userName, orderId, movieName, cinema, room, roomType, showtime, seats, ticketPrice, comboPrice, totalAmount, voucherDiscount, voucherCode, amountDiscount, amountDiscountDescription, itemPromotions, percentPromotions, finalAmount, qrCodeDataUrl, foodCombos } = data;
  
  // Debug logging
  console.log(`📧 Email Template Debug:`, {
    orderId,
    foodCombos,
    hasFoodCombos: foodCombos && foodCombos.length > 0,
    foodCombosLength: foodCombos ? foodCombos.length : 0
  });
  
  return {
    subject: "CineJoy: Giao Dịch Thành Công",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; overflow-x: hidden;">
        
        <div style="padding: 10px; background-color: white;">
          <div style="text-align: center; margin: 15px 0;">
            <img src="cid:qr-code" alt="QR Code - Mã vé: ${orderId}" style="max-width: 150px; border: 2px solid #000000; border-radius: 10px;" />
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <p style="margin: 0; color: #856404; font-size: 12px;">
              Vui lòng đưa mã QR này đến quầy vé CineJoy để nhận vé của bạn
            </p>

            <p style="margin: 0; color: #856404; font-size: 12px; margin-top: 3px;">
              <strong>*Lưu ý:</strong> Vui lòng sử dụng loại vé đúng với độ tuổi theo quy định của CineJoy. 
              Chi tiết xem tại <a href="#" style="color: #e50914;">đây!</a>
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h3 style="color: #e50914; margin: 0; text-align: center; font-size: 16px; padding: 5px 0;">THÔNG TIN VÉ</h3>
            <table style="width: 100%; max-width: 100%; border-collapse: collapse; table-layout: fixed; word-wrap: break-word;">
              <tr>
                <td style="padding: 5px 0; font-weight: bold; width: 30%; font-size: 14px; word-wrap: break-word;">Mã vé:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Tên phim:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${movieName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Rạp:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${cinema}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Phòng chiếu:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${room}${roomType ? ` (${roomType})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Suất chiếu:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${showtime}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Ghế:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${seats.join(', ')}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Giá vé:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${seats.length} x ${ticketPrice.toLocaleString('vi-VN')}₫</td>
              </tr>
              ${data.foodCombos && data.foodCombos.length > 0 ? `
              <tr>
                <td colspan="2" style="padding: 10px 0; font-weight: bold; font-size: 14px; border-top: 1px dashed #ccc;">
                  CHI TIẾT CONCESSION
                </td>
              </tr>
              ${data.foodCombos.map(combo => `
              <tr>
                <td style="padding: 5px 0; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word;">${combo.comboName}</td>
                <td style="padding: 5px 0; font-size: 14px; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">${combo.quantity} x ${combo.price.toLocaleString('vi-VN')}₫</td>
              </tr>
              `).join('')}
              <tr>
                <td colspan="2" style="padding: 5px 0; border-bottom: 1px dashed #ccc;"></td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Voucher:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">
                  ${voucherDiscount && voucherDiscount > 0 ? `-${voucherDiscount.toLocaleString('vi-VN')}₫` : '0₫'}
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold; font-size: 14px; word-wrap: break-word;">Khuyến mãi:</td>
                <td style="padding: 5px 0; word-wrap: break-word; overflow-wrap: break-word; text-align: right;">
                  ${amountDiscount && amountDiscount > 0 ? `-${amountDiscount.toLocaleString('vi-VN')}₫` : '0₫'}
                </td>
              </tr>
              ${amountDiscount && amountDiscount > 0 && amountDiscountDescription ? `
              <tr>
                <td colspan="2" style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word;">
                  ${amountDiscountDescription}
                </td>
              </tr>
              ` : ''}
              ${percentPromotions && percentPromotions.length > 0 ? percentPromotions.map(promotion => `
              <tr>
                <td style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word;">
                  ${promotion.description || `Giảm ${promotion.discountPercent}% ${promotion.comboName}`}
                </td>
                <td style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word; text-align: right;">
                  -${promotion.discountAmount.toLocaleString('vi-VN')}₫
                </td>
              </tr>
              `).join('') : ''}
              ${itemPromotions && itemPromotions.length > 0 ? itemPromotions.map(promotion => `
              <tr>
                <td colspan="2" style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word;">
                  ${promotion.description}
                </td>
              </tr>
              <tr>
                <td style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word;">
                  +${promotion.rewardQuantity} ${promotion.rewardItem}
                </td>
                <td style="padding: 2px 0; font-size: 12px; font-style: italic; word-wrap: break-word; text-align: right;">
                  ${promotion.rewardType === 'free' ? '(miễn phí)' : ''}
                </td>
              </tr>
              `).join('') : ''}
            </table>
          </div>
          
          
          <div style="background-color: #e50914; color: white; padding: 12px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 0; font-size: 14px;">Tổng cộng: ${finalAmount.toLocaleString('vi-VN')}₫</h2>
          </div>
          
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #e50914; margin-top: 0; font-size: 14px;">CineJoy Cinemas Việt Nam</h3>
            <p style="margin: 5px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Địa chỉ:</strong> Lầu 2, 7/28 Thành Thái, Phường 14, Quận 10, TP.HCM</p>
            <p style="margin: 5px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Email hỗ trợ:</strong> <a href="mailto:hoidap@cinejoy.vn" style="color: #e50914;">hoidap@cinejoy.vn</a></p>
            <p style="margin: 5px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>Hotline:</strong> 1900 6017</p>
          </div>
        </div>
      </div>
    `,
  };
};
  

const sendResetPasswordEmail = async (to: string, userName: string, otp: string) => {
  try {
    const template = getResetPasswordTemplate(userName, otp);

    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM as string,
      to: to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    return {
      status: true,
      error: 0,
      message: "Email đã được gửi thành công",
      data: null,
    };
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    return {
      status: false,
      error: 1,
      message: "Không thể gửi email: " + (error as Error).message,
      data: null,
    };
  }
};

const sendWelcomeEmail = async (to: string, userName: string) => {
  try {
    const template = getWelcomeTemplate(userName);

    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM as string,
      to: to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    return {
      status: true,
      error: 0,
      message: "Email chào mừng đã được gửi thành công",
      data: null,
    };
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    return {
      status: false,
      error: 1,
      message: "Không thể gửi email: " + (error as Error).message,
      data: null,
    };
  }
};

const sendPaymentSuccessEmail = async (to: string, data: PaymentEmailData) => {
  try {
    
    // Tạo QR code từ order ID
    const qrCodeBuffer = await QRCode.toBuffer(data.orderId, {
      width: 100,  // Giảm kích thước
      margin: 1,   // Giảm margin
      color: {
        dark: '#000000',  // Màu đen bình thường
        light: '#FFFFFF'
      }
    });

    const template = getPaymentSuccessTemplate({
      ...data,
      qrCodeDataUrl: '' // Không dùng base64 nữa
    });

    const mailOptions: SendMailOptions = {
      from: process.env.EMAIL_FROM as string,
      to: to,
      subject: template.subject,
      html: template.html,
      attachments: [
        {
          filename: `qr-code-${data.orderId}.png`,
          content: qrCodeBuffer,
          cid: 'qr-code' // Content ID để reference trong HTML
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    return {
      status: true,
      error: 0,
      message: "Email xác nhận thanh toán đã được gửi thành công",
      data: null,
    };
  } catch (error) {
    console.error("Lỗi gửi email thanh toán:", error);
    return {
      status: false,
      error: 1,
      message: "Không thể gửi email: " + (error as Error).message,
      data: null,
    };
  }
};

export {
  sendResetPasswordEmail,
  sendWelcomeEmail,
  sendPaymentSuccessEmail,
  type PaymentEmailData,
};
