import PriceList, { IPriceList, IPriceListLine } from "../models/PriceList";
import { FoodCombo } from "../models/FoodCombo";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

export interface ICreatePriceListData {
  code: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  lines: IPriceListLine[];
}

export interface IUpdatePriceListData {
  code?: string;
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  lines?: IPriceListLine[];
}

class PriceListService {
  private toVietnamStartOfDay(date: Date) {
    return dayjs(date).tz(VIETNAM_TZ).startOf("day");
  }

  private normalizeDateRangeToVietnam(startDate: Date, endDate: Date) {
    const start = this.toVietnamStartOfDay(startDate);
    const end = this.toVietnamStartOfDay(endDate);

    return {
      startDate: start.toDate(),
      endDate: end.toDate(),
    };
  }

  private formatVietnamDate(date: dayjs.Dayjs) {
    return date.tz(VIETNAM_TZ).format("DD/MM/YYYY");
  }

  private computeStatusByDate(
    startDate: Date,
    endDate: Date
  ): "scheduled" | "active" | "expired" {
    const today = dayjs().tz(VIETNAM_TZ).startOf("day");
    const start = this.toVietnamStartOfDay(startDate);
    const end = this.toVietnamStartOfDay(endDate);

    if (end.isBefore(today)) return "expired";
    if (
      today.isSame(start) ||
      today.isSame(end) ||
      (today.isAfter(start) && today.isBefore(end))
    ) {
      return "active";
    }
    return "scheduled";
  }

  // Đồng bộ trạng thái theo thời gian; chỉ cập nhật khi lệch
  private async syncStatusIfNeeded(priceList: IPriceList): Promise<IPriceList> {
    const expected = this.computeStatusByDate(
      priceList.startDate,
      priceList.endDate
    );
    if (priceList.status !== expected) {
      await PriceList.findByIdAndUpdate(priceList._id, { status: expected });
      // phản ánh ngay trong object trả về
      (priceList as any).status = expected;
    }
    return priceList;
  }

  // Lấy tất cả bảng giá
  async getAllPriceLists(): Promise<IPriceList[]> {
    const lists = await PriceList.find().sort({ startDate: -1 });
    // Đồng bộ trạng thái trước khi trả về
    const synced = await Promise.all(
      lists.map((pl) => this.syncStatusIfNeeded(pl))
    );
    return synced;
  }

  // Lấy bảng giá theo ID
  async getPriceListById(id: string): Promise<IPriceList | null> {
    const pl = await PriceList.findById(id);
    if (!pl) return null;
    return await this.syncStatusIfNeeded(pl);
  }

  // Lấy bảng giá hiện tại (active)
  async getCurrentPriceList(): Promise<IPriceList | null> {
    // Lấy tất cả bảng giá và kiểm tra trạng thái bằng logic computeStatusByDate
    const allPriceLists = await PriceList.find().sort({ startDate: -1 });

    for (const priceList of allPriceLists) {
      const status = this.computeStatusByDate(
        priceList.startDate,
        priceList.endDate
      );
      if (status === "active") {
        return await this.syncStatusIfNeeded(priceList);
      }
    }

    return null;
  }

  // Kiểm tra mã bảng giá có tồn tại không
  async checkCodeExists(code: string): Promise<boolean> {
    const existingPriceList = await PriceList.findOne({
      code: code.toUpperCase(),
    });
    return !!existingPriceList;
  }

  // Tạo bảng giá mới
  async createPriceList(
    priceListData: ICreatePriceListData
  ): Promise<IPriceList> {
    const normalizedDates = this.normalizeDateRangeToVietnam(
      priceListData.startDate,
      priceListData.endDate
    );
    priceListData.startDate = normalizedDates.startDate;
    priceListData.endDate = normalizedDates.endDate;

    // Kiểm tra mã bảng giá có trùng lặp không
    const codeExists = await this.checkCodeExists(priceListData.code);
    if (codeExists) {
      throw new Error(
        `Mã bảng giá "${priceListData.code}" đã tồn tại, vui lòng chọn mã khác`
      );
    }

    // Kiểm tra xung đột thời gian
    await this.checkTimeConflicts(
      priceListData.startDate,
      priceListData.endDate
    );

    // Kiểm tra và filter các line còn tồn tại (cho sao chép bảng giá)
    const { validLines, skippedCount, skippedItems } =
      await this.validateAndFilterLines(priceListData.lines);

    const priceList = new PriceList({
      ...priceListData,
      code: priceListData.code.toUpperCase(), // Đảm bảo uppercase
      lines: validLines,
    });

    const savedPriceList = await priceList.save();

    // Thêm thông tin về các item đã bỏ qua vào response
    (savedPriceList as any).skippedInfo = {
      skippedCount,
      skippedItems,
    };

    return savedPriceList;
  }

  // Cập nhật bảng giá
  async updatePriceList(
    id: string,
    updateData: IUpdatePriceListData
  ): Promise<IPriceList | null> {
    const priceList = await PriceList.findById(id);
    if (!priceList) {
      throw new Error("Bảng giá không tồn tại");
    }

    // Kiểm tra mã bảng giá có trùng lặp không (nếu có thay đổi code)
    if (updateData.code && updateData.code !== priceList.code) {
      const codeExists = await this.checkCodeExists(updateData.code);
      if (codeExists) {
        throw new Error(
          `Mã bảng giá "${updateData.code}" đã tồn tại, vui lòng chọn mã khác`
        );
      }
      updateData.code = updateData.code.toUpperCase(); // Đảm bảo uppercase
    }

    // Kiểm tra quy tắc chỉnh sửa
    this.validateEditRules(priceList.status, updateData);

    // Kiểm tra xung đột thời gian nếu có thay đổi ngày
    if (updateData.startDate || updateData.endDate) {
      const normalized = this.normalizeDateRangeToVietnam(
        updateData.startDate || priceList.startDate,
        updateData.endDate || priceList.endDate
      );
      updateData.startDate = normalized.startDate;
      updateData.endDate = normalized.endDate;
      const startDate = updateData.startDate;
      const endDate = updateData.endDate;
      await this.checkTimeConflicts(startDate, endDate, id);
    }

    // Lấy giá từ sản phẩm/combo nếu có lines mới
    if (updateData.lines) {
      updateData.lines = await this.populatePricesFromProducts(
        updateData.lines
      );
    }

    return await PriceList.findByIdAndUpdate(id, updateData, { new: true });
  }

  // Xóa bảng giá
  async deletePriceList(id: string): Promise<boolean> {
    const priceList = await PriceList.findById(id);
    if (!priceList) {
      throw new Error("Bảng giá không tồn tại");
    }

    // Kiểm tra quy tắc xóa
    this.validateDeleteRules(priceList.status);

    const result = await PriceList.findByIdAndDelete(id);
    return !!result;
  }

  // Kiểm tra xung đột thời gian
  private async checkTimeConflicts(
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<void> {
    const normalizedStart = this.toVietnamStartOfDay(startDate).toDate();
    const normalizedEnd = this.toVietnamStartOfDay(endDate).toDate();

    const query: any = {
      $or: [
        // Bảng giá mới bắt đầu trong khoảng thời gian của bảng giá khác
        {
          startDate: { $lte: normalizedStart },
          endDate: { $gte: normalizedStart },
        },
        // Bảng giá mới kết thúc trong khoảng thời gian của bảng giá khác
        {
          startDate: { $lte: normalizedEnd },
          endDate: { $gte: normalizedEnd },
        },
        // Bảng giá mới bao trùm hoàn toàn bảng giá khác
        {
          startDate: { $gte: normalizedStart },
          endDate: { $lte: normalizedEnd },
        },
      ],
    };

    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const conflictingPriceList = await PriceList.findOne(query);
    if (conflictingPriceList) {
      throw new Error("Khoảng thời gian bị trùng với bảng giá khác");
    }
  }

  // Lấy giá từ sản phẩm/combo
  private async populatePricesFromProducts(
    lines: IPriceListLine[]
  ): Promise<IPriceListLine[]> {
    const populatedLines = await Promise.all(
      lines.map(async (line) => {
        if (line.type === "ticket") {
          // Giá ghế được nhập trực tiếp
          return line;
        } else if (line.type === "combo" || line.type === "single") {
          if (line.productId) {
            const product = await FoodCombo.findById(line.productId);
            if (product) {
              return {
                ...line,
                productName: product.name,
                price: line.price || 0, // Không có giá từ sản phẩm, chỉ dùng giá đã nhập
              };
            }
          }
        }
        return line;
      })
    );

    return populatedLines;
  }

  // Kiểm tra và filter các line còn tồn tại khi sao chép
  private async validateAndFilterLines(lines: IPriceListLine[]): Promise<{
    validLines: IPriceListLine[];
    skippedCount: number;
    skippedItems: string[];
  }> {
    const validLines: IPriceListLine[] = [];
    const skippedItems: string[] = [];

    for (const line of lines) {
      if (line.type === "ticket") {
        // Vé (loại ghế) luôn hợp lệ vì có các loại cố định
        validLines.push(line);
      } else if (line.type === "combo" || line.type === "single") {
        if (line.productId) {
          const product = await FoodCombo.findById(line.productId);
          if (product) {
            validLines.push({
              ...line,
              productName: product.name,
              price: line.price || 0, // Không có giá từ sản phẩm, chỉ dùng giá đã nhập
            });
          } else {
            // Sản phẩm/combo không tồn tại, ghi lại để báo cáo
            skippedItems.push(line.productName || line.productId);
          }
        }
      }
    }

    return {
      validLines,
      skippedCount: skippedItems.length,
      skippedItems,
    };
  }

  // Kiểm tra quy tắc chỉnh sửa
  private validateEditRules(
    status: string,
    updateData: IUpdatePriceListData
  ): void {
    if (status === "expired") {
      throw new Error("Không thể chỉnh sửa bảng giá đã hết hạn");
    }

    if (status === "active") {
      // Chỉ cho phép sửa endDate để split version
      const allowedFields = ["endDate"];
      const updateFields = Object.keys(updateData);
      const hasInvalidFields = updateFields.some(
        (field) => !allowedFields.includes(field)
      );

      if (hasInvalidFields) {
        throw new Error(
          "Bảng giá đang hoạt động chỉ có thể sửa ngày kết thúc để tạo version mới"
        );
      }
    }
  }

  // Kiểm tra quy tắc xóa
  private validateDeleteRules(status: string): void {
    if (status === "expired") {
      throw new Error("Không thể xóa bảng giá đã hết hạn");
    }

    if (status === "active") {
      throw new Error("Không thể xóa bảng giá đang hoạt động");
    }
  }

  // Kiểm tra khoảng trống thời gian
  async checkTimeGaps(): Promise<{
    hasGap: boolean;
    message?: string;
    gaps?: string[];
  }> {
    const priceLists = await PriceList.find().sort({ startDate: 1 });

    if (priceLists.length === 0) {
      return { hasGap: false };
    }

    const today = dayjs().tz(VIETNAM_TZ).startOf("day");
    const firstPriceList = priceLists[0];
    const lastPriceList = priceLists[priceLists.length - 1];
    const gaps: string[] = [];

    // Kiểm tra khoảng trống ở đầu (trước bảng giá đầu tiên)
    const firstStart = this.toVietnamStartOfDay(firstPriceList.startDate);
    if (firstStart.isAfter(today)) {
      const diffDays = firstStart.diff(today, "day");
      const todayStr = this.formatVietnamDate(today);
      const startStr = this.formatVietnamDate(firstStart);
      // Chỉ cảnh báo khi còn ít nhất 1 ngày trống
      if (diffDays > 0) {
        gaps.push(
          `Khoảng trống từ ${todayStr} đến ${startStr} (trước bảng giá "${firstPriceList.name}")`
        );
      }
    }

    // Kiểm tra khoảng trống giữa các bảng giá
    for (let i = 0; i < priceLists.length - 1; i++) {
      const current = priceLists[i];
      const next = priceLists[i + 1];

      const currentEndDate = this.toVietnamStartOfDay(current.endDate);
      const nextStartDate = this.toVietnamStartOfDay(next.startDate);

      // Tính ngày kế tiếp sau endDate (ngày hợp lệ tiếp theo)
      const dayAfterEndDate = currentEndDate.add(1, "day");

      // Nếu nextStartDate > dayAfterEndDate thì có khoảng trống
      // Ví dụ: endDate = 31/1, dayAfterEndDate = 1/2, nextStartDate = 1/2 => không có gap
      // Ví dụ: endDate = 31/1, dayAfterEndDate = 1/2, nextStartDate = 3/2 => có gap từ 1/2 đến 2/2
      if (nextStartDate.isAfter(dayAfterEndDate)) {
        const gapStartDate = dayAfterEndDate;
        const gapEndDate = nextStartDate.subtract(1, "day"); // Ngày trước startDate

        const gapStartStr = this.formatVietnamDate(gapStartDate);
        const gapEndStr = this.formatVietnamDate(gapEndDate);
        gaps.push(
          `Khoảng trống từ ${gapStartStr} đến ${gapEndStr} (giữa bảng giá "${current.name}" và "${next.name}")`
        );
      }
    }

    // Kiểm tra khoảng trống ở cuối (sau bảng giá cuối cùng)
    const lastEnd = this.toVietnamStartOfDay(lastPriceList.endDate);
    if (lastEnd.isBefore(today)) {
      const endStr = this.formatVietnamDate(lastEnd);
      const todayStr = this.formatVietnamDate(today);
      gaps.push(
        `Khoảng trống từ ${endStr} đến ${todayStr} (sau bảng giá "${lastPriceList.name}" đã hết hạn)`
      );
    }

    if (gaps.length > 0) {
      return {
        hasGap: true,
        message: `Phát hiện ${gaps.length} khoảng thời gian trống chưa có bảng giá. Xem chi tiết bên dưới để biết thời gian cụ thể.`,
        gaps: gaps,
      };
    }

    return { hasGap: false };
  }

  // Lấy danh sách sản phẩm/combo để tạo bảng giá
  async getProductsForPriceList(): Promise<{
    combos: any[];
    singleProducts: any[];
  }> {
    const combos = await FoodCombo.find({ type: "combo" }).select(
      "_id name price"
    );
    const singleProducts = await FoodCombo.find({ type: "single" }).select(
      "_id name price"
    );

    return { combos, singleProducts };
  }

  // Split version bảng giá
  async splitPriceListVersion(
    id: string,
    splitData: {
      newName: string;
      oldEndDate: Date;
      newStartDate: Date;
    }
  ): Promise<IPriceList> {
    const priceList = await PriceList.findById(id);
    if (!priceList) {
      throw new Error("Bảng giá không tồn tại");
    }

    if (priceList.status !== "active") {
      throw new Error("Chỉ có thể split version bảng giá đang hoạt động");
    }

    // Kiểm tra ngày hợp lệ
    if (splitData.oldEndDate >= splitData.newStartDate) {
      throw new Error(
        "Ngày kết thúc bảng giá cũ phải trước ngày bắt đầu bảng giá mới"
      );
    }

    // Lấy ngày hiện tại và reset về đầu ngày để so sánh chính xác
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oldEndDate = new Date(splitData.oldEndDate);
    oldEndDate.setHours(0, 0, 0, 0);

    if (oldEndDate < today) {
      throw new Error(
        `Ngày kết thúc bảng giá cũ (${oldEndDate.toLocaleDateString(
          "vi-VN"
        )}) không thể là ngày trong quá khứ. Ngày hiện tại là ${today.toLocaleDateString(
          "vi-VN"
        )}`
      );
    }

    // Kiểm tra ngày bắt đầu bảng giá mới không được trong quá khứ
    const newStartDate = new Date(splitData.newStartDate);
    newStartDate.setHours(0, 0, 0, 0);

    if (newStartDate < today) {
      throw new Error(
        `Ngày bắt đầu bảng giá mới (${newStartDate.toLocaleDateString(
          "vi-VN"
        )}) không thể là ngày trong quá khứ. Ngày hiện tại là ${today.toLocaleDateString(
          "vi-VN"
        )}`
      );
    }

    // Kiểm tra không có khoảng trống thời gian
    const timeDiff =
      splitData.newStartDate.getTime() - splitData.oldEndDate.getTime();
    if (timeDiff > 24 * 60 * 60 * 1000) {
      // Nếu khoảng cách > 1 ngày
      throw new Error(
        `Không được có khoảng trống thời gian giữa 2 bảng giá. Khoảng cách hiện tại là ${Math.ceil(
          timeDiff / (24 * 60 * 60 * 1000)
        )} ngày`
      );
    }

    // Sử dụng transaction để đảm bảo tính nhất quán
    const session = await PriceList.startSession();
    session.startTransaction();

    try {
      // 1. Cập nhật bảng giá cũ (kết thúc sớm)
      await PriceList.findByIdAndUpdate(
        id,
        { endDate: splitData.oldEndDate },
        { session }
      );

      // 2. Tạo bảng giá mới
      const newPriceList = new PriceList({
        name: splitData.newName,
        startDate: splitData.newStartDate,
        endDate: priceList.endDate, // Giữ nguyên ngày kết thúc ban đầu của bảng giá cũ
        lines: priceList.lines, // Copy toàn bộ lines
        status: "scheduled", // Mặc định là scheduled
      });

      // Kiểm tra validation cuối cùng
      if (newPriceList.startDate >= newPriceList.endDate) {
        throw new Error(
          `Ngày bắt đầu bảng giá mới (${newPriceList.startDate.toLocaleDateString(
            "vi-VN"
          )}) phải trước ngày kết thúc (${newPriceList.endDate.toLocaleDateString(
            "vi-VN"
          )})`
        );
      }

      await newPriceList.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return newPriceList;
    } catch (error) {
      // Rollback transaction nếu có lỗi
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PriceListService();
