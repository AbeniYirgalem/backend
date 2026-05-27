import {
  getArrivalPrediction,
  getStationQueue,
} from "./intelligence-service.js";

export function getQueueStatus(station: string) {
  return getStationQueue(station);
}

export function getEtaPrediction(routeId: string) {
  return getArrivalPrediction(routeId);
}
