// import { AppointmentStatus } from '../types/appointment';
// import nodemailer from 'nodemailer';
// import { Appointment } from './database/schema/appointment';

// export class ReminderService {
//   /**
//    * Gửi thông báo nhắc hẹn cho các cuộc hẹn sắp diễn ra
//    * Hàm này có thể được gọi từ một cron job chạy định kỳ
//    */
//   static async sendReminders() {
//     try {
//       // Lấy danh sách các lịch hẹn cần gửi nhắc nhở
//       const now = new Date();
//       const pendingReminders = await Appointment.find({
//         reminderSent: false,
//         reminderTime: { $lte: now },
//         appointmentDate: { $gt: now },
//         status: { $in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] }
//       })
//         .populate('customerId', 'username email phoneNumber')
//         .populate('shopId', 'shop_name address phone_number')
//         .exec();

//       // Khởi tạo transporter để gửi email
//       const transporter = nodemailer.createTransport({
//         // Cấu hình SMTP server - thay thế bằng cấu hình thực tế
//         host: process.env.SMTP_HOST || 'smtp.example.com',
//         port: parseInt(process.env.SMTP_PORT || '587'),
//         secure: process.env.SMTP_SECURE === 'true',
//         auth: {
//           user: process.env.SMTP_USER || 'username',
//           pass: process.env.SMTP_PASSWORD || 'password'
//         }
//       });

//       // Gửi thông báo cho từng lịch hẹn
//       for (const appointment of pendingReminders) {
//         try {
//           // Trích xuất thông tin cần thiết
//           const customer = appointment.customerId as any;
//           const shop = appointment.shopId as any;
          
//           if (!customer || !shop) continue;

//           // Gửi email nhắc hẹn
//           if (customer.email) {
//             await transporter.sendMail({
//               from: `"Barber App" <${process.env.SMTP_FROM || 'noreply@barber.app'}>`,
//               to: customer.email,
//               subject: `Nhắc hẹn: Lịch cắt tóc tại ${shop.shop_name}`,
//               html: `
//                 <h2>Xin chào ${customer.username},</h2>
//                 <p>Chúng tôi muốn nhắc bạn về lịch hẹn cắt tóc sắp tới:</p>
//                 <ul>
//                   <li><strong>Thời gian:</strong> ${appointment.appointmentDate.toLocaleString()}</li>
//                   <li><strong>Địa điểm:</strong> ${shop.shop_name} - ${shop.address}</li>
//                   <li><strong>Dịch vụ:</strong> ${appointment.services.join(', ')}</li>
//                 </ul>
//                 <p>Nếu bạn cần thay đổi hoặc hủy lịch hẹn, vui lòng liên hệ với chúng tôi qua số điện thoại ${shop.phone_number}.</p>
//                 <p>Trân trọng,<br/>Đội ngũ ${shop.shop_name}</p>
//               `
//             });
//           }

//           // Đánh dấu là đã gửi nhắc nhở
//           appointment.reminderSent = true;
//           await appointment.save();
          
//         } catch (error) {
//           console.error(`Lỗi khi gửi nhắc nhở cho lịch hẹn ${appointment._id}:`, error);
//           // Tiếp tục với lịch hẹn khác ngay cả khi một lịch hẹn thất bại
//           continue;
//         }
//       }

//       return {
//         success: true,
//         count: pendingReminders.length,
//         message: `Đã gửi ${pendingReminders.length} thông báo nhắc hẹn`
//       };
//     } catch (error) {
//       console.error("Lỗi khi gửi thông báo nhắc hẹn:", error);
//       throw error;
//     }
//   }
// }