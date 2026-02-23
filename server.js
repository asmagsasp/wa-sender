const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let qrCodeData = null;
let isConnected = false;

const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', async (qr) => {
  qrCodeData = await qrcode.toDataURL(qr);
  isConnected = false;
  console.log('QR Code gerado');
});

client.on('ready', () => {
  isConnected = true;
  qrCodeData = null;
  console.log('WhatsApp conectado!');
});

client.on('disconnected', () => {
  isConnected = false;
  console.log('Desconectado');
});

client.initialize();

app.get('/status', (req, res) => {
  res.json({ connected: isConnected });
});

app.get('/qr', (req, res) => {
  res.json({ qr: qrCodeData });
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!isConnected) return res.json({ success: false, error: 'WhatsApp não conectado' });
  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.post('/disconnect', async (req, res) => {
  await client.destroy();
  isConnected = false;
  res.json({ success: true });
});

app.listen(3001, () => console.log('Servidor rodando em http://localhost:3001'));