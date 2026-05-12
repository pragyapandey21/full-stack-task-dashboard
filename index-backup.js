const express = require('express');
const cors = require('cors');
const connectDB = require("./config/db");
const Task = require("./models/Task");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "No token, access denied" });
  }

  try {
    const actualToken = token.replace("Bearer ", "");

    const decoded = jwt.verify(actualToken, "mysecretkey");

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}

const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Hello Pragya 🚀');
});

app.get("/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({
        userId: req.user.id
    });
  res.json(tasks);
});

console.log("CORS BACKEND FILE IS RUNNING");

app.post("/tasks", authMiddleware, async (req, res) => {
  try {
    console.log("Received from frontend:", req.body);

    const newTask = await Task.create({
    ...req.body,
    userId: req.user.id
});

    console.log("Saved in MongoDB:", newTask);

    res.json({
      message: "Task saved successfully",
      task: newTask,
    });
  } catch (error) {
    console.log("POST Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;

    await Task.findByIdAndDelete(taskId);

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.log("DELETE Error:", error.message);

    res.status(500).json({
      error: error.message,
    });
  }
});
app.put("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.log("PUT Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check empty fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id },
      "mysecretkey",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});