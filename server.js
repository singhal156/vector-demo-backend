// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { createClient } = require("@deepgram/sdk");
const Cobra = require("@picovoice/cobra-node");
require("dotenv").config();

const cors = require('cors');

// Define allowed origins (your Vercel frontend URL)
const allowedOrigins = ['https://vector-demo-cuma7k93v-singhal156s-projects.vercel.app'];

const PORT = process.env.PORT || 3000;

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    // Store the persona for use in the chat context
    // (Implementation for storing this will depend on your specific app needs)
    console.log(`Persona set to: ${persona}`);
    res.sendStatus(200);
});

wss.on("connection", (ws) => {
    console.log("Client connected");

    // Initialize Picovoice Cobra for VAD
    const cobra = new Cobra(process.env.PICOVOICE_ACCESS_KEY);

    // Function to handle incoming audio data
    ws.on("message", async (message) => {
        // Handle the incoming audio message for processing
        const audioData = message; // Assuming message is the audio data

        // Use Cobra for VAD
        const isSpeech = await cobra.process(audioData);
        if (isSpeech) {
            console.log("Detected speech, processing...");
            // Use Deepgram STT for transcription
            const response = await deepgramClient.transcription.preRecorded(
                { buffer: audioData, mimetype: "audio/wav" },
                { punctuate: true }
            );

            const transcript = response?.channel?.alternatives[0]?.transcript;
            console.log(`Transcribed text: ${transcript}`);

            // Here you would call OpenAI's API with the transcribed text and the persona
            // Implement OpenAI LLM call here (not shown in this code)

            // Send the response back to the client
            ws.send(`Assistant response based on persona: ${transcript}`);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
