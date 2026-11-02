const express = require('express');
const path = require('path');
const app = express();

// Allow cross-origin requests from the Next.js dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Middleware to parse JSON and serve the frontend folder
app.use(express.json());
app.use(express.static('public'));

let taskQueue = [];

// 1. API for your Web Dashboard to add bulk tasks
app.post('/api/add-tasks', (req, res) => {
    const { tasks } = req.body; 
    
    if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Invalid tasks format" });
    }
    
    // Add all pasted tasks to our queue
    tasks.forEach(task => {
        taskQueue.push({
            taskId: Date.now().toString() + Math.floor(Math.random() * 1000),
            phoneNumber: task.phone.trim(),
            message: task.message.trim()
        });
    });

    console.log(`Added ${tasks.length} new tasks. Total in queue: ${taskQueue.length}`);
    res.json({ success: true, queued: taskQueue.length });
});

// 2. API for your Android Phone to poll every 30 seconds
app.get('/api/get-task', (req, res) => {
    if (taskQueue.length > 0) {
        const nextTask = taskQueue.shift(); // Pull the first task from the line
        console.log(`Sending task to phone: ${nextTask.phoneNumber}`);
        
        return res.json({
            hasTask: true,
            taskId: nextTask.taskId,
            phoneNumber: nextTask.phoneNumber,
            message: nextTask.message
        });
    }
    
    // If queue is empty, tell the phone to keep waiting
    return res.json({ hasTask: false });
});

// Endpoint to view all active tasks in queue
app.get('/api/get-queue-status', (req, res) => {
    res.json({
        totalInQueue: taskQueue.length,
        tasks: taskQueue
    });
});

// 3. Start the server (Render sets the process.env.PORT automatically)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WhatsApp Bot Backend running on port ${PORT}`);
});