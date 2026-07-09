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

// Generate a unique email based on user's name
async function generateUniqueEmail(name) {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    let email = `${clean}@apnamestri.com`;
    let count = 1;
    while (true) {
        const existing = await Vendor.findOne({ Email_address: email });
        if (!existing) {
            break;
        }
        email = `${clean}${count}@apnamestri.com`;
        count++;
    }
    return email;
}

const users = {};
let latestQR = null;
let isBotConnected = false;

// ==========================
// TRANSLATIONS
// ==========================
const translations = {
    English: {
        selectLanguage: "Please select 1, 2 or 3",
        enterName: "Enter your full name:",
        chooseCategory: `Select Category:
1. Technical
2. Non-Technical`,
        invalidCategory: "❌ Please choose 1 or 2",
        chooseTechnicalSkill: `Choose Technical Skill:

1. Architects
2. Civil Engineer
3. Site Supervisor
4. Survey Engineer
5. MEP Consultant
6. Structural Engineer
7. Project Manager
8. HVAC Engineer
9. Safety Engineer
10. Contractor
11. Interior Designer
12. WaterProofing Consultant
13. Acoustic Consultants`,
        chooseNonTechnicalSkill: `Choose Non-Technical Skill:

1. EarthWork Labour
2. Civil Mason
3. Plumber
4. Electrician
5. Painter
6. Carpenter
7. False Ceiling Worker
8. Fabrication
9. Lift Technician
10. Dismantaling Expert`,
        technicalSkills: {
            "1": "Architects",
            "2": "Civil Engineer",
            "3": "Site Supervisor",
            "4": "Survey Engineer",
            "5": "MEP Consultant",
            "6": "Structural Engineer",
            "7": "Project Manager",
            "8": "HVAC Engineer",
            "9": "Safety Engineer",
            "10": "Contractor",
            "11": "Interior Designer",
            "12": "WaterProofing Consultant",
            "13": "Acoustic Consultants",
        },
        nonTechnicalSkills: {
            "1": "EarthWork Labour",
            "2": "Civil Mason",
            "3": "Plumber",
            "4": "Electrician",
            "5": "Painter",
            "6": "Carpenter",
            "7": "False Ceiling Worker",
            "8": "Fabrication",
            "9": "Lift Technician",
            "10": "Dismantaling Expert",
            "11": "Flooring work",
            "12": "Granite work",
            "13": "Form work/centering",
            "14": "Civil helper",
            "15": "water Proofing",
            "16": "Termite control",

        },
        invalidTechnicalSkill: "❌ Please choose a number from 1 to 13.",
        invalidNonTechnicalSkill: "❌ Please choose a number from 1 to 10.",
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
Email: ${user.email}
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
        chooseCategory: `వర్గాన్ని ఎంచుకోండి:
1. Technical (టెక్నికల్)
2. Non-Technical (నాన్-టెక్నికల్)`,
        invalidCategory: "❌ దయచేసి 1 లేదా 2 ఎంచుకోండి",
        chooseTechnicalSkill: `టెక్నికల్ స్కిల్ ఎంచుకోండి:

1. Architects (ఆర్కిటెక్ట్స్)
2. Civil Engineer (సివిల్ ఇంజనీర్)
3. Site Supervisor (సైట్ సూపర్వైజర్)
4. Survey Engineer (సర్వే ఇంజనీర్)
5. MEP Consultant (MEP కన్సల్టెంట్)
6. Structural Engineer (స్ట్రక్చరల్ ఇంజనీర్)
7. Project Manager (ప్రాజెక్ట్ మేనేజర్)
8. HVAC Engineer (HVAC ఇంజనీర్)
9. Safety Engineer (సేఫ్టీ ఇంజనీర్)
10. Contractor (కాంట్రాక్టర్)
11. Interior Designer (ఇంటీరియర్ డిజైనర్)
12. WaterProofing Consultant (వాటర్‌ప్రూఫింగ్ కన్సల్టెంట్)
13. Acoustic Consultants (అకౌస్టిక్ కన్సల్టెంట్స్)`,
        chooseNonTechnicalSkill: `నాన్-టెక్నికల్ స్కిల్ ఎంచుకోండి:

1. EarthWork Labour (మట్టి పని కూలీ)
2. Civil Mason (తాపీ మేస్త్రీ)
3. Plumber (ప్లంబర్)
4. Electrician (ఎలక్ట్రీషియన్)
5. Painter (పెయింటర్)
6. Carpenter (కార్పెంటర్)
7. False Ceiling Worker (ఫాల్స్ సీలింగ్ వర్కర్)
8. Fabrication (ఫాబ్రికేషన్)
9. Lift Technician (లిఫ్ట్ టెక్నీషియన్)
10. Dismantaling Expert (భవనాలు కూల్చే నిపుణుడు)`,
        technicalSkills: {
            "1": "Architects (ఆర్కిటెక్ట్స్)",
            "2": "Civil Engineer (సివిల్ ఇంజనీర్)",
            "3": "Site Supervisor (సైట్ సూపర్వైజర్)",
            "4": "Survey Engineer (సర్వే ఇంజనీర్)",
            "5": "MEP Consultant (MEP కన్సల్టెంట్)",
            "6": "Structural Engineer (స్ట్రక్చరల్ ఇంజనీర్)",
            "7": "Project Manager (ప్రాజెక్ట్ మేనేజర్)",
            "8": "HVAC Engineer (HVAC ఇంజనీర్)",
            "9": "Safety Engineer (సేఫ్టీ ఇంజనీర్)",
            "10": "Contractor (కాంట్రాక్టర్)",
            "11": "Interior Designer (ఇంటీరియర్ డిజైనర్)",
            "12": "WaterProofing Consultant (వాటర్‌ప్రూఫింగ్ కన్సల్టెంట్)",
            "13": "Acoustic Consultants (అకౌస్టిక్ కన్సల్టెంట్స్)",
        },
        nonTechnicalSkills: {
            "1": "EarthWork Labour (మట్టి పని కూలీ)",
            "2": "Civil Mason (తాపీ మేస్త్రీ)",
            "3": "Plumber (ప్లంబర్)",
            "4": "Electrician (ఎలక్ట్రీషియన్)",
            "5": "Painter (పెయింటర్)",
            "6": "Carpenter (కార్పెంటర్)",
            "7": "False Ceiling Worker (ఫాల్స్ సీలింగ్ వర్కర్)",
            "8": "Fabrication (ఫాబ్రికేషన్)",
            "9": "Lift Technician (లిఫ్ట్ టెక్నీషియన్)",
            "10": "Dismantaling Expert (భవనాలు కూల్చే నిపుణుడు)",
        },
        invalidTechnicalSkill: "❌ దయచేసి 1 నుండి 13 వరకు సంఖ్యను ఎంచుకోండి.",
        invalidNonTechnicalSkill: "❌ దయచేసి 1 నుండి 10 వరకు సంఖ్యను ఎంచుకోండి.",
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
ఈమెయిల్: ${user.email}
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
        chooseCategory: `श्रेणी चुनें:
1. Technical (तकनीकी)
2. Non-Technical (गैर-तकनीकी)`,
        invalidCategory: "❌ कृपया 1 या 2 चुनें",
        chooseTechnicalSkill: `तकनीकी कौशल चुनें:

1. Architects (आर्किटेक्ट्स)
2. Civil Engineer (सिविल इंजीनियर)
3. Site Supervisor (साइट सुपरवाइजर)
4. Survey Engineer (सर्वे इंजीनियर)
5. MEP Consultant (एमईपी सलाहकार)
6. Structural Engineer (स्ट्रक्चरल इंजीनियर)
7. Project Manager (प्रोजेक्ट मैनेजर)
8. HVAC Engineer (एचवीएसी इंजीनियर)
9. Safety Engineer (सेफ्टी इंजीनियर)
10. Contractor (ठेकेदार)
11. Interior Designer (इंटीरियर डिजाइनर)
12. WaterProofing Consultant (वॉटरप्रूफिंग सलाहकार)
13. Acoustic Consultants (ध्वनि सलाहकार)`,
        chooseNonTechnicalSkill: `गैर-तकनीकी कौशल चुनें:

1. EarthWork Labour (मिट्टी काम मजदूर)
2. Civil Mason (राजमिस्त्री)
3. Plumber (प्लंबर)
4. Electrician (इलेक्ट्रीशियन)
5. Painter (पेंटर)
6. Carpenter (बढ़ई)
7. False Ceiling Worker (फॉल्स सीलिंग कारीगर)
8. Fabrication (फैब्रिकेशन कारीगर)
9. Lift Technician (लिफ्ट तकनीशियन)
10. Dismantaling Expert (डिसमेंटलिंग एक्सपर्ट)`,
        technicalSkills: {
            "1": "Architects (आर्किटेक्ट्स)",
            "2": "Civil Engineer (सिविल इंजीनियर)",
            "3": "Site Supervisor (साइट सुपरवाइजर)",
            "4": "Survey Engineer (सर्वे इंजीनियर)",
            "5": "MEP Consultant (एमईपी सलाहकार)",
            "6": "Structural Engineer (स्ट्रक्चरल इंजीनियर)",
            "7": "Project Manager (प्रोजेक्ट मैनेजर)",
            "8": "HVAC Engineer (एचवीएसी इंजीनियर)",
            "9": "Safety Engineer (सेफ्टी इंजीनियर)",
            "10": "Contractor (ठेकेदार)",
            "11": "Interior Designer (इंटीरियर डिजाइनर)",
            "12": "WaterProofing Consultant (वॉटरप्रूफिंग सलाहकार)",
            "13": "Acoustic Consultants (ध्वनि सलाहकार)",
        },
        nonTechnicalSkills: {
            "1": "EarthWork Labour (मिट्टी काम मजदूर)",
            "2": "Civil Mason (राजमिस्त्री)",
            "3": "Plumber (प्लंबर)",
            "4": "Electrician (इलेक्ट्रीशियन)",
            "5": "Painter (पेंटर)",
            "6": "Carpenter (बढ़ई)",
            "7": "False Ceiling Worker (फॉल्स सीलिंग कारीगर)",
            "8": "Fabrication (फैब्रिकेशन कारीगर)",
            "9": "Lift Technician (लिफ्ट तकनीशियन)",
            "10": "Dismantaling Expert (डिसमेंटलिंग एक्सपर्ट)",
        },
        invalidTechnicalSkill: "❌ कृपया 1 से 13 के बीच की संख्या चुनें।",
        invalidNonTechnicalSkill: "❌ कृपया 1 से 10 के बीच की संख्या चुनें।",
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
ईमेल: ${user.email}
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

        // Reset session if user types "exit" or "clear"
        const cleanTextLower = text.trim().toLowerCase();
        if (cleanTextLower === "exit" || cleanTextLower === "clear") {
            delete users[sender];
        }

        // Check if user is in normal chat mode
        if (users[sender] && users[sender].step === "NORMAL_CHAT") {
            if (text.trim().toLowerCase() === "#bot") {
                delete users[sender];
            } else {
                return; // Do not respond, treat as normal WhatsApp chat
            }
        }

        // New User — Ask for bot vs normal chat preference
        if (!users[sender]) {
            users[sender] = {
                step: "CHOOSE_MODE",
            };

            await sock.sendMessage(sender, {
                text: `Choose Chat Mode / చాట్ మోడ్ ఎంచుకోండి / चैट मोड चुनें:

1. Chat with Bot (Apna Mestri Bot) / బాట్‌తో చాట్ చేయండి / बॉट के साथ चैट करें
2. Normal Chat (Human) / సాధారణ చాట్ / सामान्य चैट

Reply with 1 or 2 / 1 లేదా 2 తో రిప్లై ఇవ్వండి / 1 या 2 के साथ उत्तर दें`,
            });

            return;
        }

        const user = users[sender];

        // Handle Chat Mode Selection
        if (user.step === "CHOOSE_MODE") {
            const cleanText = text.trim();
            if (cleanText === "1") {
                // Check if they are already registered in the DB
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
                        user.step = "NORMAL_CHAT";
                        user.phone = existing.Phone_number;
                        user.name = existing.Owner_name;
                        user.language = "English";

                        await sock.sendMessage(sender, {
                            text: "You are already registered ✅\nమీరు ఇప్పటికే రిజిస్టర్ అయ్యారు ✅\nआप पहले से रजिस्टर्ड हैं ✅\n\n(Normal chat mode activated. Reply with #bot if you need to use the bot again.)",
                        });
                        return;
                    }
                } catch (dbErr) {
                    console.error("❌ Error checking existing user on greeting:", dbErr.message);
                }

                // Not registered, proceed to Language selection
                user.step = "LANGUAGE";
                await sock.sendMessage(sender, {
                    text: `👋 Welcome to Apna Mestri
👋 Apna Mestri కి స్వాగతం
👋 Apna Mestri में आपका स्वागत है

Choose Language / భాష ఎంచుకోండి / भाषा चुनें

1. English
2. తెలుగు
3. हिन्दी`,
                });
            } else if (cleanText === "2") {
                user.step = "NORMAL_CHAT";
                await sock.sendMessage(sender, {
                    text: `🔌 Normal chat mode activated. The bot is now disabled.
(If you want to use the bot again, reply with #bot)

🔌 సాధారణ చాట్ మోడ్ సక్రియం చేయబడింది. బాట్ ఇప్పుడు నిలిపివేయబడింది.
(మీరు మళ్లీ బాట్ ఉపయోగించాలనుకుంటే, #bot అని రిప్లై ఇవ్వండి)

🔌 सामान्य चैट मोड सक्रिय हो गया है। बॉट अब बंद है।
(यदि आप फिर से बॉट का उपयोग करना चाहते हैं, तो #bot का उत्तर दें)`,
                });
            } else {
                await sock.sendMessage(sender, {
                    text: "❌ Please reply with 1 or 2\n❌ దయచేసి 1 లేదా 2 తో రిప్లై ఇవ్వండి\n❌ कृपया 1 या 2 के साथ उत्तर दें",
                });
            }
            return;
        }


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
            user.step = "CATEGORY";

            await sock.sendMessage(sender, {
                text: t(user.language, "chooseCategory"),
            });

            return;
        }

        // ==========================
        // CATEGORY
        // ==========================
        if (user.step === "CATEGORY") {
            const categories = {
                "1": "Technical",
                "2": "Non-Technical",
            };

            if (!categories[text]) {
                await sock.sendMessage(sender, {
                    text: t(user.language, "invalidCategory"),
                });
                return;
            }

            user.category = categories[text];
            user.step = "SKILL";

            await sock.sendMessage(sender, {
                text: user.category === "Technical"
                    ? t(user.language, "chooseTechnicalSkill")
                    : t(user.language, "chooseNonTechnicalSkill"),
            });

            return;
        }

        // ==========================
        // SKILL
        // ==========================
        if (user.step === "SKILL") {
            const isTechnical = user.category === "Technical";
            const skillList = isTechnical
                ? t(user.language, "technicalSkills")
                : t(user.language, "nonTechnicalSkills");

            if (!skillList[text]) {
                await sock.sendMessage(sender, {
                    text: isTechnical
                        ? t(user.language, "invalidTechnicalSkill")
                        : t(user.language, "invalidNonTechnicalSkill"),
                });
                return;
            }

            user.skillKey = text;
            user.skill = skillList[text];
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
            const englishSkills = user.category === "Technical"
                ? translations["English"].technicalSkills
                : translations["English"].nonTechnicalSkills;

            const categoryName = englishSkills[user.skillKey] || user.skill;

            // Generate random security password
            user.password = generatePassword();

            // Save to MongoDB
            try {
                const existingVendor = await Vendor.findOne({ Phone_number: user.phone });

                if (!existingVendor) {
                    // Generate unique email based on user's name
                    user.email = await generateUniqueEmail(user.name);

                    const vendor = new Vendor({
                        Business_Name: null,
                        Owner_name: user.name,
                        Email_address: user.email,
                        Phone_number: user.phone,
                        Business_address: null,
                        Category: user.category,
                        Sub_Category: [categoryName],
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
            user.step = "NORMAL_CHAT";
            await sock.sendMessage(sender, {
                text: `${t(user.language, "alreadyRegistered")}\n\n🔌 Normal chat mode activated. The bot is now disabled. (Reply with #bot to activate it again.)`,
            });
        }
    });

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        // Display QR code in terminal for scanning
        if (qr) {
            latestQR = qr;
            console.log("\n📱 Scan this QR code with WhatsApp:\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            isBotConnected = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const errorReason = lastDisconnect?.error?.message || lastDisconnect?.error || "Unknown error";
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`❌ WhatsApp Connection Closed. Reason: ${errorReason}. Status Code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 5 seconds...");
                setTimeout(() => {
                    startBot();
                }, 5000);
            } else {
                console.log("⚠️ Logged out from WhatsApp. Clearing session and restarting to scan new QR code...");
                const fs = require("fs");
                try {
                    fs.rmSync("./auth", { recursive: true, force: true });
                    console.log("✅ Session credentials cleared successfully.");
                } catch (err) {
                    console.error("❌ Failed to clear credentials directory:", err.message);
                }

                console.log("🔄 Starting fresh bot instance in 3 seconds...");
                setTimeout(() => {
                    startBot();
                }, 3000);
            }
        }

        if (connection === "open") {
            isBotConnected = true;
            latestQR = null;
            console.log("✅ WhatsApp Bot Connected");
        }
    });
}

const http = require("http");

// Connect to MongoDB first, then start the bot
connectDB().then(() => {
    startBot();

    // Simple health check server for hosting platforms like Render/Railway
    const PORT = process.env.PORT || 6000;
    http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });

        if (isBotConnected) {
            res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Apna Mestri WhatsApp Bot - Connected</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #e8f5e9;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            text-align: center;
            border-top: 6px solid #2e7d32;
            max-width: 400px;
            width: 90%;
        }
        h1 { color: #2e7d32; margin-top: 0; font-size: 24px; }
        p { color: #555; font-size: 16px; line-height: 1.5; }
        .icon { font-size: 48px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>Bot is Connected!</h1>
        <p>Apna Mestri WhatsApp Bot is active and running successfully.</p>
    </div>
</body>
</html>`);
        } else if (latestQR) {
            res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Apna Mestri WhatsApp Bot - Scan QR</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        h1 { color: #075e54; margin-top: 0; font-size: 24px; }
        p { color: #555; font-size: 15px; line-height: 1.5; }
        .qr-box {
            margin: 20px 0;
            padding: 10px;
            background: white;
            display: inline-block;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
        }
        img {
            display: block;
            width: 250px;
            height: 250px;
        }
        .footer { font-size: 12px; color: #888; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Scan QR Code</h1>
        <p>Open WhatsApp on your phone, tap <b>Linked Devices</b>, and scan this code to connect the bot:</p>
        <div class="qr-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(latestQR)}" alt="WhatsApp QR Code" />
        </div>
        <p class="footer">Awaiting scan. This page auto-refreshes every 10 seconds.</p>
    </div>
    <script>
        setTimeout(() => { window.location.reload(); }, 10000);
    </script>
</body>
</html>`);
        } else {
            res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Apna Mestri WhatsApp Bot - Starting</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #fafafa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        h1 { color: #f57c00; margin-top: 0; font-size: 24px; }
        p { color: #555; font-size: 15px; line-height: 1.5; }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #f57c00;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Starting Bot...</h1>
        <p>Connecting to WhatsApp servers. If this is a new session, a QR code will appear here in a few seconds.</p>
    </div>
    <script>
        setTimeout(() => { window.location.reload(); }, 5000);
    </script>
</body>
</html>`);
        }
    }).listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
});