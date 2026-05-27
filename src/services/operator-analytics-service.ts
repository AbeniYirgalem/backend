import { ActivityLog } from "../models/ActivityLog.js";
import { Transaction } from "../models/Transaction.js";
import { TripBooking } from "../models/TripBooking.js";

export async function getOperatorOverview() {
  const activeWindowMinutes = 15;
  const since = new Date(Date.now() - activeWindowMinutes * 60 * 1000);

  const activeUsersResult = await ActivityLog.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: "$userId" } },
    { $count: "count" },
  ]);

  const fareRevenueResult = await Transaction.aggregate([
    { $match: { type: "fare", status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const telebirrRevenueResult = await TripBooking.aggregate([
    {
      $match: {
        paymentMethod: "telebirr",
        status: { $nin: ["cancelled", "refunded"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$fare" } } },
  ]);

  const activeUsers = activeUsersResult[0]?.count ?? 0;
  const fareRevenue = fareRevenueResult[0]?.total ?? 0;
  const telebirrRevenue = telebirrRevenueResult[0]?.total ?? 0;

  return {
    activeUsers,
    totalRevenue: fareRevenue + telebirrRevenue,
    activeWindowMinutes,
  };
}
