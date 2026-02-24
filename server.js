const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

let qrCodeData = null;
let isConnected = false;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
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
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable'
    }
});

client.on('qr', async (qr) => {
    isConnected = false;
    qrCodeData = await qrcode.toDataURL(qr);
    console.log('QR Code gerado');
});

client.on('ready', () => {
    isConnected = true;
    qrCodeData = null;
    console.log('WhatsApp conectado!');
});

client.on('disconnected', () => {
    isConnected = false;
    console.log('WhatsApp desconectado');
    client.initialize();
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
    if (!isConnected) return res.status(400).json({ error: 'WhatsApp não conectado' });
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
});

app.post('/disconnect', async (req, res) => {
    await client.logout();
    isConnected = false;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
