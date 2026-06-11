const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Pulling your Twilio credentials securely from Render
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

app.post('/chat', async (req, res) => {
    const incomingText = req.body.Body || "Hello";
    const userPhone = req.body.From; // Your iPhone number
    const twilioPhone = req.body.To; // Your Twilio number

    // 1. Immediately send an empty 200 OK back to Twilio. 
    // This instantly stops Twilio's 15-second kill switch.
    res.set('Content-Type', 'text/xml');
    res.status(200).send('<Response></Response>');

    // 2. Run the heavy AI web search in the background
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
            { googleSearch: {} } // Live web search enabled
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        let aiReply = "System Error: No text generated.";
        if (data.error) {
            aiReply = `API Error: ${data.error.message}`;
        } else if (data.candidates && data.candidates[0].content) {
            aiReply = data.candidates[0].content.parts[0].text;
        }

        // 3. Actively push the reply back to the iPhone as a new message
        await client.messages.create({
            body: aiReply,
            from: twilioPhone,
            to: userPhone
        });

    } catch (error) {
        console.error("Transmission failed:", error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Satellite gateway listening on port ${PORT}`);
});
