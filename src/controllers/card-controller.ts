import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  getCardById,
  rechargeCard,
  registerCard,
  tapCard,
} from "../services/card-service.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const card = await registerCard({
    userId: req.user!.id,
    cardUid: req.body.cardUid,
    initialBalance: req.body.initialBalance,
  });
  sendResponse(res, 201, "Card registered", card);
});

export const recharge = asyncHandler(async (req: Request, res: Response) => {
  const result = await rechargeCard({
    userId: req.user!.id,
    cardUid: req.body.cardUid,
    amount: req.body.amount,
  });
  sendResponse(res, 200, "Card recharged", result);
});

export const tap = asyncHandler(async (req: Request, res: Response) => {
  const result = await tapCard({
    userId: req.user!.id,
    cardUid: req.body.cardUid,
    fare: req.body.fare,
    routeId: req.body.routeId,
    originStopId: req.body.originStopId,
    destinationStopId: req.body.destinationStopId,
  });
  sendResponse(res, 200, "Fare deducted", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const card = await getCardById(req.params.id, req.user!.id);
  sendResponse(res, 200, "Card", card);
});
