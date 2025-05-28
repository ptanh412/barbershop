// import mongoose from "mongoose"; // Đảm bảo bạn đã cài đặt mongoose: npm install mongoose
// import { ServiceTemplate } from "./types/serviceTemplate"; // Giữ nguyên import này

// // ******************************************************
// // THÊM CẤU HÌNH KẾT NỐI MONGODB Ở ĐÂY
// // ******************************************************
// const DB_URI = "mongodb+srv://test:1234567890@clusterbarbershop.akttioa.mongodb.net/?retryWrites=true&w=majority&appName=ClusterBarberShop"; // THAY THẾ bằng chuỗi kết nối của bạn
// // Ví dụ với MongoDB Atlas:
// // const DB_URI = "mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority";

// const connectDB = async () => {
//   try {
//     await mongoose.connect(DB_URI);
//     console.log("MongoDB connected successfully!");
//   } catch (err) {
//     console.error("MongoDB connection error:", err);
//     process.exit(1); // Thoát ứng dụng nếu không thể kết nối DB
//   }
// };

// // Sample data initialization (you would run this once or use a seed script)
// const initializeServiceTemplates = async () => {
//   try {
//     const count = await ServiceTemplate.countDocuments();

//     if (count === 0) {
//       const defaultTemplates = [
//         {
//           name: "Regular Haircut",
//           defaultPrice: 25.00,
//           description: "Basic haircut with clippers and scissors",
//           duration: 30,
//           category: "Haircut",
//         },
//         {
//           name: "Beard Trim",
//           defaultPrice: 15.00,
//           description: "Trimming and shaping of beard",
//           duration: 20,
//           category: "Facial Hair",
//         },
//         {
//           name: "Haircut & Beard Combo",
//           defaultPrice: 35.00,
//           description: "Haircut combined with beard trimming and styling",
//           duration: 45,
//           category: "Combo",
//         },
//         {
//           name: "Hot Towel Shave",
//           defaultPrice: 30.00,
//           description: "Traditional hot towel straight razor shave",
//           duration: 30,
//           category: "Facial Hair",
//         },
//         {
//           name: "Kids Haircut",
//           defaultPrice: 20.00,
//           description: "Haircut for children under 12",
//           duration: 25,
//           category: "Haircut",
//         },
//         {
//           name: "Hair Styling",
//           defaultPrice: 15.00,
//           description: "Hair styling without cutting",
//           duration: 20,
//           category: "Styling",
//         },
//         {
//           name: "Hair Coloring",
//           defaultPrice: 60.00,
//           description: "Basic hair coloring service",
//           duration: 60,
//           category: "Color",
//         },
//         {
//           name: "Head Massage",
//           defaultPrice: 20.00,
//           description: "Relaxing scalp and head massage",
//           duration: 20,
//           category: "Additional",
//         },
//       ];

//       await ServiceTemplate.insertMany(defaultTemplates);
//       console.log("Default service templates initialized");
//     } else {
//       console.log("Service templates already exist, skipping initialization.");
//     }
//   } catch (error) {
//     console.error("Error initializing service templates:", error);
//   } finally {
//     // Đảm bảo đóng kết nối sau khi hoàn tất công việc
//     await mongoose.disconnect();
//     console.log("MongoDB disconnected.");
//   }
// };

// // Gọi hàm kết nối trước, sau đó gọi hàm khởi tạo
// const runSeed = async () => {
//   await connectDB();
//   await initializeServiceTemplates();
// };

// runSeed();