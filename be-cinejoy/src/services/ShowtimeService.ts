import { IShowtime, Showtime } from "../models/Showtime";
import ShowSession from "../models/ShowSession";
import SeatModel from "../models/Seat";
import RoomModel from "../models/Room";
import mongoose from "mongoose";

class ShowtimeService {
  private dateKeyUTC(d: Date | string): string {
    const x = new Date(d);
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
  }
  async getShowtimes(): Promise<IShowtime[]> {
    try {
      const showtimes = await Showtime.find()
        .populate("movieId", "title")
        .populate("theaterId", "name")
        .populate({
          path: "showTimes.room",
          select: "name"
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime"
        });
      return showtimes;
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
          select: "name"
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime"
        });
      return showtime;
    } catch (error) {
      throw error;
    }
  }

  async addShowtime(showtimeData: Partial<IShowtime>): Promise<IShowtime> {
    try {
      if (!showtimeData.movieId || !showtimeData.theaterId || !showtimeData.showTimes || showtimeData.showTimes.length === 0) {
        throw new Error("Thiếu dữ liệu bắt buộc để tạo suất chiếu");
      }

      // Chuẩn hóa mảng showTimes: khởi tạo seats tự động nếu thiếu/không hợp lệ
      const normalizedShowTimes = await Promise.all(
        (showtimeData.showTimes as any[]).map(async (st: any) => {
          st.start = new Date(st.start);
          st.end = new Date(st.end);
          if (!Array.isArray(st.seats) || st.seats.length === 0 || (st.seats[0] && !st.seats[0].seat)) {
            const roomSeats = await SeatModel.find({ room: st.room }).select("_id status");
            st.seats = roomSeats.map((s) => ({ seat: s._id as any, status: s.status || "available" }));
          }
          return st;
        })
      );

      // Tìm xem đã có document cho cặp movieId + theaterId chưa
      let doc = await Showtime.findOne({ movieId: showtimeData.movieId, theaterId: showtimeData.theaterId });

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
              throw new Error("Thời gian bắt đầu không nằm trong khoảng của ca chiếu đã chọn");
            }
            if (endMin > sessionEndMin) {
              throw new Error("Thời gian kết thúc vượt quá thời gian của ca chiếu");
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
            if (startMin < (sessionStartMin as number) || startMin >= (sessionEndMin as number)) {
              throw new Error("Thời gian bắt đầu không nằm trong khoảng của ca chiếu đã chọn");
            }
            if (endMin > (sessionEndMin as number)) {
              throw new Error("Thời gian kết thúc vượt quá thời gian của ca chiếu");
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
            return stStartMin >= (sessionStartMin as number) && stStartMin < (sessionEndMin as number);
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
            return startMin >= (sessionStartMin as number) && startMin < (sessionEndMin as number);
          });

          // Bỏ giới hạn tối đa 2 suất/ca/phòng. Vẫn tiếp tục thêm suất chiếu nếu không trùng.
          const totalInSession = inThisSession.length + alsoIncoming.length;

          // Khởi tạo seats tự động nếu thiếu trước khi push
          if (!Array.isArray(incoming.seats) || incoming.seats.length === 0 || (incoming.seats[0] && !incoming.seats[0].seat)) {
            const roomSeats = await SeatModel.find({ room: incoming.room }).select("_id status");
            incoming.seats = roomSeats.map((s) => ({ seat: s._id as any, status: s.status || "available" }));
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
      // If showTimes updated, ensure seats are present for each new item
      if (Array.isArray((showtimeData as any).showTimes)) {
        const updatedList = await Promise.all(
          (showtimeData as any).showTimes.map(async (st: any) => {
            if (!st.seats || st.seats.length === 0) {
              const roomSeats = await SeatModel.find({ room: st.room }).select("_id status");
              st.seats = roomSeats.map((s) => ({ seat: s._id, status: "available" }));
            }
            return st;
          })
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
          select: "name"
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime"
        });
      return showtimes;
    } catch (error) {
      throw error;
    }
  }

  // Lấy các suất chiếu theo phòng và ngày (lọc trong mảng showTimes)
  async getShowtimesByRoomAndDate(roomId: string, date: string): Promise<{
    showtimeId: string;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    movieId: string;
  }[]> {
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
          select: "name"
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime"
        });
      return showtimes;
    } catch (error) {
      throw error;
    }
  }

  // Backfill: khởi tạo lại seats cho toàn bộ showtimes đang thiếu/không hợp lệ
  async backfillAllShowtimeSeats(force = false): Promise<{ total: number; fixed: number }> {
    const docs = await Showtime.find({});
    let fixed = 0;
    for (const doc of docs) {
      let changed = false;
      for (let i = 0; i < doc.showTimes.length; i++) {
        const st: any = doc.showTimes[i];
        const invalid = !Array.isArray(st.seats) || st.seats.length === 0 || st.seats.some((x: any) => !x || !x.seat);
        if (invalid || force) {
          const roomSeats = await SeatModel.find({ room: st.room }).select("_id status");
          st.seats = roomSeats.map((s) => ({ seat: s._id as any, status: s.status || "available" }));
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
          select: "name"
        })
        .populate({
          path: "showTimes.showSessionId",
          select: "name startTime endTime"
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
        seatData = await this.generateDefaultSeats((specificShowtime.room as any)._id);

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
      const roomId: any = (specificShowtime.room as any)?._id || (specificShowtime.room as any);
      const roomLayout = await RoomModel.findById(roomId).select('seatLayout').lean();
      
      // Build quick lookup from roomLayout: seatId -> { type, status }
      const roomSeatMap: Record<string, { type?: string; status?: string }> = {};
      const rl = (roomLayout as any)?.seatLayout;
      if (rl && rl.seats) {
        Object.keys(rl.seats).forEach((sid: string) => {
          roomSeatMap[sid] = { type: rl.seats[sid].type, status: rl.seats[sid].status };
        });
      }
      
      // Fallback: If roomSeatMap is empty, build it from SeatModel by room (seatId -> type/status)
      if (Object.keys(roomSeatMap).length === 0) {
        const seatsByRoom = await SeatModel.find({ room: roomId }).select('seatId type status').lean();
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
          if (sid && typeof sid === 'string' && /^[A-Z]\d+$/i.test(sid)) {
            const rowChar = sid.charAt(0).toUpperCase();
            const colNum = parseInt(sid.substring(1), 10) || 0;
            maxRowCharCode = Math.max(maxRowCharCode, rowChar.charCodeAt(0));
            maxColNumber = Math.max(maxColNumber, colNum);
          }
        });
        const layoutRows = maxRowCharCode >= 65 ? (maxRowCharCode - 65 + 1) : ((roomLayout as any)?.seatLayout?.rows || 12);
        const layoutCols = maxColNumber > 0 ? maxColNumber : ((roomLayout as any)?.seatLayout?.cols || 10);
        return { layoutRows, layoutCols };
      };

      const { layoutRows: derivedRows, layoutCols: derivedCols } = deriveLayout();

      // Populate seat information with type and other details
      const populatedSeats = await Promise.all(
        seatData.map(async (seatItem: any, index: number) => {
          const seatInfo = await SeatModel.findById(seatItem.seat).select('type status seatId');
          
          // Compute seatId by index as fallback (row-major order)
          const cols = derivedCols;
          const rowIndex = Math.floor(index / cols);
          const colIndex = index % cols;
          const computedSeatId = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
          
          const sid = seatInfo?.seatId || computedSeatId;
          const fromRoom = roomSeatMap[sid];
          
          // Status priority: SeatModel.maintenance -> RoomLayout.maintenance -> seatItem.status
          const finalStatus = (seatInfo?.status === 'maintenance' || fromRoom?.status === 'maintenance')
            ? 'maintenance'
            : seatItem.status;
          
          // Type priority: RoomLayout.type (most up-to-date from admin) -> SeatModel.type -> 'normal'
          const finalType = fromRoom?.type || seatInfo?.type || 'normal';
          
          return {
            seat: seatItem.seat,
            seatId: sid,
            status: finalStatus,
            type: finalType,
            _id: seatItem._id
          };
        })
      );

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
          cols: derivedCols
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
    const room = await RoomModel.findById(roomId).select('seatLayout');
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
      if (typeof seatIdentifier === 'object' || seatIdentifier.toString().includes('ObjectId') || seatIdentifier.length === 24) {
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
    status: "available" | "selected" = "selected"
  ): Promise<any> {
    try {
      // showtimeId là parentId (ID của document cha)
      const showtime = await Showtime.findById(showtimeId)
        .populate({
          path: "showTimes.room",
          select: "name"
        })
        .populate({
          path: "showTimes.seats.seat",
          select: "seatId type status"
        });
      if (!showtime) {
        throw new Error("Không tìm thấy suất chiếu");
      }

      // Tìm suất chiếu cụ thể
      const targetDate = new Date(date);


      const showtimeIndex = showtime.showTimes.findIndex((st) => {
        // So sánh ngày - convert UTC sang Vietnam time (UTC + 7)
        const showDate = new Date(st.date);
        const showDateVietnam = new Date(showDate.getTime() + 7 * 60 * 60 * 1000);
        const showDateStr = showDateVietnam.toISOString().split('T')[0];
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
      const roomId = ((specificShowtime.room as any)?._id) || specificShowtime.room;
      const seatDocs = await Seat.find({
        room: roomId,
        seatId: { $in: seatIds.map((s) => s.toUpperCase().trim()) },
      })
        .select("_id seatId")
        .lean();

      // DEBUG: log dữ liệu đầu vào và mapping ghế tìm được từ collection Seat
      try {
        console.log("[BookSeats][DEBUG] Input:", {
          showtimeId,
          date,
          startTime,
          room,
          seatIds,
          roomId: roomId?.toString?.() || roomId,
        });
        console.log("[BookSeats][DEBUG] Seat docs from collection:", seatDocs.map((d: any) => ({ id: d?._id?.toString?.(), seatId: d?.seatId })));
        console.log("[BookSeats][DEBUG] specificShowtime seats length:", specificShowtime?.seats?.length);
        console.log("[BookSeats][DEBUG] First 5 seats in specificShowtime:", (specificShowtime?.seats || []).slice(0, 5).map((s: any) => ({ seat: s?.seat?.toString?.(), status: s?.status })));
      } catch {}

      const requestedSet = new Set(seatIds.map((s) => s.toUpperCase().trim()));
      const foundSet = new Set(seatDocs.map((d: any) => d.seatId));
      const missing = [...requestedSet].filter((s) => !foundSet.has(s));
      if (missing.length > 0) {
        console.log("[BookSeats][DEBUG] Missing in Seat collection:", missing);
        throw new Error(`Ghế không tồn tại trong phòng: ${missing.join(", ")}`);
      }

      // kiểm tra trạng thái trong showtime theo _id ghế (thêm nhiều nhánh so khớp)
      seatDocs.forEach((doc: any) => {
        const targetId = doc._id.toString();
        const entry = specificShowtime.seats.find((s: any) => {
          const seatField = s?.seat;
          const matchById = seatField && typeof seatField === 'object' && typeof seatField.toString === 'function' && !seatField._id && seatField.toString() === targetId;
          const matchByObjId = seatField && seatField._id && typeof seatField._id.toString === 'function' && seatField._id.toString() === targetId;
          const matchByStr = typeof seatField === 'string' && seatField === targetId;
          const matchBySeatId = (seatField && seatField.seatId === doc.seatId) || (s as any)?.seatId === doc.seatId;
          return matchById || matchByObjId || matchByStr || matchBySeatId;
        });
        if (!entry) {
          console.log("[BookSeats][DEBUG] Seat entry not found in showtime for seatId:", doc.seatId, "(seat _id:", doc._id?.toString?.(), ")");
          unavailableSeats.push(`${doc.seatId} (không tồn tại)`);
        } else if (entry.status !== "available") {
          unavailableSeats.push(`${doc.seatId} (đã được đặt)`);
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
          const matchById = seatField && typeof seatField === 'object' && typeof seatField.toString === 'function' && !seatField._id && seatField.toString() === targetId;
          const matchByObjId = seatField && seatField._id && typeof seatField._id.toString === 'function' && seatField._id.toString() === targetId;
          const matchByStr = typeof seatField === 'string' && seatField === targetId;
          const matchBySeatId = (seatField && seatField.seatId === doc.seatId) || (s as any)?.seatId === doc.seatId;
          return matchById || matchByObjId || matchByStr || matchBySeatId;
        });
        if (seatIndex !== -1) {
          showtime.showTimes[showtimeIndex].seats[seatIndex].status = status as any;
          // hold 5 minutes when selected
          if (status === 'selected') {
            (showtime.showTimes[showtimeIndex].seats[seatIndex] as any).reservedUntil = new Date(Date.now() + 5 * 60 * 1000);
          } else {
            (showtime.showTimes[showtimeIndex].seats[seatIndex] as any).reservedUntil = undefined;
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
      const targetStartTime = startTime.includes('T') ? new Date(startTime) : new Date(`${date} ${startTime}`);

      const showtimeIndex = showtime.showTimes.findIndex((st) => {
        const showDate = new Date(st.date).toDateString();
        const showStartTime = new Date(st.start).getTime();
        const targetDateStr = targetDate.toDateString();
        const targetTimeMs = targetStartTime.getTime();

        const dateMatch = showDate === targetDateStr;
        const timeMatch = Math.abs(showStartTime - targetTimeMs) < 60000;
        const roomMatch = ((st.room as any)?.name || st.room.toString()) === room;

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
          return (seatField && (seatField as any).seatId === seatId) || (s as any)?.seatId === seatId || (typeof seatField === 'object' && typeof (seatField as any).toString === 'function' && (seatField as any).toString() === seatId);
        });
        if (seatIndex !== -1) {
          showtime.showTimes[showtimeIndex].seats[seatIndex].status =
            "available";
          (showtime.showTimes[showtimeIndex].seats[seatIndex] as any).reservedUntil = undefined;
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
    status: "selected" | "available" | "maintenance"
  ): Promise<void> {
    const showtime = await Showtime.findById(showtimeId)
      .populate({ path: "showTimes.room", select: "name" })
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
        timeMatch = Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
      } else if (startTime.includes(" ")) {
        const showStartTime = new Date(st.start);
        const targetTimeStr = `${date} ${startTime}`;
        const targetStartTime = new Date(targetTimeStr);
        timeMatch = Math.abs(showStartTime.getTime() - targetStartTime.getTime()) < 60000;
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

    if (showtimeIndex === -1) throw new Error("Không tìm thấy suất chiếu cụ thể");

    const specificShowtime = showtime.showTimes[showtimeIndex];
    seatIds.forEach((seatId) => {
      const seatIndex = specificShowtime.seats.findIndex(
        (s) => ((s.seat as any)?.seatId === seatId) || ((s as any)?.seatId === seatId)
        );
        if (seatIndex !== -1) {
        specificShowtime.seats[seatIndex].status = status as any;
        (specificShowtime.seats[seatIndex] as any).reservedUntil = status === 'selected' ? new Date(Date.now() + 5 * 60 * 1000) : undefined;
      }
    });

    await showtime.save();
  }

  // Release all expired reservations (selected but exceed reservedUntil)
  async releaseExpiredReservations(): Promise<{ released: number }> {
    const docs = await Showtime.find({});
    let released = 0;
    const now = new Date();
    for (const doc of docs) {
      let changed = false;
      for (const st of (doc.showTimes as any[])) {
        for (const seat of st.seats) {
          if (seat.status === 'selected' && seat.reservedUntil && new Date(seat.reservedUntil) < now) {
            seat.status = 'available';
            seat.reservedUntil = undefined;
            released++;
            changed = true;
          }
        }
      }
      if (changed) await doc.save();
    }
    return { released };
  }

  // Tạo dữ liệu ghế mặc định khi seats array rỗng
  private async generateDefaultSeats(roomId: string): Promise<any[]> {
    const seats: any[] = [];
    
    const room = await RoomModel.findById(roomId).select('seatLayout');
    const rows = room?.seatLayout?.rows || 12;
    const cols = room?.seatLayout?.cols || 10;
    
    // Get all seats for this room from database, include seatId to match by position
    const roomSeats = await SeatModel.find({ room: roomId }).select('_id type status seatId');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seatIdLabel = `${String.fromCharCode(65 + row)}${col + 1}`;
        // Find corresponding seat in database by seatId
        const dbSeat = roomSeats.find((seat: any) => seat.seatId === seatIdLabel);
        seats.push({
          seat: dbSeat?._id || new mongoose.Types.ObjectId(),
          status: dbSeat?.status || "available",
          type: dbSeat?.type || 'normal',
          _id: new mongoose.Types.ObjectId()
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
      const defaultSeats = await this.generateDefaultSeats(showtime.showTimes[showtimeIndex].room.toString());
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
}

export default ShowtimeService;
