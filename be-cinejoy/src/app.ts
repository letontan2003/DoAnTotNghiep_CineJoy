import dotenv from "dotenv";
import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./configs/dbconnect";
import AuthRouter from "./routes/AuthRouter";
import moviesRouter from "./routes/MoviesRouter";
import theaterRouter from "./routes/TheaterRouter";
import ShowtimeRouter from "./routes/ShowtimeRouter";
import FoodComboRouter from "./routes/FoodComboRouter";
import BlogRouter from "./routes/BlogRouter";
import VoucherRouter from "./routes/VoucherRouter";
import UserVoucherRouter from "./routes/UserVoucherRouter";
import RegionRouter from "./routes/RegionRouter";
import chatbotRouter from "./routes/chatbotRoutes";
import UserRouter from "./routes/UserRouter";
import UploadRouter from "./routes/UploadRouter";
import OrderRouter from "./routes/OrderRouter";
import PaymentRouter from "./routes/PaymentRouter";
import RoomRouter from "./routes/RoomRouter";
import SeatRouter from "./routes/SeatRouter";
import ShowSessionRouter from "./routes/ShowSessionRouter";
import PriceListRouter from "./routes/PriceListRouter";
import momoConfig from "./configs/momoConfig";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Access-Control-Allow-Headers",
      "Origin",
      "Accept",
      "X-Requested-With",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
      "Access-Control-Allow-Credentials",
      "delay",
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 204,
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

//import routes
app.use("/v1/api/auth", AuthRouter);
app.use("/v1/api/user", UserRouter);
app.use("/v1/api/upload", UploadRouter);
app.use("/v1/user-vouchers", UserVoucherRouter);
app.use("/v1/api/orders", OrderRouter);
app.use("/v1/api/payments", PaymentRouter);
app.use("/movies", moviesRouter);
app.use("/theaters", theaterRouter);
app.use("/showtimes", ShowtimeRouter);
app.use("/foodcombos", FoodComboRouter);
app.use("/blogs", BlogRouter);
app.use("/vouchers", VoucherRouter);
app.use("/regions", RegionRouter);
app.use("/rooms", RoomRouter);
app.use("/seats", SeatRouter);
app.use("/show-sessions", ShowSessionRouter);
app.use("/price-lists", PriceListRouter);
app.use("/chatbot", chatbotRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);

  // Initialize database connection
  connectDB();

  // Check MoMo configuration on startup
  console.log("\n📋 MoMo Payment Gateway Status:");
  if (momoConfig.isConfigured()) {
    console.log(`✅ MoMo is configured (${momoConfig.getEnvironment()} mode)`);
  } else {
    console.log(
      "⚠️  MoMo configuration incomplete - Payment features may not work"
    );
    console.log("📝 Please check your .env file for required MoMo variables");
  }

  console.log("🎬 CineJoy Backend Ready!\n");
});
