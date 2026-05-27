import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  createTransportNotification,
  getAdminOverview,
  getArrivalPrediction,
  getAvailability,
  getCongestionMap,
  getFaultAnalytics,
  getPassengerFlowAnalytics,
  getRouteSuggestions,
  getStationQueue,
  getSuggestedSolutions,
  getVehicleLocations,
  listFaults,
  listNotifications,
  runFaultMonitoring,
  seedTransportData,
} from "../services/intelligence-service.js";

export const queue = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(
    res,
    200,
    "Queue status",
    getStationQueue(req.query.station as string | undefined),
  );
});

export const eta = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(
    res,
    200,
    "Taxi arrival prediction",
    getArrivalPrediction(req.query.routeId as string | undefined),
  );
});

export const availability = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getAvailability(req.query.station as string | undefined);
    sendResponse(res, 200, "Transport availability", data);
  },
);

export const congestion = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getCongestionMap();
  sendResponse(res, 200, "Congestion map", data);
});

export const routes = asyncHandler(async (req: Request, res: Response) => {
  const data = await getRouteSuggestions({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  sendResponse(res, 200, "Route suggestions", data);
});

export const vehicles = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getVehicleLocations();
  sendResponse(res, 200, "Vehicle locations", data);
});

export const monitorFaults = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await runFaultMonitoring();
    sendResponse(res, 200, "Fault monitoring completed", data);
  },
);

export const faults = asyncHandler(async (req: Request, res: Response) => {
  const data = await listFaults({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 10),
    category: req.query.category as string | undefined,
    severity: req.query.severity as string | undefined,
    status: req.query.status as string | undefined,
  });
  sendResponse(res, 200, "Faults", data);
});

export const faultAnalytics = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getFaultAnalytics();
    sendResponse(res, 200, "Fault analytics", data);
  },
);

export const solutions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getSuggestedSolutions();
  sendResponse(res, 200, "Suggested solutions", data);
});

export const passengerFlow = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getPassengerFlowAnalytics();
    sendResponse(res, 200, "Passenger flow analytics", data);
  },
);

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getAdminOverview();
  sendResponse(res, 200, "Admin overview", data);
});

export const notifications = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await listNotifications((req.query.audience as string) || "all");
    sendResponse(res, 200, "Notifications", data);
  },
);

export const createNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const notification = await createTransportNotification(req.body);
    const io = req.app.get("io");
    if (io) {
      io.emit("transport:notification", notification);
    }
    sendResponse(res, 201, "Notification created", notification);
  },
);

export const seed = asyncHandler(async (_req: Request, res: Response) => {
  const data = await seedTransportData();
  sendResponse(res, 201, "Sample transport data ready", data);
});
