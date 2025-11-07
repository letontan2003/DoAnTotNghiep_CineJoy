import { User } from "../models/User";
import Order from "../models/Order";

class PointsService {
  // Tự động cập nhật điểm cho tất cả order CONFIRMED
  async updatePointsForConfirmedOrders(): Promise<{
    processedOrders: number;
    totalPointsAdded: number;
    updatedUsers: string[];
  }> {
    try {

      // Tìm tất cả order có trạng thái CONFIRMED và chưa được xử lý điểm
      const confirmedOrders = await Order.find({
        orderStatus: 'CONFIRMED',
        $or: [
          { pointsProcessed: { $exists: false } }, // Chưa có field pointsProcessed
          { pointsProcessed: false }, // Hoặc pointsProcessed = false
          { pointsProcessed: null }   // Hoặc pointsProcessed = null
        ]
      }).populate({
        path: 'foodCombos.comboId',
        select: 'type name'
      });

      if (confirmedOrders.length === 0) {
        return {
          processedOrders: 0,
          totalPointsAdded: 0,
          updatedUsers: []
        };
      }

      console.log(`📊 Found ${confirmedOrders.length} confirmed orders to process`);
      
      // Log chi tiết các order để debug
      for (const order of confirmedOrders) {
        console.log(`📋 Order ${order._id}: ${order.seats?.length || 0} seats, ${order.foodCombos?.length || 0} combos`);
      }

      let totalPointsAdded = 0;
      const updatedUsers: string[] = [];

      for (const order of confirmedOrders) {
        try {
          // Tính số điểm cho order này
          let pointsToAdd = 0;
          let seatPoints = 0;
          let comboPoints = 0;

          // Cộng 5 điểm cho mỗi vé xem phim (seat)
          if (order.seats && order.seats.length > 0) {
            seatPoints = order.seats.length * 5;
            pointsToAdd += seatPoints;
            console.log(`  🎫 Seats: ${order.seats.length} x 5 = ${seatPoints} points`);
          }

          // Cộng 5 điểm cho mỗi combo (chỉ loại "combo", không phải "single")
          if (order.foodCombos && order.foodCombos.length > 0) {
            for (const combo of order.foodCombos) {
              // Kiểm tra type của combo - chỉ cộng điểm cho type "combo"
              const comboData = combo.comboId as any; // Cast để tránh lỗi TypeScript
              if (comboData && typeof comboData === 'object' && comboData.type === 'combo') {
                const comboPoint = combo.quantity * 5; // Cộng 5 điểm cho mỗi sản phẩm combo (nhân với quantity)
                comboPoints += comboPoint;
                pointsToAdd += comboPoint;
                console.log(`  🍿 Combo (${comboData.name}): ${combo.quantity} x 5 = ${comboPoint} points`);
              } else {
                console.log(`  🥤 Single item (${comboData?.name || 'Unknown'}): 0 points (type: ${comboData?.type || 'unknown'})`);
              }
            }
          }

          console.log(`  📊 Total points for order ${order._id}: ${pointsToAdd} (${seatPoints} seats + ${comboPoints} combos)`);

          if (pointsToAdd > 0) {
            // Cập nhật điểm cho user
            await User.findByIdAndUpdate(
              order.userId,
              { $inc: { point: pointsToAdd } }
            );

            totalPointsAdded += pointsToAdd;
            
            if (!updatedUsers.includes(order.userId.toString())) {
              updatedUsers.push(order.userId.toString());
            }

            console.log(`✅ Added ${pointsToAdd} points to user ${order.userId} for order ${order._id}`);
          }

          // Đánh dấu order đã được xử lý điểm
          // Đảm bảo unset expiresAt để tránh TTL index xóa orders CONFIRMED
          await Order.findByIdAndUpdate(
            order._id,
            {
              $set: { pointsProcessed: true },
              $unset: { expiresAt: "" } // Đảm bảo expiresAt không được set lại
            }
          );

        } catch (error) {
          console.error(`❌ Error processing order ${order._id}:`, error);
        }
      }

      console.log(`✅ Points processing completed: ${totalPointsAdded} points added to ${updatedUsers.length} users`);

      return {
        processedOrders: confirmedOrders.length,
        totalPointsAdded,
        updatedUsers
      };

    } catch (error) {
      console.error('❌ Error in updatePointsForConfirmedOrders:', error);
      throw error;
    }
  }

  // Lấy điểm hiện tại của user
  async getUserPoints(userId: string): Promise<number> {
    try {
      const user = await User.findById(userId).select('point');
      return user?.point || 0;
    } catch (error) {
      console.error('❌ Error getting user points:', error);
      throw error;
    }
  }

  // Cộng điểm cho một order cụ thể (gọi ngay khi thanh toán thành công)
  async updatePointsForSingleOrder(orderId: string): Promise<{
    success: boolean;
    pointsAdded: number;
    message: string;
  }> {
    try {
      console.log(`🎯 Processing points for single order: ${orderId}`);

      // Tìm order theo ID và populate comboId để lấy thông tin type
      const order = await Order.findById(orderId).populate({
        path: 'foodCombos.comboId',
        select: 'type name'
      });

      if (!order) {
        console.log(`❌ Order ${orderId} not found`);
        return {
          success: false,
          pointsAdded: 0,
          message: 'Order not found'
        };
      }

      // Kiểm tra order đã được xử lý điểm chưa
      if (order.pointsProcessed) {
        console.log(`ℹ️ Order ${orderId} already processed for points`);
        return {
          success: true,
          pointsAdded: 0,
          message: 'Order already processed'
        };
      }

      // Kiểm tra order status
      if (order.orderStatus !== 'CONFIRMED') {
        console.log(`❌ Order ${orderId} status is not CONFIRMED: ${order.orderStatus}`);
        return {
          success: false,
          pointsAdded: 0,
          message: `Order status is ${order.orderStatus}, not CONFIRMED`
        };
      }

      let pointsToAdd = 0;

      // Tính điểm cho vé (seats)
      if (order.seats && order.seats.length > 0) {
        pointsToAdd += order.seats.length * 5;
        console.log(`  📍 Seats: ${order.seats.length} x 5 = ${order.seats.length * 5} points`);
      }

      // Tính điểm cho combo (foodCombos) - chỉ cộng 5 điểm cho loại "combo", không phải "single"
      if (order.foodCombos && order.foodCombos.length > 0) {
        for (const combo of order.foodCombos) {
          // Kiểm tra type của combo - chỉ cộng điểm cho type "combo"
          const comboData = combo.comboId as any; // Cast để tránh lỗi TypeScript
          if (comboData && typeof comboData === 'object' && comboData.type === 'combo') {
            const comboPoints = combo.quantity * 5; // Cộng 5 điểm cho mỗi sản phẩm combo (nhân với quantity)
            pointsToAdd += comboPoints;
            console.log(`  🍿 Combo (${comboData.name}): ${combo.quantity} x 5 = ${comboPoints} points`);
          } else {
            console.log(`  🥤 Single item (${comboData?.name || 'Unknown'}): 0 points (type: ${comboData?.type || 'unknown'})`);
          }
        }
      }

      if (pointsToAdd > 0) {
        // Cộng điểm cho user
        await User.findByIdAndUpdate(
          order.userId,
          { $inc: { point: pointsToAdd } }
        );

        // Đánh dấu order đã được xử lý điểm
        // Đảm bảo unset expiresAt để tránh TTL index xóa orders CONFIRMED
        await Order.findByIdAndUpdate(
          orderId,
          {
            $set: { pointsProcessed: true },
            $unset: { expiresAt: "" } // Đảm bảo expiresAt không được set lại
          }
        );

        console.log(`✅ Added ${pointsToAdd} points to user ${order.userId} for order ${orderId}`);

        return {
          success: true,
          pointsAdded: pointsToAdd,
          message: `Successfully added ${pointsToAdd} points`
        };
      } else {
        console.log(`ℹ️ No points to add for order ${orderId}`);
        return {
          success: true,
          pointsAdded: 0,
          message: 'No points to add'
        };
      }

    } catch (error) {
      console.error(`❌ Error processing points for order ${orderId}:`, error);
      return {
        success: false,
        pointsAdded: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Chạy cập nhật điểm manual (để test)
  async runManualPointsUpdate(): Promise<any> {
    console.log('🔧 Running manual points update...');
    return await this.updatePointsForConfirmedOrders();
  }

  // Force TypeScript recompilation
  // Method updatePointsForSingleOrder is defined above
}

export default new PointsService();
