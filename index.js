const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGO_DB_URI;
const app = express();
const PORT = process.env.PORT;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("wanderlast");
    const destinationsCollection = database.collection("destinations");
    const bookingsCollection = database.collection("bookings");

    // Create a new destination
    app.post("/destinations", async (req, res) => {
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
    app.patch("/destinations/:id", async (req, res) => {
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
    app.delete("/destinations/:id", async (req, res) => {
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
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.json({
        success: true,
        message: "Booking added successfully",
        id: result.insertedId,
      });
    });

    // Get bookings by user ID
    app.get("/bookings/:userId", async (req, res) => {
      const userId = req.params.userId;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.json(result);
    });

    // Delete a booking by ID
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.json({
        success: true,
        message: "Booking deleted successfully",
        deletedCount: result.deletedCount,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
