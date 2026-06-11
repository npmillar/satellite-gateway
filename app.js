const express = require('express');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
// This tells the server how to read Twilio's incoming texts
app.use(express.urlencoded({ extended: true }));

// This is the pathway Twilio will target
app.post('/chat', async (req, res) => {
    const twiml = new MessagingResponse();
    const incomingText = req.body.Body || "Hello";
    
    // We use a hidden environment variable here so your key isn't public on GitHub!
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        system_instruction: {
            parts: [{ text: "You are a concise off-grid assistant. Give accurate, highly compressed answers. Limit strictly to 1-2 sentences. No markdown." }]
        },
        contents: [
            { parts: [{ text: incomingText }] }
        ],
        tools: [
            { googleSearch: {} } // Search Grounding is enabled
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            twiml.message(`API Error: ${data.error.message}`);
        } else {
            const aiReply = data.candidates[0].content.parts[0].text;
            twiml.message(aiReply);
        }
    } catch (error) {
        twiml.message("System Error: Transmission failed.");
    }
    
    // Package it as XML so Twilio understands the reply
    res.type('text/xml').send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Satellite gateway listening on port ${PORT}`);
});
