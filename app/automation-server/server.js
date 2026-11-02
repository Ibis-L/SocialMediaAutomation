const express = require('express');
const app = express();
app.use(express.json());

// In-memory queue of message tasks
let taskQueue = [
    { taskId: "101", phoneNumber: "919257803775", message: "Automated task #1 from REST API server!" },
    { taskId: "102", phoneNumber: "919876543210", message: "Automated task #2 from REST API server!" }
];

// Endpoint polled by the Android phone
app.get('/api/get-task', (req, res) => {
    if (taskQueue.length > 0) {
        const nextTask = taskQueue.shift(); // Get and remove next task
        console.log(`[Server] Serving task ${nextTask.taskId} to phone.`);
        return res.json({
            hasTask: true,
            taskId: nextTask.taskId,
            phoneNumber: nextTask.phoneNumber,
            message: nextTask.message
        });
    }

    return res.json({ hasTask: false });
});

app.listen(3000, '0.0.0.0', () => {
    console.log("REST API Server running on port 3000...");
});
