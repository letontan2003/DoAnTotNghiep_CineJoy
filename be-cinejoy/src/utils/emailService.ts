import nodemailer, { Transporter, SendMailOptions } from "nodemailer";

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

export {
  sendResetPasswordEmail,
  sendWelcomeEmail,
};
