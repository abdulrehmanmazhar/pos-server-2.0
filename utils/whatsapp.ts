import {makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';

let sock;
async function connectWhatsapp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        version: version,
    });

    // Handle events
    sock.ev.process(async (events) => {
        if (events['connection.update']) {
            const { connection, lastDisconnect } = events['connection.update'];
            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    connectWhatsapp();
                } else {
                    console.log("Disconnected because you logged out.");
                }
            } else if (connection === 'open') {
                console.log("WhatsApp connected!");
                // Send a message after connection is established
                await sendMessage('923157642387', 'Good Morning!');
            }
        }

        if (events['creds.update']) {
            await saveCreds();
        }
    });
}

// Function to send a message
export async function sendMessage(phoneNumber, message) {
    try {
        const jid = phoneNumber + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        console.log(`Message sent to ${phoneNumber}: ${message}`);
    } catch (err) {
        console.error(`Failed to send message to ${phoneNumber}:`, err);
    }
}

connectWhatsapp();
