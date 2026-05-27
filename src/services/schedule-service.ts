import { Schedule } from "../models/Schedule.js";

export async function createSchedule(payload: {
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
}) {
  return Schedule.create({
    ...payload,
    departureTime: new Date(payload.departureTime),
    arrivalTime: new Date(payload.arrivalTime),
  });
}

export async function getSchedules() {
  return Schedule.find().populate("busId routeId").lean();
}

export async function searchSchedules(payload: {
  from: string;
  to: string;
  date: string;
}) {
  return Schedule.find()
    .populate({
      path: "routeId",
      match: { from: payload.from, to: payload.to },
    })
    .lean();
}
