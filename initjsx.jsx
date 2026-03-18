import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ───────── AUDIO ENGINE ───────── */
const speak = (text, rate = 0.82) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;
  u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find(v => v.lang === "ja-JP" && v.name.includes("Google")) ||
    voices.find(v => v.lang === "ja-JP") ||
    voices.find(v => v.lang.startsWith("ja"));
  if (jpVoice) u.voice = jpVoice;
  window.speechSynthesis.speak(u);
};

const speakSlow = (text) => speak(text, 0.55);

/* ───────── PHRASE DATA ───────── */
const PHRASES = {
  "Essentials": {
    icon: "🌸",
    desc: "Core phrases you'll use every single day",
    phrases: [
      { jp: "すみません", roma: "Sumimasen", en: "Excuse me / I'm sorry", note: "THE most useful word in Japan. Use to get attention, apologize, or thank someone.", context: "everywhere" },
      { jp: "ありがとうございます", roma: "Arigatō gozaimasu", en: "Thank you (polite)", note: "Full polite form. Use this as your default.", context: "everywhere" },
      { jp: "ありがとう", roma: "Arigatō", en: "Thanks (casual)", note: "Casual — fine with peers or in relaxed settings.", context: "casual" },
      { jp: "おはようございます", roma: "Ohayō gozaimasu", en: "Good morning", note: "Used until about 10-11am.", context: "morning" },
      { jp: "こんにちは", roma: "Konnichiwa", en: "Hello / Good afternoon", note: "The universal daytime greeting.", context: "daytime" },
      { jp: "こんばんは", roma: "Konbanwa", en: "Good evening", note: "Use after sunset.", context: "evening" },
      { jp: "はい", roma: "Hai", en: "Yes", note: "Also used as 'I'm listening' — you'll hear it constantly.", context: "everywhere" },
      { jp: "いいえ", roma: "Iie", en: "No", note: "Polite no. Often accompanied by hand waving.", context: "everywhere" },
      { jp: "お願いします", roma: "Onegai shimasu", en: "Please", note: "Attach to almost any request to make it polite.", context: "everywhere" },
      { jp: "大丈夫です", roma: "Daijōbu desu", en: "It's okay / I'm fine / No thank you", note: "Incredibly versatile. Can mean 'no thanks' or 'I'm alright'.", context: "everywhere" },
      { jp: "分かりました", roma: "Wakarimashita", en: "I understand", note: "Confirms you got the message.", context: "everywhere" },
      { jp: "分かりません", roma: "Wakarimasen", en: "I don't understand", note: "Very useful when lost in conversation.", context: "everywhere" },
      { jp: "英語を話せますか？", roma: "Eigo o hanasemasu ka?", en: "Do you speak English?", note: "Ask politely — many Japanese are shy about their English even if they know some.", context: "everywhere" },
      { jp: "日本語が少しだけ話せます", roma: "Nihongo ga sukoshi dake hanasemasu", en: "I can speak only a little Japanese", note: "Sets expectations and people will appreciate the effort.", context: "everywhere" },
      { jp: "もう一度お願いします", roma: "Mō ichido onegai shimasu", en: "One more time, please", note: "Ask someone to repeat what they said.", context: "everywhere" },
      { jp: "ゆっくりお願いします", roma: "Yukkuri onegai shimasu", en: "Slowly, please", note: "Ask someone to speak more slowly.", context: "everywhere" },
      { jp: "失礼します", roma: "Shitsurei shimasu", en: "Excuse me (formal)", note: "Used when entering/leaving a room, passing someone, or interrupting.", context: "formal" },
    ]
  },
  "Dining & Food": {
    icon: "🍜",
    desc: "Ordering, dietary needs, paying — essential for Kyushu's food scene",
    phrases: [
      { jp: "いただきます", roma: "Itadakimasu", en: "I humbly receive (said before eating)", note: "ALWAYS say this before eating. It's a sign of gratitude and respect.", context: "before meal" },
      { jp: "ごちそうさまでした", roma: "Gochisōsama deshita", en: "Thank you for the meal (said after eating)", note: "Say when finished. Staff will appreciate it greatly.", context: "after meal" },
      { jp: "一人です", roma: "Hitori desu", en: "One person / Table for one", note: "For your solo Kyushu dining. Hold up one finger too.", context: "entering restaurant" },
      { jp: "二人です / 三人です", roma: "Futari desu / Sannin desu", en: "Two people / Three people", note: "For when Kyle and Alex join. Use fingers to confirm.", context: "entering restaurant" },
      { jp: "メニューをお願いします", roma: "Menyū o onegai shimasu", en: "Menu, please", note: "Sometimes menus are only brought on request.", context: "ordering" },
      { jp: "おすすめは何ですか？", roma: "Osusume wa nan desu ka?", en: "What do you recommend?", note: "Great for local specialties, especially in Kyushu.", context: "ordering" },
      { jp: "これをお願いします", roma: "Kore o onegai shimasu", en: "This one, please (pointing)", note: "Point at the menu or food display. Works perfectly.", context: "ordering" },
      { jp: "もう一つお願いします", roma: "Mō hitotsu onegai shimasu", en: "One more, please", note: "For ordering another of the same item.", context: "ordering" },
      { jp: "お水をお願いします", roma: "Omizu o onegai shimasu", en: "Water, please", note: "Water is free at virtually all restaurants in Japan.", context: "ordering" },
      { jp: "ビールをお願いします", roma: "Bīru o onegai shimasu", en: "Beer, please", note: "Japan's beer culture is strong. Try local Kyushu brands!", context: "ordering" },
      { jp: "お会計をお願いします", roma: "Okaikei o onegai shimasu", en: "Check, please", note: "Or make an X with your index fingers — universally understood.", context: "paying" },
      { jp: "カードで払えますか？", roma: "Kādo de haraemasu ka?", en: "Can I pay by card?", note: "CRITICAL for rural Kyushu — many places are cash only.", context: "paying" },
      { jp: "別々でお願いします", roma: "Betsubetsu de onegai shimasu", en: "Separate checks, please", note: "For splitting bills with Kyle and Alex.", context: "paying" },
      { jp: "美味しい！", roma: "Oishii!", en: "Delicious!", note: "Say this genuinely — chefs and staff love hearing it.", context: "during meal" },
      { jp: "美味しかったです", roma: "Oishikatta desu", en: "It was delicious", note: "Past tense — say when leaving or finishing.", context: "after meal" },
      { jp: "アレルギーがあります", roma: "Arerugī ga arimasu", en: "I have allergies", note: "Follow with the allergen name if you know it.", context: "dietary" },
      { jp: "肉なしでお願いします", roma: "Niku nashi de onegai shimasu", en: "Without meat, please", note: "Useful if anyone in your group has dietary restrictions.", context: "dietary" },
      { jp: "辛くしないでください", roma: "Karaku shinaide kudasai", en: "Not spicy, please", note: "Kyushu food can be spicy — especially some ramen.", context: "dietary" },
      { jp: "持ち帰りできますか？", roma: "Mochikaeri dekimasu ka?", en: "Can I take this to go?", note: "Takeaway isn't as common but worth asking.", context: "ordering" },
    ]
  },
  "Transportation": {
    icon: "🚃",
    desc: "Trains, buses, taxis, and rental cars across Kyushu and beyond",
    phrases: [
      { jp: "駅はどこですか？", roma: "Eki wa doko desu ka?", en: "Where is the station?", note: "Add station name before 駅 (eki).", context: "navigation" },
      { jp: "東京に行きたいです", roma: "Tōkyō ni ikitai desu", en: "I want to go to Tokyo", note: "Replace 東京 with any destination name.", context: "navigation" },
      { jp: "次の電車は何時ですか？", roma: "Tsugi no densha wa nanji desu ka?", en: "What time is the next train?", note: "Useful for rural Kyushu where trains run less frequently.", context: "trains" },
      { jp: "この電車は博多に止まりますか？", roma: "Kono densha wa Hakata ni tomarimasu ka?", en: "Does this train stop at Hakata?", note: "Important — some trains skip stations.", context: "trains" },
      { jp: "乗り換えはありますか？", roma: "Norikae wa arimasu ka?", en: "Is there a transfer?", note: "Check if you need to change trains.", context: "trains" },
      { jp: "片道 / 往復", roma: "Katamichi / Ōfuku", en: "One way / Round trip", note: "For buying tickets at the counter.", context: "tickets" },
      { jp: "指定席 / 自由席", roma: "Shiteiseki / Jiyūseki", en: "Reserved seat / Non-reserved seat", note: "Shinkansen and limited express have both options.", context: "trains" },
      { jp: "ここまでお願いします", roma: "Koko made onegai shimasu", en: "To here, please (taxi — showing phone)", note: "Show the address on your phone if pronunciation is tricky.", context: "taxi" },
      { jp: "ここで降ろしてください", roma: "Koko de oroshite kudasai", en: "Please drop me off here", note: "For getting out of a taxi at a specific spot.", context: "taxi" },
      { jp: "いくらですか？", roma: "Ikura desu ka?", en: "How much is it?", note: "Universal pricing question.", context: "everywhere" },
      { jp: "バス停はどこですか？", roma: "Basutei wa doko desu ka?", en: "Where is the bus stop?", note: "Essential in rural Kyushu where buses are key transport.", context: "bus" },
      { jp: "このバスは別府に行きますか？", roma: "Kono basu wa Beppu ni ikimasu ka?", en: "Does this bus go to Beppu?", note: "Confirm before boarding — rural bus routes can be confusing.", context: "bus" },
      { jp: "ガソリンスタンドはどこですか？", roma: "Gasorin sutando wa doko desu ka?", en: "Where is the gas station?", note: "Essential for the Yamanami Highway drive.", context: "driving" },
      { jp: "レギュラー満タンお願いします", roma: "Regyurā mantan onegai shimasu", en: "Fill it up with regular, please", note: "At staffed gas stations. Self-serve is also common.", context: "driving" },
    ]
  },
  "Ryokan & Onsen": {
    icon: "♨️",
    desc: "For Kurokawa Onsen, Miyama Sansou, and other traditional stays",
    phrases: [
      { jp: "チェックインお願いします", roma: "Chekkuin onegai shimasu", en: "Check-in, please", note: "Upon arriving at your ryokan.", context: "check-in" },
      { jp: "予約があります", roma: "Yoyaku ga arimasu", en: "I have a reservation", note: "State your name after. They may have it under your booking platform name.", context: "check-in" },
      { jp: "お風呂は何時までですか？", roma: "Ofuro wa nanji made desu ka?", en: "Until what time is the bath open?", note: "Onsen hours vary — especially important at ryokans.", context: "onsen" },
      { jp: "露天風呂はどこですか？", roma: "Rotenburo wa doko desu ka?", en: "Where is the outdoor bath?", note: "Rotenburo (outdoor onsen) is a must-try experience.", context: "onsen" },
      { jp: "貸切風呂はありますか？", roma: "Kashikiri buro wa arimasu ka?", en: "Is there a private bath?", note: "Some ryokans offer private onsen — great if you're shy.", context: "onsen" },
      { jp: "タトゥーは大丈夫ですか？", roma: "Tatū wa daijōbu desu ka?", en: "Are tattoos okay?", note: "Some onsen ban tattoos. Always ask first.", context: "onsen" },
      { jp: "夕食は何時ですか？", roma: "Yūshoku wa nanji desu ka?", en: "What time is dinner?", note: "Ryokan kaiseki dinners have set times — don't be late!", context: "meals" },
      { jp: "朝食は何時ですか？", roma: "Chōshoku wa nanji desu ka?", en: "What time is breakfast?", note: "Traditional Japanese breakfast is part of the experience.", context: "meals" },
      { jp: "浴衣の着方を教えてください", roma: "Yukata no kikata o oshiete kudasai", en: "Please show me how to wear the yukata", note: "Left side over right (right over left is for the deceased).", context: "room" },
      { jp: "お湯が熱すぎます", roma: "Oyu ga atsusugimasu", en: "The water is too hot", note: "Onsen water can be 42°C+. Take it slow entering.", context: "onsen" },
      { jp: "チェックアウトは何時ですか？", roma: "Chekkuauto wa nanji desu ka?", en: "What time is checkout?", note: "Typically 10-11am at ryokans.", context: "check-out" },
      { jp: "荷物を預けられますか？", roma: "Nimotsu o azukeraremasu ka?", en: "Can I leave my luggage?", note: "Most places will hold bags after checkout.", context: "check-out" },
    ]
  },
  "Shopping": {
    icon: "🏪",
    desc: "Konbini, souvenir shops, and daily purchases",
    phrases: [
      { jp: "袋はいりません", roma: "Fukuro wa irimasen", en: "I don't need a bag", note: "Bags cost extra in Japan. Bring your own eco bag.", context: "konbini" },
      { jp: "温めてください", roma: "Atatamete kudasai", en: "Please heat it up", note: "For konbini bento and onigiri — they'll microwave it.", context: "konbini" },
      { jp: "これはいくらですか？", roma: "Kore wa ikura desu ka?", en: "How much is this?", note: "Point at the item.", context: "shopping" },
      { jp: "免税できますか？", roma: "Menzei dekimasu ka?", en: "Is tax-free available?", note: "Over ¥5,000 at participating stores. Bring your passport.", context: "shopping" },
      { jp: "現金だけですか？", roma: "Genkin dake desu ka?", en: "Cash only?", note: "VERY important in rural Kyushu. Always carry cash.", context: "paying" },
      { jp: "ATMはどこですか？", roma: "ATM wa doko desu ka?", en: "Where is the ATM?", note: "7-Eleven and post office ATMs accept foreign cards.", context: "cash" },
    ]
  },
  "Navigation": {
    icon: "🗺️",
    desc: "Finding your way, especially in rural Kyushu",
    phrases: [
      { jp: "ここはどこですか？", roma: "Koko wa doko desu ka?", en: "Where am I?", note: "If you're truly lost. Show a map on your phone.", context: "lost" },
      { jp: "右 / 左 / まっすぐ", roma: "Migi / Hidari / Massugu", en: "Right / Left / Straight", note: "Listen for these in directions.", context: "directions" },
      { jp: "近いですか？", roma: "Chikai desu ka?", en: "Is it nearby?", note: "Gauge walking distance.", context: "directions" },
      { jp: "歩いて何分ですか？", roma: "Aruite nanpun desu ka?", en: "How many minutes on foot?", note: "Japanese people give very accurate time estimates.", context: "directions" },
      { jp: "トイレはどこですか？", roma: "Toire wa doko desu ka?", en: "Where is the toilet?", note: "You'll need this. Japan has excellent public restrooms.", context: "essential" },
      { jp: "この近くにレストランはありますか？", roma: "Kono chikaku ni resutoran wa arimasu ka?", en: "Is there a restaurant nearby?", note: "Swap レストラン for: 病院 (byōin/hospital), 薬局 (yakkyoku/pharmacy).", context: "asking" },
    ]
  },
  "Emergencies": {
    icon: "🏥",
    desc: "Medical needs, emergencies, and getting help",
    phrases: [
      { jp: "助けてください！", roma: "Tasukete kudasai!", en: "Help me, please!", note: "For emergencies. Say it loudly and clearly.", context: "emergency" },
      { jp: "警察を呼んでください", roma: "Keisatsu o yonde kudasai", en: "Please call the police", note: "Police: 110.", context: "emergency" },
      { jp: "救急車を呼んでください", roma: "Kyūkyūsha o yonde kudasai", en: "Please call an ambulance", note: "Ambulance: 119. Free in Japan.", context: "emergency" },
      { jp: "病院に行きたいです", roma: "Byōin ni ikitai desu", en: "I want to go to a hospital", note: "For non-emergency medical needs.", context: "medical" },
      { jp: "気分が悪いです", roma: "Kibun ga warui desu", en: "I feel sick", note: "General 'I don't feel well'.", context: "medical" },
      { jp: "頭が痛いです", roma: "Atama ga itai desu", en: "I have a headache", note: "Replace 頭 (atama/head) with: お腹 (onaka/stomach), 喉 (nodo/throat).", context: "medical" },
      { jp: "パスポートをなくしました", roma: "Pasupōto o nakushimashita", en: "I lost my passport", note: "Go to the nearest police box (交番 / kōban).", context: "emergency" },
    ]
  },
  "Cultural": {
    icon: "⛩️",
    desc: "Temples, shrines, etiquette, and making connections",
    phrases: [
      { jp: "写真を撮ってもいいですか？", roma: "Shashin o totte mo ii desu ka?", en: "May I take a photo?", note: "ALWAYS ask first, especially at temples and of people.", context: "photos" },
      { jp: "写真を撮ってもらえますか？", roma: "Shashin o totte moraemasu ka?", en: "Could you take my photo?", note: "Hand over your phone with camera ready.", context: "photos" },
      { jp: "きれいですね", roma: "Kirei desu ne", en: "It's beautiful, isn't it?", note: "For cherry blossoms, scenery, food presentation.", context: "appreciation" },
      { jp: "すごいですね", roma: "Sugoi desu ne", en: "That's amazing!", note: "A versatile expression of admiration.", context: "appreciation" },
      { jp: "初めて日本に来ました", roma: "Hajimete Nihon ni kimashita", en: "This is my first time in Japan", note: "Great conversation starter — people love helping first-timers.", context: "social" },
      { jp: "日本が大好きです", roma: "Nihon ga daisuki desu", en: "I love Japan", note: "Sincere compliment that opens doors.", context: "social" },
      { jp: "乾杯！", roma: "Kanpai!", en: "Cheers!", note: "Essential for drinking with Kyle and Alex.", context: "drinking" },
      { jp: "桜はどこで見られますか？", roma: "Sakura wa doko de miraremasu ka?", en: "Where can I see cherry blossoms?", note: "Perfect for your late March / early April timing.", context: "sightseeing" },
    ]
  },
  "Kyushu": {
    icon: "🌋",
    desc: "Regional phrases for Kumamoto, Beppu, Aso, and Kurokawa",
    phrases: [
      { jp: "地獄めぐりのチケットをください", roma: "Jigoku meguri no chiketto o kudasai", en: "Ticket for the Hell Tour, please", note: "For Beppu's famous 'Hell' hot spring circuit.", context: "beppu" },
      { jp: "砂風呂に入りたいです", roma: "Suna buro ni hairitai desu", en: "I'd like to try the sand bath", note: "Beppu's unique hot sand baths.", context: "beppu" },
      { jp: "阿蘇山の火口は見られますか？", roma: "Asosan no kakō wa miraremasu ka?", en: "Can I see Mt. Aso's crater?", note: "Access depends on volcanic activity.", context: "aso" },
      { jp: "温泉手形をください", roma: "Onsen tegata o kudasai", en: "Onsen pass, please", note: "Kurokawa Onsen's wooden pass for bath hopping.", context: "kurokawa" },
      { jp: "湯めぐりをしたいです", roma: "Yumeguri o shitai desu", en: "I'd like to do the hot spring hopping", note: "Kurokawa's famous yumeguri.", context: "kurokawa" },
      { jp: "とんこつラーメンをください", roma: "Tonkotsu rāmen o kudasai", en: "Pork bone ramen, please", note: "Kyushu is the birthplace of tonkotsu ramen!", context: "food" },
      { jp: "馬刺しはありますか？", roma: "Basashi wa arimasu ka?", en: "Do you have horse sashimi?", note: "Kumamoto's famous delicacy.", context: "food" },
      { jp: "焼酎をお願いします", roma: "Shōchū o onegai shimasu", en: "Shōchū, please", note: "Kyushu's signature spirit.", context: "food" },
      { jp: "地元の名物は何ですか？", roma: "Jimoto no meibutsu wa nan desu ka?", en: "What's the local specialty?", note: "Every town in Kyushu has something unique!", context: "food" },
    ]
  },
  "AnimeJapan": {
    icon: "🎮",
    desc: "For AnimeJapan 2026 and pop culture shopping",
    phrases: [
      { jp: "限定グッズはありますか？", roma: "Gentei guzzu wa arimasu ka?", en: "Are there limited edition goods?", note: "Convention exclusives sell out fast.", context: "shopping" },
      { jp: "並んでいますか？", roma: "Narande imasu ka?", en: "Are you in line?", note: "Queues in Japan are orderly. Ask before joining.", context: "conventions" },
      { jp: "最後尾はどこですか？", roma: "Saibī wa doko desu ka?", en: "Where is the end of the line?", note: "For long convention or store queues.", context: "conventions" },
      { jp: "ガチャはどこですか？", roma: "Gacha wa doko desu ka?", en: "Where are the gacha machines?", note: "Capsule toy machines everywhere.", context: "shopping" },
      { jp: "コスプレエリアはどこですか？", roma: "Kosupure eria wa doko desu ka?", en: "Where is the cosplay area?", note: "For AnimeJapan's cosplay zones.", context: "conventions" },
    ]
  }
};

/* ───────── GRAMMAR DATA ───────── */
const PARTICLES = [
  {
    particle: "は", roma: "wa", role: "Topic marker",
    en: "As for / Speaking of",
    explanation: "Marks the main topic. Think of it as 'As for X...' — it tells the listener what you're talking about.",
    examples: [
      { jp: "私は　アメリカ人です", roma: "Watashi wa amerikajin desu", en: "I am American", breakdown: "I [topic] American am" },
      { jp: "天気は　いいです", roma: "Tenki wa ii desu", en: "The weather is nice", breakdown: "Weather [topic] nice is" },
    ]
  },
  {
    particle: "が", roma: "ga", role: "Subject marker",
    en: "Identifies the subject / 'but'",
    explanation: "Marks the grammatical subject, especially for new information, existence, or abilities. Also means 'but' between clauses.",
    examples: [
      { jp: "猫が　います", roma: "Neko ga imasu", en: "There is a cat", breakdown: "Cat [subject] exists" },
      { jp: "日本語が　分かります", roma: "Nihongo ga wakarimasu", en: "I understand Japanese", breakdown: "Japanese [subject] understand" },
    ]
  },
  {
    particle: "を", roma: "o", role: "Object marker",
    en: "The thing being acted upon",
    explanation: "Marks the direct object — the thing receiving the action. Like 'the' in 'eat THE ramen'.",
    examples: [
      { jp: "ラーメンを　食べます", roma: "Rāmen o tabemasu", en: "I eat ramen", breakdown: "Ramen [object] eat" },
      { jp: "写真を　撮ります", roma: "Shashin o torimasu", en: "I take a photo", breakdown: "Photo [object] take" },
    ]
  },
  {
    particle: "に", roma: "ni", role: "Direction / Time / Location",
    en: "To / At / On (specific)",
    explanation: "Points to a destination, a specific time, or where something exists. Very versatile — think 'to/at/on'.",
    examples: [
      { jp: "京都に　行きます", roma: "Kyōto ni ikimasu", en: "I go to Kyoto", breakdown: "Kyoto [to] go" },
      { jp: "三時に　会います", roma: "Sanji ni aimasu", en: "I'll meet at 3 o'clock", breakdown: "3 o'clock [at] meet" },
    ]
  },
  {
    particle: "で", roma: "de", role: "Means / Location of action",
    en: "By / At / With (method)",
    explanation: "Marks WHERE an action happens (not just where something is) or BY WHAT MEANS. 'Eat at the restaurant', 'go by bus'.",
    examples: [
      { jp: "バスで　行きます", roma: "Basu de ikimasu", en: "I go by bus", breakdown: "Bus [by means of] go" },
      { jp: "レストランで　食べます", roma: "Resutoran de tabemasu", en: "I eat at a restaurant", breakdown: "Restaurant [at/action] eat" },
    ]
  },
  {
    particle: "の", roma: "no", role: "Possession / Connection",
    en: "'s / of",
    explanation: "Connects two nouns — like 's in English. 'Japan's food', 'friend's car', 'hotel's onsen'.",
    examples: [
      { jp: "日本の　食べ物", roma: "Nihon no tabemono", en: "Japanese food (food of Japan)", breakdown: "Japan ['s] food" },
      { jp: "駅の　近く", roma: "Eki no chikaku", en: "Near the station", breakdown: "Station ['s] vicinity" },
    ]
  },
  {
    particle: "と", roma: "to", role: "And / With",
    en: "And / Together with",
    explanation: "Connects nouns ('A and B') or marks companionship ('with X').",
    examples: [
      { jp: "友達と　行きます", roma: "Tomodachi to ikimasu", en: "I go with a friend", breakdown: "Friend [with] go" },
      { jp: "ビールと　ラーメン", roma: "Bīru to rāmen", en: "Beer and ramen", breakdown: "Beer [and] ramen" },
    ]
  },
  {
    particle: "も", roma: "mo", role: "Also / Too",
    en: "Also / Too / Even",
    explanation: "Replaces は or が to mean 'also'. 'I'm American too', 'This one too please'.",
    examples: [
      { jp: "これも　お願いします", roma: "Kore mo onegai shimasu", en: "This one too, please", breakdown: "This [also] please" },
      { jp: "私も　行きたいです", roma: "Watashi mo ikitai desu", en: "I also want to go", breakdown: "I [also] want-to-go" },
    ]
  },
  {
    particle: "か", roma: "ka", role: "Question marker",
    en: "? (turns statements into questions)",
    explanation: "Add to the end of any sentence to make it a question. It IS the question mark.",
    examples: [
      { jp: "これは　何ですか？", roma: "Kore wa nan desu ka?", en: "What is this?", breakdown: "This [topic] what is [?]" },
      { jp: "大丈夫ですか？", roma: "Daijōbu desu ka?", en: "Are you okay?", breakdown: "Okay is [?]" },
    ]
  },
  {
    particle: "から / まで", roma: "kara / made", role: "From / Until",
    en: "From / Until (to)",
    explanation: "Mark starting and ending points — for time or location.",
    examples: [
      { jp: "東京から　京都まで", roma: "Tōkyō kara Kyōto made", en: "From Tokyo to Kyoto", breakdown: "Tokyo [from] Kyoto [to]" },
      { jp: "九時から　五時まで", roma: "Kuji kara goji made", en: "From 9 to 5", breakdown: "9 o'clock [from] 5 o'clock [until]" },
    ]
  },
];

const CONNECTORS = [
  { jp: "だから", roma: "dakara", en: "So / Therefore", usage: "Cause → Result. 'It's raining, SO I'll take the bus.'", example: { jp: "雨だから、バスで行きます", roma: "Ame dakara, basu de ikimasu", en: "It's raining, so I'll go by bus" } },
  { jp: "でも", roma: "demo", en: "But / However", usage: "Contrast. Start of sentence. 'But I want to go.'", example: { jp: "高いです。でも、美味しいです", roma: "Takai desu. Demo, oishii desu", en: "It's expensive. But it's delicious" } },
  { jp: "けど / が", roma: "kedo / ga", en: "But / Although", usage: "Softer 'but', joins two clauses. Very common in speech.", example: { jp: "高いけど、美味しいです", roma: "Takai kedo, oishii desu", en: "It's expensive, but delicious" } },
  { jp: "そして", roma: "soshite", en: "And then / And also", usage: "Connecting events in sequence or adding info.", example: { jp: "京都に行きます。そして、大阪に行きます", roma: "Kyōto ni ikimasu. Soshite, Ōsaka ni ikimasu", en: "I'll go to Kyoto. And then Osaka" } },
  { jp: "それから", roma: "sorekara", en: "After that / And then", usage: "Sequential — 'first X, then after that Y'.", example: { jp: "温泉に入ります。それから、夕食です", roma: "Onsen ni hairimasu. Sorekara, yūshoku desu", en: "I'll take the onsen. After that, dinner" } },
  { jp: "だけど", roma: "dakedo", en: "But / However (casual)", usage: "Casual version of でも. Use in relaxed conversation.", example: { jp: "行きたい。だけど、時間がない", roma: "Ikitai. Dakedo, jikan ga nai", en: "I want to go. But I don't have time" } },
  { jp: "なぜ / どうして", roma: "naze / dōshite", en: "Why?", usage: "Ask reasons. どうして is softer, なぜ more direct.", example: { jp: "どうして閉まっていますか？", roma: "Dōshite shimatte imasu ka?", en: "Why is it closed?" } },
  { jp: "もし", roma: "moshi", en: "If", usage: "Hypothetical. 'If it rains...' Often paired with たら (tara).", example: { jp: "もし雨なら、タクシーで行きます", roma: "Moshi ame nara, takushī de ikimasu", en: "If it rains, I'll go by taxi" } },
  { jp: "たぶん", roma: "tabun", en: "Maybe / Probably", usage: "Hedging. 'Maybe I'll go.' Very useful for being non-committal.", example: { jp: "たぶん明日行きます", roma: "Tabun ashita ikimasu", en: "I'll probably go tomorrow" } },
  { jp: "まだ", roma: "mada", en: "Still / Not yet", usage: "'Still waiting', 'not yet arrived'. Very handy.", example: { jp: "まだです", roma: "Mada desu", en: "Not yet" } },
  { jp: "もう", roma: "mō", en: "Already / Anymore", usage: "'Already finished', 'not anymore'.", example: { jp: "もう食べました", roma: "Mō tabemashita", en: "I already ate" } },
  { jp: "とても / すごく", roma: "totemo / sugoku", en: "Very / Really", usage: "Intensifiers. すごく is more casual.", example: { jp: "とても美味しいです", roma: "Totemo oishii desu", en: "It's very delicious" } },
];

const QUESTION_WORDS = [
  { jp: "何（なに/なん）", roma: "nani / nan", en: "What", example: "これは何ですか？ — Kore wa nan desu ka? — What is this?" },
  { jp: "どこ", roma: "doko", en: "Where", example: "トイレはどこですか？ — Toire wa doko desu ka? — Where is the toilet?" },
  { jp: "いつ", roma: "itsu", en: "When", example: "いつ出発しますか？ — Itsu shuppatsu shimasu ka? — When do we depart?" },
  { jp: "だれ / どなた", roma: "dare / donata", en: "Who (casual / polite)", example: "だれですか？ — Dare desu ka? — Who is it?" },
  { jp: "どう / いかが", roma: "dō / ikaga", en: "How (casual / polite)", example: "どうですか？ — Dō desu ka? — How is it?" },
  { jp: "いくら", roma: "ikura", en: "How much (price)", example: "いくらですか？ — Ikura desu ka? — How much?" },
  { jp: "いくつ", roma: "ikutsu", en: "How many", example: "いくつ要りますか？ — Ikutsu irimasu ka? — How many do you need?" },
  { jp: "どれ", roma: "dore", en: "Which one", example: "どれがいいですか？ — Dore ga ii desu ka? — Which one is good?" },
  { jp: "どうやって", roma: "dō yatte", en: "How (method)", example: "どうやって行きますか？ — Dō yatte ikimasu ka? — How do I get there?" },
];

const SENTENCE_PATTERNS = [
  {
    title: "Basic Fact",
    pattern: "[Topic] は [Description] です",
    patternRoma: "[Topic] wa [Description] desu",
    en: "[Topic] is [Description]",
    examples: [
      { jp: "これは ラーメンです", roma: "Kore wa rāmen desu", en: "This is ramen" },
      { jp: "私は アメリカ人です", roma: "Watashi wa amerikajin desu", en: "I am American" },
    ]
  },
  {
    title: "Want To Do",
    pattern: "[Place] に [Verb stem]たいです",
    patternRoma: "[Place] ni [Verb stem]-tai desu",
    en: "I want to [verb] to/at [place]",
    examples: [
      { jp: "京都に 行きたいです", roma: "Kyōto ni ikitai desu", en: "I want to go to Kyoto" },
      { jp: "温泉に 入りたいです", roma: "Onsen ni hairitai desu", en: "I want to enter the onsen" },
    ]
  },
  {
    title: "Is There / Do You Have",
    pattern: "[Thing] は ありますか？",
    patternRoma: "[Thing] wa arimasu ka?",
    en: "Is/Are there [thing]? / Do you have [thing]?",
    examples: [
      { jp: "Wi-Fiは ありますか？", roma: "Wi-Fi wa arimasu ka?", en: "Is there Wi-Fi?" },
      { jp: "空いている部屋は ありますか？", roma: "Aiteiru heya wa arimasu ka?", en: "Are there available rooms?" },
    ]
  },
  {
    title: "May I / Is It OK?",
    pattern: "[Verb て-form] もいいですか？",
    patternRoma: "[Verb te-form] mo ii desu ka?",
    en: "May I [verb]? / Is it OK to [verb]?",
    examples: [
      { jp: "写真を撮っても いいですか？", roma: "Shashin o totte mo ii desu ka?", en: "May I take a photo?" },
      { jp: "ここに座っても いいですか？", roma: "Koko ni suwatte mo ii desu ka?", en: "May I sit here?" },
    ]
  },
  {
    title: "Please Do [X]",
    pattern: "[Thing] を お願いします / [Verb て-form] ください",
    patternRoma: "[Thing] o onegai shimasu / [Verb te] kudasai",
    en: "[Thing] please / Please [verb]",
    examples: [
      { jp: "ビールを お願いします", roma: "Bīru o onegai shimasu", en: "Beer, please" },
      { jp: "待って ください", roma: "Matte kudasai", en: "Please wait" },
    ]
  },
  {
    title: "Going Somewhere By [Method]",
    pattern: "[Place] に [Method] で 行きます",
    patternRoma: "[Place] ni [Method] de ikimasu",
    en: "I go to [place] by [method]",
    examples: [
      { jp: "空港に タクシーで 行きます", roma: "Kūkō ni takushī de ikimasu", en: "I go to the airport by taxi" },
      { jp: "別府に 電車で 行きます", roma: "Beppu ni densha de ikimasu", en: "I go to Beppu by train" },
    ]
  },
];

const USEFUL_VOCAB = [
  { jp: "これ / それ / あれ", roma: "kore / sore / are", en: "This / That (near you) / That (over there)" },
  { jp: "ここ / そこ / あそこ", roma: "koko / soko / asoko", en: "Here / There (near you) / Over there" },
  { jp: "今 / 後で / 先に", roma: "ima / ato de / saki ni", en: "Now / Later / First / Before" },
  { jp: "大きい / 小さい", roma: "ōkii / chiisai", en: "Big / Small" },
  { jp: "高い / 安い", roma: "takai / yasui", en: "Expensive / Cheap" },
  { jp: "暑い / 寒い", roma: "atsui / samui", en: "Hot (weather) / Cold (weather)" },
  { jp: "新しい / 古い", roma: "atarashii / furui", en: "New / Old" },
  { jp: "いい / 悪い", roma: "ii / warui", en: "Good / Bad" },
  { jp: "多い / 少ない", roma: "ōi / sukunai", en: "Many / Few" },
  { jp: "早い / 遅い", roma: "hayai / osoi", en: "Early-Fast / Late-Slow" },
];

/* ───────── QUIZ POOL ───────── */
const QUIZ_POOL = Object.values(PHRASES).flatMap(cat =>
  cat.phrases.filter(p => !p.jp.includes("＿") && p.jp.length < 20).map(p => ({
    jp: p.jp, roma: p.roma, en: p.en
  }))
);

/* ───────── COMPONENTS ───────── */
function AudioBtn({ text, slow, size = 18 }) {
  const [playing, setPlaying] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    setPlaying(true);
    if (slow) speakSlow(text); else speak(text);
    setTimeout(() => setPlaying(false), 1500);
  };
  return (
    <button onClick={handleClick} title={slow ? "Play slowly" : "Play audio"} style={{
      background: playing ? "rgba(139,105,64,0.2)" : "rgba(196,164,132,0.08)",
      border: "1px solid rgba(196,164,132,0.15)",
      borderRadius: "50%",
      width: size + 12, height: size + 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", flexShrink: 0,
      transition: "all 0.15s ease",
      color: playing ? "#c4a484" : "#8b7b6b",
      fontSize: size - 4,
    }}>
      {slow ? "🐢" : "🔊"}
    </button>
  );
}

function PhraseCard({ phrase, index, isFav, toggleFav, isExpanded, toggleExpand, showCategory }) {
  return (
    <div className="phrase-card" style={{
      background: "rgba(196,164,132,0.04)",
      border: "1px solid rgba(196,164,132,0.1)",
      borderRadius: 10,
      overflow: "hidden",
      animationDelay: `${index * 30}ms`,
      opacity: 0,
    }}>
      <div onClick={toggleExpand} style={{
        padding: "14px 16px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}>
        <div style={{ flex: 1 }}>
          {showCategory && phrase.category && (
            <div style={{ fontSize: 10, color: "#6b5b4b", marginBottom: 4, letterSpacing: 1 }}>
              {PHRASES[phrase.category]?.icon} {phrase.category.toUpperCase()}
            </div>
          )}
          <div style={{
            fontSize: 20,
            fontFamily: "'Noto Sans JP', sans-serif",
            fontWeight: 500,
            color: "#dbc1a0",
            marginBottom: 4,
            lineHeight: 1.4,
          }}>
            {phrase.jp}
          </div>
          <div style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginBottom: 2 }}>
            {phrase.roma}
          </div>
          <div style={{ fontSize: 13, color: "#a99b8b" }}>
            {phrase.en}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          <button onClick={(e) => { e.stopPropagation(); toggleFav(); }} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, padding: 2, opacity: isFav ? 1 : 0.3, transition: "opacity 0.2s", flexShrink: 0,
          }}>
            {isFav ? "⭐" : "☆"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 16px 14px", animation: "fadeIn 0.2s ease" }}>
          {/* Audio Buttons */}
          <div style={{
            display: "flex", gap: 8, marginBottom: 10,
            padding: "8px 10px",
            background: "rgba(196,164,132,0.04)",
            borderRadius: 8,
          }}>
            <AudioBtn text={phrase.jp} />
            <AudioBtn text={phrase.jp} slow />
            <span style={{ fontSize: 11, color: "#6b5b4b", display: "flex", alignItems: "center", marginLeft: 4 }}>
              Tap to hear · 🐢 for slow
            </span>
          </div>

          {phrase.note && (
            <div style={{
              padding: "10px 12px",
              background: "rgba(139,105,64,0.08)",
              borderRadius: 6,
              borderLeft: "2px solid #8b6940",
            }}>
              <div style={{ fontSize: 10, color: "#8b6940", fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>💡 TIP</div>
              <div style={{ fontSize: 12, color: "#a08060", lineHeight: 1.6 }}>{phrase.note}</div>
            </div>
          )}
          {phrase.context && (
            <div style={{
              marginTop: 8,
              display: "inline-block",
              padding: "3px 10px",
              background: "rgba(196,164,132,0.06)",
              borderRadius: 12,
              fontSize: 10,
              color: "#6b5b4b",
              border: "1px solid rgba(196,164,132,0.1)",
            }}>📍 {phrase.context}</div>
          )}
        </div>
      )}
    </div>
  );
}

function GrammarSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "rgba(196,164,132,0.04)",
      border: "1px solid rgba(196,164,132,0.1)",
      borderRadius: 10,
      marginBottom: 10,
      overflow: "hidden",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%",
        padding: "14px 16px",
        background: "transparent",
        border: "none",
        color: "#dbc1a0",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Noto Serif', serif",
        fontSize: 15,
        fontWeight: 600,
        textAlign: "left",
      }}>
        {title}
        <span style={{ color: "#6b5b4b", fontSize: 12, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────── MAIN APP ───────── */
function App() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeCategory, setActiveCategory] = useState("Essentials");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("jp-favs2") || "[]")); } catch { return new Set(); }
  });
  const [expandedPhrase, setExpandedPhrase] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDirection, setQuizDirection] = useState("en-to-jp");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [grammarSub, setGrammarSub] = useState("structure");

  // Preload voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const h = () => window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", h);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", h);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("jp-favs2", JSON.stringify([...favorites])); } catch {}
  }, [favorites]);

  const toggleFav = useCallback((key) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const filteredPhrases = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const results = [];
    Object.entries(PHRASES).forEach(([cat, data]) => {
      data.phrases.forEach(p => {
        if (p.en.toLowerCase().includes(q) || p.roma.toLowerCase().includes(q) || p.jp.includes(q) || (p.note && p.note.toLowerCase().includes(q))) {
          results.push({ ...p, category: cat });
        }
      });
    });
    return results;
  }, [search]);

  const favPhrases = useMemo(() => {
    const results = [];
    Object.entries(PHRASES).forEach(([cat, data]) => {
      data.phrases.forEach(p => {
        if (favorites.has(p.jp)) results.push({ ...p, category: cat });
      });
    });
    return results;
  }, [favorites]);

  const generateQuiz = useCallback(() => {
    const pool = [...QUIZ_POOL].sort(() => Math.random() - 0.5);
    const correct = pool[0];
    const wrongOptions = pool.slice(1, 4);
    const options = [...wrongOptions, correct].sort(() => Math.random() - 0.5);
    setQuizState({ correct, options });
    setShowAnswer(false);
    setSelectedAnswer(null);
  }, []);

  const handleQuizAnswer = useCallback((option) => {
    if (showAnswer) return;
    setSelectedAnswer(option);
    setShowAnswer(true);
    setQuizScore(prev => ({
      correct: prev.correct + (option.jp === quizState.correct.jp ? 1 : 0),
      total: prev.total + 1
    }));
  }, [showAnswer, quizState]);

  const categories = Object.keys(PHRASES);
  const totalPhrases = Object.values(PHRASES).reduce((sum, cat) => sum + cat.phrases.length, 0);

  const tabStyle = (id) => ({
    flex: 1,
    padding: "11px 4px",
    background: activeTab === id ? "rgba(196,164,132,0.1)" : "transparent",
    border: "none",
    borderBottom: activeTab === id ? "2px solid #8b6940" : "2px solid transparent",
    color: activeTab === id ? "#c4a484" : "#6b5b4b",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "'Noto Serif', serif",
    fontWeight: activeTab === id ? 600 : 400,
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1a1412 0%, #2d1f1a 30%, #1a1412 100%)",
      color: "#e8ddd3",
      fontFamily: "'Noto Serif', 'Hiragino Mincho ProN', Georgia, serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700&family=Noto+Sans+JP:wght@300;400;500;700&family=Zen+Antique&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #5a3e2e; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .phrase-card { animation: fadeIn 0.3s ease forwards; }
        .category-btn { transition: all 0.2s ease; }
        .category-btn:hover { transform: translateY(-1px); }
        .quiz-option { transition: all 0.15s ease; cursor: pointer; }
        .quiz-option:hover:not(.answered) { transform: translateX(4px); background: rgba(196,164,132,0.12); }
        .grammar-sub:hover { background: rgba(196,164,132,0.1) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "28px 24px 16px",
        textAlign: "center",
        borderBottom: "1px solid rgba(196,164,132,0.15)",
        background: "linear-gradient(180deg, rgba(139,90,43,0.12) 0%, transparent 100%)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 12, right: 20, fontSize: 40, opacity: 0.06, fontFamily: "'Zen Antique', serif" }}>日本語</div>
        <div style={{ fontSize: 10, letterSpacing: 6, textTransform: "uppercase", color: "#8b6940", marginBottom: 6 }}>Japan Travel Companion</div>
        <h1 style={{
          fontSize: 26,
          fontWeight: 700,
          background: "linear-gradient(135deg, #c4a484, #dbc1a0, #8b6940)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontFamily: "'Zen Antique', 'Noto Serif', serif",
          marginBottom: 3,
        }}>旅の言葉</h1>
        <div style={{ fontSize: 12, color: "#8b7b6b", fontStyle: "italic" }}>
          Tabi no Kotoba — Words for the Journey
        </div>
        <div style={{ fontSize: 10, color: "#5a4a3a", marginTop: 4 }}>
          {totalPhrases} phrases · Audio · Grammar · Practice Quizzes
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(196,164,132,0.12)",
        background: "rgba(0,0,0,0.15)",
      }}>
        <button onClick={() => setActiveTab("browse")} style={tabStyle("browse")}>📖 Phrases</button>
        <button onClick={() => setActiveTab("grammar")} style={tabStyle("grammar")}>🧩 Grammar</button>
        <button onClick={() => setActiveTab("favorites")} style={tabStyle("favorites")}>⭐ Saved ({favorites.size})</button>
        <button onClick={() => { setActiveTab("quiz"); if (!quizState) generateQuiz(); }} style={tabStyle("quiz")}>🎯 Quiz</button>
      </div>

      {/* ═══════ BROWSE TAB ═══════ */}
      {activeTab === "browse" && (
        <div>
          {/* Search */}
          <div style={{ padding: "14px 20px 6px" }}>
            <div style={{
              position: "relative",
              background: "rgba(196,164,132,0.06)",
              border: "1px solid rgba(196,164,132,0.15)",
              borderRadius: 8,
            }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, opacity: 0.4 }}>🔍</span>
              <input
                type="text"
                placeholder="Search English, romaji, or Japanese..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "11px 36px 11px 36px",
                  background: "transparent", border: "none", color: "#e8ddd3",
                  fontSize: 13, fontFamily: "'Noto Serif', serif", outline: "none",
                }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(196,164,132,0.15)", border: "none", color: "#8b7b6b",
                  borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              )}
            </div>
          </div>

          {!filteredPhrases && (
            <div style={{ padding: "6px 20px 20px" }}>
              {/* Category Pills */}
              <div style={{
                display: "flex", gap: 6, overflowX: "auto", padding: "6px 0 14px",
                WebkitOverflowScrolling: "touch",
              }}>
                {categories.map(cat => (
                  <button key={cat} className="category-btn" onClick={() => setActiveCategory(cat)} style={{
                    flexShrink: 0, padding: "7px 12px", borderRadius: 18,
                    border: activeCategory === cat ? "1px solid #8b6940" : "1px solid rgba(196,164,132,0.15)",
                    background: activeCategory === cat ? "rgba(139,105,64,0.2)" : "rgba(196,164,132,0.04)",
                    color: activeCategory === cat ? "#c4a484" : "#8b7b6b",
                    cursor: "pointer", fontSize: 11, fontFamily: "'Noto Serif', serif",
                    whiteSpace: "nowrap", fontWeight: activeCategory === cat ? 600 : 400,
                  }}>
                    {PHRASES[cat].icon} {cat}
                  </button>
                ))}
              </div>

              <div style={{
                padding: "8px 12px", background: "rgba(139,105,64,0.06)",
                borderRadius: 8, marginBottom: 14, borderLeft: "3px solid #8b6940",
              }}>
                <div style={{ fontSize: 11, color: "#8b7b6b" }}>{PHRASES[activeCategory].desc}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PHRASES[activeCategory].phrases.map((p, i) => (
                  <PhraseCard key={p.jp + i} phrase={p} index={i}
                    isFav={favorites.has(p.jp)} toggleFav={() => toggleFav(p.jp)}
                    isExpanded={expandedPhrase === p.jp}
                    toggleExpand={() => setExpandedPhrase(expandedPhrase === p.jp ? null : p.jp)} />
                ))}
              </div>
            </div>
          )}

          {filteredPhrases && (
            <div style={{ padding: "10px 20px 20px" }}>
              <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 10 }}>
                {filteredPhrases.length} result{filteredPhrases.length !== 1 ? "s" : ""} for "{search}"
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredPhrases.map((p, i) => (
                  <PhraseCard key={p.jp + i} phrase={p} index={i}
                    isFav={favorites.has(p.jp)} toggleFav={() => toggleFav(p.jp)}
                    isExpanded={expandedPhrase === p.jp}
                    toggleExpand={() => setExpandedPhrase(expandedPhrase === p.jp ? null : p.jp)}
                    showCategory={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ GRAMMAR TAB ═══════ */}
      {activeTab === "grammar" && (
        <div>
          {/* Grammar Sub-nav */}
          <div style={{
            display: "flex", gap: 2, padding: "10px 20px",
            overflowX: "auto", WebkitOverflowScrolling: "touch",
          }}>
            {[
              { id: "structure", label: "🏗️ Sentence Structure" },
              { id: "particles", label: "🧩 Particles" },
              { id: "connectors", label: "🔗 Connectors" },
              { id: "questions", label: "❓ Question Words" },
              { id: "vocab", label: "📝 Core Vocab" },
              { id: "pronunciation", label: "🗣️ Pronunciation" },
            ].map(s => (
              <button key={s.id} className="grammar-sub" onClick={() => setGrammarSub(s.id)} style={{
                flexShrink: 0, padding: "7px 12px", borderRadius: 16,
                border: grammarSub === s.id ? "1px solid #8b6940" : "1px solid transparent",
                background: grammarSub === s.id ? "rgba(139,105,64,0.15)" : "transparent",
                color: grammarSub === s.id ? "#c4a484" : "#6b5b4b",
                cursor: "pointer", fontSize: 11, fontFamily: "'Noto Serif', serif",
                whiteSpace: "nowrap",
              }}>{s.label}</button>
            ))}
          </div>

          <div style={{ padding: "4px 20px 24px" }}>

            {/* ─── SENTENCE STRUCTURE ─── */}
            {grammarSub === "structure" && (
              <div>
                {/* THE KEY INSIGHT */}
                <div style={{
                  padding: "16px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c4a484", marginBottom: 8 }}>
                    🔑 The #1 Rule of Japanese
                  </div>
                  <div style={{ fontSize: 13, color: "#a99b8b", lineHeight: 1.7 }}>
                    English is <strong style={{ color: "#dbc1a0" }}>Subject → Verb → Object</strong> (I eat ramen).
                  </div>
                  <div style={{ fontSize: 13, color: "#a99b8b", lineHeight: 1.7 }}>
                    Japanese is <strong style={{ color: "#dbc1a0" }}>Subject → Object → Verb</strong> (I ramen eat).
                  </div>
                  <div style={{
                    marginTop: 12, padding: "10px 14px",
                    background: "rgba(0,0,0,0.2)", borderRadius: 8,
                    fontFamily: "'Noto Sans JP', monospace",
                  }}>
                    <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 4 }}>English:</div>
                    <div style={{ fontSize: 14, color: "#c4a484", marginBottom: 8 }}>
                      <span style={{ background: "rgba(100,140,200,0.15)", padding: "2px 6px", borderRadius: 4 }}>I</span>
                      {" "}
                      <span style={{ background: "rgba(200,100,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>eat</span>
                      {" "}
                      <span style={{ background: "rgba(100,180,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>ramen</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 4 }}>Japanese:</div>
                    <div style={{ fontSize: 14, color: "#c4a484" }}>
                      <span style={{ background: "rgba(100,140,200,0.15)", padding: "2px 6px", borderRadius: 4 }}>私は</span>
                      {" "}
                      <span style={{ background: "rgba(100,180,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>ラーメンを</span>
                      {" "}
                      <span style={{ background: "rgba(200,100,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>食べます</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 6 }}>
                      <span style={{ background: "rgba(100,140,200,0.15)", padding: "1px 4px", borderRadius: 3 }}>I [wa]</span>
                      {" "}
                      <span style={{ background: "rgba(100,180,100,0.15)", padding: "1px 4px", borderRadius: 3 }}>ramen [o]</span>
                      {" "}
                      <span style={{ background: "rgba(200,100,100,0.15)", padding: "1px 4px", borderRadius: 3 }}>eat</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#8b7b6b", marginTop: 12, lineHeight: 1.6 }}>
                    <strong style={{ color: "#a08060" }}>The verb ALWAYS goes last.</strong> Everything else can shift around as long as the little particles (は, を, に, で) mark what role each word plays. This is exactly like how you built sentences in Spain — learn the little connecting words and snap them together.
                  </div>
                </div>

                {/* Pro tip */}
                <div style={{
                  padding: "12px 14px",
                  background: "rgba(76,140,76,0.06)",
                  border: "1px solid rgba(76,140,76,0.15)",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#8bc48b",
                  lineHeight: 1.6,
                }}>
                  <strong>Japan hack:</strong> You can often DROP the subject entirely. Japanese people rarely say "I" (watashi). Context handles it. So "ラーメンを食べます" (ramen o tabemasu) already means "I eat ramen" — shorter and more natural than including 私は.
                </div>

                {/* Sentence Patterns */}
                {SENTENCE_PATTERNS.map((pat, i) => (
                  <GrammarSection key={i} title={`${pat.title}`} defaultOpen={i === 0}>
                    <div style={{
                      padding: "10px 12px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 8,
                      marginBottom: 10,
                      fontFamily: "'Noto Sans JP', monospace",
                    }}>
                      <div style={{ fontSize: 14, color: "#c4a484" }}>{pat.pattern}</div>
                      <div style={{ fontSize: 11, color: "#8b7b6b", marginTop: 2 }}>{pat.patternRoma}</div>
                      <div style={{ fontSize: 12, color: "#6b5b4b", marginTop: 2 }}>{pat.en}</div>
                    </div>
                    {pat.examples.map((ex, j) => (
                      <div key={j} style={{
                        padding: "10px 12px", marginBottom: 6,
                        background: "rgba(196,164,132,0.04)",
                        borderRadius: 6,
                        borderLeft: "2px solid rgba(139,105,64,0.3)",
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <AudioBtn text={ex.jp} size={14} />
                          <span style={{ fontSize: 16, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{ex.jp}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#8b7b6b", fontStyle: "italic" }}>{ex.roma}</div>
                        <div style={{ fontSize: 12, color: "#a99b8b" }}>{ex.en}</div>
                      </div>
                    ))}
                  </GrammarSection>
                ))}
              </div>
            )}

            {/* ─── PARTICLES ─── */}
            {grammarSub === "particles" && (
              <div>
                <div style={{
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#a99b8b",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ color: "#c4a484" }}>Particles are your superpower.</strong> They're the tiny words that tell you WHO does WHAT to WHOM, WHERE, WHEN, and HOW. In Spanish you had prepositions like "para", "con", "en" — Japanese particles work the same way but they come <em>after</em> the word instead of before it.
                </div>

                {PARTICLES.map((p, i) => (
                  <GrammarSection key={i} title={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontFamily: "'Noto Sans JP', sans-serif",
                        fontSize: 20,
                        color: "#c4a484",
                      }}>{p.particle}</span>
                      <span style={{ fontSize: 12, color: "#8b7b6b" }}>({p.roma}) — {p.role}</span>
                    </span>
                  } defaultOpen={i === 0}>
                    <div style={{ fontSize: 12, color: "#a99b8b", lineHeight: 1.6, marginBottom: 10 }}>
                      <strong style={{ color: "#a08060" }}>Think of it as: "{p.en}"</strong>
                      <br />{p.explanation}
                    </div>
                    {p.examples.map((ex, j) => (
                      <div key={j} style={{
                        padding: "10px 12px", marginBottom: 6,
                        background: "rgba(196,164,132,0.04)",
                        borderRadius: 6,
                        borderLeft: "2px solid rgba(139,105,64,0.3)",
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <AudioBtn text={ex.jp.replace(/　/g, "")} size={14} />
                          <span style={{ fontSize: 16, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{ex.jp}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#8b7b6b", fontStyle: "italic" }}>{ex.roma}</div>
                        <div style={{ fontSize: 12, color: "#a99b8b" }}>{ex.en}</div>
                        <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 4, fontFamily: "monospace" }}>
                          ↳ {ex.breakdown}
                        </div>
                      </div>
                    ))}
                  </GrammarSection>
                ))}
              </div>
            )}

            {/* ─── CONNECTORS ─── */}
            {grammarSub === "connectors" && (
              <div>
                <div style={{
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#a99b8b",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ color: "#c4a484" }}>These are your sentence glue.</strong> Just like "pero", "porque", "entonces" let you chain ideas in Spanish, these words let you go beyond one-off phrases and actually express thoughts, reasons, and preferences.
                </div>

                {CONNECTORS.map((c, i) => (
                  <div key={i} style={{
                    background: "rgba(196,164,132,0.04)",
                    border: "1px solid rgba(196,164,132,0.1)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 8,
                    animation: "fadeIn 0.3s ease forwards",
                    animationDelay: `${i * 30}ms`,
                    opacity: 0,
                  }} className="phrase-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <span style={{
                          fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif",
                          fontWeight: 500, color: "#dbc1a0",
                        }}>{c.jp}</span>
                        <span style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginLeft: 8 }}>{c.roma}</span>
                      </div>
                      <AudioBtn text={c.jp} size={14} />
                    </div>
                    <div style={{ fontSize: 14, color: "#c4a484", fontWeight: 600, marginBottom: 4 }}>{c.en}</div>
                    <div style={{ fontSize: 12, color: "#8b7b6b", marginBottom: 8, lineHeight: 1.5 }}>{c.usage}</div>
                    <div style={{
                      padding: "10px 12px",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: 6,
                      borderLeft: "2px solid rgba(139,105,64,0.3)",
                    }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <AudioBtn text={c.example.jp} size={14} />
                        <span style={{ fontSize: 15, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{c.example.jp}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#8b7b6b", fontStyle: "italic" }}>{c.example.roma}</div>
                      <div style={{ fontSize: 12, color: "#a99b8b" }}>{c.example.en}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── QUESTION WORDS ─── */}
            {grammarSub === "questions" && (
              <div>
                <div style={{
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#a99b8b",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ color: "#c4a484" }}>Just add か (ka) to the end.</strong> Any statement becomes a question by adding か. And these question words slot in where the answer would go — "This is [what]?" = "これは何ですか？"
                </div>

                {QUESTION_WORDS.map((q, i) => (
                  <div key={i} style={{
                    background: "rgba(196,164,132,0.04)",
                    border: "1px solid rgba(196,164,132,0.1)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    marginBottom: 8,
                    animation: "fadeIn 0.3s ease forwards",
                    animationDelay: `${i * 30}ms`,
                    opacity: 0,
                  }} className="phrase-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <span style={{
                          fontSize: 22, fontFamily: "'Noto Sans JP', sans-serif",
                          fontWeight: 500, color: "#dbc1a0",
                        }}>{q.jp}</span>
                        <span style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginLeft: 8 }}>{q.roma}</span>
                      </div>
                      <AudioBtn text={q.jp.split("（")[0].split(" / ")[0]} size={14} />
                    </div>
                    <div style={{ fontSize: 15, color: "#c4a484", fontWeight: 600, marginBottom: 6 }}>{q.en}</div>
                    <div style={{
                      padding: "8px 12px",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#8b7b6b",
                      lineHeight: 1.6,
                      fontStyle: "italic",
                    }}>{q.example}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── CORE VOCAB ─── */}
            {grammarSub === "vocab" && (
              <div>
                <div style={{
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#a99b8b",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ color: "#c4a484" }}>Essential building blocks.</strong> These demonstratives, adjectives, and time words let you point at things, describe what you need, and add nuance. Combine with particles and patterns from the other sections.
                </div>

                {USEFUL_VOCAB.map((v, i) => (
                  <div key={i} style={{
                    background: "rgba(196,164,132,0.04)",
                    border: "1px solid rgba(196,164,132,0.1)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    marginBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    animation: "fadeIn 0.3s ease forwards",
                    animationDelay: `${i * 30}ms`,
                    opacity: 0,
                  }} className="phrase-card">
                    <div>
                      <div style={{ fontSize: 18, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0", marginBottom: 2 }}>{v.jp}</div>
                      <div style={{ fontSize: 12, color: "#8b7b6b", fontStyle: "italic" }}>{v.roma}</div>
                      <div style={{ fontSize: 12, color: "#a99b8b" }}>{v.en}</div>
                    </div>
                    <AudioBtn text={v.jp.split(" / ")[0]} size={14} />
                  </div>
                ))}
              </div>
            )}

            {/* ─── PRONUNCIATION ─── */}
            {grammarSub === "pronunciation" && (
              <div>
                <div style={{
                  padding: "14px",
                  background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))",
                  border: "1px solid rgba(196,164,132,0.2)",
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#a99b8b",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ color: "#c4a484" }}>Good news: Japanese pronunciation is very consistent.</strong> Unlike English, each character always makes the same sound. There are only 5 vowel sounds and no silent letters (almost). If you can say the vowels right, you're 80% there.
                </div>

                {/* Vowels */}
                <GrammarSection title="🗣️ The 5 Vowels — Master These First" defaultOpen={true}>
                  {[
                    { char: "あ a", sound: "ah", like: "Like 'a' in 'father'", ex: "ありがとう", exRoma: "arigatō" },
                    { char: "い i", sound: "ee", like: "Like 'ee' in 'feet'", ex: "いい", exRoma: "ii" },
                    { char: "う u", sound: "oo", like: "Like 'oo' in 'food' but shorter, lips relaxed", ex: "うみ", exRoma: "umi" },
                    { char: "え e", sound: "eh", like: "Like 'e' in 'get'", ex: "えき", exRoma: "eki" },
                    { char: "お o", sound: "oh", like: "Like 'o' in 'go' but shorter", ex: "おはよう", exRoma: "ohayō" },
                  ].map((v, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", marginBottom: 6,
                      background: "rgba(196,164,132,0.04)", borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 24, fontFamily: "'Noto Sans JP'", color: "#c4a484", width: 60, textAlign: "center", flexShrink: 0 }}>{v.char}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#dbc1a0" }}>{v.like}</div>
                        <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 2 }}>Example: {v.ex} ({v.exRoma})</div>
                      </div>
                      <AudioBtn text={v.ex} size={14} />
                    </div>
                  ))}
                </GrammarSection>

                <GrammarSection title="⚡ Key Pronunciation Rules">
                  {[
                    { rule: "Long vowels (ō, ū)", detail: "Hold the sound longer — don't change it. おおさか (Ōsaka) has a long 'o'. It's the same 'o' sound, just stretched.", example: "東京 (Tōkyō) — both o's are long" },
                    { rule: "The Japanese 'R'", detail: "Not English 'r' or 'l'. Your tongue quickly taps the ridge behind your upper front teeth — like saying a fast 'd' in 'ladder'. This is the same sound as a Spanish single 'r' (pero, hora).", example: "ラーメン (rāmen)" },
                    { rule: "Silent 'u' in desu/masu", detail: "The 'u' at the end is barely whispered or silent. です sounds like 'dess', ます sounds like 'mass'. This is the most common beginner mistake to fix.", example: "食べます (tabemass, not tabemasu)" },
                    { rule: "Double consonants (っ)", detail: "A small っ means PAUSE briefly before the next consonant. Think of the pause in 'bookkeeper' between the k's.", example: "切手 kitte (ki-tte), もっと motto (mo-tto)" },
                    { rule: "'tsu' つ", detail: "Like 'ts' in 'cats' — one smooth sound, not 'too-sue'. This is tricky for English speakers but gets easy with practice.", example: "つなみ (tsunami)" },
                    { rule: "'n' before b/m/p", detail: "The ん (n) sounds more like 'm' before b, m, or p sounds. This happens naturally.", example: "新聞 shinbun → shimbun" },
                    { rule: "Every syllable is even", detail: "Unlike English, Japanese doesn't stress certain syllables. Each one gets roughly equal weight and timing. Think machine-gun rhythm.", example: "さくら sa-ku-ra (not SA-ku-ra)" },
                  ].map((r, i) => (
                    <div key={i} style={{
                      padding: "10px 12px", marginBottom: 8,
                      background: "rgba(196,164,132,0.04)", borderRadius: 6,
                      borderLeft: "2px solid rgba(139,105,64,0.3)",
                    }}>
                      <div style={{ fontSize: 13, color: "#c4a484", fontWeight: 600, marginBottom: 4 }}>{r.rule}</div>
                      <div style={{ fontSize: 12, color: "#a99b8b", lineHeight: 1.6, marginBottom: 4 }}>{r.detail}</div>
                      <div style={{ fontSize: 11, color: "#6b5b4b", fontStyle: "italic" }}>→ {r.example}</div>
                    </div>
                  ))}
                </GrammarSection>

                <GrammarSection title="🇪🇸 Spanish Speaker Advantages">
                  <div style={{ fontSize: 12, color: "#a99b8b", lineHeight: 1.8 }}>
                    <p style={{ marginBottom: 8 }}>Having spoken Spanish in Spain, you already have some pronunciation advantages for Japanese:</p>
                    <div style={{ padding: "8px 12px", background: "rgba(76,140,76,0.06)", borderRadius: 6, marginBottom: 6 }}>
                      <strong style={{ color: "#8bc48b" }}>✓ Vowels are nearly identical</strong> — Japanese あいうえお map almost perfectly to Spanish a, i, u, e, o
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(76,140,76,0.06)", borderRadius: 6, marginBottom: 6 }}>
                      <strong style={{ color: "#8bc48b" }}>✓ The 'R' sound</strong> — Spanish single 'r' (pero) is basically the Japanese 'r'. You're already ahead.
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(76,140,76,0.06)", borderRadius: 6, marginBottom: 6 }}>
                      <strong style={{ color: "#8bc48b" }}>✓ No complex consonant clusters</strong> — Both languages have clean syllable structure
                    </div>
                    <div style={{ padding: "8px 12px", background: "rgba(200,160,60,0.08)", borderRadius: 6, marginBottom: 6 }}>
                      <strong style={{ color: "#c4a060" }}>⚠ Watch out:</strong> Japanese has no stress emphasis — every syllable is even, unlike Spanish
                    </div>
                  </div>
                </GrammarSection>

                <div style={{
                  padding: "14px",
                  background: "rgba(196,164,132,0.04)",
                  borderRadius: 10,
                  border: "1px solid rgba(196,164,132,0.08)",
                  marginTop: 8,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8b6940", marginBottom: 6 }}>🔊 Audio Tip</div>
                  <div style={{ fontSize: 12, color: "#8b7b6b", lineHeight: 1.6 }}>
                    Every phrase in the Phrases tab has an audio button — tap to hear at normal speed, or use the 🐢 button for slow playback. Practice repeating out loud — the speech synthesis uses native Japanese pronunciation patterns.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ FAVORITES TAB ═══════ */}
      {activeTab === "favorites" && (
        <div style={{ padding: "16px 20px 20px" }}>
          {favPhrases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b5b4b" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>⭐</div>
              <div style={{ fontSize: 15, marginBottom: 6 }}>No saved phrases yet</div>
              <div style={{ fontSize: 12 }}>Tap the star on any phrase to save it for quick reference</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {favPhrases.map((p, i) => (
                <PhraseCard key={p.jp + i} phrase={p} index={i}
                  isFav={true} toggleFav={() => toggleFav(p.jp)}
                  isExpanded={expandedPhrase === p.jp}
                  toggleExpand={() => setExpandedPhrase(expandedPhrase === p.jp ? null : p.jp)}
                  showCategory={true} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ QUIZ TAB ═══════ */}
      {activeTab === "quiz" && (
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
          }}>
            <div style={{
              display: "flex", gap: 4,
              background: "rgba(196,164,132,0.06)", borderRadius: 8, padding: 3,
              border: "1px solid rgba(196,164,132,0.12)",
            }}>
              {[
                { id: "en-to-jp", label: "EN → JP" },
                { id: "jp-to-en", label: "JP → EN" },
              ].map(d => (
                <button key={d.id} onClick={() => { setQuizDirection(d.id); setQuizScore({ correct: 0, total: 0 }); generateQuiz(); }} style={{
                  padding: "6px 12px", borderRadius: 6, border: "none",
                  background: quizDirection === d.id ? "rgba(139,105,64,0.25)" : "transparent",
                  color: quizDirection === d.id ? "#c4a484" : "#6b5b4b",
                  cursor: "pointer", fontSize: 12, fontFamily: "'Noto Serif', serif",
                  fontWeight: quizDirection === d.id ? 600 : 400,
                }}>{d.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#8b7b6b" }}>
              {quizScore.total > 0 && (
                <span>
                  <span style={{ color: "#8b6940", fontWeight: 700 }}>{quizScore.correct}</span> / {quizScore.total}
                  <span style={{ marginLeft: 6, fontSize: 11, color: "#6b5b4b" }}>
                    ({Math.round((quizScore.correct / quizScore.total) * 100)}%)
                  </span>
                </span>
              )}
            </div>
          </div>

          {quizState && (
            <div style={{ animation: "slideUp 0.3s ease forwards" }}>
              <div style={{
                padding: "24px 20px",
                background: "rgba(139,105,64,0.06)",
                border: "1px solid rgba(196,164,132,0.12)",
                borderRadius: 12,
                textAlign: "center",
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 10, letterSpacing: 2, textTransform: "uppercase" }}>
                  {quizDirection === "en-to-jp" ? "How do you say..." : "What does this mean?"}
                </div>
                <div style={{
                  fontSize: quizDirection === "en-to-jp" ? 18 : 26,
                  fontWeight: 600,
                  color: "#dbc1a0",
                  fontFamily: quizDirection === "jp-to-en" ? "'Noto Sans JP', sans-serif" : "'Noto Serif', serif",
                  lineHeight: 1.5,
                }}>
                  {quizDirection === "en-to-jp" ? quizState.correct.en : quizState.correct.jp}
                </div>
                {quizDirection === "jp-to-en" && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                    <AudioBtn text={quizState.correct.jp} />
                    <AudioBtn text={quizState.correct.jp} slow />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {quizState.options.map((option, i) => {
                  const isCorrect = option.jp === quizState.correct.jp;
                  const isSelected = selectedAnswer?.jp === option.jp;
                  let bg = "rgba(196,164,132,0.04)";
                  let border = "rgba(196,164,132,0.12)";
                  let textColor = "#e8ddd3";
                  if (showAnswer) {
                    if (isCorrect) { bg = "rgba(76,140,76,0.12)"; border = "rgba(76,140,76,0.4)"; textColor = "#8bc48b"; }
                    else if (isSelected && !isCorrect) { bg = "rgba(180,80,60,0.1)"; border = "rgba(180,80,60,0.3)"; textColor = "#c49090"; }
                    else { bg = "rgba(196,164,132,0.02)"; textColor = "#5a4a3a"; }
                  }
                  return (
                    <button key={i} className={`quiz-option ${showAnswer ? 'answered' : ''}`}
                      onClick={() => handleQuizAnswer(option)}
                      style={{
                        padding: "14px 16px", background: bg,
                        border: `1px solid ${border}`, borderRadius: 10,
                        color: textColor, cursor: showAnswer ? "default" : "pointer",
                        textAlign: "left",
                        fontFamily: quizDirection === "en-to-jp" ? "'Noto Sans JP', sans-serif" : "'Noto Serif', serif",
                        fontSize: quizDirection === "en-to-jp" ? 16 : 14,
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%",
                        border: `1px solid ${showAnswer && isCorrect ? "rgba(76,140,76,0.5)" : "rgba(196,164,132,0.2)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, flexShrink: 0,
                        background: showAnswer && isCorrect ? "rgba(76,140,76,0.15)" : "transparent",
                        color: showAnswer && isCorrect ? "#8bc48b" : "#6b5b4b",
                      }}>
                        {showAnswer ? (isCorrect ? "✓" : isSelected ? "✕" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                      </span>
                      <span>
                        {quizDirection === "en-to-jp" ? option.jp : option.en}
                        {quizDirection === "en-to-jp" && (
                          <span style={{ display: "block", fontSize: 12, color: "#8b7b6b", marginTop: 2 }}>{option.roma}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {showAnswer && (
                <div>
                  {/* Show correct answer with audio after answering */}
                  <div style={{
                    padding: "12px 16px",
                    background: "rgba(139,105,64,0.06)",
                    border: "1px solid rgba(196,164,132,0.1)",
                    borderRadius: 10,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <AudioBtn text={quizState.correct.jp} />
                    <div>
                      <div style={{ fontSize: 16, fontFamily: "'Noto Sans JP'", color: "#dbc1a0" }}>{quizState.correct.jp}</div>
                      <div style={{ fontSize: 11, color: "#8b7b6b" }}>{quizState.correct.roma} — {quizState.correct.en}</div>
                    </div>
                  </div>
                  <button onClick={generateQuiz} style={{
                    width: "100%", padding: "14px",
                    background: "linear-gradient(135deg, rgba(139,105,64,0.25), rgba(139,105,64,0.15))",
                    border: "1px solid rgba(139,105,64,0.4)", borderRadius: 10,
                    color: "#c4a484", cursor: "pointer", fontSize: 14,
                    fontFamily: "'Noto Serif', serif", fontWeight: 600, letterSpacing: 1,
                  }}>Next Question →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "20px", textAlign: "center",
        borderTop: "1px solid rgba(196,164,132,0.08)", marginTop: 20,
      }}>
        <div style={{ fontSize: 11, color: "#4a3a2a" }}>
          Built for Jacob's Japan trip · March 22 – April 10, 2026
        </div>
        <div style={{ fontSize: 10, color: "#3a2a1a", marginTop: 4 }}>
          Kyushu → Tokyo → Kyoto → Osaka → Kawaguchiko
        </div>
      </div>
    </div>
  );
}

export default App;