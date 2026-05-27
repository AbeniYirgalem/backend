import mongoose from "mongoose";
import { Route } from "../models/Route.js";

type SeedRoute = {
  name: string;
  fromLocation: string;
  toLocation: string;
  from: string;
  to: string;
  distance: number;
  estimatedTime: number;
  fare: number;
  coordinates: Array<{ lat: number; lng: number }>;
};

const routesData: SeedRoute[] = [
  {
    name: "Seed: Goro -> Megenagna",
    fromLocation: "Goro",
    toLocation: "Megenagna",
    from: "Goro",
    to: "Megenagna",
    distance: 12.5,
    estimatedTime: 35,
    fare: 25,
    coordinates: [
      { lat: 8.9921, lng: 38.8109 },
      { lat: 9.0015, lng: 38.8092 },
      { lat: 9.0126, lng: 38.8071 },
      { lat: 9.0206, lng: 38.7998 },
    ],
  },
  {
    name: "Seed: Piassa -> Bole",
    fromLocation: "Piassa",
    toLocation: "Bole",
    from: "Piassa",
    to: "Bole",
    distance: 10.2,
    estimatedTime: 28,
    fare: 22,
    coordinates: [
      { lat: 9.0346, lng: 38.7467 },
      { lat: 9.0188, lng: 38.7601 },
      { lat: 9.0054, lng: 38.7789 },
      { lat: 8.9973, lng: 38.7888 },
    ],
  },
  {
    name: "Seed: Kality -> Mexico",
    fromLocation: "Kality",
    toLocation: "Mexico",
    from: "Kality",
    to: "Mexico",
    distance: 15.8,
    estimatedTime: 45,
    fare: 30,
    coordinates: [
      { lat: 8.9149, lng: 38.7805 },
      { lat: 8.9412, lng: 38.7694 },
      { lat: 8.9685, lng: 38.7605 },
      { lat: 8.9972, lng: 38.7469 },
    ],
  },
  {
    name: "Seed: Ayat -> Merkato",
    fromLocation: "Ayat",
    toLocation: "Merkato",
    from: "Ayat",
    to: "Merkato",
    distance: 18.4,
    estimatedTime: 55,
    fare: 35,
    coordinates: [
      { lat: 9.0417, lng: 38.8356 },
      { lat: 9.0294, lng: 38.8124 },
      { lat: 9.0152, lng: 38.7841 },
      { lat: 9.0332, lng: 38.7388 },
    ],
  },
  {
    name: "Seed: Sarbet -> CMC",
    fromLocation: "Sarbet",
    toLocation: "CMC",
    from: "Sarbet",
    to: "CMC",
    distance: 9.4,
    estimatedTime: 25,
    fare: 18,
    coordinates: [
      { lat: 9.0028, lng: 38.7347 },
      { lat: 9.0102, lng: 38.7585 },
      { lat: 9.0191, lng: 38.7823 },
      { lat: 9.0269, lng: 38.8038 },
    ],
  },
];

async function seedRoutes() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to seed routes");
  }

  const shouldClear = process.env.SEED_CLEAR_ROUTES !== "false";

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  if (shouldClear) {
    await Route.deleteMany({});
  }

  await Route.insertMany(routesData);

  await mongoose.disconnect();
}

seedRoutes()
  .then(() => {
    console.log("Seed routes completed");
  })
  .catch((error) => {
    console.error("Seed routes failed", error);
    process.exitCode = 1;
  });
