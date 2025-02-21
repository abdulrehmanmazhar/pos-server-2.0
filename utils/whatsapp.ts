// import {makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';

// let sock;
// async function connectWhatsapp() {
//     const { state, saveCreds } = await useMultiFileAuthState('auth');
//     const { version } = await fetchLatestBaileysVersion();

//     sock = makeWASocket({
//         printQRInTerminal: true,
//         auth: state,
//         version: version,
//     });

//     // Handle events
//     sock.ev.process(async (events) => {
//         if (events['connection.update']) {
//             const { connection, lastDisconnect } = events['connection.update'];
//             if (connection === 'close') {
//                 if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
//                     connectWhatsapp();
//                 } else {
//                     console.log("Disconnected because you logged out.");
//                 }
//             } else if (connection === 'open') {
//                 console.log("WhatsApp connected!");
//                 // Send a message after connection is established
//                 await sendMessage('923157642387', 'Good Morning!');
//             }
//         }

//         if (events['creds.update']) {
//             await saveCreds();
//         }
//     });
// }

// // Function to send a message
// export async function sendMessage(phoneNumber, message) {
//     try {
//         const jid = phoneNumber + '@s.whatsapp.net';
//         await sock.sendMessage(jid, { text: message });
//         console.log(`Message sent to ${phoneNumber}: ${message}`);
//     } catch (err) {
//         console.error(`Failed to send message to ${phoneNumber}:`, err);
//     }
// }

// connectWhatsapp();


// import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';

// let sock;

// export async function connectWhatsapp(io) { // Accept io instance
//     const { state, saveCreds } = await useMultiFileAuthState('auth');
//     const { version } = await fetchLatestBaileysVersion();

//     sock = makeWASocket({
//         printQRInTerminal: false, // ❌ Disable terminal QR code
//         auth: state,
//         version: version,
//     });

//     // Handle Baileys events
//     sock.ev.process(async (events) => {
//         if (events['connection.update']) {
//             const { connection, lastDisconnect, qr } = events['connection.update'];
            
//             if (qr) {
//                 console.log("Sending QR code to frontend...");
//                 io.emit('qr', qr); // ✅ Send QR code to frontend
//             }

//             if (connection === 'close') {
//                 console.log("Disconnected. Reconnecting...");
//                 connectWhatsapp(io); // Reconnect WhatsApp
//             } else if (connection === 'open') {
//                 console.log("WhatsApp connected!");
//             }
//         }

//         if (events['creds.update']) {
//             await saveCreds();
//         }
//     });
// }

// import fs from 'fs';
// import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from 'baileys';

// let sock;

import fs from 'fs';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from 'baileys';

let sock;

export async function connectWhatsapp(io) {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        printQRInTerminal: false, // ❌ Disable terminal QR code
        auth: state,
        version: version,
    });

    // Handle Baileys events
    sock.ev.process(async (events) => {
        if (events['connection.update']) {
            const { connection, lastDisconnect, qr } = events['connection.update'];

            if (qr) {
                console.log("Sending QR code to frontend...");
                io.emit('qr', qr); // ✅ Send QR code to frontend
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;

                if (reason === DisconnectReason.loggedOut) {
                    console.log("User logged out from mobile. Clearing auth folder...");
                    
                    // Remove stored authentication data
                    fs.rmSync('auth', { recursive: true, force: true });

                    console.log("Auth folder deleted. Waiting for reconnection...");
                }

                console.log("Disconnected. Reconnecting...");
                connectWhatsapp(io); // Reconnect to generate new QR if needed
            } else if (connection === 'open') {
                console.log("WhatsApp connected!");
            }
        }

        if (events['creds.update']) {
            await saveCreds();
        }
    });
}

// Function to log out and clear the session
export async function logoutWhatsapp(io) {
    try {
        if (sock) {
            await sock.logout();
            console.log("Logged out successfully!");
        }

        // Remove stored authentication data
        fs.rmSync('auth', { recursive: true, force: true });

        // Reconnect to generate a new QR
        console.log("Restarting WhatsApp session...");
        connectWhatsapp(io);
    } catch (error) {
        console.error("Logout failed:", error);
    }
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
