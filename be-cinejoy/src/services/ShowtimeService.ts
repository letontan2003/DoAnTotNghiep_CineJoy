import { IShowtime, Showtime } from "../models/Showtime";
import ShowSession from "../models/ShowSession";
import SeatModel from "../models/Seat";
import RoomModel from "../models/Room";
import mongoose from "mongoose";

class ShowtimeService {
  private dateKeyUTC(d: Date | string): string {
    const x = new Date(d);
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(x.getUTCDate()).padStart(2, "0")}`;
  }
  async getShowtimes(): Promise<IShowtime[]> {
    try {
      // Tối ưu: Chỉ lấy showtimes có ít nhất 1 showTime trong tương lai hoặc hôm nay
      // Tránh load quá nhiều dữ liệu showtimes đã qua
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const showtimes = await Showtime.find({
        "showTimes.date": { $gte: todayStart },
        "showTimes.status": { $in: ["active", null, undefined] },
      })

        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        })
        .lean(); // Sử dụng lean() để tăng performance

      // Lọc chỉ lấy showtime có trạng thái active và trong tương lai/hôm nay
      const activeShowtimes = showtimes
        .map((showtime) => ({
          ...showtime,
          showTimes: showtime.showTimes.filter((st: any) => {
            const stDate = new Date(st.date);
            const isFutureOrToday = stDate >= todayStart;
            const isActive = st.status === "active" || !st.status;
            return isFutureOrToday && isActive;
          }),
        }))
        .filter((showtime) => showtime.showTimes.length > 0);

      return activeShowtimes as any;
    } catch (error) {
      throw error;
    }
  }

  async getShowtimeById(id: string): Promise<IShowtime | null> {
    try {
      const showtime = await Showtime.findById(id)
        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        });
      return showtime;
    } catch (error) {
      throw error;
    }
  }

  async addShowtime(showtimeData: Partial<IShowtime>): Promise<IShowtime> {
    try {
      if (
        !showtimeData.movieId ||
        !showtimeData.theaterId ||
        !showtimeData.showTimes ||
        showtimeData.showTimes.length === 0
      ) {
        throw new Error("Tất cả các suất chiếu đều bị trùng nên sẽ bỏ qua.");
      }

      // Chuẩn hóa mảng showTimes: LUÔN khởi tạo seats từ database để đảm bảo tính nhất quán
      const normalizedShowTimes = await Promise.all(
        (showtimeData.showTimes as any[]).map(async (st: any) => {
          st.start = new Date(st.start);
          st.end = new Date(st.end);

          // Luôn khởi tạo lại seats từ database để đảm bảo có đầy đủ thông tin
          const roomSeats = await SeatModel.find({ room: st.room }).select(
            "_id status"
          );
          if (roomSeats.length === 0) {
            throw new Error(
              `Không tìm thấy ghế nào trong phòng ${st.room}. Vui lòng tạo ghế cho phòng trước khi tạo suất chiếu.`
            );
          }
          st.seats = roomSeats.map((s) => ({
            seat: s._id,
            status: s.status || "available",
          }));

          return st;
        })
      );

      // Tìm xem đã có document cho cặp movieId + theaterId chưa
      let doc = await Showtime.findOne({
        movieId: showtimeData.movieId,
        theaterId: showtimeData.theaterId,
      });

      if (!doc) {
        // Chưa có → tạo mới một document nhưng vẫn phải validate: tối đa 2 suất/ca và thời gian nằm trong ca
        for (let i = 0; i < normalizedShowTimes.length; i++) {
          const incoming = normalizedShowTimes[i] as any;

          // Đã bỏ ràng buộc trùng lặp suất chiếu theo yêu cầu

          // Tính khung ca
          let sessionStartMin: number | null = null;
          let sessionEndMin: number | null = null;
          let sessionName: string | undefined;
          if (incoming.showSessionId) {
            const session = await ShowSession.findById(incoming.showSessionId);
            if (session) {
              sessionName = session.name;
              const [sh, sm] = session.startTime.split(":").map(Number);
              const [eh, em] = session.endTime.split(":").map(Number);
              sessionStartMin = sh * 60 + sm;
              sessionEndMin = eh * 60 + em;
              if (sessionEndMin <= sessionStartMin) sessionEndMin += 24 * 60;
            }
          }
          if (sessionStartMin === null || sessionEndMin === null) {
            const start = new Date(incoming.start);
            sessionStartMin = start.getHours() * 60 + start.getMinutes();
            sessionEndMin = sessionStartMin + 5 * 60; // fallback
          }

          // Validate start/end nằm trong ca (trừ ca đêm)
          const start = new Date(incoming.start);
          const end = new Date(incoming.end);
          let startMin = start.getHours() * 60 + start.getMinutes();
          let endMin = end.getHours() * 60 + end.getMinutes();
          if (endMin <= startMin) endMin += 24 * 60;
          if (sessionName && !/đêm/i.test(sessionName)) {
            if (startMin < sessionStartMin || startMin >= sessionEndMin) {
              throw new Error(
                "Thời gian bắt đầu không nằm trong khoảng của ca chiếu đã chọn"
              );
            }
          }

          // Đếm số suất trong cùng ca của cùng ngày/phòng trong batch
          const dateStr = this.dateKeyUTC(incoming.date);
          // Trước đây có kiểm tra giới hạn tối đa 2 suất/ca/phòng trong cùng ngày.
          // Theo yêu cầu hiện tại, bỏ ràng buộc này để cho phép thêm không giới hạn trong một ca.
          // Vẫn giữ nguyên các kiểm tra thời gian hợp lệ và tránh trùng suất chiếu ở phía trên.
          normalizedShowTimes.filter((st: any, idx: number) => {
            if (idx === i) return false;
            const sameDate = this.dateKeyUTC(st.date) === dateStr;
            const sameRoom = st.room.toString() === incoming.room.toString();
            if (!sameDate || !sameRoom) return false;
            const hh = new Date(st.start).getHours();
            const mm = new Date(st.start).getMinutes();
            const stMin = hh * 60 + mm;
            return stMin >= sessionStartMin! && stMin < sessionEndMin!;
          });
        }
        doc = new Showtime({
          movieId: showtimeData.movieId,
          theaterId: showtimeData.theaterId,
          showTimes: normalizedShowTimes,
        } as any);
        await doc.save();
        return doc;
      }

      // Đã có document → gộp các showTimes, bỏ ràng buộc trùng lặp
      for (const incoming of normalizedShowTimes) {
        // Đã bỏ kiểm tra trùng lặp suất chiếu theo yêu cầu

        // Kiểm tra giới hạn 2 suất/ca trong ngày/phòng
        // Ưu tiên dùng showSessionId nếu có; nếu không, suy ra theo time range
        let sessionStartMin: number | null = null;
        let sessionEndMin: number | null = null;
        let sessionName: string | undefined;
        if (incoming.showSessionId) {
          const session = await ShowSession.findById(incoming.showSessionId);
          if (session) {
            sessionName = session.name;
            const [sh, sm] = session.startTime.split(":").map(Number);
            const [eh, em] = session.endTime.split(":").map(Number);
            sessionStartMin = sh * 60 + sm;
            sessionEndMin = eh * 60 + em;
            if (sessionEndMin <= sessionStartMin) {
              sessionEndMin += 24 * 60; // qua ngày
            }
          }
        }
        // Nếu không có session, suy ra theo khoảng 5h mặc định quanh giờ bắt đầu (fallback an toàn)
        if (sessionStartMin === null || sessionEndMin === null) {
          const start = new Date(incoming.start);
          sessionStartMin = start.getHours() * 60 + start.getMinutes();
          sessionEndMin = sessionStartMin + 5 * 60;
        }

        const dateStr = this.dateKeyUTC(incoming.date);

        // Validate start/end nằm trong ca (trừ ca đêm)
        const start = new Date(incoming.start);
        const end = new Date(incoming.end);
        let startMin = start.getHours() * 60 + start.getMinutes();
        let endMin = end.getHours() * 60 + end.getMinutes();
        if (endMin <= startMin) endMin += 24 * 60;
        if (sessionName && !/đêm/i.test(sessionName)) {
          if (
            startMin < (sessionStartMin as number) ||
            startMin >= (sessionEndMin as number)
          ) {
            throw new Error(
              "Thời gian bắt đầu không nằm trong khoảng của ca chiếu đã chọn"
            );
          }
        }
        const inThisSession = doc.showTimes.filter((st: any) => {
          const sameDate = this.dateKeyUTC(st.date) === dateStr;
          const sameRoom = st.room.toString() === incoming.room.toString();
          if (!sameDate || !sameRoom) return false;
          let stStart = new Date(st.start);
          let stEnd = new Date(st.end);
          // quy đổi về phút
          let stStartMin = stStart.getHours() * 60 + stStart.getMinutes();
          let stEndMin = stEnd.getHours() * 60 + stEnd.getMinutes();
          if (stEndMin <= stStartMin) stEndMin += 24 * 60;
          return (
            stStartMin >= (sessionStartMin as number) &&
            stStartMin < (sessionEndMin as number)
          );
        });

        // Cộng thêm các incoming khác trong cùng batch thuộc cùng ca
        const alsoIncoming = normalizedShowTimes.filter((st: any) => {
          if (st === incoming) return false;
          const sameDate = this.dateKeyUTC(st.date) === dateStr;
          const sameRoom = st.room.toString() === incoming.room.toString();
          if (!sameDate || !sameRoom) return false;
          const hh = new Date(st.start).getHours();
          const mm = new Date(st.start).getMinutes();
          const startMin = hh * 60 + mm;
          return (
            startMin >= (sessionStartMin as number) &&
            startMin < (sessionEndMin as number)
          );
        });

        // Bỏ giới hạn tối đa 2 suất/ca/phòng. Vẫn tiếp tục thêm suất chiếu nếu không trùng.
        const totalInSession = inThisSession.length + alsoIncoming.length;

        // Luôn khởi tạo lại seats từ database để đảm bảo tính nhất quán
        const roomSeats = await SeatModel.find({ room: incoming.room }).select(
          "_id status"
        );
        if (roomSeats.length === 0) {
          throw new Error(
            `Không tìm thấy ghế nào trong phòng ${incoming.room}. Vui lòng tạo ghế cho phòng trước khi tạo suất chiếu.`
          );
        }
        incoming.seats = roomSeats.map((s) => ({
          seat: s._id,
          status: s.status || "available",
        }));

        // Đặt trạng thái mặc định cho showtime nếu chưa có
        if (!incoming.status) {
          incoming.status = "active";
        }

        doc.showTimes.push(incoming);
      }

      await doc.save();
      return doc;
    } catch (error) {
      throw error;
    }
  }

  async updateShowtime(
    id: string,
    showtimeData: Partial<IShowtime>
  ): Promise<IShowtime | null> {
    try {
      const existingShowtime = await Showtime.findById(id);
      if (!existingShowtime) {
        throw new Error("Không tìm thấy suất chiếu");
      }

      // If showTimes updated, merge với dữ liệu cũ để giữ nguyên seats của các suất có ghế đã đặt
      if (Array.isArray((showtimeData as any).showTimes)) {
        const updatedList = await Promise.all(
          (showtimeData as any).showTimes.map(
            async (incomingSt: any, index: number) => {
              // Tìm suất chiếu cũ tương ứng (so khớp theo date, start, room)
              const existingSt = existingShowtime.showTimes.find(
                (oldSt: any) => {
                  const sameDate =
                    new Date(oldSt.date).toISOString() ===
                    new Date(incomingSt.date).toISOString();
                  const sameStart =
                    new Date(oldSt.start).toISOString() ===
                    new Date(incomingSt.start).toISOString();
                  const sameRoom =
                    oldSt.room.toString() === incomingSt.room.toString();
                  return sameDate && sameStart && sameRoom;
                }
              );

              // Nếu tìm thấy suất cũ và có ghế, giữ nguyên seats
              if (
                existingSt &&
                existingSt.seats &&
                existingSt.seats.length > 0
              ) {
                // Kiểm tra xem có ghế đã đặt không
                const hasOccupied = existingSt.seats.some(
                  (seat: any) => seat.status === "occupied"
                );

                if (hasOccupied) {
                  // Giữ nguyên toàn bộ seats của suất này
                  incomingSt.seats = existingSt.seats;
                } else {
                  // Nếu không có ghế đã đặt, cho phép reinitialize nếu cần
                  if (!incomingSt.seats || incomingSt.seats.length === 0) {
                    const roomSeats = await SeatModel.find({
                      room: incomingSt.room,
                    }).select("_id status");
                    incomingSt.seats = roomSeats.map((s) => ({
                      seat: s._id,
                      status: "available",
                    }));
                  } else {
                    incomingSt.seats = existingSt.seats;
                  }
                }
              } else {
                // Suất mới hoặc chưa có seats, initialize
                if (!incomingSt.seats || incomingSt.seats.length === 0) {
                  const roomSeats = await SeatModel.find({
                    room: incomingSt.room,
                  }).select("_id status");
                  incomingSt.seats = roomSeats.map((s) => ({
                    seat: s._id,
                    status: "available",
                  }));
                }
              }

              // Đặt trạng thái mặc định cho showtime nếu chưa có
              if (!incomingSt.status) {
                incomingSt.status = "active";
              }

              return incomingSt;
            }
          )
        );
        (showtimeData as any).showTimes = updatedList;
      }

      const updatedShowtime = await Showtime.findByIdAndUpdate(
        id,
        showtimeData,
        { new: true }
      );
      return updatedShowtime;
    } catch (error) {
      throw error;
    }
  }

  async deleteShowtime(id: string): Promise<IShowtime | null> {
    try {
      const deletedShowtime = await Showtime.findByIdAndDelete(id);
      return deletedShowtime;
    } catch (error) {
      throw error;
    }
  }

  async getShowtimesByTheaterMovie(
    theaterId: string,
    movieId: string
  ): Promise<IShowtime[]> {
    try {
      const showtimes = await Showtime.find({
        theaterId,
        movieId,
      })
        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        });

      // Lọc chỉ lấy showtime có trạng thái active
      const activeShowtimes = showtimes
        .map((showtime) => ({
          ...showtime.toObject(),
          showTimes: showtime.showTimes.filter(
            (st: any) => st.status === "active" || !st.status
          ), // Bao gồm cả showtime chưa có status (backward compatibility)
        }))
        .filter((showtime) => showtime.showTimes.length > 0);

      return activeShowtimes as any;
    } catch (error) {
      throw error;
    }
  }

  // Lấy các suất chiếu theo phòng và ngày (lọc trong mảng showTimes)
  async getShowtimesByRoomAndDate(
    roomId: string,
    date: string
  ): Promise<
    {
      showtimeId: string;
      room: string;
      date: string;
      startTime: string;
      endTime: string;
      movieId: string;
    }[]
  > {
    const items = await Showtime.aggregate([
      { $unwind: "$showTimes" },
      {
        $match: {
          "showTimes.room": new mongoose.Types.ObjectId(roomId),
        },
      },
      {
        $addFields: {
          dateKey: {
            $dateToString: {
              date: "$showTimes.date",
              format: "%Y-%m-%d",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        },
      },
      { $match: { dateKey: date } },
      {
        $project: {
          showtimeId: "$_id",
          room: "$showTimes.room",
          date: "$showTimes.date",
          startTime: "$showTimes.start",
          endTime: "$showTimes.end",
          movieId: "$movieId",
        },
      },
      { $sort: { startTime: 1 } },
    ]);
    return items as any;
  }

  async getShowtimesByTheater(theaterId: string): Promise<IShowtime[]> {
    try {
      const showtimes = await Showtime.find({
        theaterId,
      })
        .populate("movieId", "title ageRating genre")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        });

      // Lọc chỉ lấy showtime có trạng thái active
      const activeShowtimes = showtimes
        .map((showtime) => ({
          ...showtime.toObject(),
          showTimes: showtime.showTimes.filter(
            (st: any) => st.status === "active" || !st.status
          ), // Bao gồm cả showtime chưa có status (backward compatibility)
        }))
        .filter((showtime) => showtime.showTimes.length > 0);

      return activeShowtimes as any;
    } catch (error) {
      throw error;
    }
  }

  // Backfill: khởi tạo lại seats cho toàn bộ showtimes đang thiếu/không hợp lệ
  async backfillAllShowtimeSeats(
    force = false
  ): Promise<{ total: number; fixed: number }> {
    const docs = await Showtime.find({});
    let fixed = 0;
    for (const doc of docs) {
      let changed = false;
      for (let i = 0; i < doc.showTimes.length; i++) {
        const st: any = doc.showTimes[i];
        const invalid =
          !Array.isArray(st.seats) ||
          st.seats.length === 0 ||
          st.seats.some((x: any) => !x || !x.seat);
        if (invalid || force) {
          const roomSeats = await SeatModel.find({ room: st.room }).select(
            "_id status"
          );
          st.seats = roomSeats.map((s) => ({
            seat: s._id as any,
            status: s.status || "available",
          }));
          changed = true;
        }
      }
      if (changed) {
        await doc.save();
        fixed++;
      }
    }
    return { total: docs.length, fixed };
  }

  // Lấy danh sách ghế cho suất chiếu cụ thể
  async getSeatsForShowtime(
    showtimeId: string,
    date: string,
    startTime: string,
    room?: string
  ): Promise<any> {
    try {
      const showtime = await Showtime.findById(showtimeId)
        .populate("movieId", "title duration")
        .populate("theaterId", "name location")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        });

      if (!showtime) {
        return null;
      }

      // Tìm suất chiếu cụ thể trong array showTimes
      const targetDate = new Date(date);

      const specificShowtime = showtime.showTimes.find((st) => {
        // So sánh ngày
        const showDate = new Date(st.date);
        const targetDate = new Date(date);
        const dateMatch = showDate.toDateString() === targetDate.toDateString();

        // So sánh thời gian
        let timeMatch = false;
        if (startTime.includes("T")) {
          // Nếu startTime là ISO string đầy đủ
          const showStartTime = new Date(st.start);
          const targetStartTime = new Date(startTime);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else if (startTime.includes(" ")) {
          // Format 12-hour như "03:00 PM"
          const showStartTime = new Date(st.start);
          const targetTimeStr = `${date} ${startTime}`;
          const targetStartTime = new Date(targetTimeStr);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else {
          // Nếu startTime chỉ là thời gian (HH:mm) 24-hour format
          const showStartTime = new Date(st.start);
          // Convert UTC time to local time for comparison
          const showTimeHour = showStartTime.getHours(); // Use getHours() instead of getUTCHours()
          const showTimeMin = showStartTime.getMinutes(); // Use getMinutes() instead of getUTCMinutes()
          const [targetHour, targetMin] = startTime.split(":").map(Number);
          timeMatch = showTimeHour === targetHour && showTimeMin === targetMin;
        }

        // So sánh phòng - st.room đã được populate thành object có name
        const roomMatch = room ? (st.room as any)?.name === room : true;

        return dateMatch && timeMatch && roomMatch;
      });

      if (!specificShowtime) {
        // Không tìm thấy suất chiếu phù hợp - trả về null thay vì fake data
        return null;
      }

      // Trả về thông tin ghế cùng với metadata
      let seatData;
      if (!specificShowtime.seats || specificShowtime.seats.length === 0) {
        // Nếu chưa có ghế trong database, tạo ghế mặc định (all available)
        seatData = await this.generateDefaultSeats(
          (specificShowtime.room as any)._id
        );

        // Tự động lưu ghế mặc định vào database
        const showtimeIndex = showtime.showTimes.findIndex((st) => {
          const showDate = new Date(st.date);
          const targetDate = new Date(date);
          const dateMatch =
            showDate.toDateString() === targetDate.toDateString();

          let timeMatch = false;
          if (startTime.includes("T")) {
            const showStartTime = new Date(st.start);
            const targetStartTime = new Date(startTime);
            timeMatch =
              Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
              60000;
          } else if (startTime.includes(" ")) {
            const showStartTime = new Date(st.start);
            const targetTimeStr = `${date} ${startTime}`;
            const targetStartTime = new Date(targetTimeStr);
            timeMatch =
              Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
              60000;
          } else {
            const showTimeHour = new Date(st.start).getHours();
            const showTimeMin = new Date(st.start).getMinutes();
            const [targetHour, targetMin] = startTime.split(":").map(Number);
            timeMatch =
              showTimeHour === targetHour && showTimeMin === targetMin;
          }

          const roomMatch = room ? st.room.toString() === room : true;
          return dateMatch && timeMatch && roomMatch;
        });

        if (showtimeIndex !== -1) {
          showtime.showTimes[showtimeIndex].seats = seatData;
          await showtime.save();
        }
      } else {
        // Sử dụng dữ liệu ghế thật từ database
        seatData = specificShowtime.seats;
      }

      // Get seat layout info for response
      const roomId: any =
        (specificShowtime.room as any)?._id || (specificShowtime.room as any);
      const roomLayout = await RoomModel.findById(roomId)
        .select("seatLayout")
        .lean();

      // Build quick lookup from roomLayout: seatId -> { type, status }
      const roomSeatMap: Record<string, { type?: string; status?: string }> =
        {};
      const rl = (roomLayout as any)?.seatLayout;
      if (rl && rl.seats) {
        Object.keys(rl.seats).forEach((sid: string) => {
          roomSeatMap[sid] = {
            type: rl.seats[sid].type,
            status: rl.seats[sid].status,
          };
        });
      }

      // Fallback: If roomSeatMap is empty, build it from SeatModel by room (seatId -> type/status)
      if (Object.keys(roomSeatMap).length === 0) {
        const seatsByRoom = await SeatModel.find({ room: roomId })
          .select("seatId type status")
          .lean();
        seatsByRoom.forEach((s: any) => {
          if (s.seatId) {
            roomSeatMap[s.seatId] = { type: s.type, status: s.status };
          }
        });
      }

      // Derive rows/cols from actual seat ids in roomSeatMap (fallback to roomLayout if needed)
      const deriveLayout = () => {
        let maxRowCharCode = -1;
        let maxColNumber = 0;
        Object.keys(roomSeatMap).forEach((sid) => {
          if (sid && typeof sid === "string" && /^[A-Z]\d+$/i.test(sid)) {
            const rowChar = sid.charAt(0).toUpperCase();
            const colNum = parseInt(sid.substring(1), 10) || 0;
            maxRowCharCode = Math.max(maxRowCharCode, rowChar.charCodeAt(0));
            maxColNumber = Math.max(maxColNumber, colNum);
          }
        });
        const layoutRows =
          maxRowCharCode >= 65
            ? maxRowCharCode - 65 + 1
            : (roomLayout as any)?.seatLayout?.rows || 12;
        const layoutCols =
          maxColNumber > 0
            ? maxColNumber
            : (roomLayout as any)?.seatLayout?.cols || 10;
        return { layoutRows, layoutCols };
      };

      const { layoutRows: derivedRows, layoutCols: derivedCols } =
        deriveLayout();

      // Tối ưu: Batch query tất cả seats một lần thay vì query từng cái (tránh N+1 query problem)
      const seatIds = seatData
        .map((seatItem: any) => {
          const seatId = seatItem.seat;
          return typeof seatId === "object" && seatId?._id
            ? seatId._id
            : seatId;
        })
        .filter(Boolean);

      // Query tất cả seats một lần
      const allSeatInfos = await SeatModel.find({
        _id: { $in: seatIds },
      })
        .select("_id type status seatId")
        .lean();

      // Tạo map để lookup nhanh: seatId -> seatInfo
      const seatInfoMap = new Map();
      allSeatInfos.forEach((seat: any) => {
        seatInfoMap.set(seat._id.toString(), seat);
      });

      // Populate seat information với dữ liệu đã query batch
      const populatedSeats = seatData.map((seatItem: any, index: number) => {
        const seatId = seatItem.seat;
        const seatIdStr =
          typeof seatId === "object" && seatId?._id
            ? seatId._id.toString()
            : seatId?.toString();
        const seatInfo = seatInfoMap.get(seatIdStr);

        // Compute seatId by index as fallback (row-major order)
        const cols = derivedCols;
        const rowIndex = Math.floor(index / cols);
        const colIndex = index % cols;
        const computedSeatId = `${String.fromCharCode(65 + rowIndex)}${
          colIndex + 1
        }`;

        const sid = seatInfo?.seatId || computedSeatId;
        const fromRoom = roomSeatMap[sid];

        // Status priority: SeatModel.maintenance -> RoomLayout.maintenance -> seatItem.status
        const finalStatus =
          seatInfo?.status === "maintenance" ||
          fromRoom?.status === "maintenance"
            ? "maintenance"
            : seatItem.status;

        // Type priority: RoomLayout.type (most up-to-date from admin) -> SeatModel.type -> 'normal'
        const finalType = fromRoom?.type || seatInfo?.type || "normal";

        return {
          seat: seatItem.seat,
          seatId: sid,
          status: finalStatus,
          type: finalType,
          _id: seatItem._id,
        };
      });

      return {
        showtimeInfo: {
          _id: showtime._id,
          movie: showtime.movieId,
          theater: showtime.theaterId,
          date: specificShowtime.date,
          startTime: specificShowtime.start,
          endTime: specificShowtime.end,
          room: specificShowtime.room,
        },
        seats: populatedSeats,
        seatLayout: {
          rows: derivedRows,
          cols: derivedCols,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Tạo layout ghế theo hàng (A, B, C, D, E, F, G, H)
  private async generateSeatLayout(seats: any[], roomId: string): Promise<any> {
    const layout: any = {};
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];

    // Get room layout from database once
    const room = await RoomModel.findById(roomId).select("seatLayout");
    const seatsPerRow = room?.seatLayout?.cols || 15; // Default to 15 if not found

    // Group seats by row
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      // Check if we have seat identifier (could be seatId or seat property)
      let seatIdentifier = seat.seatId || seat.seat;

      if (!seatIdentifier) {
        continue; // Skip this seat
      }

      // If seatIdentifier is ObjectId, generate a default layout
      if (
        typeof seatIdentifier === "object" ||
        seatIdentifier.toString().includes("ObjectId") ||
        seatIdentifier.length === 24
      ) {
        // Generate default seat layout based on seat index
        const seatIndex = i;

        const rowIndex = Math.floor(seatIndex / seatsPerRow);
        const colIndex = seatIndex % seatsPerRow;
        const row = String.fromCharCode(65 + rowIndex); // A, B, C, D, E, F, G, H
        const seatNumber = colIndex + 1;

        if (!layout[row]) {
          layout[row] = [];
        }

        layout[row].push({
          seatId: `${row}${seatNumber}`,
          number: seatNumber,
          status: seat.status || "available",
          type: seat.type || "standard",
          price: seat.price || 90000,
        });
        continue;
      }

      // Original logic for seatId format like "A1", "B2"
      const seatNumber = parseInt(seatIdentifier.substring(1)); // Extract number from A1, B2, etc.
      const row = seatIdentifier.charAt(0); // Extract letter A, B, C, etc.

      if (!layout[row]) {
        layout[row] = [];
      }

      layout[row].push({
        seatId: seat.seatId,
        number: seatNumber,
        status: seat.status, // available, maintenance
        type: seat.type, // standard, vip, couple
        price: seat.price,
      });
    }

    // Sort seats in each row by number
    Object.keys(layout).forEach((row) => {
      layout[row].sort((a: any, b: any) => a.number - b.number);
    });

    const result = {
      rows: rows.filter((row) => layout[row]), // Only include rows that have seats
      layout: layout,
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.status === "available")
        .length,
      occupiedSeats: seats.filter((seat) => seat.status === "selected").length,
    };

    return result;
  }

  // Helper method để so sánh thời gian linh hoạt
  private compareTime(showTimeStart: Date, targetTime: string): boolean {
    // Nếu targetTime là ISO string đầy đủ
    if (targetTime.includes("T")) {
      const targetStartTime = new Date(targetTime);
      return (
        Math.abs(showTimeStart.getTime() - targetStartTime.getTime()) < 60000
      );
    }

    // Nếu targetTime chỉ là thời gian (HH:mm) 24-hour format
    if (targetTime.includes(":")) {
      const showTimeHour = showTimeStart.getHours();
      const showTimeMin = showTimeStart.getMinutes();
      const [targetHour, targetMin] = targetTime.split(":").map(Number);
      return showTimeHour === targetHour && showTimeMin === targetMin;
    }

    return false;
  }

  // Helper method để so sánh ngày
  private compareDates(showDate: Date, targetDateStr: string): boolean {
    const showDateStr = new Date(showDate).toDateString();
    const targetDate = new Date(targetDateStr).toDateString();
    return showDateStr === targetDate;
  }

  // Đặt ghế
  async bookSeats(
    showtimeId: string,
    date: string,
    startTime: string,
    room: string,
    seatIds: string[],
    status: "available" | "selected" = "selected",
    reservedByUserId?: string
  ): Promise<any> {
    try {
      // showtimeId là parentId (ID của document cha)
      const showtime = await Showtime.findById(showtimeId)
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.seats.seat",
          select: "seatId type status",
        });
      if (!showtime) {
        throw new Error("Không tìm thấy suất chiếu");
      }

      // Tìm suất chiếu cụ thể
      const targetDate = new Date(date);

      const showtimeIndex = showtime.showTimes.findIndex((st) => {
        // So sánh ngày - convert UTC sang Vietnam time (UTC + 7)
        const showDate = new Date(st.date);
        const showDateVietnam = new Date(
          showDate.getTime() + 7 * 60 * 60 * 1000
        );
        const showDateStr = showDateVietnam.toISOString().split("T")[0];
        const targetDateStr = date; // Frontend đã gửi format YYYY-MM-DD
        const dateMatch = showDateStr === targetDateStr;

        // So sánh thời gian
        let timeMatch = false;
        if (startTime.includes("T")) {
          // Nếu startTime là ISO string đầy đủ
          const showStartTime = new Date(st.start);
          const targetStartTime = new Date(startTime);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else if (startTime.includes(" ")) {
          // Format 12-hour như "03:00 PM"
          const showStartTime = new Date(st.start);
          const targetTimeStr = `${date} ${startTime}`;
          const targetStartTime = new Date(targetTimeStr);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else {
          // Nếu startTime chỉ là thời gian (HH:mm) 24-hour format
          const showStartTime = new Date(st.start);
          // Convert UTC time to Vietnam time (UTC + 7)
          const vietnamHour = (showStartTime.getUTCHours() + 7) % 24;
          const vietnamMin = showStartTime.getUTCMinutes();
          const [targetHour, targetMin] = startTime.split(":").map(Number);
          timeMatch = vietnamHour === targetHour && vietnamMin === targetMin;
        }

        // So sánh room - sử dụng tên phòng đã được populate
        const roomMatch = (st.room as any)?.name === room;

        return dateMatch && timeMatch && roomMatch;
      });

      if (showtimeIndex === -1) {
        throw new Error("Không tìm thấy suất chiếu cụ thể");
      }

      // Kiểm tra ghế có sẵn không (map seatId -> _id theo room)
      const specificShowtime = showtime.showTimes[showtimeIndex];
      const unavailableSeats: string[] = [];
      const Seat = (await import("../models/Seat")).default;
      const roomId =
        (specificShowtime.room as any)?._id || specificShowtime.room;
      const seatDocs = await Seat.find({
        room: roomId,
        seatId: { $in: seatIds.map((s) => s.toUpperCase().trim()) },
      })
        .select("_id seatId")
        .lean();

      const requestedSet = new Set(seatIds.map((s) => s.toUpperCase().trim()));
      const foundSet = new Set(seatDocs.map((d: any) => d.seatId));
      const missing = [...requestedSet].filter((s) => !foundSet.has(s));
      if (missing.length > 0) {
        throw new Error(`Ghế không tồn tại trong phòng: ${missing.join(", ")}`);
      }

      // kiểm tra trạng thái trong showtime theo _id ghế (thêm nhiều nhánh so khớp)
      seatDocs.forEach((doc: any) => {
        const targetId = doc._id.toString();
        const entry = specificShowtime.seats.find((s: any) => {
          const seatField = s?.seat;
          const matchById =
            seatField &&
            typeof seatField === "object" &&
            typeof seatField.toString === "function" &&
            !seatField._id &&
            seatField.toString() === targetId;
          const matchByObjId =
            seatField &&
            seatField._id &&
            typeof seatField._id.toString === "function" &&
            seatField._id.toString() === targetId;
          const matchByStr =
            typeof seatField === "string" && seatField === targetId;
          const matchBySeatId =
            (seatField && seatField.seatId === doc.seatId) ||
            (s as any)?.seatId === doc.seatId;
          return matchById || matchByObjId || matchByStr || matchBySeatId;
        });
        if (!entry) {
          unavailableSeats.push(`${doc.seatId} (không tồn tại)`);
        } else if (entry.status !== "available") {
          // Nếu ghế đã được đặt, kiểm tra xem có phải của user hiện tại không
          const currentReservedBy = (entry as any).reservedBy?.toString();
          const requestingUserId = reservedByUserId?.toString();

          // Nếu không phải của user hiện tại, thì ghế không khả dụng
          if (
            currentReservedBy &&
            requestingUserId &&
            currentReservedBy !== requestingUserId
          ) {
            unavailableSeats.push(`${doc.seatId} (đã được đặt)`);
          } else if (!currentReservedBy && entry.status === "selected") {
            // Nếu ghế đã selected nhưng không có reservedBy, cũng coi là không khả dụng
            unavailableSeats.push(`${doc.seatId} (đã được đặt)`);
          } else if (!requestingUserId) {
            // Nếu không có requestingUserId, vẫn cho phép đặt lại nếu reservedBy khớp
            // Đây là fallback cho trường hợp userId không được truyền đúng
          }
          // Nếu là của user hiện tại, cho phép đặt lại
        }
      });

      if (unavailableSeats.length > 0) {
        throw new Error(`Ghế không khả dụng: ${unavailableSeats.join(", ")}`);
      }

      // Cập nhật trạng thái ghế thành 'reserved' (tạm giữ) hoặc 'occupied' (đã đặt)
      seatDocs.forEach((doc: any) => {
        const targetId = doc._id.toString();
        const seatIndex = specificShowtime.seats.findIndex((s: any) => {
          const seatField = s?.seat;
          const matchById =
            seatField &&
            typeof seatField === "object" &&
            typeof seatField.toString === "function" &&
            !seatField._id &&
            seatField.toString() === targetId;
          const matchByObjId =
            seatField &&
            seatField._id &&
            typeof seatField._id.toString === "function" &&
            seatField._id.toString() === targetId;
          const matchByStr =
            typeof seatField === "string" && seatField === targetId;
          const matchBySeatId =
            (seatField && seatField.seatId === doc.seatId) ||
            (s as any)?.seatId === doc.seatId;
          return matchById || matchByObjId || matchByStr || matchBySeatId;
        });
        if (seatIndex !== -1) {
          showtime.showTimes[showtimeIndex].seats[seatIndex].status =
            status as any;
          // hold 5 minutes when selected
          if (status === "selected") {
            (
              showtime.showTimes[showtimeIndex].seats[seatIndex] as any
            ).reservedUntil = new Date(Date.now() + 5 * 60 * 1000);
            if (reservedByUserId) {
              (
                showtime.showTimes[showtimeIndex].seats[seatIndex] as any
              ).reservedBy = reservedByUserId as any;
            }
          } else {
            (
              showtime.showTimes[showtimeIndex].seats[seatIndex] as any
            ).reservedUntil = undefined;
            (
              showtime.showTimes[showtimeIndex].seats[seatIndex] as any
            ).reservedBy = undefined;
          }
        }
      });

      await showtime.save();

      return {
        message: "Đặt ghế thành công",
        reservedSeats: seatIds,
        showtimeId: showtimeId,
        reservationTime: new Date(),
        // Reservation expires after 10 minutes
        reservationExpires: new Date(Date.now() + 10 * 60 * 1000),
      };
    } catch (error) {
      console.error("Error booking seats:", error);
      throw error;
    }
  }

  // Release ghế (đặt lại trạng thái về available)
  async releaseSeats(
    showtimeId: string,
    date: string,
    startTime: string,
    room: string,
    seatIds: string[]
  ): Promise<any> {
    try {
      const showtime = await Showtime.findById(showtimeId);
      if (!showtime) {
        throw new Error("Không tìm thấy suất chiếu");
      }

      // Tìm suất chiếu cụ thể
      const targetDate = new Date(date);
      const targetStartTime = startTime.includes("T")
        ? new Date(startTime)
        : new Date(`${date} ${startTime}`);

      const showtimeIndex = showtime.showTimes.findIndex((st) => {
        const showDate = new Date(st.date).toDateString();
        const showStartTime = new Date(st.start).getTime();
        const targetDateStr = targetDate.toDateString();
        const targetTimeMs = targetStartTime.getTime();

        const dateMatch = showDate === targetDateStr;
        const timeMatch = Math.abs(showStartTime - targetTimeMs) < 60000;
        const roomMatch =
          ((st.room as any)?.name || st.room.toString()) === room;

        return dateMatch && timeMatch && roomMatch;
      });

      if (showtimeIndex === -1) {
        throw new Error("Không tìm thấy suất chiếu cụ thể");
      }

      // Cập nhật trạng thái ghế về 'available'
      const specificShowtime = showtime.showTimes[showtimeIndex];
      seatIds.forEach((seatId) => {
        const seatIndex = specificShowtime.seats.findIndex((s: any) => {
          const seatField = s?.seat;
          return (
            (seatField && (seatField as any).seatId === seatId) ||
            (s as any)?.seatId === seatId ||
            (typeof seatField === "object" &&
              typeof (seatField as any).toString === "function" &&
              (seatField as any).toString() === seatId)
          );
        });
        if (seatIndex !== -1) {
          showtime.showTimes[showtimeIndex].seats[seatIndex].status =
            "available";
          (
            showtime.showTimes[showtimeIndex].seats[seatIndex] as any
          ).reservedUntil = undefined;
          (
            showtime.showTimes[showtimeIndex].seats[seatIndex] as any
          ).reservedBy = undefined;
        }
      });

      await showtime.save();

      return {
        message: "Release ghế thành công",
        releasedSeats: seatIds,
        showtimeId: showtimeId,
        releaseTime: new Date(),
      };
    } catch (error) {
      console.error("Error releasing seats:", error);
      throw error;
    }
  }

  // Cập nhật trạng thái ghế trong collection showtimes (ví dụ: selected sau khi thanh toán thành công)
  async setSeatsStatus(
    showtimeId: string,
    date: string,
    startTime: string,
    room: string,
    seatIds: string[],
    status: "selected" | "available" | "maintenance" | "reserved" | "occupied",
    onlyIfReservedByUserId?: string,
    reservedByUserId?: string
  ): Promise<void> {
    const showtime = await Showtime.findById(showtimeId)
      .populate({ path: "showTimes.room", select: "name roomType" })
      .populate({ path: "showTimes.seats.seat", select: "seatId" });

    if (!showtime) throw new Error("Không tìm thấy suất chiếu");

    const showtimeIndex = showtime.showTimes.findIndex((st) => {
      const showDate = new Date(st.date);
      const showDateVietnam = new Date(showDate.getTime() + 7 * 60 * 60 * 1000);
      const showDateStr = showDateVietnam.toISOString().split("T")[0];
      const dateMatch = showDateStr === date;

      let timeMatch = false;
      if (startTime.includes("T")) {
        const showStartTime = new Date(st.start);
        const targetStartTime = new Date(startTime);
        timeMatch =
          Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
      } else if (startTime.includes(" ")) {
        const showStartTime = new Date(st.start);
        const targetTimeStr = `${date} ${startTime}`;
        const targetStartTime = new Date(targetTimeStr);
        timeMatch =
          Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
      } else {
        const showStartTime = new Date(st.start);
        const vietnamHour = (showStartTime.getUTCHours() + 7) % 24;
        const vietnamMin = showStartTime.getUTCMinutes();
        const [targetHour, targetMin] = startTime.split(":").map(Number);
        timeMatch = vietnamHour === targetHour && vietnamMin === targetMin;
      }

      const roomMatch = (st.room as any)?.name === room;
      return dateMatch && timeMatch && roomMatch;
    });

    if (showtimeIndex === -1)
      throw new Error("Không tìm thấy suất chiếu cụ thể");

    const specificShowtime = showtime.showTimes[showtimeIndex];

    seatIds.forEach((seatId) => {
      const seatIndex = specificShowtime.seats.findIndex(
        (s) =>
          (s.seat as any)?.seatId === seatId || (s as any)?.seatId === seatId
      );

      if (seatIndex !== -1) {
        const current = specificShowtime.seats[seatIndex] as any;

        console.log(`🔍 Processing seat ${seatId}:`, {
          currentStatus: current.status,
          currentReservedBy: current.reservedBy?.toString(),
          onlyIfReservedByUserId,
          requestedStatus: status,
        });

        if (onlyIfReservedByUserId) {
          if (
            current.reservedBy &&
            current.reservedBy.toString() !== onlyIfReservedByUserId
          ) {
            console.log(
              `❌ Seat ${seatId} is reserved by different user, skipping`
            );
            return; // skip not owned
          }
        }

        const seat = specificShowtime.seats[seatIndex] as any;
        seat.status = status as any;

        // Logic cho reservation
        if (status === "selected" || status === "reserved") {
          // Tạm giữ ghế 8 phút khi user chọn ghế và vào trang payment
          seat.reservedUntil = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes
          seat.reservedBy = reservedByUserId
            ? new mongoose.Types.ObjectId(reservedByUserId)
            : seat.reservedBy;
          console.log(
            `🔒 Seat ${seatId} reserved by user ${reservedByUserId} until ${seat.reservedUntil}`
          );
        } else if (status === "occupied") {
          // Ghế đã được thanh toán thành công - không còn tạm giữ
          seat.reservedUntil = undefined;
          seat.reservedBy = undefined;
          console.log(
            `✅ Seat ${seatId} marked as occupied after successful payment`
          );
        } else if (status === "available") {
          // Giải phóng ghế
          seat.reservedUntil = undefined;
          seat.reservedBy = undefined;
          console.log(`🔓 Seat ${seatId} released and available`);
        }
      } else {
        console.log(`❌ Seat ${seatId} not found in showtime`);
      }
    });

    console.log(
      `💾 Before save - Seat statuses:`,
      seatIds.map((id) => {
        const seatIndex = specificShowtime.seats.findIndex(
          (s) => (s.seat as any)?.seatId === id || (s as any)?.seatId === id
        );
        if (seatIndex !== -1) {
          const seat = specificShowtime.seats[seatIndex] as any;
          return {
            seatId: id,
            status: seat.status,
            reservedBy: seat.reservedBy?.toString(),
          };
        }
        return { seatId: id, status: "not found" };
      })
    );

    await showtime.save();

    console.log(
      `✅ Showtime saved successfully. Updated seats:`,
      seatIds.map((id) => ({ seatId: id, status: "available" }))
    );

    // Verify after save
    const verifyShowtime = await Showtime.findById(showtimeId);
    const verifySpecificShowtime = verifyShowtime?.showTimes[showtimeIndex];
    console.log(
      `🔍 After save verification:`,
      seatIds.map((id) => {
        const seatIndex = verifySpecificShowtime?.seats.findIndex(
          (s) => (s.seat as any)?.seatId === id || (s as any)?.seatId === id
        );
        if (seatIndex !== -1 && seatIndex !== undefined) {
          const seat = verifySpecificShowtime?.seats[seatIndex] as any;
          return {
            seatId: id,
            status: seat.status,
            reservedBy: seat.reservedBy?.toString(),
          };
        }
        return { seatId: id, status: "not found" };
      })
    );
  }

  // Lấy thông tin ghế với trạng thái reservation cho user hiện tại
  async getSeatsWithReservationStatus(
    showtimeId: string,
    date: string,
    startTime: string,
    room: string,
    currentUserId?: string,
    isFromPaymentReturn?: boolean
  ): Promise<
    {
      seatId: string;
      status: string;
      reservedBy?: string;
      reservedUntil?: Date;
      isReservedByMe: boolean;
    }[]
  > {
    const showtime = await Showtime.findById(showtimeId)
      .populate({ path: "showTimes.room", select: "name roomType" })
      .populate({ path: "showTimes.seats.seat", select: "seatId" });

    if (!showtime) throw new Error("Không tìm thấy suất chiếu");

    const showtimeIndex = showtime.showTimes.findIndex((st) => {
      const showDate = new Date(st.date);
      const showDateVietnam = new Date(showDate.getTime() + 7 * 60 * 60 * 1000);
      const showDateStr = showDateVietnam.toISOString().split("T")[0];
      const dateMatch = showDateStr === date;

      let timeMatch = false;
      if (startTime.includes("T")) {
        const showStartTime = new Date(st.start);
        const targetStartTime = new Date(startTime);
        timeMatch =
          Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
      } else if (startTime.includes(" ")) {
        const showStartTime = new Date(st.start);
        const targetTimeStr = `${date} ${startTime}`;
        const targetStartTime = new Date(targetTimeStr);
        timeMatch =
          Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
      } else {
        const showStartTime = new Date(st.start);
        const vietnamHour = (showStartTime.getUTCHours() + 7) % 24;
        const vietnamMin = showStartTime.getUTCMinutes();
        const [targetHour, targetMin] = startTime.split(":").map(Number);
        timeMatch = vietnamHour === targetHour && vietnamMin === targetMin;
      }

      const roomMatch = (st.room as any)?.name === room;
      return dateMatch && timeMatch && roomMatch;
    });

    if (showtimeIndex === -1)
      throw new Error("Không tìm thấy suất chiếu cụ thể");

    const specificShowtime = showtime.showTimes[showtimeIndex];
    const now = new Date();
    let hasChanges = false;

    const result = specificShowtime.seats.map((seat: any) => {
      const seatId = seat.seat?.seatId || seat.seatId;
      const reservedBy = seat.reservedBy?.toString();
      const reservedUntil = seat.reservedUntil;
      const isReservedByMe = currentUserId && reservedBy === currentUserId;

      // Kiểm tra xem reservation có hết hạn không
      const isExpired = reservedUntil && new Date(reservedUntil) < now;

      // Nếu không phải quay lại từ payment và ghế đang được user này reserved,
      // thì không hiển thị trạng thái selected/reserved
      let finalStatus = isExpired ? "available" : seat.status;
      let finalReservedBy = isExpired ? undefined : reservedBy;
      let finalIsReservedByMe = Boolean(isExpired ? false : isReservedByMe);

      if (
        !isFromPaymentReturn &&
        isReservedByMe &&
        (seat.status === "selected" || seat.status === "reserved")
      ) {
        // Nếu không phải quay lại từ payment, không hiển thị ghế đang chọn của user
        // Và thực sự giải phóng ghế trong database
        finalStatus = "available";
        finalReservedBy = undefined;
        finalIsReservedByMe = false;

        // Cập nhật trạng thái trong database để giải phóng ghế
        seat.status = "available";
        seat.reservedUntil = undefined;
        seat.reservedBy = undefined;
        hasChanges = true;

        console.log(
          `🔍 Seat ${seatId} released - not from payment return, status reset to available and database updated`
        );
      }

      return {
        seatId,
        status: finalStatus,
        reservedBy: finalReservedBy,
        reservedUntil: isExpired ? undefined : reservedUntil,
        isReservedByMe: finalIsReservedByMe,
      };
    });

    // Lưu thay đổi nếu có
    if (hasChanges) {
      await showtime.save();
      console.log(
        `💾 Saved changes to showtime ${showtimeId} - released user reserved seats`
      );
    }

    return result;
  }

  // Release all expired reservations (selected/reserved but exceed reservedUntil)
  async releaseExpiredReservations(): Promise<{ released: number }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Chỉ query showtimes có ngày trong khoảng 24h qua và 24h tới
    // Vì reservations chỉ tồn tại trong 8 phút, nên chỉ cần check showtimes gần đây
    const docs = await Showtime.find({
      "showTimes.date": {
        $gte: yesterday,
        $lte: tomorrow,
      },
    });

    let released = 0;

    for (const doc of docs) {
      let changed = false;
      for (const st of doc.showTimes as any[]) {
        for (const seat of st.seats) {
          if (
            (seat.status === "selected" || seat.status === "reserved") &&
            seat.reservedUntil &&
            new Date(seat.reservedUntil) < now
          ) {
            seat.status = "available";
            seat.reservedUntil = undefined;
            seat.reservedBy = undefined;
            released++;
            changed = true;
          }
        }
      }
      if (changed) await doc.save();
    }

    console.log(`🕐 Released ${released} expired seat reservations`);
    return { released };
  }

  // Giải phóng tất cả ghế tạm giữ của user khi chọn suất chiếu mới
  async releaseUserReservedSeats(
    userId: string
  ): Promise<{ released: number; releasedSeats: string[] }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Chỉ query showtimes có ngày trong khoảng 24h qua và 24h tới
    const docs = await Showtime.find({
      "showTimes.date": {
        $gte: yesterday,
        $lte: tomorrow,
      },
    });

    let released = 0;
    const releasedSeats: string[] = [];

    for (const doc of docs) {
      let changed = false;
      for (const st of doc.showTimes as any[]) {
        for (const seat of st.seats) {
          if (
            (seat.status === "selected" || seat.status === "reserved") &&
            seat.reservedBy &&
            seat.reservedBy.toString() === userId
          ) {
            const seatId = seat.seat?.seatId || "unknown";
            seat.status = "available";
            seat.reservedUntil = undefined;
            seat.reservedBy = undefined;
            released++;
            releasedSeats.push(seatId);
            changed = true;
          }
        }
      }
      if (changed) await doc.save();
    }

    console.log(
      `🔄 Released ${released} user reserved seats for user ${userId}`
    );
    return { released, releasedSeats };
  }

  // Tạo dữ liệu ghế mặc định khi seats array rỗng
  private async generateDefaultSeats(roomId: string): Promise<any[]> {
    const seats: any[] = [];

    const room = await RoomModel.findById(roomId).select("seatLayout");
    const rows = room?.seatLayout?.rows || 12;
    const cols = room?.seatLayout?.cols || 10;

    // Get all seats for this room from database, include seatId to match by position
    const roomSeats = await SeatModel.find({ room: roomId }).select(
      "_id type status seatId"
    );

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seatIdLabel = `${String.fromCharCode(65 + row)}${col + 1}`;
        // Find corresponding seat in database by seatId
        const dbSeat = roomSeats.find(
          (seat: any) => seat.seatId === seatIdLabel
        );
        seats.push({
          seat: dbSeat?._id || new mongoose.Types.ObjectId(),
          status: dbSeat?.status || "available",
          type: dbSeat?.type || "normal",
          _id: new mongoose.Types.ObjectId(),
        });
      }
    }

    return seats;
  }

  // Method để khởi tạo ghế vào database cho một showtime cụ thể
  async initializeSeatsForShowtime(
    showtimeId: string,
    date: string,
    startTime: string,
    room?: string
  ): Promise<boolean> {
    try {
      const showtime = await Showtime.findById(showtimeId);
      if (!showtime) {
        throw new Error("Không tìm thấy suất chiếu");
      }

      // Tìm showtime cụ thể trong array
      const showtimeIndex = showtime.showTimes.findIndex((st) => {
        const showDate = new Date(st.date);
        const targetDate = new Date(date);
        const dateMatch = showDate.toDateString() === targetDate.toDateString();

        let timeMatch = false;
        if (startTime.includes("T")) {
          const showStartTime = new Date(st.start);
          const targetStartTime = new Date(startTime);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else if (startTime.includes(" ")) {
          const showStartTime = new Date(st.start);
          const targetTimeStr = `${date} ${startTime}`;
          const targetStartTime = new Date(targetTimeStr);
          timeMatch =
            Math.abs(showStartTime.getTime() - targetStartTime.getTime()) <
            60000;
        } else {
          const showTimeHour = new Date(st.start).getHours();
          const showTimeMin = new Date(st.start).getMinutes();
          const [targetHour, targetMin] = startTime.split(":").map(Number);
          timeMatch = showTimeHour === targetHour && showTimeMin === targetMin;
        }

        const roomMatch = room ? st.room.toString() === room : true;
        return dateMatch && timeMatch && roomMatch;
      });

      if (showtimeIndex === -1) {
        throw new Error("Không tìm thấy suất chiếu cụ thể");
      }

      // Nếu đã có ghế thì không khởi tạo lại
      if (
        showtime.showTimes[showtimeIndex].seats &&
        showtime.showTimes[showtimeIndex].seats.length > 0
      ) {
        return true;
      }

      // Tạo dữ liệu ghế mặc định
      const defaultSeats = await this.generateDefaultSeats(
        showtime.showTimes[showtimeIndex].room.toString()
      );
      showtime.showTimes[showtimeIndex].seats = defaultSeats;

      await showtime.save();
      console.log(
        `Initialized ${defaultSeats.length} seats for showtime ${showtimeId}`
      );
      return true;
    } catch (error) {
      console.error("Error initializing seats:", error);
      throw error;
    }
  }

  // Lấy danh sách showtime theo trạng thái (tương tự BlogService.getBlogsByStatus)
  async getShowtimesByStatus(status: "active" | "inactive"): Promise<any[]> {
    try {
      const showtimes = await Showtime.find({
        "showTimes.status": status,
      })
        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        });

      // Lọc chỉ lấy các showtime có trạng thái phù hợp
      const filteredShowtimes = showtimes
        .map((showtime) => ({
          ...showtime.toObject(),
          showTimes: showtime.showTimes.filter(
            (st: any) => st.status === status
          ),
        }))
        .filter((showtime) => showtime.showTimes.length > 0);

      return filteredShowtimes;
    } catch (error) {
      console.error("Error getting showtimes by status:", error);
      throw error;
    }
  }

  // Lấy tất cả showtime cho admin (bao gồm cả active và inactive)
  async getAllShowtimesForAdmin(): Promise<IShowtime[]> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysLater = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      const showtimes = await Showtime.find({
        "showTimes.date": {
          $gte: thirtyDaysAgo,
          $lte: thirtyDaysLater,
        },
      })
        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name roomType",
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime",
        })
        .lean(); // Sử dụng lean() để tăng performance

      // Admin thấy tất cả showtime (không filter theo status)
      return showtimes as any;
    } catch (error) {
      console.error("Error getting all showtimes for admin:", error);
      throw error;
    }
  }

  // Kiểm tra xem showtime có ghế đã đặt (occupied) không
  async hasOccupiedSeats(
    showtimeId: string,
    showTimeIndex: number
  ): Promise<boolean> {
    try {
      const showtime = await Showtime.findById(showtimeId);
      if (!showtime) {
        return false;
      }

      const showTime = showtime.showTimes[showTimeIndex];
      if (!showTime) {
        return false;
      }

      // Kiểm tra xem có ghế nào có status = 'occupied' không
      const hasOccupied = showTime.seats.some(
        (seat: any) => seat.status === "occupied"
      );
      return hasOccupied;
    } catch (error) {
      console.error("Error checking occupied seats:", error);
      return false;
    }
  }

  // Kiểm tra xem showtime có ghế đã đặt không (API endpoint)
  async checkShowtimeOccupiedSeats(showtimeId: string): Promise<{
    hasOccupiedSeats: boolean;
    occupiedCount: number;
    totalSeats: number;
  }> {
    try {
      const showtime = await Showtime.findById(showtimeId);
      if (!showtime) {
        return { hasOccupiedSeats: false, occupiedCount: 0, totalSeats: 0 };
      }

      let totalOccupied = 0;
      let totalSeats = 0;
      let hasOccupied = false;

      for (const showTime of showtime.showTimes) {
        totalSeats += showTime.seats.length;
        const occupiedInThisShowTime = showTime.seats.filter(
          (seat: any) => seat.status === "occupied"
        ).length;
        totalOccupied += occupiedInThisShowTime;

        if (occupiedInThisShowTime > 0) {
          hasOccupied = true;
        }
      }

      return {
        hasOccupiedSeats: hasOccupied,
        occupiedCount: totalOccupied,
        totalSeats: totalSeats,
      };
    } catch (error) {
      console.error("Error checking showtime occupied seats:", error);
      return { hasOccupiedSeats: false, occupiedCount: 0, totalSeats: 0 };
    }
  }

  // Kiểm tra từng suất chiếu có ghế đã đặt không
  async checkEachShowtimeOccupiedSeats(showtimeId: string): Promise<{
    showtimes: Array<{
      index: number;
      hasOccupiedSeats: boolean;
      occupiedCount: number;
      totalSeats: number;
    }>;
  }> {
    try {
      const showtime = await Showtime.findById(showtimeId);
      if (!showtime) {
        return { showtimes: [] };
      }

      const showtimes = showtime.showTimes.map((showTime, index) => {
        const totalSeats = showTime.seats.length;
        const occupiedCount = showTime.seats.filter(
          (seat: any) => seat.status === "occupied"
        ).length;

        return {
          index,
          hasOccupiedSeats: occupiedCount > 0,
          occupiedCount,
          totalSeats,
        };
      });

      return { showtimes };
    } catch (error) {
      console.error("Error checking each showtime occupied seats:", error);
      return { showtimes: [] };
    }
  }

  // Tự động cập nhật trạng thái showtime đã quá ngày thành inactive
  async updateExpiredShowtimes(): Promise<{
    updatedCount: number;
    updatedShowtimes: any[];
  }> {
    try {
      // Lấy ngày hiện tại theo timezone Việt Nam (UTC+7)
      const now = new Date();
      const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7
      const todayStr = vietnamTime.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      // Tìm tất cả showtime có showTimes trong ngày đã qua (chỉ những ngày trước hôm nay)
      const yesterday = new Date(vietnamTime);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Query chỉ tìm showtime có ngày < hôm qua (không bao gồm hôm qua và hôm nay)
      const showtimes = await Showtime.find({
        "showTimes.date": { $lt: new Date(yesterdayStr + "T00:00:00.000Z") },
        "showTimes.status": { $in: ["active", null, undefined] }, // Chỉ update active hoặc chưa có status
      });

      let updatedCount = 0;
      const updatedShowtimes: any[] = [];

      for (const showtime of showtimes) {
        let hasUpdates = false;

        // Cập nhật từng showTime trong mảng
        for (let i = 0; i < showtime.showTimes.length; i++) {
          const showTime = showtime.showTimes[i] as any;
          const showDate = new Date(showTime.date);
          const showDateStr = showDate.toISOString().split("T")[0];

          // Chỉ update những suất chiếu có ngày < hôm qua (không bao gồm hôm qua và hôm nay)
          if (
            showDateStr < yesterdayStr &&
            (!showTime.status || showTime.status === "active")
          ) {
            showTime.status = "inactive";
            hasUpdates = true;
          } else {
          }
        }

        // Nếu có thay đổi, lưu showtime
        if (hasUpdates) {
          await showtime.save();
          updatedCount++;
          updatedShowtimes.push({
            showtimeId: showtime._id,
            movieId: showtime.movieId,
            theaterId: showtime.theaterId,
            updatedShowTimes: showtime.showTimes.filter(
              (st: any) => st.status === "inactive"
            ),
          });
        }
      }

      return {
        updatedCount,
        updatedShowtimes,
      };
    } catch (error) {
      console.error("Error updating expired showtimes:", error);
      throw error;
    }
  }
}

export default ShowtimeService;
