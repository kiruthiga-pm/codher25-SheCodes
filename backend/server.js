const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/auth-db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ✅ Updated schema to include email and password
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  // ✅ Add this
});

const User = mongoose.model("User", userSchema);

// ✅ /user endpoint
// Use the correct DB connection
const carbonFootprintConnection = mongoose.createConnection(
  "mongodb://localhost:27017/carbon_footprint_db",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Flexible schema to support dynamic fields
const carbonUserSchema = new mongoose.Schema({}, { strict: false });
const CarbonUser = carbonFootprintConnection.model(
  "User",
  carbonUserSchema,
  "users"
);

// ✅ Updated /user route to fetch the latest record for a username

app.post("/user", async (req, res) => {
  const { username } = req.body;
  console.log("Fetching ALL records for:", username);

  try {
    const userRecords = await CarbonUser.find({ username })
      .sort({ _id: -1 })
      .lean();

    if (userRecords.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No records found for this user" });
    }

    // Clean records by dropping _id, username, and user_data.Sex
    const cleanedRecords = userRecords.map((record) => {
      const { _id, username, ...rest } = record;

      // If record has a `user_data` field, remove `Sex` from it
      if (rest.user_data && typeof rest.user_data === "object") {
        const { Sex, ...cleanedUserData } = rest.user_data;
        return {
          ...rest,
          user_data: {
            ...cleanedUserData,
            month: record.month,
            year: record.year,
          },
        };
      }

      // If flat structure, remove Sex from top-level
      const { Sex, ...cleanedFlat } = rest;
      return cleanedFlat;
    });
    console.log("Fetching ALL records for:", cleanedRecords);

    res.json({ success: true, data: cleanedRecords });
  } catch (err) {
    console.error("Error fetching records:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Login route - direct password comparison
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && user.password === password) {
      res.json({ success: true, username: user.username }); // 👈 Return username
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Registration route - plain password (NO bcrypt)
app.post("/register", async (req, res) => {
  const { email, username, password } = req.body; // ✅ Get username

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const newUser = new User({ email, username, password }); // ✅ Store username
    await newUser.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
