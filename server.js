require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' });
  }

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt.trim(),
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI.');
    }

    res.json({ imageUrl });
  } catch (err) {
    console.error('❌ Error generating image:', err);
    res.status(500).json({
      error: err?.error?.message || err.message || 'Image generation failed.',
    });
  }
});

app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  const systemPrompt = {
    role: 'system',
    content: `You are a helpful image assistant. When the user gives a prompt, acknowledge it simply by saying "Okay, working on: [prompt]". After the image is generated, ask "Is this close to what you wanted?" If the user gives feedback, revise the prompt accordingly and confirm you're updating it. Keep responses short and focused. Do not offer suggestions unless asked.`,
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemPrompt, ...messages],
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Optional: Health check route
app.get('/', (req, res) => {
  res.send('AI Image Studio backend is running.');
});

// Fallback route for SPA
app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
