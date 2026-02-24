const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const sessions = {}; // { userId: { client, qrCode, isConnected } }

function getSession(userId) {
  return sessions[userId];
}

function createSession(userId) {
  if (sessions[userId]) return sessions[userId];

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId, dataPath: './sessions' }),
    puppeteer: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  });

  sessions[userId] = { client, qrCode: null, isConnected: false };

  client.on('qr', async (qr) => {
    sessions[userId].isConnected = false;
    sessions[userId].qrCode = await qrcode.toDataURL(qr);
    console.log(`QR gerado para ${userId}`);
  });

  client.on('ready', () => {
    sessions[userId].isConnected = true;
    sessions[userId].qrCode = null;
    console.log(`WhatsApp conectado: ${userId}`);
  });

  client.on('disconnected', () => {
    sessions[userId].isConnected = false;
    console.log(`WhatsApp desconectado: ${userId}`);
  });

  client.initialize();
  return sessions[userId];
}

app.get('/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  const session = getSession(userId);
  res.json({ connected: session?.isConnected || false });
});

app.get('/qr', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });
  createSession(userId);
  const session = getSession(userId);
  res.json({ qr: session?.qrCode || null });
});

app.post('/send', async (req, res) => {
  const { userId, phone, message } = req.body;
  const session = getSession(userId);
  if (!session?.isConnected) return res.status(400).json({ error: 'WhatsApp não conectado' });
  const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
  await session.client.sendMessage(chatId, message);
  res.json({ success: true });
});

app.post('/disconnect', async (req, res) => {
  const { userId } = req.body;
  const session = getSession(userId);
  if (session) {
    await session.client.logout();
    delete sessions[userId];
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
