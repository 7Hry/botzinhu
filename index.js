const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

async function conectar() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,   // ← desativado porque está obsoleto
        logger: pino({ level: 'silent' }),
        browser: ['Bot do Dedão', 'Chrome', '1.0'],
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();  // limpa a tela pra ficar mais limpo
            console.log('\n🔥 🔥 🔥  ESCANEIE O QR CODE ABAIXO  🔥 🔥 🔥\n');
            qrcode.generate(qr, { small: true });
            console.log('\nAbra o WhatsApp no celular → Configurações → Dispositivos vinculados → Vincular um dispositivo');
            console.log('Escaneie o QR que está acima ↑↑↑');
        }

        if (connection === 'open') {
            console.log('\n✅ BOT CONECTADO COM SUCESSO! 🎉');
            console.log('Agora é só mandar foto/vídeo com /s');
        }

        if (connection === 'close') {
            console.log('Conexão fechada, tentando reconectar...');
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                setTimeout(conectar, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim();

        if (texto !== '/s' && texto !== '/s2') return;

        console.log('📸 Criando sticker...');

        try {
            let buffer = await sock.downloadMediaMessage(msg);

            const sticker = new Sticker(buffer, {
                pack: 'Bot do',
                author: 'Dedão',
                type: StickerTypes.FULL,
                categories: ['😎'],
                quality: 80,
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: '❌ Erro ao criar sticker.' });
        }
    });
}

conectar();
