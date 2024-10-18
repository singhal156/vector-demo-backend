const express = require("express");
const http = require("http");
const { createClient } = require("@deepgram/sdk");
const Cobra = require("@picovoice/cobra-node");
require("dotenv").config();
const cors = require('cors');
const { Server } = require("socket.io"); // Import Socket.IO

// Define allowed origins (your Vercel frontend URL)
const allowedOrigins = ['https://vector-demo-cuma7k93v-singhal156s-projects.vercel.app'];

const PORT = process.env.PORT || 3000;

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Initialize Socket.IO

// Enable CORS
app.use(cors({
    origin: function (origin, callback) {
        console.log('Origin:', origin); // Log the origin
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// Endpoint to receive persona settings from the frontend
app.post("/api/persona", (req, res) => {
    const { persona } = req.body; // Get the persona from the request
    console.log(`Persona set to: ${persona}`);
    res.sendStatus(200);
});

// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("Client connected");

    // Initialize Picovoice Cobra for VAD
    const cobra = new Cobra(process.env.PICOVOICE_ACCESS_KEY);

    // Function to handle incoming audio data
    socket.on("user_message", async (message) => {
        const audioData = message; // Assuming message is the audio data

        // Use Cobra for VAD
        const isSpeech = await cobra.process(audioData);
        if (isSpeech) {
            console.log("Detected speech, processing...");
            const response = await deepgramClient.transcription.preRecorded(
                { buffer: audioData, mimetype: "audio/wav" },
                { punctuate: true }
            );

            const transcript = response?.channel?.alternatives[0]?.transcript;
            console.log(`Transcribed text: ${transcript}`);

            // Here you would call OpenAI's API with the transcribed text and the persona
            // Implement OpenAI LLM call here (not shown in this code)

            // Send the response back to the client
            socket.emit("message", `Assistant response based on persona: ${transcript}`);
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

