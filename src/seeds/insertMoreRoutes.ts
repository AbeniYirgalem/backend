import "dotenv/config";
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
};

const moreRoutes: SeedRoute[] = [
  {
    name: "Bole → Sarbet",
    fromLocation: "Bole",
    toLocation: "Sarbet",
    from: "Bole",
    to: "Sarbet",
    distance: 9,
    estimatedTime: 22,
    fare: 20,
  },
  {
    name: "Sarbet → Piassa",
    fromLocation: "Sarbet",
    toLocation: "Piassa",
    from: "Sarbet",
    to: "Piassa",
    distance: 7,
    estimatedTime: 18,
    fare: 18,
  },
  {
    name: "Piassa → Mexico",
    fromLocation: "Piassa",
    toLocation: "Mexico",
    from: "Piassa",
    to: "Mexico",
    distance: 5,
    estimatedTime: 12,
    fare: 12,
  },
  {
    name: "Mexico → Bole",
    fromLocation: "Mexico",
    toLocation: "Bole",
    from: "Mexico",
    to: "Bole",
    distance: 8,
    estimatedTime: 20,
    fare: 18,
  },
  {
    name: "Bole → Ayat",
    fromLocation: "Bole",
    toLocation: "Ayat",
    from: "Bole",
    to: "Ayat",
    distance: 11,
    estimatedTime: 28,
    fare: 22,
  },

  {
    name: "Ayat → Piassa",
    fromLocation: "Ayat",
    toLocation: "Piassa",
    from: "Ayat",
    to: "Piassa",
    distance: 15,
    estimatedTime: 38,
    fare: 30,
  },
  {
    name: "Piassa → Summit",
    fromLocation: "Piassa",
    toLocation: "Summit",
    from: "Piassa",
    to: "Summit",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Summit → Mexico",
    fromLocation: "Summit",
    toLocation: "Mexico",
    from: "Summit",
    to: "Mexico",
    distance: 10,
    estimatedTime: 25,
    fare: 20,
  },
  {
    name: "Mexico → CMC",
    fromLocation: "Mexico",
    toLocation: "CMC",
    from: "Mexico",
    to: "CMC",
    distance: 12,
    estimatedTime: 30,
    fare: 25,
  },
  {
    name: "CMC → Merkato",
    fromLocation: "CMC",
    toLocation: "Merkato",
    from: "CMC",
    to: "Merkato",
    distance: 14,
    estimatedTime: 35,
    fare: 30,
  },

  {
    name: "Merkato → Sarbet",
    fromLocation: "Merkato",
    toLocation: "Sarbet",
    from: "Merkato",
    to: "Sarbet",
    distance: 6,
    estimatedTime: 15,
    fare: 15,
  },
  {
    name: "Sarbet → Goro",
    fromLocation: "Sarbet",
    toLocation: "Goro",
    from: "Sarbet",
    to: "Goro",
    distance: 10,
    estimatedTime: 25,
    fare: 22,
  },
  {
    name: "Goro → Mexico",
    fromLocation: "Goro",
    toLocation: "Mexico",
    from: "Goro",
    to: "Mexico",
    distance: 9,
    estimatedTime: 22,
    fare: 20,
  },
  {
    name: "Mexico → Ayat",
    fromLocation: "Mexico",
    toLocation: "Ayat",
    from: "Mexico",
    to: "Ayat",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Ayat → Kality",
    fromLocation: "Ayat",
    toLocation: "Kality",
    from: "Ayat",
    to: "Kality",
    distance: 14,
    estimatedTime: 35,
    fare: 30,
  },

  {
    name: "Kality → Piassa",
    fromLocation: "Kality",
    toLocation: "Piassa",
    from: "Kality",
    to: "Piassa",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Piassa → Akaki",
    fromLocation: "Piassa",
    toLocation: "Akaki",
    from: "Piassa",
    to: "Akaki",
    distance: 16,
    estimatedTime: 40,
    fare: 35,
  },
  {
    name: "Akaki → Bole",
    fromLocation: "Akaki",
    toLocation: "Bole",
    from: "Akaki",
    to: "Bole",
    distance: 15,
    estimatedTime: 38,
    fare: 30,
  },
  {
    name: "Bole → Gofa",
    fromLocation: "Bole",
    toLocation: "Gofa",
    from: "Bole",
    to: "Gofa",
    distance: 12,
    estimatedTime: 30,
    fare: 25,
  },
  {
    name: "Gofa → Mexico",
    fromLocation: "Gofa",
    toLocation: "Mexico",
    from: "Gofa",
    to: "Mexico",
    distance: 10,
    estimatedTime: 25,
    fare: 20,
  },

  {
    name: "Mexico → Lafto",
    fromLocation: "Mexico",
    toLocation: "Lafto",
    from: "Mexico",
    to: "Lafto",
    distance: 7,
    estimatedTime: 18,
    fare: 18,
  },
  {
    name: "Lafto → Piassa",
    fromLocation: "Lafto",
    toLocation: "Piassa",
    from: "Lafto",
    to: "Piassa",
    distance: 9,
    estimatedTime: 22,
    fare: 20,
  },
  {
    name: "Piassa → Lebu",
    fromLocation: "Piassa",
    toLocation: "Lebu",
    from: "Piassa",
    to: "Lebu",
    distance: 14,
    estimatedTime: 35,
    fare: 30,
  },
  {
    name: "Lebu → Bole",
    fromLocation: "Lebu",
    toLocation: "Bole",
    from: "Lebu",
    to: "Bole",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Bole → Torhailoch",
    fromLocation: "Bole",
    toLocation: "Torhailoch",
    from: "Bole",
    to: "Torhailoch",
    distance: 8,
    estimatedTime: 20,
    fare: 18,
  },

  {
    name: "Torhailoch → Merkato",
    fromLocation: "Torhailoch",
    toLocation: "Merkato",
    from: "Torhailoch",
    to: "Merkato",
    distance: 6,
    estimatedTime: 15,
    fare: 15,
  },
  {
    name: "Merkato → Gofa",
    fromLocation: "Merkato",
    toLocation: "Gofa",
    from: "Merkato",
    to: "Gofa",
    distance: 11,
    estimatedTime: 28,
    fare: 22,
  },
  {
    name: "Gofa → CMC",
    fromLocation: "Gofa",
    toLocation: "CMC",
    from: "Gofa",
    to: "CMC",
    distance: 15,
    estimatedTime: 38,
    fare: 30,
  },
  {
    name: "CMC → Sarbet",
    fromLocation: "CMC",
    toLocation: "Sarbet",
    from: "CMC",
    to: "Sarbet",
    distance: 10,
    estimatedTime: 25,
    fare: 22,
  },
  {
    name: "Sarbet → Summit",
    fromLocation: "Sarbet",
    toLocation: "Summit",
    from: "Sarbet",
    to: "Summit",
    distance: 12,
    estimatedTime: 30,
    fare: 25,
  },

  {
    name: "Summit → Akaki",
    fromLocation: "Summit",
    toLocation: "Akaki",
    from: "Summit",
    to: "Akaki",
    distance: 14,
    estimatedTime: 35,
    fare: 30,
  },
  {
    name: "Akaki → Ayat",
    fromLocation: "Akaki",
    toLocation: "Ayat",
    from: "Akaki",
    to: "Ayat",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Ayat → Sarbet",
    fromLocation: "Ayat",
    toLocation: "Sarbet",
    from: "Ayat",
    to: "Sarbet",
    distance: 12,
    estimatedTime: 30,
    fare: 25,
  },
  {
    name: "Sarbet → Lebu",
    fromLocation: "Sarbet",
    toLocation: "Lebu",
    from: "Sarbet",
    to: "Lebu",
    distance: 10,
    estimatedTime: 25,
    fare: 22,
  },
  {
    name: "Lebu → Mexico",
    fromLocation: "Lebu",
    toLocation: "Mexico",
    from: "Lebu",
    to: "Mexico",
    distance: 9,
    estimatedTime: 22,
    fare: 20,
  },

  {
    name: "Mexico → Piassa",
    fromLocation: "Mexico",
    toLocation: "Piassa",
    from: "Mexico",
    to: "Piassa",
    distance: 5,
    estimatedTime: 12,
    fare: 12,
  },
  {
    name: "Piassa → Bole",
    fromLocation: "Piassa",
    toLocation: "Bole",
    from: "Piassa",
    to: "Bole",
    distance: 12,
    estimatedTime: 30,
    fare: 25,
  },
  {
    name: "Bole → CMC",
    fromLocation: "Bole",
    toLocation: "CMC",
    from: "Bole",
    to: "CMC",
    distance: 9,
    estimatedTime: 22,
    fare: 20,
  },
  {
    name: "CMC → Goro",
    fromLocation: "CMC",
    toLocation: "Goro",
    from: "CMC",
    to: "Goro",
    distance: 11,
    estimatedTime: 28,
    fare: 22,
  },
  {
    name: "Goro → Piassa",
    fromLocation: "Goro",
    toLocation: "Piassa",
    from: "Goro",
    to: "Piassa",
    distance: 11,
    estimatedTime: 28,
    fare: 22,
  },

  {
    name: "Piassa → Ayat",
    fromLocation: "Piassa",
    toLocation: "Ayat",
    from: "Piassa",
    to: "Ayat",
    distance: 15,
    estimatedTime: 38,
    fare: 30,
  },
  {
    name: "Ayat → Mexico",
    fromLocation: "Ayat",
    toLocation: "Mexico",
    from: "Ayat",
    to: "Mexico",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
  {
    name: "Mexico → Summit",
    fromLocation: "Mexico",
    toLocation: "Summit",
    from: "Mexico",
    to: "Summit",
    distance: 10,
    estimatedTime: 25,
    fare: 20,
  },
  {
    name: "Summit → Bole",
    fromLocation: "Summit",
    toLocation: "Bole",
    from: "Summit",
    to: "Bole",
    distance: 8,
    estimatedTime: 20,
    fare: 18,
  },
  {
    name: "Bole → Merkato",
    fromLocation: "Bole",
    toLocation: "Merkato",
    from: "Bole",
    to: "Merkato",
    distance: 11,
    estimatedTime: 28,
    fare: 22,
  },

  {
    name: "Merkato → Akaki",
    fromLocation: "Merkato",
    toLocation: "Akaki",
    from: "Merkato",
    to: "Akaki",
    distance: 17,
    estimatedTime: 45,
    fare: 40,
  },
  {
    name: "Akaki → Sarbet",
    fromLocation: "Akaki",
    toLocation: "Sarbet",
    from: "Akaki",
    to: "Sarbet",
    distance: 14,
    estimatedTime: 35,
    fare: 30,
  },
  {
    name: "Sarbet → CMC",
    fromLocation: "Sarbet",
    toLocation: "CMC",
    from: "Sarbet",
    to: "CMC",
    distance: 10,
    estimatedTime: 25,
    fare: 22,
  },
  {
    name: "CMC → Piassa",
    fromLocation: "CMC",
    toLocation: "Piassa",
    from: "CMC",
    to: "Piassa",
    distance: 13,
    estimatedTime: 32,
    fare: 28,
  },
];

async function insertMoreRoutes() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to insert routes");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    const names = moreRoutes.map((route) => route.name);
    const existing = await Route.find({ name: { $in: names } })
      .select({ name: 1 })
      .lean();
    const existingNames = new Set(existing.map((route) => route.name));
    const newRoutes = moreRoutes.filter(
      (route) => !existingNames.has(route.name),
    );

    if (newRoutes.length === 0) {
      console.log("✅ No new routes to insert");
      return;
    }

    await Route.insertMany(newRoutes, { ordered: false });
    console.log("✅ Additional routes inserted successfully");
  } finally {
    await mongoose.connection.close();
  }
}

insertMoreRoutes().catch((error) => {
  console.error("❌ Error inserting routes:", error);
  process.exitCode = 1;
});
