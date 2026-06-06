const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
} = require("@whiskeysockets/baileys");

const crypto = require("crypto");
const qrcode = require("qrcode-terminal");
const connectDB = require("./config/db");
const Vendor = require("./models/Vendor");

// Generate a random 8-character alphanumeric password
function generatePassword() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

const users = {};

// ==========================
// TRANSLATIONS
// ==========================
const translations = {
    English: {
        selectLanguage: "Please select 1, 2 or 3",
        enterName: "Enter your full name:",
        chooseSkill: `Choose Skill

1. Electrician
2. Plumber
3. Painter
4. Mason`,
        skills: {
            "1": "Electrician",
            "2": "Plumber",
            "3": "Painter",
            "4": "Mason",
        },
        invalidSkill: "Choose 1 to 4",
        selectWage: `Select Daily Wage

1. ₹500-700
2. ₹700-1000
3. ₹1000-1500
4. ₹1500+`,
        invalidWage: "Choose 1 to 4",
        askLocation: `📍 Please share your current location.

WhatsApp ➜ Attach ➜ Location ➜ Send Current Location`,
        invalidLocation: "📍 Please send your location using WhatsApp Location feature.",
        askPhone: "📞 Enter your 10-digit phone number (Example: 9876543210):",
        invalidPhone: "❌ Please enter a valid 10-digit phone number.",
        registrationSuccess: (user) => `✅ Registration Successful

Name: ${user.name}
Phone: ${user.phone}
Skill: ${user.skill}
Daily Wage: ${user.dailyWage}

🔐 Your Security Password: ${user.password}
⚠️ Please save this password. You will need it to login.

Thank you for joining Apna Mestri 👷`,
        alreadyRegistered: "You are already registered ✅",
    },
    Telugu: {
        selectLanguage: "దయచేసి 1, 2 లేదా 3 ఎంచుకోండి",
        enterName: "మీ పూర్తి పేరు నమోదు చేయండి:",
        chooseSkill: `నైపుణ్యాన్ని ఎంచుకోండి

1. ఎలక్ట్రీషియన్
2. ప్లంబర్
3. పెయింటర్
4. మేసన్`,
        skills: {
            "1": "ఎలక్ట్రీషియన్",
            "2": "ప్లంబర్",
            "3": "పెయింటర్",
            "4": "మేసన్",
        },
        invalidSkill: "1 నుండి 4 ఎంచుకోండి",
        selectWage: `రోజువారీ వేతనం ఎంచుకోండి

1. ₹500-700
2. ₹700-1000
3. ₹1000-1500
4. ₹1500+`,
        invalidWage: "1 నుండి 4 ఎంచుకోండి",
        askLocation: `📍 దయచేసి మీ ప్రస్తుత లొకేషన్ పంపండి.

WhatsApp ➜ Attach ➜ Location ➜ Send Current Location`,
        invalidLocation: "📍 దయచేసి WhatsApp లొకేషన్ ఫీచర్ ఉపయోగించి మీ లొకేషన్ పంపండి.",
        askPhone: "📞 మీ 10 అంకెల ఫోన్ నంబర్ నమోదు చేయండి (ఉదాహరణ: 9876543210):",
        invalidPhone: "❌ దయచేసి చెల్లుబాటు అయ్యే 10 అంకెల ఫోన్ నంబర్ నమోదు చేయండి.",
        registrationSuccess: (user) => `✅ రిజిస్ట్రేషన్ విజయవంతం

పేరు: ${user.name}
ఫోన్: ${user.phone}
నైపుణ్యం: ${user.skill}
రోజువారీ వేతనం: ${user.dailyWage}

🔐 మీ సెక్యూరిటీ పాస్‌వర్డ్: ${user.password}
⚠️ దయచేసి ఈ పాస్‌వర్డ్ సేవ్ చేయండి. లాగిన్ కోసం ఇది అవసరం.

Apna Mestri లో చేరినందుకు ధన్యవాదాలు 👷`,
        alreadyRegistered: "మీరు ఇప్పటికే రిజిస్టర్ అయ్యారు ✅",
    },
    Hindi: {
        selectLanguage: "कृपया 1, 2 या 3 चुनें",
        enterName: "अपना पूरा नाम दर्ज करें:",
        chooseSkill: `कौशल चुनें

1. इलेक्ट्रीशियन
2. प्लंबर
3. पेंटर
4. मिस्त्री (राजमिस्त्री)`,
        skills: {
            "1": "इलेक्ट्रीशियन",
            "2": "प्लंबर",
            "3": "पेंटर",
            "4": "मिस्त्री (राजमिस्त्री)",
        },
        invalidSkill: "1 से 4 में से चुनें",
        selectWage: `दैनिक मजदूरी चुनें

1. ₹500-700
2. ₹700-1000
3. ₹1000-1500
4. ₹1500+`,
        invalidWage: "1 से 4 में से चुनें",
        askLocation: `📍 कृपया अपना वर्तमान लोकेशन भेजें।

WhatsApp ➜ Attach ➜ Location ➜ Send Current Location`,
        invalidLocation: "📍 कृपया WhatsApp लोकेशन फीचर का उपयोग करके अपना लोकेशन भेजें।",
        askPhone: "📞 अपना 10 अंकों का फोन नंबर दर्ज करें (उदाहरण: 9876543210):",
        invalidPhone: "❌ कृपया एक मान्य 10 अंकों का फोन नंबर दर्ज करें।",
        registrationSuccess: (user) => `✅ रजिस्ट्रेशन सफल

नाम: ${user.name}
फोन: ${user.phone}
कौशल: ${user.skill}
दैनिक मजदूरी: ${user.dailyWage}

🔐 आपका सिक्योरिटी पासवर्ड: ${user.password}
⚠️ कृपया इस पासवर्ड को सेव करें। लॉगिन के लिए इसकी जरूरत होगी।

Apna Mestri से जुड़ने के लिए धन्यवाद 👷`,
        alreadyRegistered: "आप पहले से रजिस्टर्ड हैं ✅",
    },
};

// Helper to get translated text
function t(lang, key) {
    return translations[lang]?.[key] || translations["English"][key];
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        auth: state,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];

        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        // New User — check database first to see if they are already registered
        if (!users[sender]) {
            const jidNumber = sender.split("@")[0];
            const cleanedJidPhone = jidNumber.length === 12 && jidNumber.startsWith("91")
                ? jidNumber.slice(2)
                : jidNumber;

            try {
                const existing = await Vendor.findOne({
                    $or: [
                        { Phone_number: cleanedJidPhone },
                        { Phone_number: jidNumber }
                    ]
                });

                if (existing) {
                    users[sender] = {
                        step: "COMPLETE",
                        phone: existing.Phone_number,
                        name: existing.Owner_name,
                        language: "English"
                    };

                    await sock.sendMessage(sender, {
                        text: "You are already registered ✅\nమీరు ఇప్పటికే రిజిస్టర్ అయ్యారు ✅\nआप पहले से रजिस्टर्ड हैं ✅",
                    });
                    return;
                }
            } catch (dbErr) {
                console.error("❌ Error checking existing user on greeting:", dbErr.message);
            }

            users[sender] = {
                step: "LANGUAGE",
            };

            await sock.sendMessage(sender, {
                text: `👋 Welcome to Apna Mestri
👋 Apna Mestri కి స్వాగతం
👋 Apna Mestri में आपका स्वागत है

Choose Language / భాష ఎంచుకోండి / भाषा चुनें

1. English
2. తెలుగు
3. हिन्दी`,
            });

            return;
        }

        const user = users[sender];

        // ==========================
        // LANGUAGE
        // ==========================
        if (user.step === "LANGUAGE") {
            const languages = {
                "1": "English",
                "2": "Telugu",
                "3": "Hindi",
            };

            if (!languages[text]) {
                await sock.sendMessage(sender, {
                    text: "Please select 1, 2 or 3\nదయచేసి 1, 2 లేదా 3 ఎంచుకోండి\nकृपया 1, 2 या 3 चुनें",
                });
                return;
            }

            user.language = languages[text];
            user.step = "NAME";

            await sock.sendMessage(sender, {
                text: t(user.language, "enterName"),
            });

            return;
        }

        // ==========================
        // NAME
        // ==========================
        if (user.step === "NAME") {
            user.name = text;
            user.step = "SKILL";

            await sock.sendMessage(sender, {
                text: t(user.language, "chooseSkill"),
            });

            return;
        }

        // ==========================
        // SKILL
        // ==========================
        if (user.step === "SKILL") {
            const skillKeys = { "1": true, "2": true, "3": true, "4": true };

            if (!skillKeys[text]) {
                await sock.sendMessage(sender, {
                    text: t(user.language, "invalidSkill"),
                });
                return;
            }

            const localizedSkills = t(user.language, "skills");
            user.skillKey = text;
            user.skill = localizedSkills[text];
            user.step = "WAGE";

            await sock.sendMessage(sender, {
                text: t(user.language, "selectWage"),
            });

            return;
        }


        // ==========================
        // WAGE
        // ==========================
        if (user.step === "WAGE") {
            const wages = {
                "1": "₹500-700",
                "2": "₹700-1000",
                "3": "₹1000-1500",
                "4": "₹1500+",
            };

            if (!wages[text]) {
                await sock.sendMessage(sender, {
                    text: t(user.language, "invalidWage"),
                });
                return;
            }

            user.dailyWage = wages[text];
            user.step = "PHONE";

            await sock.sendMessage(sender, {
                text: t(user.language, "askPhone"),
            });

            return;
        }

        // ==========================
        // PHONE
        // ==========================
        if (user.step === "PHONE") {
            const cleaned = text.replace(/[\s\-\(\)\+]/g, "");

            // Accept 10-digit numbers (or with country code like 91XXXXXXXXXX)
            if (!/^\d{10}$/.test(cleaned) && !/^91\d{10}$/.test(cleaned)) {
                await sock.sendMessage(sender, {
                    text: t(user.language, "invalidPhone"),
                });
                return;
            }

            // Store as 10-digit number (strip 91 prefix if present)
            const enteredPhone = cleaned.length === 12 && cleaned.startsWith("91")
                ? cleaned.slice(2)
                : cleaned;

            // Check if phone number is already registered in DB
            try {
                const existing = await Vendor.findOne({ Phone_number: enteredPhone });
                if (existing) {
                    await sock.sendMessage(sender, {
                        text: t(user.language, "alreadyRegistered"),
                    });
                    user.step = "COMPLETE";
                    user.phone = enteredPhone;
                    return;
                }
            } catch (dbErr) {
                console.error("❌ Error checking phone number existence:", dbErr.message);
            }

            user.phone = enteredPhone;
            user.step = "LOCATION";

            await sock.sendMessage(sender, {
                text: t(user.language, "askLocation"),
            });

            return;
        }

        // ==========================
        // LOCATION
        // ==========================
        if (user.step === "LOCATION") {
            if (!msg.message.locationMessage) {
                await sock.sendMessage(sender, {
                    text: t(user.language, "invalidLocation"),
                });
                return;
            }

            user.latitude =
                msg.message.locationMessage.degreesLatitude;

            user.longitude =
                msg.message.locationMessage.degreesLongitude;

            user.status = "active";

            user.step = "COMPLETE";

            // Map bot skill to English category for DB storage
            const skillToCategory = {
                "1": "Electrician",
                "2": "Plumber",
                "3": "Painter",
                "4": "Mason",
            };

            // Generate random security password
            user.password = generatePassword();

            // Save to MongoDB
            try {
                const existingVendor = await Vendor.findOne({ Phone_number: user.phone });

                if (!existingVendor) {
                    const vendor = new Vendor({
                        Business_Name: null,
                        Owner_name: user.name,
                        Email_address: `${user.phone}@whatsapp.apnamestri.com`,
                        Phone_number: user.phone,
                        Business_address: null,
                        Category: user.skillKey ? skillToCategory[user.skillKey] : user.skill,
                        Sub_Category: [],
                        role: "Technical",
                        Tax_ID: null,
                        ID_Type: null,
                        Password: user.password,
                        ProductUrls: [],
                        Profile_Image: "",
                        Account_Number: null,
                        IFSC_Code: null,
                        Charge_Per_Hour_or_Day: user.dailyWage,
                        Charge_Type: "Daily",
                        Latitude: user.latitude,
                        Longitude: user.longitude,
                        Verified: false,
                        description: null
                    });

                    await vendor.save();
                    console.log("✅ Worker saved to MongoDB:", vendor._id);

                    console.log("Worker Registered");
                    console.log(user);

                    const successMsg = t(user.language, "registrationSuccess");
                    await sock.sendMessage(sender, {
                        text: successMsg(user),
                    });
                } else {
                    console.log("ℹ️ Worker already exists in DB:", existingVendor._id);
                    await sock.sendMessage(sender, {
                        text: t(user.language, "alreadyRegistered"),
                    });
                }
            } catch (dbErr) {
                console.error("❌ Error saving worker to MongoDB:", dbErr.message);
            }

            return;
        }

        // ==========================
        // REGISTERED USER
        // ==========================
        if (user.step === "COMPLETE") {
            await sock.sendMessage(sender, {
                text: t(user.language, "alreadyRegistered"),
            });
        }
    });

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
        // Display QR code in terminal for scanning
        if (qr) {
            console.log("\n📱 Scan this QR code with WhatsApp:\n");
            qrcode.generate(qr, { small: true });
        }

        if (
            connection === "close" &&
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut
        ) {
            startBot();
        }

        if (connection === "open") {
            console.log("✅ WhatsApp Bot Connected");
        }
    });
}

// Connect to MongoDB first, then start the bot
connectDB().then(() => {
    startBot();
});