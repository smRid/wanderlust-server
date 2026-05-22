const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const uri = process.env.MONGO_DB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

if (!uri) {
  console.error("Missing required environment variable: MONGO_DB_URI");
  console.error("Create a .env file from .env.example and add your MongoDB URI.");
  process.exit(1);
}

if (!process.env.CLIENT_URL) {
  console.error("Missing required environment variable: CLIENT_URL");
  console.error("Create a .env file from .env.example and add your client URL.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = async (req, res, next) => {
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  const authHeader = req.headers.authorization;
  if (!authHeader) {
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
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

const verifyAdminJWT = async (req, res, next) => {
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  const authHeader = req.headers.authorization;
  if (!authHeader) {
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
    } else {
      next();
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

async function run() {
  try {
    const database = client.db("wanderlast");
    const destinationsCollection = database.collection("destinations");
    const bookingsCollection = database.collection("bookings");

    // Create a new destination
    app.post("/destinations", verifyAdminJWT, async (req, res) => {
      const destination = req.body;
      const result = await destinationsCollection.insertOne(destination);
      res.json({
        success: true,
        message: "Destination added successfully",
        id: result.insertedId,
      });
    });

    // Get all destinations
    app.get("/destinations", async (req, res) => {
      const destinations = await destinationsCollection.find().toArray();
      res.json(destinations);
    });

    // Get a destination by ID
    app.get("/destinations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const destination = await destinationsCollection.findOne(query);
      res.json(destination);
    });

    // Update a destination by ID
    app.patch("/destinations/:id", verifyAdminJWT, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await destinationsCollection.updateOne(query, updateDoc);
      res.json({
        success: true,
        message: "Destination updated successfully",
        modifiedCount: result.modifiedCount,
      });
    });

    // Delete a destination by ID
    app.delete("/destinations/:id", verifyAdminJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await destinationsCollection.deleteOne(query);
      res.json({
        success: true,
        message: "Destination deleted successfully",
        deletedCount: result.deletedCount,
      });
    });

    // Create a new booking
    app.post("/bookings", verifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.json({
        success: true,
        message: "Booking added successfully",
        id: result.insertedId,
      });
    });

    // Get bookings by user ID
    app.get("/bookings/:userId", verifyJWT, async (req, res) => {
      const userId = req.params.userId;

      if (req.user.sub !== userId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      const result = await bookingsCollection.find({ userId }).toArray();
      res.json(result);
    });

    // Delete a booking by ID
    app.delete("/bookings/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const booking = await bookingsCollection.findOne(query);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (booking.userId !== req.user.sub) {
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
    });

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
