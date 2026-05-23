const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const uri = process.env.MONGODB_URI || process.env.MONGO_DB_URI;
const clientUrl = (
  process.env.CLIENT_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL
)?.replace(/\/$/, "");
const databaseName = process.env.MONGODB_DB || "wanderlast";
const app = express();
const PORT = process.env.PORT || 5000;

if (!uri) {
  console.error("Missing required environment variable: MONGODB_URI");
  console.error("Create a .env file from .env.example and add your MongoDB URI.");
  process.exit(1);
}

if (!clientUrl) {
  console.error(
    "Missing required environment variable: CLIENT_URL, BETTER_AUTH_URL, or NEXT_PUBLIC_APP_URL",
  );
  console.error("Add your client URL so the server can verify auth tokens.");
  process.exit(1);
}

const allowedOrigins = new Set([
  clientUrl,
  "http://localhost:3000",
  "http://localhost:3001",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const jwksUrl = new URL(`${clientUrl}/api/auth/jwks`);
const JWKS = createRemoteJWKSet(jwksUrl);

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getObjectId = (id) => {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
};

const getJwtUserId = (payload) => payload?.sub || payload?.id || payload?.userId;

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

const verifyAdminJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    if (payload.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      });
    }

    next();
  } catch (error) {
    console.error("Admin JWT verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

async function run() {
  try {
    const database = client.db(databaseName);
    const destinationsCollection = database.collection("destinations");
    const bookingsCollection = database.collection("bookings");

    // Create a new destination
    app.post("/destinations", verifyAdminJWT, asyncHandler(async (req, res) => {
      const destination = req.body;
      const result = await destinationsCollection.insertOne(destination);
      res.json({
        success: true,
        message: "Destination added successfully",
        id: result.insertedId,
      });
    }));

    // Get all destinations
    app.get("/destinations", asyncHandler(async (req, res) => {
      const destinations = await destinationsCollection.find().toArray();
      res.json(destinations);
    }));

    // Get a destination by ID
    app.get("/destinations/:id", asyncHandler(async (req, res) => {
      const id = req.params.id;
      const objectId = getObjectId(id);

      if (!objectId) {
        return res.status(404).json({
          success: false,
          message: "Destination not found",
        });
      }

      const query = { _id: objectId };
      const destination = await destinationsCollection.findOne(query);

      if (!destination) {
        return res.status(404).json({
          success: false,
          message: "Destination not found",
        });
      }

      res.json(destination);
    }));

    // Update a destination by ID
    app.patch("/destinations/:id", verifyAdminJWT, asyncHandler(async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const objectId = getObjectId(id);

      if (!objectId) {
        return res.status(400).json({
          success: false,
          message: "Invalid destination ID",
        });
      }

      const query = { _id: objectId };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await destinationsCollection.updateOne(query, updateDoc);
      res.json({
        success: true,
        message: "Destination updated successfully",
        modifiedCount: result.modifiedCount,
      });
    }));

    // Delete a destination by ID
    app.delete("/destinations/:id", verifyAdminJWT, asyncHandler(async (req, res) => {
      const id = req.params.id;
      const objectId = getObjectId(id);

      if (!objectId) {
        return res.status(400).json({
          success: false,
          message: "Invalid destination ID",
        });
      }

      const query = { _id: objectId };
      const result = await destinationsCollection.deleteOne(query);
      res.json({
        success: true,
        message: "Destination deleted successfully",
        deletedCount: result.deletedCount,
      });
    }));

    // Create a new booking
    app.post("/bookings", verifyJWT, asyncHandler(async (req, res) => {
      const booking = req.body;
      const userId = getJwtUserId(req.user);

      if (!userId || booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.json({
        success: true,
        message: "Booking added successfully",
        id: result.insertedId,
      });
    }));

    // Get bookings by user ID
    app.get("/bookings/:userId", verifyJWT, asyncHandler(async (req, res) => {
      const userId = req.params.userId;

      if (getJwtUserId(req.user) !== userId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const result = await bookingsCollection.find({ userId }).toArray();
      res.json(result);
    }));

    // Delete a booking by ID
    app.delete("/bookings/:id", verifyJWT, asyncHandler(async (req, res) => {
      const id = req.params.id;
      const objectId = getObjectId(id);

      if (!objectId) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID",
        });
      }

      const query = { _id: objectId };

      const booking = await bookingsCollection.findOne(query);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (booking.userId !== getJwtUserId(req.user)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own bookings",
        });
      }

      const result = await bookingsCollection.deleteOne(query);
      res.json({
        success: true,
        message: "Booking deleted successfully",
        deletedCount: result.deletedCount,
      });
    }));

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
