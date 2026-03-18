import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ───────── AUDIO ENGINE (from initjsx.jsx) ───────── */
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

// ─── GRAMMAR REFERENCE ─────────────────────────────────────────────
const GRAMMAR = {
  "desu": {
    jp: "です", type: "copula", meaning: "is / am / are (polite)",
    explanation: "The polite copula — it asserts that something 'is' something. Placed at the end of a sentence to make it polite. In casual speech, it can be dropped entirely. When used after an adjective (e.g., 'oishii desu'), it adds politeness without changing the meaning. The past tense is 'deshita' (でした).",
    usage: [
      { jp: "一人です", roma: "Hitori desu", en: "It's one person / I am alone" },
      { jp: "大丈夫です", roma: "Daijōbu desu", en: "It's okay / I'm fine" },
      { jp: "近いですか？", roma: "Chikai desu ka?", en: "Is it nearby?" },
    ]
  },
  "ka": {
    jp: "か", type: "particle", meaning: "question marker",
    explanation: "Placed at the end of a sentence to turn it into a question — like a spoken question mark. In polite speech, 'ka' is always used. In casual speech, it can be replaced by rising intonation alone. Note: 'ka' can sound blunt in casual speech, so among friends, simply raising your tone is more natural.",
    usage: [
      { jp: "どこですか？", roma: "Doko desu ka?", en: "Where is it?" },
      { jp: "ありますか？", roma: "Arimasu ka?", en: "Is there (one)? / Do you have?" },
      { jp: "何時ですか？", roma: "Nanji desu ka?", en: "What time is it?" },
    ]
  },
  "wa": {
    jp: "は", type: "particle", meaning: "topic marker (as for ~)",
    explanation: "Marks the topic of the sentence — the thing you're talking about. Written as hiragana 'ha' (は) but pronounced 'wa' when used as a particle. Think of it as 'As for [topic], ...' — it sets the stage for what follows. Not the same as the subject marker 'ga'.",
    usage: [
      { jp: "駅はどこですか？", roma: "Eki wa doko desu ka?", en: "As for the station, where is it?" },
      { jp: "これはいくらですか？", roma: "Kore wa ikura desu ka?", en: "As for this, how much?" },
      { jp: "お風呂は何時までですか？", roma: "Ofuro wa nanji made desu ka?", en: "As for the bath, until what time?" },
    ]
  },
  "o": {
    jp: "を", type: "particle", meaning: "object marker (acts on ~)",
    explanation: "Marks the direct object — the thing being acted upon by the verb. Written as 'wo' (を) but pronounced 'o'. If you're doing something TO something, that something gets 'o'. Example: 'water (o) please' = I'm requesting water.",
    usage: [
      { jp: "お水をお願いします", roma: "Omizu o onegai shimasu", en: "Water, please (requesting water)" },
      { jp: "写真を撮ってもいいですか？", roma: "Shashin o totte mo ii desu ka?", en: "May I take a photo?" },
      { jp: "メニューをお願いします", roma: "Menyū o onegai shimasu", en: "Menu, please" },
    ]
  },
  "ga": {
    jp: "が", type: "particle", meaning: "subject marker / but",
    explanation: "Marks the grammatical subject — who or what performs the action. Used when introducing new information or emphasizing the subject. Differs from 'wa': 'wa' = 'as for X' (known topic), 'ga' = 'X is the one that...' (new/emphasized info). Also means 'but' when connecting two clauses.",
    usage: [
      { jp: "アレルギーがあります", roma: "Arerugī ga arimasu", en: "Allergies exist (I have allergies)" },
      { jp: "予約があります", roma: "Yoyaku ga arimasu", en: "A reservation exists (I have a reservation)" },
      { jp: "日本が大好きです", roma: "Nihon ga daisuki desu", en: "Japan is (what I) love" },
    ]
  },
  "ni": {
    jp: "に", type: "particle", meaning: "to / at / in (destination, location, time)",
    explanation: "A versatile particle with several core uses: (1) destination/direction — 'I want to go TO [place] ni'; (2) location of existence — 'there IS something AT [place] ni'; (3) specific time — 'AT 3 o'clock ni'; (4) indirect object — 'I'll contact TO [person] ni'. Think of it as pointing to a specific target.",
    usage: [
      { jp: "___に行きたいです", roma: "___ni ikitai desu", en: "I want to go to ___" },
      { jp: "病院に行きたいです", roma: "Byōin ni ikitai desu", en: "I want to go to the hospital" },
      { jp: "この近くに___はありますか？", roma: "Kono chikaku ni ___wa arimasu ka?", en: "Is there ___ near here?" },
    ]
  },
  "de": {
    jp: "で", type: "particle", meaning: "at / by means of / in",
    explanation: "Indicates (1) the place where an action happens — 'eat AT the restaurant de'; (2) the means/method — 'pay BY card de'; (3) the material or tool used. Key distinction from 'ni': 'ni' = static existence/destination, 'de' = where action takes place. 'Eki de' = at the station (doing something), 'Eki ni' = to/at the station (being there).",
    usage: [
      { jp: "カードで払えますか？", roma: "Kādo de haraemasu ka?", en: "Can I pay by card?" },
      { jp: "Suicaで払えますか？", roma: "Suica de haraemasu ka?", en: "Can I pay with Suica?" },
      { jp: "部屋で食べられますか？", roma: "Heya de taberaremasu ka?", en: "Can I eat in the room?" },
    ]
  },
  "no": {
    jp: "の", type: "particle", meaning: "possessive / connecting (of, 's)",
    explanation: "Connects two nouns, showing possession or association — like English 'of' or apostrophe-s. The owner/modifier comes BEFORE 'no', the thing owned comes AFTER. 'Nihon no tabemono' = Japan's food. Also used to turn verbs/sentences into noun phrases.",
    usage: [
      { jp: "阿蘇山の火口", roma: "Asosan no kakō", en: "Mt. Aso's crater" },
      { jp: "浴衣の着方", roma: "Yukata no kikata", en: "The way of wearing a yukata" },
      { jp: "地獄めぐりのチケット", roma: "Jigoku meguri no chiketto", en: "Ticket for the Hell Tour" },
    ]
  },
  "mo": {
    jp: "も", type: "particle", meaning: "also / too / even",
    explanation: "Replaces 'wa' or 'ga' to mean 'also' or 'too'. If 'A wa suki desu' means 'I like A', then 'B mo suki desu' means 'I like B too'. Can also mean 'even' for emphasis.",
    usage: [
      { jp: "写真を撮ってもいいですか？", roma: "Shashin o totte mo ii desu ka?", en: "Is it okay even if I take a photo?" },
    ]
  },
  "made": {
    jp: "まで", type: "particle", meaning: "until / as far as / up to",
    explanation: "Indicates a limit in time or space — 'until' or 'up to'. For time: 'nanji made' = until what time. For distance: '___made' = as far as [destination]. Often paired with 'kara' (from): 'kara...made' = from...to.",
    usage: [
      { jp: "___までお願いします", roma: "___made onegai shimasu", en: "To ___, please (in a taxi)" },
      { jp: "お風呂は何時までですか？", roma: "Ofuro wa nanji made desu ka?", en: "Until what time is the bath?" },
    ]
  },
  "doko": {
    jp: "どこ", type: "question word", meaning: "where",
    explanation: "The question word for 'where'. Used in the pattern '___wa doko desu ka?' (Where is ___?). Can also be used as 'doko de' (at what place) or 'doko ni' (to what place).",
    usage: [
      { jp: "駅はどこですか？", roma: "Eki wa doko desu ka?", en: "Where is the station?" },
      { jp: "トイレはどこですか？", roma: "Toire wa doko desu ka?", en: "Where is the toilet?" },
      { jp: "ATMはどこですか？", roma: "ATM wa doko desu ka?", en: "Where is the ATM?" },
    ]
  },
  "nan_nani": {
    jp: "何", type: "question word", meaning: "what",
    explanation: "The question word for 'what'. Pronounced 'nani' on its own or before particles, but 'nan' before 'desu', 'ji' (time), and certain counters. 'Nan desu ka?' = What is it? 'Nanji' = what time? 'Nannin' = how many people?",
    usage: [
      { jp: "おすすめは何ですか？", roma: "Osusume wa nan desu ka?", en: "What do you recommend?" },
      { jp: "何時ですか？", roma: "Nanji desu ka?", en: "What time is it?" },
      { jp: "地元の名物は何ですか？", roma: "Jimoto no meibutsu wa nan desu ka?", en: "What is the local specialty?" },
    ]
  },
  "ikura": {
    jp: "いくら", type: "question word", meaning: "how much (price)",
    explanation: "Used specifically for asking about prices. The standard pattern is 'kore wa ikura desu ka?' (How much is this?). Not used for quantities — use 'ikutsu' for 'how many'.",
    usage: [
      { jp: "いくらですか？", roma: "Ikura desu ka?", en: "How much is it?" },
      { jp: "これはいくらですか？", roma: "Kore wa ikura desu ka?", en: "How much is this?" },
    ]
  },
  "kudasai": {
    jp: "ください", type: "auxiliary", meaning: "please (do ~) / please (give me ~)",
    explanation: "A polite request form. After a verb in 'te-form': asks someone to DO something (e.g., 'oshiete kudasai' = please teach me). After a noun + 'o': asks for a thing (e.g., 'chiketto o kudasai' = ticket please). More direct than 'onegai shimasu' — fine for shops and service contexts.",
    usage: [
      { jp: "ここで降ろしてください", roma: "Koko de oroshite kudasai", en: "Please drop me off here" },
      { jp: "チケットをください", roma: "Chiketto o kudasai", en: "Ticket, please" },
      { jp: "温めてください", roma: "Atatamete kudasai", en: "Please heat it up" },
    ]
  },
  "onegai_shimasu": {
    jp: "お願いします", type: "expression", meaning: "please (I request ~)",
    explanation: "A polite way to request something — literally 'I humbly request'. More polite and softer than 'kudasai'. Used after nouns with 'o' (e.g., 'omizu o onegai shimasu' = water please), or on its own after establishing context. The go-to phrase for ordering and requesting.",
    usage: [
      { jp: "お水をお願いします", roma: "Omizu o onegai shimasu", en: "Water, please" },
      { jp: "もう一度お願いします", roma: "Mō ichido onegai shimasu", en: "One more time, please" },
      { jp: "チェックインお願いします", roma: "Chekkuin onegai shimasu", en: "Check-in, please" },
    ]
  },
  "arimasu": {
    jp: "あります", type: "verb", meaning: "there is / exists (for things)",
    explanation: "Expresses existence for inanimate objects and abstract things. 'X ga arimasu' = X exists / there is X. The negative is 'arimasen' (there isn't). For living things (people, animals), use 'imasu' instead. Also used for 'I have' — 'yoyaku ga arimasu' = I have a reservation (a reservation exists).",
    usage: [
      { jp: "予約があります", roma: "Yoyaku ga arimasu", en: "I have a reservation" },
      { jp: "アレルギーがあります", roma: "Arerugī ga arimasu", en: "I have allergies" },
      { jp: "乗り換えはありますか？", roma: "Norikae wa arimasu ka?", en: "Is there a transfer?" },
    ]
  },
  "ikitai": {
    jp: "行きたい", type: "verb form", meaning: "want to go",
    explanation: "The 'tai-form' expresses desire — 'I want to [verb]'. Take the verb stem and add '-tai'. 'Ikimasu' (go) → 'ikitai' (want to go). 'Tabemasu' (eat) → 'tabetai' (want to eat). 'Hairitai' (want to enter). Only used for YOUR OWN desires — asking about someone else's desires requires different forms.",
    usage: [
      { jp: "___に行きたいです", roma: "___ni ikitai desu", en: "I want to go to ___" },
      { jp: "砂風呂に入りたいです", roma: "Suna buro ni hairitai desu", en: "I want to try the sand bath" },
      { jp: "湯めぐりをしたいです", roma: "Yumeguri o shitai desu", en: "I want to do the hot spring hopping" },
    ]
  },
  "kore_sore_are": {
    jp: "これ・それ・あれ", type: "pronoun", meaning: "this / that / that (over there)",
    explanation: "Three demonstrative pronouns based on distance: 'kore' = this (near me), 'sore' = that (near you), 'are' = that over there (far from both). Same system applies to 'kono/sono/ano' (before nouns) and 'koko/soko/asoko' (places). When pointing at a menu, use 'kore'.",
    usage: [
      { jp: "これをお願いします", roma: "Kore o onegai shimasu", en: "This one, please" },
      { jp: "これはいくらですか？", roma: "Kore wa ikura desu ka?", en: "How much is this?" },
    ]
  },
  "masu_masen": {
    jp: "ます / ません", type: "verb ending", meaning: "polite verb endings (affirmative / negative)",
    explanation: "The polite verb endings. '-masu' = present/future positive, '-masen' = present/future negative, '-mashita' = past positive, '-masen deshita' = past negative. These attach to verb stems: 'wakari-masu' (understand), 'wakari-masen' (don't understand). Always use -masu form with strangers and in formal situations.",
    usage: [
      { jp: "分かりました", roma: "Wakarimashita", en: "I understood (past polite)" },
      { jp: "分かりません", roma: "Wakarimasen", en: "I don't understand (negative polite)" },
      { jp: "止まりますか？", roma: "Tomarimasu ka?", en: "Does it stop?" },
    ]
  },
  "nai_nashi": {
    jp: "ない / なし", type: "negation", meaning: "without / not / none",
    explanation: "'Nashi' means 'without' or 'none' and is used after nouns: 'niku nashi' = without meat. 'Nai' is the casual negative ending for adjectives and verbs. In requests, 'naide kudasai' = please don't. These are your key negation tools.",
    usage: [
      { jp: "肉なしでお願いします", roma: "Niku nashi de onegai shimasu", en: "Without meat, please" },
      { jp: "辛くしないでください", roma: "Karaku shinaide kudasai", en: "Please don't make it spicy" },
      { jp: "袋はいりません", roma: "Fukuro wa irimasen", en: "I don't need a bag" },
    ]
  },
  "dake": {
    jp: "だけ", type: "particle", meaning: "only / just",
    explanation: "Limits to 'only' or 'just' the thing before it. 'Sukoshi dake' = just a little. 'Genkin dake' = cash only. Placed directly after the word it limits.",
    usage: [
      { jp: "少しだけ話せます", roma: "Sukoshi dake hanasemasu", en: "I can speak just a little" },
      { jp: "現金だけですか？", roma: "Genkin dake desu ka?", en: "Is it cash only?" },
    ]
  },
  "ne": {
    jp: "ね", type: "particle", meaning: "isn't it? / right? (seeking agreement)",
    explanation: "A sentence-ending particle that seeks agreement or confirmation — like English 'right?' or 'isn't it?'. Creates a warm, conversational tone. 'Kirei desu ne' = It's beautiful, isn't it? Using 'ne' makes you sound natural and engaged rather than making flat statements.",
    usage: [
      { jp: "きれいですね", roma: "Kirei desu ne", en: "It's beautiful, isn't it?" },
      { jp: "すごいですね", roma: "Sugoi desu ne", en: "That's amazing, right?" },
    ]
  },
  "dekimasu": {
    jp: "できます", type: "verb", meaning: "can do / is possible",
    explanation: "Expresses ability or possibility. '___dekimasu ka?' = Can [you/I] do ___? Often used with nouns: 'shichaku dekimasu ka?' = Can I try it on? The negative is 'dekimasen' (cannot). Very useful for asking what's possible.",
    usage: [
      { jp: "試着できますか？", roma: "Shichaku dekimasu ka?", en: "Can I try it on?" },
      { jp: "持ち帰りできますか？", roma: "Mochikaeri dekimasu ka?", en: "Can I take it to go?" },
      { jp: "免税できますか？", roma: "Menzei dekimasu ka?", en: "Is tax-free available?" },
    ]
  },
  "nanji": {
    jp: "何時", type: "question word", meaning: "what time",
    explanation: "Combines 'nan' (what) + 'ji' (hour/o'clock) to ask 'what time?'. Used in patterns like 'nanji desu ka?' (what time is it?) and 'nanji made' (until what time?). Hours are counted: ichiji (1:00), niji (2:00), sanji (3:00)...",
    usage: [
      { jp: "何時ですか？", roma: "Nanji desu ka?", en: "What time is it?" },
      { jp: "夕食は何時ですか？", roma: "Yūshoku wa nanji desu ka?", en: "What time is dinner?" },
      { jp: "チェックアウトは何時ですか？", roma: "Chekkuauto wa nanji desu ka?", en: "What time is checkout?" },
    ]
  },
};

// ─── DATA FROM initjsx.jsx ──────────────────────────────────────────
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

// ─── PHRASE DATA WITH BREAKDOWNS ────────────────────────────────────
const PHRASES = {
  "Essentials": {
    icon: "🌸", desc: "Core phrases you'll use every single day",
    phrases: [
      { jp: "すみません", roma: "Sumimasen", en: "Excuse me / I'm sorry", note: "THE most useful word in Japan. Use to get attention, apologize, or thank someone.", context: "everywhere", breakdown: [{ word: "すみません", roma: "sumimasen", meaning: "excuse me / sorry" }] },
      { jp: "ありがとうございます", roma: "Arigatō gozaimasu", en: "Thank you (polite)", note: "Full polite form. Use this as your default.", context: "everywhere", breakdown: [{ word: "ありがとう", roma: "arigatō", meaning: "thank you" }, { word: "ございます", roma: "gozaimasu", meaning: "(polite suffix)" }] },
      { jp: "ありがとう", roma: "Arigatō", en: "Thanks (casual)", note: "Casual — fine with peers or in relaxed settings.", context: "casual", breakdown: [{ word: "ありがとう", roma: "arigatō", meaning: "thanks" }] },
      { jp: "おはようございます", roma: "Ohayō gozaimasu", en: "Good morning", note: "Used until about 10-11am.", context: "morning", breakdown: [{ word: "おはよう", roma: "ohayō", meaning: "good morning" }, { word: "ございます", roma: "gozaimasu", meaning: "(polite suffix)" }] },
      { jp: "こんにちは", roma: "Konnichiwa", en: "Hello / Good afternoon", note: "The universal daytime greeting.", context: "daytime", breakdown: [{ word: "こんにちは", roma: "konnichiwa", meaning: "hello / good day" }] },
      { jp: "こんばんは", roma: "Konbanwa", en: "Good evening", note: "Use after sunset.", context: "evening", breakdown: [{ word: "こんばんは", roma: "konbanwa", meaning: "good evening" }] },
      { jp: "はい", roma: "Hai", en: "Yes", note: "Also used as 'I'm listening' — you'll hear it constantly.", context: "everywhere", breakdown: [{ word: "はい", roma: "hai", meaning: "yes" }] },
      { jp: "いいえ", roma: "Iie", en: "No", note: "Polite no. Often accompanied by hand waving.", context: "everywhere", breakdown: [{ word: "いいえ", roma: "iie", meaning: "no" }] },
      { jp: "お願いします", roma: "Onegai shimasu", en: "Please", note: "Attach to almost any request to make it polite.", context: "everywhere", breakdown: [{ word: "お願いします", roma: "onegai shimasu", meaning: "please (I request)", grammarId: "onegai_shimasu" }] },
      { jp: "大丈夫です", roma: "Daijōbu desu", en: "It's okay / I'm fine / No thank you", note: "Incredibly versatile. Can mean 'no thanks' or 'I'm alright'.", context: "everywhere", breakdown: [{ word: "大丈夫", roma: "daijōbu", meaning: "okay / alright" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "分かりました", roma: "Wakarimashita", en: "I understand", note: "Confirms you got the message.", context: "everywhere", breakdown: [{ word: "分かりました", roma: "wakarimashita", meaning: "understood (past polite)", grammarId: "masu_masen" }] },
      { jp: "分かりません", roma: "Wakarimasen", en: "I don't understand", note: "Very useful when lost in conversation.", context: "everywhere", breakdown: [{ word: "分かりません", roma: "wakarimasen", meaning: "don't understand (negative polite)", grammarId: "masu_masen" }] },
      { jp: "英語を話せますか？", roma: "Eigo o hanasemasu ka?", en: "Do you speak English?", note: "Ask politely — many Japanese are shy about their English even if they know some.", context: "everywhere", breakdown: [{ word: "英語", roma: "eigo", meaning: "English" }, { word: "を", roma: "o", meaning: "(object marker)", grammarId: "o" }, { word: "話せます", roma: "hanasemasu", meaning: "can speak", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "日本語が少しだけ話せます", roma: "Nihongo ga sukoshi dake hanasemasu", en: "I can speak only a little Japanese", note: "Sets expectations and people will appreciate the effort.", context: "everywhere", breakdown: [{ word: "日本語", roma: "nihongo", meaning: "Japanese (language)" }, { word: "が", roma: "ga", meaning: "(subject marker)", grammarId: "ga" }, { word: "少し", roma: "sukoshi", meaning: "a little" }, { word: "だけ", roma: "dake", meaning: "only", grammarId: "dake" }, { word: "話せます", roma: "hanasemasu", meaning: "can speak", grammarId: "masu_masen" }] },
      { jp: "もう一度お願いします", roma: "Mō ichido onegai shimasu", en: "One more time, please", note: "Ask someone to repeat what they said.", context: "everywhere", breakdown: [{ word: "もう", roma: "mō", meaning: "more / again" }, { word: "一度", roma: "ichido", meaning: "one time" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "ゆっくりお願いします", roma: "Yukkuri onegai shimasu", en: "Slowly, please", note: "Ask someone to speak more slowly.", context: "everywhere", breakdown: [{ word: "ゆっくり", roma: "yukkuri", meaning: "slowly" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "失礼します", roma: "Shitsurei shimasu", en: "Excuse me (formal)", note: "Used when entering/leaving a room, passing someone, or interrupting.", context: "formal", breakdown: [{ word: "失礼", roma: "shitsurei", meaning: "rudeness / discourtesy" }, { word: "します", roma: "shimasu", meaning: "do (polite)", grammarId: "masu_masen" }] },
    ]
  },
  "Dining & Food": {
    icon: "🍜", desc: "Ordering, dietary needs, paying — essential for Kyushu's food scene",
    phrases: [
      { jp: "いただきます", roma: "Itadakimasu", en: "I humbly receive (said before eating)", note: "ALWAYS say this before eating. It's a sign of gratitude and respect.", context: "before meal", breakdown: [{ word: "いただきます", roma: "itadakimasu", meaning: "I humbly receive" }] },
      { jp: "ごちそうさまでした", roma: "Gochisōsama deshita", en: "Thank you for the meal (said after eating)", note: "Say when finished. Staff will appreciate it greatly.", context: "after meal", breakdown: [{ word: "ごちそうさま", roma: "gochisōsama", meaning: "what a feast" }, { word: "でした", roma: "deshita", meaning: "was (past of desu)", grammarId: "desu" }] },
      { jp: "一人です", roma: "Hitori desu", en: "One person / Table for one", note: "For your solo Kyushu dining. Hold up one finger too.", context: "entering restaurant", breakdown: [{ word: "一人", roma: "hitori", meaning: "one person" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "三人です", roma: "Sannin desu", en: "Three people", note: "For when Kyle and Alex join. Use fingers to confirm.", context: "entering restaurant", breakdown: [{ word: "三人", roma: "sannin", meaning: "three people" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "メニューをお願いします", roma: "Menyū o onegai shimasu", en: "Menu, please", note: "Sometimes menus are only brought on request.", context: "ordering", breakdown: [{ word: "メニュー", roma: "menyū", meaning: "menu" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "おすすめは何ですか？", roma: "Osusume wa nan desu ka?", en: "What do you recommend?", note: "Great for local specialties, especially in Kyushu.", context: "ordering", breakdown: [{ word: "おすすめ", roma: "osusume", meaning: "recommendation" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何", roma: "nan", meaning: "what", grammarId: "nan_nani" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "これをお願いします", roma: "Kore o onegai shimasu", en: "This one, please (pointing)", note: "Point at the menu or food display. Works perfectly.", context: "ordering", breakdown: [{ word: "これ", roma: "kore", meaning: "this", grammarId: "kore_sore_are" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "お水をお願いします", roma: "Omizu o onegai shimasu", en: "Water, please", note: "Water is free at virtually all restaurants in Japan.", context: "ordering", breakdown: [{ word: "お水", roma: "omizu", meaning: "water (polite)" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "ビールをお願いします", roma: "Bīru o onegai shimasu", en: "Beer, please", note: "Japan's beer culture is strong. Try local Kyushu brands!", context: "ordering", breakdown: [{ word: "ビール", roma: "bīru", meaning: "beer" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "もう一つお願いします", roma: "Mō hitotsu onegai shimasu", en: "One more, please", note: "For ordering another of the same item.", context: "ordering", breakdown: [{ word: "もう", roma: "mō", meaning: "more" }, { word: "一つ", roma: "hitotsu", meaning: "one (thing)" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "お会計をお願いします", roma: "Okaikei o onegai shimasu", en: "Check, please", note: "Or make an X with your index fingers — universally understood.", context: "paying", breakdown: [{ word: "お会計", roma: "okaikei", meaning: "the check / bill" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "カードで払えますか？", roma: "Kādo de haraemasu ka?", en: "Can I pay by card?", note: "CRITICAL for rural Kyushu — many places are cash only.", context: "paying", breakdown: [{ word: "カード", roma: "kādo", meaning: "card" }, { word: "で", roma: "de", meaning: "by / with", grammarId: "de" }, { word: "払えます", roma: "haraemasu", meaning: "can pay", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "別々でお願いします", roma: "Betsubetsu de onegai shimasu", en: "Separate checks, please", note: "For splitting bills with Kyle and Alex.", context: "paying", breakdown: [{ word: "別々", roma: "betsubetsu", meaning: "separately" }, { word: "で", roma: "de", meaning: "by / in", grammarId: "de" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "美味しい！", roma: "Oishii!", en: "Delicious!", note: "Say this genuinely — chefs and staff love hearing it.", context: "during meal", breakdown: [{ word: "美味しい", roma: "oishii", meaning: "delicious" }] },
      { jp: "美味しかったです", roma: "Oishikatta desu", en: "It was delicious", note: "Past tense — say when leaving or finishing.", context: "after meal", breakdown: [{ word: "美味しかった", roma: "oishikatta", meaning: "was delicious (past)" }, { word: "です", roma: "desu", meaning: "is (polite)", grammarId: "desu" }] },
      { jp: "アレルギーがあります", roma: "Arerugī ga arimasu", en: "I have allergies", note: "Follow with the allergen name if you know it.", context: "dietary", breakdown: [{ word: "アレルギー", roma: "arerugī", meaning: "allergy" }, { word: "が", roma: "ga", meaning: "(subject)", grammarId: "ga" }, { word: "あります", roma: "arimasu", meaning: "exists / have", grammarId: "arimasu" }] },
      { jp: "肉なしでお願いします", roma: "Niku nashi de onegai shimasu", en: "Without meat, please", note: "Useful if anyone in your group has dietary restrictions.", context: "dietary", breakdown: [{ word: "肉", roma: "niku", meaning: "meat" }, { word: "なし", roma: "nashi", meaning: "without", grammarId: "nai_nashi" }, { word: "で", roma: "de", meaning: "in (that way)", grammarId: "de" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "辛くしないでください", roma: "Karaku shinaide kudasai", en: "Not spicy, please", note: "Kyushu food can be spicy — especially some ramen.", context: "dietary", breakdown: [{ word: "辛く", roma: "karaku", meaning: "spicy (adverb form)" }, { word: "しないで", roma: "shinaide", meaning: "don't do", grammarId: "nai_nashi" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "持ち帰りできますか？", roma: "Mochikaeri dekimasu ka?", en: "Can I take this to go?", note: "Takeaway isn't as common but worth asking.", context: "ordering", breakdown: [{ word: "持ち帰り", roma: "mochikaeri", meaning: "takeout" }, { word: "できます", roma: "dekimasu", meaning: "is possible", grammarId: "dekimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  },
  "Transportation": {
    icon: "🚃", desc: "Trains, buses, taxis, and rental cars across Kyushu and beyond",
    phrases: [
      { jp: "駅はどこですか？", roma: "Eki wa doko desu ka?", en: "Where is the station?", note: "Insert station name before 駅 (eki) for a specific station.", context: "navigation", breakdown: [{ word: "駅", roma: "eki", meaning: "station" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "___に行きたいです", roma: "___ni ikitai desu", en: "I want to go to ___", note: "Universal phrase. Works for taxis, asking directions, etc.", context: "navigation", breakdown: [{ word: "___", roma: "___", meaning: "(destination)" }, { word: "に", roma: "ni", meaning: "to", grammarId: "ni" }, { word: "行きたい", roma: "ikitai", meaning: "want to go", grammarId: "ikitai" }, { word: "です", roma: "desu", meaning: "(polite)", grammarId: "desu" }] },
      { jp: "次の電車は何時ですか？", roma: "Tsugi no densha wa nanji desu ka?", en: "What time is the next train?", note: "Useful for rural Kyushu where trains run less frequently.", context: "trains", breakdown: [{ word: "次", roma: "tsugi", meaning: "next" }, { word: "の", roma: "no", meaning: "'s / of", grammarId: "no" }, { word: "電車", roma: "densha", meaning: "train" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何時", roma: "nanji", meaning: "what time", grammarId: "nanji" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "この電車は___に止まりますか？", roma: "Kono densha wa ___ni tomarimasu ka?", en: "Does this train stop at ___?", note: "Important — some trains skip stations.", context: "trains", breakdown: [{ word: "この", roma: "kono", meaning: "this", grammarId: "kore_sore_are" }, { word: "電車", roma: "densha", meaning: "train" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "に", roma: "ni", meaning: "at", grammarId: "ni" }, { word: "止まります", roma: "tomarimasu", meaning: "stops", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "乗り換えはありますか？", roma: "Norikae wa arimasu ka?", en: "Is there a transfer?", note: "Check if you need to change trains.", context: "trains", breakdown: [{ word: "乗り換え", roma: "norikae", meaning: "transfer" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "片道 / 往復", roma: "Katamichi / Ōfuku", en: "One way / Round trip", note: "For buying tickets at the counter.", context: "tickets", breakdown: [{ word: "片道", roma: "katamichi", meaning: "one way" }, { word: "往復", roma: "ōfuku", meaning: "round trip" }] },
      { jp: "___までお願いします", roma: "___made onegai shimasu", en: "To ___, please (taxi)", note: "Show the address on your phone if pronunciation is tricky.", context: "taxi", breakdown: [{ word: "___", roma: "___", meaning: "(destination)" }, { word: "まで", roma: "made", meaning: "up to / as far as", grammarId: "made" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "いくらですか？", roma: "Ikura desu ka?", en: "How much is it?", note: "Universal pricing question.", context: "everywhere", breakdown: [{ word: "いくら", roma: "ikura", meaning: "how much", grammarId: "ikura" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "バス停はどこですか？", roma: "Basutei wa doko desu ka?", en: "Where is the bus stop?", note: "Essential in rural Kyushu where buses are key transport.", context: "bus", breakdown: [{ word: "バス停", roma: "basutei", meaning: "bus stop" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "ここで降ろしてください", roma: "Koko de oroshite kudasai", en: "Please drop me off here", note: "For getting out of a taxi at a specific spot.", context: "taxi", breakdown: [{ word: "ここ", roma: "koko", meaning: "here" }, { word: "で", roma: "de", meaning: "at", grammarId: "de" }, { word: "降ろして", roma: "oroshite", meaning: "drop off (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "このバスは___に行きますか？", roma: "Kono basu wa ___ni ikimasu ka?", en: "Does this bus go to ___?", note: "Confirm before boarding — rural bus routes can be confusing.", context: "bus", breakdown: [{ word: "この", roma: "kono", meaning: "this", grammarId: "kore_sore_are" }, { word: "バス", roma: "basu", meaning: "bus" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "に", roma: "ni", meaning: "to", grammarId: "ni" }, { word: "行きます", roma: "ikimasu", meaning: "goes", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "ガソリンスタンドはどこですか？", roma: "Gasorin sutando wa doko desu ka?", en: "Where is the gas station?", note: "Essential for the Yamanami Highway drive.", context: "driving", breakdown: [{ word: "ガソリンスタンド", roma: "gasorin sutando", meaning: "gas station" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "レギュラー満タンお願いします", roma: "Regyurā mantan onegai shimasu", en: "Fill it up with regular, please", note: "At staffed gas stations. Self-serve is also common.", context: "driving", breakdown: [{ word: "レギュラー", roma: "regyurā", meaning: "regular (gas)" }, { word: "満タン", roma: "mantan", meaning: "full tank" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
    ]
  },
  "Ryokan & Onsen": {
    icon: "♨️", desc: "For Kurokawa Onsen, Miyama Sansou, and other traditional stays",
    phrases: [
      { jp: "チェックインお願いします", roma: "Chekkuin onegai shimasu", en: "Check-in, please", note: "Upon arriving at your ryokan.", context: "check-in", breakdown: [{ word: "チェックイン", roma: "chekkuin", meaning: "check-in" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "予約があります", roma: "Yoyaku ga arimasu", en: "I have a reservation", note: "State your name after. They may have it under your booking platform name.", context: "check-in", breakdown: [{ word: "予約", roma: "yoyaku", meaning: "reservation" }, { word: "が", roma: "ga", meaning: "(subject)", grammarId: "ga" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }] },
      { jp: "お風呂は何時までですか？", roma: "Ofuro wa nanji made desu ka?", en: "Until what time is the bath open?", note: "Onsen hours vary — especially important at ryokans.", context: "onsen", breakdown: [{ word: "お風呂", roma: "ofuro", meaning: "bath" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何時", roma: "nanji", meaning: "what time", grammarId: "nanji" }, { word: "まで", roma: "made", meaning: "until", grammarId: "made" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "露天風呂はどこですか？", roma: "Rotenburo wa doko desu ka?", en: "Where is the outdoor bath?", note: "Rotenburo (outdoor onsen) is a must-try experience.", context: "onsen", breakdown: [{ word: "露天風呂", roma: "rotenburo", meaning: "outdoor bath" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "貸切風呂はありますか？", roma: "Kashikiri buro wa arimasu ka?", en: "Is there a private bath?", note: "Some ryokans offer private onsen — great if you're shy.", context: "onsen", breakdown: [{ word: "貸切風呂", roma: "kashikiri buro", meaning: "private bath" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "タトゥーは大丈夫ですか？", roma: "Tatū wa daijōbu desu ka?", en: "Are tattoos okay?", note: "Some onsen ban tattoos. Always ask first.", context: "onsen", breakdown: [{ word: "タトゥー", roma: "tatū", meaning: "tattoo" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "大丈夫", roma: "daijōbu", meaning: "okay" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "夕食は何時ですか？", roma: "Yūshoku wa nanji desu ka?", en: "What time is dinner?", note: "Ryokan kaiseki dinners have set times — don't be late!", context: "meals", breakdown: [{ word: "夕食", roma: "yūshoku", meaning: "dinner" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何時", roma: "nanji", meaning: "what time", grammarId: "nanji" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "朝食は何時ですか？", roma: "Chōshoku wa nanji desu ka?", en: "What time is breakfast?", note: "Traditional Japanese breakfast is part of the experience.", context: "meals", breakdown: [{ word: "朝食", roma: "chōshoku", meaning: "breakfast" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何時", roma: "nanji", meaning: "what time", grammarId: "nanji" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "部屋で食べられますか？", roma: "Heya de taberaremasu ka?", en: "Can I eat in my room?", note: "Some ryokans serve meals in your room — a special experience.", context: "meals", breakdown: [{ word: "部屋", roma: "heya", meaning: "room" }, { word: "で", roma: "de", meaning: "at/in", grammarId: "de" }, { word: "食べられます", roma: "taberaremasu", meaning: "can eat", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "布団をお願いします", roma: "Futon o onegai shimasu", en: "Futon, please", note: "Staff usually set up futons while you're at dinner.", context: "room", breakdown: [{ word: "布団", roma: "futon", meaning: "futon" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "荷物を預けられますか？", roma: "Nimotsu o azukeraremasu ka?", en: "Can I leave my luggage?", note: "Most places will hold bags after checkout.", context: "check-out", breakdown: [{ word: "荷物", roma: "nimotsu", meaning: "luggage" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "預けられます", roma: "azukeraremasu", meaning: "can leave/deposit", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "浴衣の着方を教えてください", roma: "Yukata no kikata o oshiete kudasai", en: "Please show me how to wear the yukata", note: "Left side over right (right over left is for the deceased).", context: "room", breakdown: [{ word: "浴衣", roma: "yukata", meaning: "yukata" }, { word: "の", roma: "no", meaning: "'s / of", grammarId: "no" }, { word: "着方", roma: "kikata", meaning: "way of wearing" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "教えて", roma: "oshiete", meaning: "teach / show (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
    ]
  },
  "Shopping": {
    icon: "🏪", desc: "Konbini, souvenir shops, and daily purchases",
    phrases: [
      { jp: "袋はいりません", roma: "Fukuro wa irimasen", en: "I don't need a bag", note: "Bags cost extra in Japan. Bring your own eco bag.", context: "konbini", breakdown: [{ word: "袋", roma: "fukuro", meaning: "bag" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "いりません", roma: "irimasen", meaning: "don't need", grammarId: "masu_masen" }] },
      { jp: "袋をお願いします", roma: "Fukuro o onegai shimasu", en: "A bag, please", note: "If you need one — usually ¥3-5.", context: "konbini", breakdown: [{ word: "袋", roma: "fukuro", meaning: "bag" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "温めてください", roma: "Atatamete kudasai", en: "Please heat it up", note: "For konbini bento and onigiri — they'll microwave it.", context: "konbini", breakdown: [{ word: "温めて", roma: "atatamete", meaning: "heat up (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "お箸をお願いします", roma: "Ohashi o onegai shimasu", en: "Chopsticks, please", note: "They sometimes ask — listen for 'ohashi'.", context: "konbini", breakdown: [{ word: "お箸", roma: "ohashi", meaning: "chopsticks" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "これはいくらですか？", roma: "Kore wa ikura desu ka?", en: "How much is this?", note: "Point at the item.", context: "shopping", breakdown: [{ word: "これ", roma: "kore", meaning: "this", grammarId: "kore_sore_are" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "いくら", roma: "ikura", meaning: "how much", grammarId: "ikura" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "試着できますか？", roma: "Shichaku dekimasu ka?", en: "Can I try it on?", note: "For clothing shopping.", context: "shopping", breakdown: [{ word: "試着", roma: "shichaku", meaning: "trying on (clothes)" }, { word: "できます", roma: "dekimasu", meaning: "is possible", grammarId: "dekimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "免税できますか？", roma: "Menzei dekimasu ka?", en: "Is tax-free available?", note: "Over ¥5,000 at participating stores. Bring your passport.", context: "shopping", breakdown: [{ word: "免税", roma: "menzei", meaning: "tax-free" }, { word: "できます", roma: "dekimasu", meaning: "is possible", grammarId: "dekimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "Suicaで払えますか？", roma: "Suica de haraemasu ka?", en: "Can I pay with Suica?", note: "IC cards work at many shops. Less common in rural areas.", context: "paying", breakdown: [{ word: "Suica", roma: "Suica", meaning: "Suica (IC card)" }, { word: "で", roma: "de", meaning: "with", grammarId: "de" }, { word: "払えます", roma: "haraemasu", meaning: "can pay", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "現金だけですか？", roma: "Genkin dake desu ka?", en: "Cash only?", note: "VERY important in rural Kyushu. Always carry cash.", context: "paying", breakdown: [{ word: "現金", roma: "genkin", meaning: "cash" }, { word: "だけ", roma: "dake", meaning: "only", grammarId: "dake" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "ATMはどこですか？", roma: "ATM wa doko desu ka?", en: "Where is the ATM?", note: "7-Eleven and post office ATMs accept foreign cards.", context: "cash", breakdown: [{ word: "ATM", roma: "ATM", meaning: "ATM" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  },
  "Directions": {
    icon: "🗺️", desc: "Finding your way around, especially in rural Kyushu",
    phrases: [
      { jp: "___はどこですか？", roma: "___wa doko desu ka?", en: "Where is ___?", note: "The essential direction question. Insert any place name.", context: "asking directions", breakdown: [{ word: "___", roma: "___", meaning: "(place)" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "ここはどこですか？", roma: "Koko wa doko desu ka?", en: "Where am I?", note: "If you're truly lost. Show a map on your phone.", context: "lost", breakdown: [{ word: "ここ", roma: "koko", meaning: "here" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "右 / 左 / まっすぐ", roma: "Migi / Hidari / Massugu", en: "Right / Left / Straight", note: "Listen for these in directions. Practice recognizing them.", context: "directions", breakdown: [{ word: "右", roma: "migi", meaning: "right" }, { word: "左", roma: "hidari", meaning: "left" }, { word: "まっすぐ", roma: "massugu", meaning: "straight" }] },
      { jp: "トイレはどこですか？", roma: "Toire wa doko desu ka?", en: "Where is the toilet?", note: "You'll need this. Japan has excellent public restrooms.", context: "essential", breakdown: [{ word: "トイレ", roma: "toire", meaning: "toilet" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "近いですか？", roma: "Chikai desu ka?", en: "Is it nearby?", note: "Gauge walking distance.", context: "directions", breakdown: [{ word: "近い", roma: "chikai", meaning: "nearby / close" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "歩いて何分ですか？", roma: "Aruite nanpun desu ka?", en: "How many minutes on foot?", note: "Japanese people give very accurate time estimates.", context: "directions", breakdown: [{ word: "歩いて", roma: "aruite", meaning: "on foot / walking" }, { word: "何分", roma: "nanpun", meaning: "how many minutes" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "コンビニはどこですか？", roma: "Konbini wa doko desu ka?", en: "Where is a convenience store?", note: "Konbini are everywhere in cities, less so in rural areas.", context: "essential", breakdown: [{ word: "コンビニ", roma: "konbini", meaning: "convenience store" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "この近くに___はありますか？", roma: "Kono chikaku ni ___wa arimasu ka?", en: "Is there a ___ nearby?", note: "Insert: レストラン (restaurant), 病院 (hospital), etc.", context: "asking", breakdown: [{ word: "この", roma: "kono", meaning: "this", grammarId: "kore_sore_are" }, { word: "近く", roma: "chikaku", meaning: "nearby" }, { word: "に", roma: "ni", meaning: "at/in", grammarId: "ni" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  },
  "Numbers & Time": {
    icon: "🔢", desc: "Counting, prices, times, and dates you'll encounter constantly",
    phrases: [
      { jp: "一、二、三、四、五", roma: "Ichi, ni, san, shi/yon, go", en: "1, 2, 3, 4, 5", note: "4 has two readings: shi (formal) and yon (common). 7 is shichi or nana.", context: "counting", breakdown: [{ word: "一", roma: "ichi", meaning: "1" }, { word: "二", roma: "ni", meaning: "2" }, { word: "三", roma: "san", meaning: "3" }, { word: "四", roma: "shi/yon", meaning: "4" }, { word: "五", roma: "go", meaning: "5" }] },
      { jp: "六、七、八、九、十", roma: "Roku, nana/shichi, hachi, kyū/ku, jū", en: "6, 7, 8, 9, 10", note: "These cover most daily counting needs.", context: "counting", breakdown: [{ word: "六", roma: "roku", meaning: "6" }, { word: "七", roma: "nana", meaning: "7" }, { word: "八", roma: "hachi", meaning: "8" }, { word: "九", roma: "kyū", meaning: "9" }, { word: "十", roma: "jū", meaning: "10" }] },
      { jp: "百 / 千 / 万", roma: "Hyaku / Sen / Man", en: "100 / 1,000 / 10,000", note: "¥10,000 = ichiman. Prices are often in hundreds/thousands.", context: "money", breakdown: [{ word: "百", roma: "hyaku", meaning: "100" }, { word: "千", roma: "sen", meaning: "1,000" }, { word: "万", roma: "man", meaning: "10,000" }] },
      { jp: "何時ですか？", roma: "Nanji desu ka?", en: "What time is it?", note: "Japan uses both 12hr and 24hr time.", context: "time", breakdown: [{ word: "何時", roma: "nanji", meaning: "what time", grammarId: "nanji" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "今日 / 明日 / 昨日", roma: "Kyō / Ashita / Kinō", en: "Today / Tomorrow / Yesterday", note: "Basic time references.", context: "time", breakdown: [{ word: "今日", roma: "kyō", meaning: "today" }, { word: "明日", roma: "ashita", meaning: "tomorrow" }, { word: "昨日", roma: "kinō", meaning: "yesterday" }] },
      { jp: "午前 / 午後", roma: "Gozen / Gogo", en: "AM / PM", note: "Used with time: 午前八時 = 8:00 AM.", context: "time", breakdown: [{ word: "午前", roma: "gozen", meaning: "AM" }, { word: "午後", roma: "gogo", meaning: "PM" }] },
    ]
  },
  "Emergencies": {
    icon: "🏥", desc: "Medical needs, emergencies, and getting help",
    phrases: [
      { jp: "助けてください！", roma: "Tasukete kudasai!", en: "Help me, please!", note: "For emergencies. Say it loudly and clearly.", context: "emergency", breakdown: [{ word: "助けて", roma: "tasukete", meaning: "help (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "警察を呼んでください", roma: "Keisatsu o yonde kudasai", en: "Please call the police", note: "Police: 110.", context: "emergency", breakdown: [{ word: "警察", roma: "keisatsu", meaning: "police" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "呼んで", roma: "yonde", meaning: "call (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "救急車を呼んでください", roma: "Kyūkyūsha o yonde kudasai", en: "Please call an ambulance", note: "Ambulance: 119. Free in Japan.", context: "emergency", breakdown: [{ word: "救急車", roma: "kyūkyūsha", meaning: "ambulance" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "呼んで", roma: "yonde", meaning: "call (te-form)" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "病院に行きたいです", roma: "Byōin ni ikitai desu", en: "I want to go to a hospital", note: "For non-emergency medical needs.", context: "medical", breakdown: [{ word: "病院", roma: "byōin", meaning: "hospital" }, { word: "に", roma: "ni", meaning: "to", grammarId: "ni" }, { word: "行きたい", roma: "ikitai", meaning: "want to go", grammarId: "ikitai" }, { word: "です", roma: "desu", meaning: "(polite)", grammarId: "desu" }] },
      { jp: "薬局はどこですか？", roma: "Yakkyoku wa doko desu ka?", en: "Where is a pharmacy?", note: "Pharmacies and drugstores are widespread.", context: "medical", breakdown: [{ word: "薬局", roma: "yakkyoku", meaning: "pharmacy" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "気分が悪いです", roma: "Kibun ga warui desu", en: "I feel sick", note: "General 'I don't feel well'.", context: "medical", breakdown: [{ word: "気分", roma: "kibun", meaning: "feeling / mood" }, { word: "が", roma: "ga", meaning: "(subject)", grammarId: "ga" }, { word: "悪い", roma: "warui", meaning: "bad" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "頭が痛いです", roma: "Atama ga itai desu", en: "I have a headache", note: "Replace 頭 (atama/head) with: お腹 (onaka/stomach), 喉 (nodo/throat).", context: "medical", breakdown: [{ word: "頭", roma: "atama", meaning: "head" }, { word: "が", roma: "ga", meaning: "(subject)", grammarId: "ga" }, { word: "痛い", roma: "itai", meaning: "painful / hurts" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "パスポートをなくしました", roma: "Pasupōto o nakushimashita", en: "I lost my passport", note: "Go to the nearest police box (交番 / kōban).", context: "emergency", breakdown: [{ word: "パスポート", roma: "pasupōto", meaning: "passport" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "なくしました", roma: "nakushimashita", meaning: "lost (past)", grammarId: "masu_masen" }] },
    ]
  },
  "Cultural & Social": {
    icon: "⛩️", desc: "Temples, shrines, etiquette, and making connections",
    phrases: [
      { jp: "写真を撮ってもいいですか？", roma: "Shashin o totte mo ii desu ka?", en: "May I take a photo?", note: "ALWAYS ask first, especially at temples and of people.", context: "photos", breakdown: [{ word: "写真", roma: "shashin", meaning: "photo" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "撮って", roma: "totte", meaning: "take (te-form)" }, { word: "も", roma: "mo", meaning: "even / also", grammarId: "mo" }, { word: "いい", roma: "ii", meaning: "good / okay" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "写真を撮ってもらえますか？", roma: "Shashin o totte moraemasu ka?", en: "Could you take my photo?", note: "Hand over your phone with camera ready.", context: "photos", breakdown: [{ word: "写真", roma: "shashin", meaning: "photo" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "撮って", roma: "totte", meaning: "take (te-form)" }, { word: "もらえます", roma: "moraemasu", meaning: "could you (humble request)" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "きれいですね", roma: "Kirei desu ne", en: "It's beautiful, isn't it?", note: "For cherry blossoms, scenery, food presentation. Very natural.", context: "appreciation", breakdown: [{ word: "きれい", roma: "kirei", meaning: "beautiful / pretty" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "ね", roma: "ne", meaning: "isn't it?", grammarId: "ne" }] },
      { jp: "すごいですね", roma: "Sugoi desu ne", en: "That's amazing!", note: "A versatile expression of admiration.", context: "appreciation", breakdown: [{ word: "すごい", roma: "sugoi", meaning: "amazing" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "ね", roma: "ne", meaning: "right?", grammarId: "ne" }] },
      { jp: "初めて日本に来ました", roma: "Hajimete Nihon ni kimashita", en: "This is my first time in Japan", note: "Great conversation starter — people love helping first-timers.", context: "social", breakdown: [{ word: "初めて", roma: "hajimete", meaning: "for the first time" }, { word: "日本", roma: "Nihon", meaning: "Japan" }, { word: "に", roma: "ni", meaning: "to", grammarId: "ni" }, { word: "来ました", roma: "kimashita", meaning: "came (past polite)", grammarId: "masu_masen" }] },
      { jp: "日本が大好きです", roma: "Nihon ga daisuki desu", en: "I love Japan", note: "Sincere compliment that opens doors.", context: "social", breakdown: [{ word: "日本", roma: "Nihon", meaning: "Japan" }, { word: "が", roma: "ga", meaning: "(subject)", grammarId: "ga" }, { word: "大好き", roma: "daisuki", meaning: "love / really like" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }] },
      { jp: "お邪魔します", roma: "Ojama shimasu", en: "Pardon the intrusion", note: "Say when entering someone's home or a private space.", context: "etiquette", breakdown: [{ word: "お邪魔", roma: "ojama", meaning: "intrusion (polite)" }, { word: "します", roma: "shimasu", meaning: "do (polite)", grammarId: "masu_masen" }] },
      { jp: "乾杯！", roma: "Kanpai!", en: "Cheers!", note: "Essential for drinking with Kyle and Alex. Wait for everyone.", context: "drinking", breakdown: [{ word: "乾杯", roma: "kanpai", meaning: "cheers / dry cup" }] },
      { jp: "桜はどこで見られますか？", roma: "Sakura wa doko de miraremasu ka?", en: "Where can I see cherry blossoms?", note: "Perfect for your late March / early April timing.", context: "sightseeing", breakdown: [{ word: "桜", roma: "sakura", meaning: "cherry blossom" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "で", roma: "de", meaning: "at", grammarId: "de" }, { word: "見られます", roma: "miraremasu", meaning: "can see", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "お花見スポットはありますか？", roma: "Ohanami supotto wa arimasu ka?", en: "Are there hanami (blossom viewing) spots?", note: "Locals know the best hidden spots.", context: "sightseeing", breakdown: [{ word: "お花見スポット", roma: "ohanami supotto", meaning: "hanami spot" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  },
  "Kyushu Specific": {
    icon: "🌋", desc: "Regional phrases for Kumamoto, Beppu, Aso, and Kurokawa",
    phrases: [
      { jp: "地獄めぐりのチケットをください", roma: "Jigoku meguri no chiketto o kudasai", en: "Ticket for the Hell Tour, please", note: "For Beppu's famous 'Hell' hot spring circuit.", context: "beppu", breakdown: [{ word: "地獄めぐり", roma: "jigoku meguri", meaning: "hell tour" }, { word: "の", roma: "no", meaning: "of", grammarId: "no" }, { word: "チケット", roma: "chiketto", meaning: "ticket" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "ください", roma: "kudasai", meaning: "please (give me)", grammarId: "kudasai" }] },
      { jp: "砂風呂に入りたいです", roma: "Suna buro ni hairitai desu", en: "I'd like to try the sand bath", note: "Beppu's unique hot sand baths — amazing experience.", context: "beppu", breakdown: [{ word: "砂風呂", roma: "suna buro", meaning: "sand bath" }, { word: "に", roma: "ni", meaning: "into", grammarId: "ni" }, { word: "入りたい", roma: "hairitai", meaning: "want to enter", grammarId: "ikitai" }, { word: "です", roma: "desu", meaning: "(polite)", grammarId: "desu" }] },
      { jp: "阿蘇山の火口は見られますか？", roma: "Asosan no kakō wa miraremasu ka?", en: "Can I see Mt. Aso's crater?", note: "Access depends on volcanic activity. Always check first.", context: "aso", breakdown: [{ word: "阿蘇山", roma: "Asosan", meaning: "Mt. Aso" }, { word: "の", roma: "no", meaning: "'s", grammarId: "no" }, { word: "火口", roma: "kakō", meaning: "crater" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "見られます", roma: "miraremasu", meaning: "can see", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "温泉手形をください", roma: "Onsen tegata o kudasai", en: "Onsen pass, please", note: "Kurokawa Onsen has a wooden pass for hopping between baths.", context: "kurokawa", breakdown: [{ word: "温泉手形", roma: "onsen tegata", meaning: "onsen pass" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "湯めぐりをしたいです", roma: "Yumeguri o shitai desu", en: "I'd like to do the hot spring hopping", note: "Kurokawa's famous yumeguri — try multiple onsen.", context: "kurokawa", breakdown: [{ word: "湯めぐり", roma: "yumeguri", meaning: "hot spring hopping" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "したい", roma: "shitai", meaning: "want to do", grammarId: "ikitai" }, { word: "です", roma: "desu", meaning: "(polite)", grammarId: "desu" }] },
      { jp: "とんこつラーメンをください", roma: "Tonkotsu rāmen o kudasai", en: "Pork bone ramen, please", note: "Kyushu is the birthplace of tonkotsu ramen!", context: "food", breakdown: [{ word: "とんこつラーメン", roma: "tonkotsu rāmen", meaning: "pork bone ramen" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "ください", roma: "kudasai", meaning: "please", grammarId: "kudasai" }] },
      { jp: "馬刺しはありますか？", roma: "Basashi wa arimasu ka?", en: "Do you have horse sashimi?", note: "Kumamoto's famous delicacy. Try it at least once.", context: "food", breakdown: [{ word: "馬刺し", roma: "basashi", meaning: "horse sashimi" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists / is available", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "焼酎をお願いします", roma: "Shōchū o onegai shimasu", en: "Shōchū, please", note: "Kyushu's signature spirit. Try imo (sweet potato) or mugi (barley).", context: "food", breakdown: [{ word: "焼酎", roma: "shōchū", meaning: "shōchū (spirit)" }, { word: "を", roma: "o", meaning: "(object)", grammarId: "o" }, { word: "お願いします", roma: "onegai shimasu", meaning: "please", grammarId: "onegai_shimasu" }] },
      { jp: "地元の名物は何ですか？", roma: "Jimoto no meibutsu wa nan desu ka?", en: "What's the local specialty?", note: "Every town in Kyushu has something unique. Ask everywhere!", context: "food", breakdown: [{ word: "地元", roma: "jimoto", meaning: "local" }, { word: "の", roma: "no", meaning: "'s", grammarId: "no" }, { word: "名物", roma: "meibutsu", meaning: "specialty" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "何", roma: "nan", meaning: "what", grammarId: "nan_nani" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "やまなみハイウェイはどちらですか？", roma: "Yamanami haiwē wa dochira desu ka?", en: "Which way to Yamanami Highway?", note: "For your scenic drive from Kumamoto to Beppu.", context: "driving", breakdown: [{ word: "やまなみハイウェイ", roma: "yamanami haiwē", meaning: "Yamanami Highway" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どちら", roma: "dochira", meaning: "which way" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  },
  "Anime & Pop Culture": {
    icon: "🎮", desc: "For AnimeJapan 2026 and pop culture shopping",
    phrases: [
      { jp: "限定グッズはありますか？", roma: "Gentei guzzu wa arimasu ka?", en: "Are there limited edition goods?", note: "Convention exclusives sell out fast.", context: "shopping", breakdown: [{ word: "限定", roma: "gentei", meaning: "limited edition" }, { word: "グッズ", roma: "guzzu", meaning: "goods / merchandise" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "あります", roma: "arimasu", meaning: "exists", grammarId: "arimasu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "並んでいますか？", roma: "Narande imasu ka?", en: "Are you in line?", note: "Queues in Japan are orderly. Ask before joining.", context: "conventions", breakdown: [{ word: "並んで", roma: "narande", meaning: "lining up" }, { word: "います", roma: "imasu", meaning: "are (doing)", grammarId: "masu_masen" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "最後尾はどこですか？", roma: "Saibī wa doko desu ka?", en: "Where is the end of the line?", note: "For long convention or store queues.", context: "conventions", breakdown: [{ word: "最後尾", roma: "saibī", meaning: "end of the line" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "ガチャはどこですか？", roma: "Gacha wa doko desu ka?", en: "Where are the gacha machines?", note: "Capsule toy machines — addictive and everywhere.", context: "shopping", breakdown: [{ word: "ガチャ", roma: "gacha", meaning: "gacha machine" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
      { jp: "コスプレエリアはどこですか？", roma: "Kosupure eria wa doko desu ka?", en: "Where is the cosplay area?", note: "For AnimeJapan's cosplay zones.", context: "conventions", breakdown: [{ word: "コスプレエリア", roma: "kosupure eria", meaning: "cosplay area" }, { word: "は", roma: "wa", meaning: "(topic)", grammarId: "wa" }, { word: "どこ", roma: "doko", meaning: "where", grammarId: "doko" }, { word: "です", roma: "desu", meaning: "is", grammarId: "desu" }, { word: "か", roma: "ka", meaning: "?", grammarId: "ka" }] },
    ]
  }
};

// ─── TYPE COLORS ──────────────────────────────────────────────────────
const TYPE_COLORS = {
  particle: { bg: "rgba(100,160,220,0.12)", border: "rgba(100,160,220,0.35)", text: "#7db8e0", label: "Particle" },
  copula: { bg: "rgba(180,140,220,0.12)", border: "rgba(180,140,220,0.35)", text: "#b490d4", label: "Copula" },
  verb: { bg: "rgba(140,200,140,0.12)", border: "rgba(140,200,140,0.35)", text: "#8bc48b", label: "Verb" },
  "verb form": { bg: "rgba(140,200,140,0.12)", border: "rgba(140,200,140,0.35)", text: "#8bc48b", label: "Verb Form" },
  "verb ending": { bg: "rgba(140,200,140,0.12)", border: "rgba(140,200,140,0.35)", text: "#8bc48b", label: "Verb Ending" },
  auxiliary: { bg: "rgba(220,180,100,0.12)", border: "rgba(220,180,100,0.35)", text: "#d4b870", label: "Auxiliary" },
  expression: { bg: "rgba(220,150,100,0.12)", border: "rgba(220,150,100,0.35)", text: "#d4a070", label: "Expression" },
  "question word": { bg: "rgba(220,120,160,0.12)", border: "rgba(220,120,160,0.35)", text: "#d490a0", label: "Question" },
  pronoun: { bg: "rgba(160,200,180,0.12)", border: "rgba(160,200,180,0.35)", text: "#a0c8b4", label: "Pronoun" },
  negation: { bg: "rgba(200,100,100,0.12)", border: "rgba(200,100,100,0.35)", text: "#c49090", label: "Negation" },
};

// ─── QUIZ GENERATORS ────────────────────────────────────────────────
const ALL_PHRASES = Object.entries(PHRASES).flatMap(([cat, data]) =>
  data.phrases.filter(p => p.breakdown && p.breakdown.length >= 3 && !p.jp.includes("___")).map(p => ({ ...p, category: cat }))
);

const PARTICLE_IDS = ["wa", "o", "ga", "ni", "de", "no", "ka", "mo", "made", "dake", "ne"];

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function generateFillGap() {
  const pool = ALL_PHRASES.filter(p => p.breakdown.some(b => b.grammarId));
  if (pool.length === 0) return null;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  const grammarWords = phrase.breakdown.filter(b => b.grammarId);
  const target = grammarWords[Math.floor(Math.random() * grammarWords.length)];
  const targetIdx = phrase.breakdown.indexOf(target);
  const allGrammarWords = Object.entries(GRAMMAR).map(([id, g]) => ({ word: g.jp, roma: id.replace(/_/g, " "), meaning: g.meaning, grammarId: id }));
  const wrongs = shuffle(allGrammarWords.filter(w => w.grammarId !== target.grammarId)).slice(0, 3);
  const options = shuffle([{ word: target.word, roma: target.roma, meaning: target.meaning, correct: true }, ...wrongs.map(w => ({ word: w.word, roma: w.roma, meaning: w.meaning, correct: false }))]);
  return { type: "fill_gap", phrase, targetIdx, target, options, en: phrase.en };
}

function generateParticlePick() {
  const particlePhrases = ALL_PHRASES.filter(p => p.breakdown.some(b => b.grammarId && PARTICLE_IDS.includes(b.grammarId)));
  if (particlePhrases.length === 0) return null;
  const phrase = particlePhrases[Math.floor(Math.random() * particlePhrases.length)];
  const particles = phrase.breakdown.filter(b => b.grammarId && PARTICLE_IDS.includes(b.grammarId));
  const target = particles[Math.floor(Math.random() * particles.length)];
  const targetIdx = phrase.breakdown.indexOf(target);
  const wrongIds = shuffle(PARTICLE_IDS.filter(id => id !== target.grammarId)).slice(0, 3);
  const options = shuffle([
    { id: target.grammarId, jp: target.word, meaning: GRAMMAR[target.grammarId]?.meaning || target.meaning, correct: true },
    ...wrongIds.map(id => ({ id, jp: GRAMMAR[id]?.jp || id, meaning: GRAMMAR[id]?.meaning || "", correct: false }))
  ]);
  return { type: "particle_pick", phrase, targetIdx, target, options, en: phrase.en };
}

function generateBuildIt() {
  const pool = ALL_PHRASES.filter(p => p.breakdown.length >= 3 && p.breakdown.length <= 7);
  if (pool.length === 0) return null;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  const correctOrder = phrase.breakdown.map((b, i) => ({ ...b, origIdx: i }));
  const scrambled = shuffle(correctOrder);
  if (scrambled.every((s, i) => s.origIdx === i)) { const tmp = scrambled[0]; scrambled[0] = scrambled[scrambled.length - 1]; scrambled[scrambled.length - 1] = tmp; }
  return { type: "build_it", phrase, correctOrder, scrambled, en: phrase.en };
}

function generatePhraseMatch(direction) {
  const pool = shuffle(Object.values(PHRASES).flatMap(cat => cat.phrases.filter(p => !p.jp.includes("___") && !p.jp.includes("＿"))));
  const correct = pool[0];
  const wrongs = pool.slice(1, 4);
  const options = shuffle([correct, ...wrongs]);
  return { type: "phrase_match", correct, options, direction };
}

function generateListening() {
  const pool = shuffle(Object.values(PHRASES).flatMap(cat => cat.phrases.filter(p => !p.jp.includes("___") && !p.jp.includes("＿") && p.jp.length < 20)));
  const correct = pool[0];
  const wrongs = pool.slice(1, 4);
  const options = shuffle([{ en: correct.en, correct: true }, ...wrongs.map(w => ({ en: w.en, correct: false }))]);
  return { type: "listening", correct, options };
}

const QUIZ_MODES = [
  { id: "fill_gap", label: "Fill the Gap", icon: "🧩", desc: "Pick the missing word from a real phrase" },
  { id: "particle_pick", label: "Particle Pick", icon: "🔗", desc: "Choose the correct particle for the sentence" },
  { id: "build_it", label: "Build It", icon: "🏗️", desc: "Arrange scrambled words into correct order" },
  { id: "phrase_match", label: "Translate", icon: "🔄", desc: "Match phrases to their meanings" },
  { id: "listening", label: "Listening", icon: "🎧", desc: "Hear a phrase, pick the meaning" },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────
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

function GrammarSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "rgba(196,164,132,0.04)", border: "1px solid rgba(196,164,132,0.1)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "14px 16px", background: "transparent", border: "none",
        color: "#dbc1a0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "'Noto Serif', serif", fontSize: 15, fontWeight: 600, textAlign: "left",
      }}>
        {title}
        <span style={{ color: "#6b5b4b", fontSize: 12, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>{children}</div>}
    </div>
  );
}

// ─── PHRASE CARD COMPONENT ──────────────────────────────────────────
function PhraseCard({ phrase, index, isFav, toggleFav, isExpanded, toggleExpand, showBreakdownState, toggleBreakdown, onGrammarClick, showCategory }) {
  return (
    <div className="phrase-card" style={{ background: "rgba(196,164,132,0.04)", border: "1px solid rgba(196,164,132,0.1)", borderRadius: 10, overflow: "hidden", animationDelay: `${index * 30}ms`, opacity: 0 }}>
      <div onClick={toggleExpand} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          {showCategory && phrase.category && <div style={{ fontSize: 10, color: "#6b5b4b", marginBottom: 4, letterSpacing: 1 }}>{PHRASES[phrase.category]?.icon} {phrase.category.toUpperCase()}</div>}
          <div style={{ fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0", marginBottom: 4, lineHeight: 1.4 }}>{phrase.jp}</div>
          <div style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginBottom: 2 }}>{phrase.roma}</div>
          <div style={{ fontSize: 13, color: "#a99b8b" }}>{phrase.en}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); speak(phrase.jp); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, opacity: 0.5, transition: "opacity 0.2s" }}>🔊</button>
          <button onClick={(e) => { e.stopPropagation(); toggleFav(); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, opacity: isFav ? 1 : 0.3, transition: "opacity 0.2s", flexShrink: 0 }}>{isFav ? "⭐" : "☆"}</button>
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding: "0 16px 14px", animation: "fadeIn 0.2s ease" }}>
          {/* Audio Buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10, padding: "8px 10px", background: "rgba(196,164,132,0.04)", borderRadius: 8 }}>
            <AudioBtn text={phrase.jp} />
            <AudioBtn text={phrase.jp} slow />
            <span style={{ fontSize: 11, color: "#6b5b4b", display: "flex", alignItems: "center", marginLeft: 4 }}>
              Tap to hear · 🐢 for slow
            </span>
          </div>
          {phrase.breakdown && phrase.breakdown.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); toggleBreakdown(); }} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", marginBottom: 10, borderRadius: 6,
              background: showBreakdownState ? "rgba(100,160,220,0.1)" : "rgba(196,164,132,0.06)",
              border: showBreakdownState ? "1px solid rgba(100,160,220,0.25)" : "1px solid rgba(196,164,132,0.12)",
              color: showBreakdownState ? "#7db8e0" : "#8b7b6b", cursor: "pointer", fontSize: 11, fontFamily: "'Noto Serif', serif",
            }}><span style={{ fontSize: 13 }}>{showBreakdownState ? "🔤" : "🔍"}</span> {showBreakdownState ? "Hide breakdown" : "Word-by-word breakdown"}</button>
          )}
          {showBreakdownState && phrase.breakdown && phrase.breakdown.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 12, marginBottom: 10, borderRadius: 8, background: "rgba(196,164,132,0.03)", border: "1px solid rgba(196,164,132,0.08)" }}>
              {phrase.breakdown.map((b, i) => (
                <div key={i} className={`breakdown-word ${b.grammarId ? "has-grammar" : ""}`}
                  onClick={b.grammarId ? (e) => { e.stopPropagation(); onGrammarClick(b.grammarId); } : undefined}
                  title={b.grammarId ? `Tap to see grammar: ${b.grammarId.replace(/_/g, " ")}` : ""}>
                  <span style={{ fontSize: 16, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0", lineHeight: 1.3 }}>{b.word}</span>
                  <span style={{ fontSize: 10, color: "#8b7b6b", marginTop: 2 }}>{b.roma}</span>
                  <span style={{ fontSize: 9, marginTop: 2, textAlign: "center", lineHeight: 1.3, color: b.grammarId && GRAMMAR[b.grammarId] ? (TYPE_COLORS[GRAMMAR[b.grammarId].type]?.text || "#a08060") : "#a08060", fontWeight: b.grammarId ? 600 : 400 }}>{b.meaning}</span>
                  {b.grammarId && <span style={{ fontSize: 8, color: "#7db8e0", marginTop: 2, opacity: 0.7 }}>📐 grammar</span>}
                </div>
              ))}
            </div>
          )}
          {phrase.note && (
            <div style={{ padding: "10px 12px", background: "rgba(139,105,64,0.08)", borderRadius: 6, borderLeft: "2px solid #8b6940" }}>
              <div style={{ fontSize: 10, color: "#8b6940", fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>💡 TIP</div>
              <div style={{ fontSize: 12, color: "#a08060", lineHeight: 1.6 }}>{phrase.note}</div>
            </div>
          )}
          {phrase.context && <div style={{ marginTop: 8, display: "inline-block", padding: "3px 10px", background: "rgba(196,164,132,0.06)", borderRadius: 12, fontSize: 10, color: "#6b5b4b", border: "1px solid rgba(196,164,132,0.1)" }}>📍 {phrase.context}</div>}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeCategory, setActiveCategory] = useState("Essentials");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("jp-favs2") || "[]")); } catch { return new Set(); }
  });
  const [expandedPhrase, setExpandedPhrase] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(new Set());
  const [activeGrammarId, setActiveGrammarId] = useState(null);
  const grammarRef = useRef(null);
  const [grammarSub, setGrammarSub] = useState("reference");

  // Quiz state
  const [quizMode, setQuizMode] = useState(null);
  const [quizQ, setQuizQ] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizDirection, setQuizDirection] = useState("en-to-jp");
  // Build It state
  const [buildSelected, setBuildSelected] = useState([]);
  const [buildChecked, setBuildChecked] = useState(false);
  // Flashcard deck with localStorage
  const [savedCards, setSavedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jp-deck") || "[]"); } catch { return []; }
  });
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewFlipped, setReviewFlipped] = useState(false);

  // Persistence effects
  useEffect(() => { try { localStorage.setItem("jp-favs2", JSON.stringify([...favorites])); } catch {} }, [favorites]);
  useEffect(() => { try { localStorage.setItem("jp-deck", JSON.stringify(savedCards)); } catch {} }, [savedCards]);

  // Voice preload
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const h = () => window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", h);
    return () => window.speechSynthesis?.removeEventListener?.("voiceschanged", h);
  }, []);

  const toggleFav = useCallback((key) => { setFavorites(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }, []);
  const toggleBreakdown = useCallback((key) => { setShowBreakdown(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }, []);

  const navigateToGrammar = useCallback((grammarId) => {
    setActiveGrammarId(grammarId); setActiveTab("grammar"); setGrammarSub("reference");
    setTimeout(() => { if (grammarRef.current) grammarRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  }, []);
  const navigateToPhrase = useCallback((phraseJp) => {
    for (const [cat, data] of Object.entries(PHRASES)) { if (data.phrases.some(p => p.jp === phraseJp)) { setActiveCategory(cat); setActiveTab("browse"); setSearch(""); setExpandedPhrase(phraseJp); setShowBreakdown(prev => new Set(prev).add(phraseJp)); return; } }
  }, []);

  const filteredPhrases = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase(); const r = [];
    Object.entries(PHRASES).forEach(([cat, data]) => { data.phrases.forEach(p => { if (p.en.toLowerCase().includes(q) || p.roma.toLowerCase().includes(q) || p.jp.includes(q) || (p.note && p.note.toLowerCase().includes(q))) r.push({ ...p, category: cat }); }); });
    return r;
  }, [search]);
  const filteredGrammar = useMemo(() => {
    if (!search.trim() || activeTab !== "grammar") return null;
    const q = search.toLowerCase();
    return Object.entries(GRAMMAR).filter(([id, g]) => id.toLowerCase().includes(q) || g.jp.includes(q) || g.meaning.toLowerCase().includes(q) || g.explanation.toLowerCase().includes(q));
  }, [search, activeTab]);
  const favPhrases = useMemo(() => { const r = []; Object.entries(PHRASES).forEach(([cat, data]) => { data.phrases.forEach(p => { if (favorites.has(p.jp)) r.push({ ...p, category: cat }); }); }); return r; }, [favorites]);

  const nextQuiz = useCallback((mode) => {
    let q = null;
    if (mode === "fill_gap") q = generateFillGap();
    else if (mode === "particle_pick") q = generateParticlePick();
    else if (mode === "build_it") q = generateBuildIt();
    else if (mode === "phrase_match") q = generatePhraseMatch(quizDirection);
    else if (mode === "listening") q = generateListening();
    setQuizQ(q); setQuizAnswered(false); setQuizSelected(null); setBuildSelected([]); setBuildChecked(false);
    if (mode === "listening" && q) setTimeout(() => speak(q.correct.jp), 400);
  }, [quizDirection]);

  const startMode = useCallback((mode) => { setQuizMode(mode); setQuizScore({ correct: 0, total: 0 }); nextQuiz(mode); }, [nextQuiz]);

  const saveCard = useCallback((card) => {
    setSavedCards(prev => {
      if (prev.some(c => c.front === card.front)) return prev;
      return [...prev, card];
    });
  }, []);
  const removeCard = useCallback((idx) => { setSavedCards(prev => prev.filter((_, i) => i !== idx)); }, []);

  const categories = Object.keys(PHRASES);
  const grammarEntryCount = Object.keys(GRAMMAR).length;

  // ─── Shared styles ─────────────────
  const pillBtn = (active) => ({
    padding: "7px 14px", borderRadius: 20, border: active ? "1px solid #8b6940" : "1px solid rgba(196,164,132,0.15)",
    background: active ? "rgba(139,105,64,0.2)" : "rgba(196,164,132,0.04)", color: active ? "#c4a484" : "#8b7b6b",
    cursor: "pointer", fontSize: 12, fontFamily: "'Noto Serif', serif", whiteSpace: "nowrap", fontWeight: active ? 600 : 400,
  });
  const cardBg = "rgba(196,164,132,0.04)";
  const cardBorder = "1px solid rgba(196,164,132,0.1)";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #1a1412 0%, #2d1f1a 30%, #1a1412 100%)", color: "#e8ddd3", fontFamily: "'Noto Serif', 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700&family=Noto+Sans+JP:wght@300;400;500;700&family=Zen+Antique&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #5a3e2e; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .phrase-card { animation: fadeIn 0.3s ease forwards; }
        .category-btn, .grammar-link, .quiz-option { transition: all 0.2s ease; }
        .category-btn:hover { transform: translateY(-1px); }
        .quiz-option:hover:not(.answered) { transform: translateX(4px); background: rgba(196,164,132,0.12); }
        .grammar-link:hover { transform: translateY(-1px); filter: brightness(1.2); }
        .breakdown-word { display: inline-flex; flex-direction: column; align-items: center; padding: 6px 5px 4px; margin: 3px 2px; border-radius: 6px; background: rgba(196,164,132,0.06); border: 1px solid rgba(196,164,132,0.1); min-width: 40px; }
        .breakdown-word.has-grammar { cursor: pointer; border-style: dashed; }
        .breakdown-word.has-grammar:hover { background: rgba(100,160,220,0.1); border-color: rgba(100,160,220,0.3); }
        .grammar-entry { animation: fadeIn 0.3s ease forwards; }
        .phrase-link { cursor: pointer; transition: all 0.15s; }
        .phrase-link:hover { background: rgba(196,164,132,0.12); }
        .build-tile { cursor: pointer; transition: all 0.15s; user-select: none; }
        .build-tile:hover { transform: scale(1.04); }
        .build-tile:active { transform: scale(0.96); }
        .mode-card { cursor: pointer; transition: all 0.2s; }
        .mode-card:hover { transform: translateY(-2px); border-color: rgba(139,105,64,0.5); }
        .grammar-sub:hover { background: rgba(196,164,132,0.1) !important; }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "32px 24px 20px", textAlign: "center", borderBottom: "1px solid rgba(196,164,132,0.15)", background: "linear-gradient(180deg, rgba(139,90,43,0.12) 0%, transparent 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 12, right: 20, fontSize: 40, opacity: 0.06, fontFamily: "'Zen Antique', serif" }}>日本語</div>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "#8b6940", marginBottom: 8, fontFamily: "'Noto Serif', serif" }}>Japan Travel Phrasebook</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #c4a484, #dbc1a0, #8b6940)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Zen Antique', 'Noto Serif', serif", marginBottom: 4 }}>旅の言葉</h1>
        <div style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic" }}>Tabi no Kotoba — Words for the Journey</div>
        <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 4 }}>{Object.values(PHRASES).reduce((s, c) => s + c.phrases.length, 0)} phrases · {grammarEntryCount} grammar entries · tap any word to explore</div>
        {(favPhrases.length > 0 || quizScore.total > 0 || savedCards.length > 0) && (
          <div style={{ fontSize: 10, color: "#5a4a3a", marginTop: 2 }}>
            {favPhrases.length > 0 && `${favPhrases.length} saved`}
            {favPhrases.length > 0 && (quizScore.total > 0 || savedCards.length > 0) && " · "}
            {quizScore.total > 0 && `${Math.round((quizScore.correct / quizScore.total) * 100)}% quiz`}
            {quizScore.total > 0 && savedCards.length > 0 && " · "}
            {savedCards.length > 0 && `${savedCards.length} in deck`}
          </div>
        )}
      </div>

      {/* ═══ TABS — 5 tabs ═══ */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(196,164,132,0.12)", background: "rgba(0,0,0,0.15)" }}>
        {[
          { id: "browse", label: "Phrases", icon: "📖" },
          { id: "grammar", label: "Grammar", icon: "📐" },
          { id: "favorites", label: `Saved${favPhrases.length ? ` (${favPhrases.length})` : ""}`, icon: "⭐" },
          { id: "practice", label: "Practice", icon: "🎯" },
          { id: "deck", label: `Deck${savedCards.length ? ` (${savedCards.length})` : ""}`, icon: "🃏" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "12px 4px", background: activeTab === tab.id ? "rgba(196,164,132,0.1)" : "transparent",
            border: "none", borderBottom: activeTab === tab.id ? "2px solid #8b6940" : "2px solid transparent",
            color: activeTab === tab.id ? "#c4a484" : "#6b5b4b", cursor: "pointer", fontSize: 11, fontFamily: "'Noto Serif', serif", fontWeight: activeTab === tab.id ? 600 : 400,
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ═══ SEARCH — show on browse, grammar, favorites ═══ */}
      {(activeTab === "browse" || activeTab === "grammar" || activeTab === "favorites") && (
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{ position: "relative", background: "rgba(196,164,132,0.06)", border: "1px solid rgba(196,164,132,0.15)", borderRadius: 8, overflow: "hidden" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
            <input type="text" placeholder={activeTab === "grammar" ? "Search grammar..." : "Search phrases..."} value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "12px 80px 12px 38px", background: "transparent", border: "none", color: "#e8ddd3", fontSize: 14, fontFamily: "'Noto Serif', serif", outline: "none" }} />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 44, top: "50%", transform: "translateY(-50%)", background: "rgba(196,164,132,0.15)", border: "none", color: "#8b7b6b", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
            <button onClick={() => {
              const allP = Object.entries(PHRASES).flatMap(([cat, data]) => data.phrases.map(p => ({ ...p, category: cat })));
              const rand = allP[Math.floor(Math.random() * allP.length)];
              setActiveTab("browse"); setActiveCategory(rand.category); setSearch(""); setExpandedPhrase(rand.jp);
              setTimeout(() => speak(rand.jp), 300);
            }} title="Random phrase" style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "rgba(196,164,132,0.1)", border: "1px solid rgba(196,164,132,0.15)", color: "#8b7b6b",
              borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>🎲</button>
          </div>
        </div>
      )}

      {/* ═══ BROWSE TAB ═══ */}
      {activeTab === "browse" && !filteredPhrases && (
        <div style={{ padding: "8px 20px 20px" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0 16px", WebkitOverflowScrolling: "touch" }}>
            {categories.map(cat => <button key={cat} className="category-btn" onClick={() => setActiveCategory(cat)} style={pillBtn(activeCategory === cat)}>{PHRASES[cat].icon} {cat}</button>)}
          </div>
          <div style={{ padding: "10px 14px", background: "rgba(139,105,64,0.06)", borderRadius: 8, marginBottom: 16, borderLeft: "3px solid #8b6940" }}>
            <div style={{ fontSize: 12, color: "#8b7b6b" }}>{PHRASES[activeCategory].desc}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PHRASES[activeCategory].phrases.map((p, i) => (
              <PhraseCard key={p.jp + i} phrase={p} index={i} isFav={favorites.has(p.jp)} toggleFav={() => toggleFav(p.jp)}
                isExpanded={expandedPhrase === p.jp} toggleExpand={() => setExpandedPhrase(expandedPhrase === p.jp ? null : p.jp)}
                showBreakdownState={showBreakdown.has(p.jp)} toggleBreakdown={() => toggleBreakdown(p.jp)} onGrammarClick={navigateToGrammar} />
            ))}
          </div>
        </div>
      )}
      {activeTab === "browse" && filteredPhrases && (
        <div style={{ padding: "12px 20px 20px" }}>
          <div style={{ fontSize: 12, color: "#6b5b4b", marginBottom: 12 }}>{filteredPhrases.length} result{filteredPhrases.length !== 1 ? "s" : ""} for "{search}"</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPhrases.map((p, i) => (
              <PhraseCard key={p.jp + i} phrase={p} index={i} isFav={favorites.has(p.jp)} toggleFav={() => toggleFav(p.jp)}
                isExpanded={expandedPhrase === p.jp} toggleExpand={() => setExpandedPhrase(expandedPhrase === p.jp ? null : p.jp)}
                showBreakdownState={showBreakdown.has(p.jp)} toggleBreakdown={() => toggleBreakdown(p.jp)} onGrammarClick={navigateToGrammar} showCategory={true} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ FAVORITES TAB ═══ */}
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
                  showBreakdownState={showBreakdown.has(p.jp)} toggleBreakdown={() => toggleBreakdown(p.jp)}
                  onGrammarClick={navigateToGrammar} showCategory={true} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ GRAMMAR TAB — 7 sub-tabs ═══ */}
      {activeTab === "grammar" && (
        <div style={{ padding: "12px 20px 20px" }}>
          {/* Sub-navigation pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0 16px", WebkitOverflowScrolling: "touch" }}>
            {[
              { id: "reference", label: "📐 Reference" },
              { id: "structure", label: "🏗️ Structure" },
              { id: "particles", label: "🧩 Particles" },
              { id: "connectors", label: "🔗 Connectors" },
              { id: "questions", label: "❓ Questions" },
              { id: "vocab", label: "📝 Vocab" },
              { id: "pronunciation", label: "🗣️ Sounds" },
            ].map(s => (
              <button key={s.id} onClick={() => setGrammarSub(s.id)} className="category-btn" style={pillBtn(grammarSub === s.id)}>{s.label}</button>
            ))}
          </div>

          {/* REFERENCE sub-tab — v2's existing grammar content */}
          {grammarSub === "reference" && (
            <div>
              <div style={{ padding: "14px 16px", background: "rgba(139,105,64,0.06)", borderRadius: 10, marginBottom: 16, borderLeft: "3px solid #8b6940" }}>
                <div style={{ fontSize: 13, color: "#a08060", lineHeight: 1.7 }}>
                  <strong style={{ color: "#c4a484" }}>How Japanese sentences work:</strong> Unlike English, Japanese puts the verb at the end. Particles (wa, o, ni, de...) attach after words to show their role — like flags marking "this is the topic" or "this is the destination". Understanding particles is the key to building your own sentences.
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {Object.entries(TYPE_COLORS).slice(0, 6).map(([type, c]) => (
                  <span key={type} style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>{c.label}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(filteredGrammar || Object.entries(GRAMMAR)).map(([id, g]) => {
                  const isActive = activeGrammarId === id;
                  const tc = TYPE_COLORS[g.type] || TYPE_COLORS.particle;
                  const linked = []; Object.entries(PHRASES).forEach(([cat, data]) => { data.phrases.forEach(p => { if (p.breakdown?.some(b => b.grammarId === id)) linked.push({ ...p, category: cat }); }); });
                  return (
                    <div key={id} ref={isActive ? grammarRef : null} className="grammar-entry" style={{ background: isActive ? "rgba(139,105,64,0.1)" : cardBg, border: isActive ? "1px solid rgba(139,105,64,0.35)" : cardBorder, borderRadius: 12, overflow: "hidden", transition: "all 0.3s" }}>
                      <div onClick={() => setActiveGrammarId(isActive ? null : id)} style={{ padding: 16, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 22, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0" }}>{g.jp}</span>
                          <span style={{ fontSize: 15, color: "#c4a484", fontWeight: 600 }}>{id.replace(/_/g, " / ")}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, marginLeft: "auto" }}>{tc.label}</span>
                        </div>
                        <div style={{ fontSize: 14, color: "#a99b8b", fontWeight: 500, marginBottom: 6 }}>{g.meaning}</div>
                        <div style={{ fontSize: 12, color: "#8b7b6b", lineHeight: 1.7 }}>{g.explanation}</div>
                      </div>
                      {isActive && (
                        <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
                          {g.usage.length > 0 && <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, color: "#8b6940", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>EXAMPLES</div>
                            {g.usage.map((ex, i) => (<div key={i} style={{ padding: "8px 12px", marginBottom: 4, background: cardBg, borderRadius: 6, borderLeft: `2px solid ${tc.border}` }}>
                              <span style={{ fontSize: 15, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{ex.jp}</span>
                              <span style={{ fontSize: 12, color: "#8b7b6b", marginLeft: 8 }}>{ex.roma}</span>
                              <div style={{ fontSize: 12, color: "#a08060", marginTop: 2 }}>{ex.en}</div>
                            </div>))}
                          </div>}
                          {linked.length > 0 && <div>
                            <div style={{ fontSize: 10, color: "#8b6940", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>USED IN {linked.length} PHRASE{linked.length > 1 ? "S" : ""} — TAP TO VIEW</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {linked.slice(0, 8).map((p, i) => (<div key={i} className="phrase-link" onClick={() => navigateToPhrase(p.jp)} style={{ padding: "8px 12px", borderRadius: 6, background: cardBg, border: "1px solid rgba(196,164,132,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, opacity: 0.5 }}>{PHRASES[p.category]?.icon}</span>
                                <span style={{ fontSize: 13, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{p.jp}</span>
                                <span style={{ fontSize: 11, color: "#8b7b6b", marginLeft: "auto" }}>{p.en}</span>
                                <span style={{ fontSize: 10, color: "#6b5b4b" }}>→</span>
                              </div>))}
                            </div>
                          </div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STRUCTURE sub-tab */}
          {grammarSub === "structure" && (
            <div>
              <div style={{ padding: "16px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c4a484", marginBottom: 8 }}>🔑 The #1 Rule of Japanese</div>
                <div style={{ fontSize: 13, color: "#a99b8b", lineHeight: 1.7 }}>English is <strong style={{ color: "#dbc1a0" }}>Subject → Verb → Object</strong> (I eat ramen).</div>
                <div style={{ fontSize: 13, color: "#a99b8b", lineHeight: 1.7 }}>Japanese is <strong style={{ color: "#dbc1a0" }}>Subject → Object → Verb</strong> (I ramen eat).</div>
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontFamily: "'Noto Sans JP', monospace" }}>
                  <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 4 }}>English:</div>
                  <div style={{ fontSize: 14, color: "#c4a484", marginBottom: 8 }}>
                    <span style={{ background: "rgba(100,140,200,0.15)", padding: "2px 6px", borderRadius: 4 }}>I</span>{" "}
                    <span style={{ background: "rgba(200,100,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>eat</span>{" "}
                    <span style={{ background: "rgba(100,180,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>ramen</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 4 }}>Japanese:</div>
                  <div style={{ fontSize: 14, color: "#c4a484" }}>
                    <span style={{ background: "rgba(100,140,200,0.15)", padding: "2px 6px", borderRadius: 4 }}>私は</span>{" "}
                    <span style={{ background: "rgba(100,180,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>ラーメンを</span>{" "}
                    <span style={{ background: "rgba(200,100,100,0.15)", padding: "2px 6px", borderRadius: 4 }}>食べます</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 6 }}>
                    <span style={{ background: "rgba(100,140,200,0.15)", padding: "1px 4px", borderRadius: 3 }}>I [wa]</span>{" "}
                    <span style={{ background: "rgba(100,180,100,0.15)", padding: "1px 4px", borderRadius: 3 }}>ramen [o]</span>{" "}
                    <span style={{ background: "rgba(200,100,100,0.15)", padding: "1px 4px", borderRadius: 3 }}>eat</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#8b7b6b", marginTop: 12, lineHeight: 1.6 }}>
                  <strong style={{ color: "#a08060" }}>The verb ALWAYS goes last.</strong> Everything else can shift around as long as the little particles (は, を, に, で) mark what role each word plays. This is exactly like how you built sentences in Spain — learn the little connecting words and snap them together.
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "rgba(76,140,76,0.06)", border: "1px solid rgba(76,140,76,0.15)", borderRadius: 8, marginBottom: 16, fontSize: 12, color: "#8bc48b", lineHeight: 1.6 }}>
                <strong>Japan hack:</strong> You can often DROP the subject entirely. Japanese people rarely say "I" (watashi). Context handles it. So "ラーメンを食べます" (ramen o tabemasu) already means "I eat ramen" — shorter and more natural than including 私は.
              </div>
              {SENTENCE_PATTERNS.map((pat, i) => (
                <GrammarSection key={i} title={`${pat.title}`} defaultOpen={i === 0}>
                  <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, marginBottom: 10, fontFamily: "'Noto Sans JP', monospace" }}>
                    <div style={{ fontSize: 14, color: "#c4a484" }}>{pat.pattern}</div>
                    <div style={{ fontSize: 11, color: "#8b7b6b", marginTop: 2 }}>{pat.patternRoma}</div>
                    <div style={{ fontSize: 12, color: "#6b5b4b", marginTop: 2 }}>{pat.en}</div>
                  </div>
                  {pat.examples.map((ex, j) => (
                    <div key={j} style={{ padding: "10px 12px", marginBottom: 6, background: "rgba(196,164,132,0.04)", borderRadius: 6, borderLeft: "2px solid rgba(139,105,64,0.3)" }}>
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

          {/* PARTICLES sub-tab */}
          {grammarSub === "particles" && (
            <div>
              <div style={{ padding: "14px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "#a99b8b", lineHeight: 1.7 }}>
                <strong style={{ color: "#c4a484" }}>Particles are your superpower.</strong> They're the tiny words that tell you WHO does WHAT to WHOM, WHERE, WHEN, and HOW. In Spanish you had prepositions like "para", "con", "en" — Japanese particles work the same way but they come <em>after</em> the word instead of before it.
              </div>
              {PARTICLES.map((p, i) => (
                <GrammarSection key={i} title={
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Noto Sans JP', sans-serif", fontSize: 20, color: "#c4a484" }}>{p.particle}</span>
                    <span style={{ fontSize: 12, color: "#8b7b6b" }}>({p.roma}) — {p.role}</span>
                  </span>
                } defaultOpen={i === 0}>
                  <div style={{ fontSize: 12, color: "#a99b8b", lineHeight: 1.6, marginBottom: 10 }}>
                    <strong style={{ color: "#a08060" }}>Think of it as: "{p.en}"</strong>
                    <br />{p.explanation}
                  </div>
                  {p.examples.map((ex, j) => (
                    <div key={j} style={{ padding: "10px 12px", marginBottom: 6, background: "rgba(196,164,132,0.04)", borderRadius: 6, borderLeft: "2px solid rgba(139,105,64,0.3)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <AudioBtn text={ex.jp.replace(/　/g, "")} size={14} />
                        <span style={{ fontSize: 16, fontFamily: "'Noto Sans JP', sans-serif", color: "#dbc1a0" }}>{ex.jp}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#8b7b6b", fontStyle: "italic" }}>{ex.roma}</div>
                      <div style={{ fontSize: 12, color: "#a99b8b" }}>{ex.en}</div>
                      <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 4, fontFamily: "monospace" }}>↳ {ex.breakdown}</div>
                    </div>
                  ))}
                </GrammarSection>
              ))}
            </div>
          )}

          {/* CONNECTORS sub-tab */}
          {grammarSub === "connectors" && (
            <div>
              <div style={{ padding: "14px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "#a99b8b", lineHeight: 1.7 }}>
                <strong style={{ color: "#c4a484" }}>These are your sentence glue.</strong> Just like "pero", "porque", "entonces" let you chain ideas in Spanish, these words let you go beyond one-off phrases and actually express thoughts, reasons, and preferences.
              </div>
              {CONNECTORS.map((c, i) => (
                <div key={i} style={{ background: "rgba(196,164,132,0.04)", border: "1px solid rgba(196,164,132,0.1)", borderRadius: 10, padding: "14px 16px", marginBottom: 8, animation: "fadeIn 0.3s ease forwards", animationDelay: `${i * 30}ms`, opacity: 0 }} className="phrase-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0" }}>{c.jp}</span>
                      <span style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginLeft: 8 }}>{c.roma}</span>
                    </div>
                    <AudioBtn text={c.jp} size={14} />
                  </div>
                  <div style={{ fontSize: 14, color: "#c4a484", fontWeight: 600, marginBottom: 4 }}>{c.en}</div>
                  <div style={{ fontSize: 12, color: "#8b7b6b", marginBottom: 8, lineHeight: 1.5 }}>{c.usage}</div>
                  <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.15)", borderRadius: 6, borderLeft: "2px solid rgba(139,105,64,0.3)" }}>
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

          {/* QUESTIONS sub-tab */}
          {grammarSub === "questions" && (
            <div>
              <div style={{ padding: "14px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "#a99b8b", lineHeight: 1.7 }}>
                <strong style={{ color: "#c4a484" }}>Just add か (ka) to the end.</strong> Any statement becomes a question by adding か. And these question words slot in where the answer would go — "This is [what]?" = "これは何ですか？"
              </div>
              {QUESTION_WORDS.map((q, i) => (
                <div key={i} style={{ background: "rgba(196,164,132,0.04)", border: "1px solid rgba(196,164,132,0.1)", borderRadius: 10, padding: "14px 16px", marginBottom: 8, animation: "fadeIn 0.3s ease forwards", animationDelay: `${i * 30}ms`, opacity: 0 }} className="phrase-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 22, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0" }}>{q.jp}</span>
                      <span style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic", marginLeft: 8 }}>{q.roma}</span>
                    </div>
                    <AudioBtn text={q.jp.split("（")[0].split(" / ")[0]} size={14} />
                  </div>
                  <div style={{ fontSize: 15, color: "#c4a484", fontWeight: 600, marginBottom: 6 }}>{q.en}</div>
                  <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.15)", borderRadius: 6, fontSize: 12, color: "#8b7b6b", lineHeight: 1.6, fontStyle: "italic" }}>{q.example}</div>
                </div>
              ))}
            </div>
          )}

          {/* VOCAB sub-tab */}
          {grammarSub === "vocab" && (
            <div>
              <div style={{ padding: "14px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "#a99b8b", lineHeight: 1.7 }}>
                <strong style={{ color: "#c4a484" }}>Essential building blocks.</strong> These demonstratives, adjectives, and time words let you point at things, describe what you need, and add nuance. Combine with particles and patterns from the other sections.
              </div>
              {USEFUL_VOCAB.map((v, i) => (
                <div key={i} style={{ background: "rgba(196,164,132,0.04)", border: "1px solid rgba(196,164,132,0.1)", borderRadius: 10, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "fadeIn 0.3s ease forwards", animationDelay: `${i * 30}ms`, opacity: 0 }} className="phrase-card">
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

          {/* PRONUNCIATION sub-tab */}
          {grammarSub === "pronunciation" && (
            <div>
              <div style={{ padding: "14px", background: "linear-gradient(135deg, rgba(139,105,64,0.12), rgba(139,105,64,0.04))", border: "1px solid rgba(196,164,132,0.2)", borderRadius: 12, marginBottom: 16, fontSize: 12, color: "#a99b8b", lineHeight: 1.7 }}>
                <strong style={{ color: "#c4a484" }}>Good news: Japanese pronunciation is very consistent.</strong> Unlike English, each character always makes the same sound. There are only 5 vowel sounds and no silent letters (almost). If you can say the vowels right, you're 80% there.
              </div>

              <GrammarSection title="🗣️ The 5 Vowels — Master These First" defaultOpen={true}>
                {[
                  { char: "あ a", sound: "ah", like: "Like 'a' in 'father'", ex: "ありがとう", exRoma: "arigatō" },
                  { char: "い i", sound: "ee", like: "Like 'ee' in 'feet'", ex: "いい", exRoma: "ii" },
                  { char: "う u", sound: "oo", like: "Like 'oo' in 'food' but shorter, lips relaxed", ex: "うみ", exRoma: "umi" },
                  { char: "え e", sound: "eh", like: "Like 'e' in 'get'", ex: "えき", exRoma: "eki" },
                  { char: "お o", sound: "oh", like: "Like 'o' in 'go' but shorter", ex: "おはよう", exRoma: "ohayō" },
                ].map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, background: "rgba(196,164,132,0.04)", borderRadius: 6 }}>
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
                  <div key={i} style={{ padding: "10px 12px", marginBottom: 8, background: "rgba(196,164,132,0.04)", borderRadius: 6, borderLeft: "2px solid rgba(139,105,64,0.3)" }}>
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

              <div style={{ padding: "14px", background: "rgba(196,164,132,0.04)", borderRadius: 10, border: "1px solid rgba(196,164,132,0.08)", marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8b6940", marginBottom: 6 }}>🔊 Audio Tip</div>
                <div style={{ fontSize: 12, color: "#8b7b6b", lineHeight: 1.6 }}>
                  Every phrase in the Phrases tab has an audio button — tap to hear at normal speed, or use the 🐢 button for slow playback. Practice repeating out loud — the speech synthesis uses native Japanese pronunciation patterns.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PRACTICE TAB ═══ */}
      {activeTab === "practice" && (
        <div style={{ padding: "16px 20px 20px" }}>
          {!quizMode ? (
            <div>
              <div style={{ fontSize: 13, color: "#a08060", marginBottom: 16, lineHeight: 1.6 }}>
                Each mode targets a different skill. <strong style={{ color: "#c4a484" }}>Save any card</strong> to your deck for review later.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {QUIZ_MODES.map(m => (
                  <div key={m.id} className="mode-card" onClick={() => startMode(m.id)} style={{
                    padding: "18px 16px", borderRadius: 12, background: cardBg, border: cardBorder, display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <span style={{ fontSize: 28 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#c4a484", marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "#8b7b6b" }}>{m.desc}</div>
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 16, color: "#6b5b4b" }}>→</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: 16, background: cardBg, borderRadius: 10, border: "1px solid rgba(196,164,132,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8b6940", marginBottom: 8 }}>💡 Pronunciation Tips</div>
                <div style={{ fontSize: 12, color: "#8b7b6b", lineHeight: 1.8 }}>
                  <div><strong style={{ color: "#a08060" }}>ō / ū</strong> — Hold the vowel longer (not a different sound)</div>
                  <div><strong style={{ color: "#a08060" }}>r</strong> — Between English "r" and "l", tongue taps the roof</div>
                  <div><strong style={{ color: "#a08060" }}>desu / masu</strong> — The final "u" is nearly silent: "dess", "mass"</div>
                  <div><strong style={{ color: "#a08060" }}>tsu</strong> — Like "ts" in "cats", not "too-sue"</div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <button onClick={() => { setQuizMode(null); setQuizQ(null); }} style={{
                  padding: "6px 12px", borderRadius: 8, background: "rgba(196,164,132,0.06)", border: cardBorder,
                  color: "#8b7b6b", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Serif', serif",
                }}>← Modes</button>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#c4a484" }}>
                  {QUIZ_MODES.find(m => m.id === quizMode)?.icon} {QUIZ_MODES.find(m => m.id === quizMode)?.label}
                </div>
                <div style={{ fontSize: 13, color: "#8b7b6b" }}>
                  {quizScore.total > 0 && <><span style={{ color: "#8b6940", fontWeight: 700 }}>{quizScore.correct}</span> / {quizScore.total}</>}
                </div>
              </div>

              {quizMode === "phrase_match" && (
                <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(196,164,132,0.06)", borderRadius: 8, padding: 3, border: cardBorder, width: "fit-content" }}>
                  {[{ id: "en-to-jp", label: "EN → JP" }, { id: "jp-to-en", label: "JP → EN" }].map(d => (
                    <button key={d.id} onClick={() => { setQuizDirection(d.id); setQuizScore({ correct: 0, total: 0 }); nextQuiz("phrase_match"); }}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: quizDirection === d.id ? "rgba(139,105,64,0.25)" : "transparent", color: quizDirection === d.id ? "#c4a484" : "#6b5b4b", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Serif', serif", fontWeight: quizDirection === d.id ? 600 : 400 }}
                    >{d.label}</button>
                  ))}
                </div>
              )}

              {quizQ && (
                <div style={{ animation: "slideUp 0.3s ease forwards" }}>
                  {/* ─── FILL THE GAP / PARTICLE PICK ─── */}
                  {(quizQ.type === "fill_gap" || quizQ.type === "particle_pick") && (<>
                    <div style={{ padding: "20px 16px", background: "rgba(139,105,64,0.06)", border: cardBorder, borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "#6b5b4b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                        {quizQ.type === "fill_gap" ? "FILL THE MISSING WORD" : "PICK THE RIGHT PARTICLE"}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center", marginBottom: 10 }}>
                        {quizQ.phrase.breakdown.map((b, i) => (
                          <span key={i} style={{
                            padding: "6px 10px", borderRadius: 8, fontWeight: 600, fontSize: 17,
                            ...(i === quizQ.targetIdx ? {
                              background: quizAnswered ? (quizSelected?.correct ? "rgba(76,140,76,0.15)" : "rgba(180,80,60,0.12)") : "rgba(100,160,220,0.12)",
                              border: quizAnswered ? (quizSelected?.correct ? "2px solid rgba(76,140,76,0.5)" : "2px solid rgba(180,80,60,0.4)") : "2px dashed rgba(100,160,220,0.5)",
                              color: quizAnswered ? (quizSelected?.correct ? "#8bc48b" : "#c49090") : "#7db8e0",
                              minWidth: 50, textAlign: "center",
                            } : { color: "#dbc1a0" }),
                          }}>
                            {i === quizQ.targetIdx ? (quizAnswered ? quizQ.target.roma : "___") : b.roma}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 10 }}>
                        {quizQ.phrase.breakdown.map((b, i) => (
                          <span key={i} style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: i === quizQ.targetIdx ? (quizAnswered ? "#8b7b6b" : "#5a4a3a") : "#6b5b4b" }}>
                            {i === quizQ.targetIdx ? (quizAnswered ? quizQ.target.word : "？") : b.word}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 14, color: "#c4a484", textAlign: "center", fontWeight: 500 }}>{quizQ.en}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {quizQ.options.map((opt, i) => {
                        const isCorrect = opt.correct;
                        const isSelected = quizSelected === opt;
                        let bg = cardBg, border = "rgba(196,164,132,0.12)", tc = "#e8ddd3";
                        if (quizAnswered) {
                          if (isCorrect) { bg = "rgba(76,140,76,0.12)"; border = "rgba(76,140,76,0.4)"; tc = "#8bc48b"; }
                          else if (isSelected) { bg = "rgba(180,80,60,0.1)"; border = "rgba(180,80,60,0.3)"; tc = "#c49090"; }
                          else { bg = "rgba(196,164,132,0.02)"; tc = "#5a4a3a"; }
                        }
                        return (
                          <button key={i} className={`quiz-option ${quizAnswered ? "answered" : ""}`}
                            onClick={() => { if (quizAnswered) return; setQuizSelected(opt); setQuizAnswered(true); setQuizScore(prev => ({ correct: prev.correct + (opt.correct ? 1 : 0), total: prev.total + 1 })); }}
                            style={{ padding: "12px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 10, color: tc, cursor: quizAnswered ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontSize: 16 }}>
                            <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${quizAnswered && isCorrect ? "rgba(76,140,76,0.5)" : "rgba(196,164,132,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: quizAnswered && isCorrect ? "rgba(76,140,76,0.15)" : "transparent", color: quizAnswered && isCorrect ? "#8bc48b" : "#6b5b4b" }}>
                              {quizAnswered ? (isCorrect ? "✓" : isSelected ? "✕" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                            </span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: 17 }}>{opt.roma || opt.word || opt.jp}</span>
                              <span style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#5a4a3a", marginLeft: 10 }}>{opt.word || opt.jp}</span>
                              {quizAnswered && isCorrect && <div style={{ fontSize: 11, color: "#8bc48b", marginTop: 3 }}>{opt.meaning}</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>)}

                  {/* ─── BUILD IT ─── */}
                  {quizQ.type === "build_it" && (<>
                    <div style={{ padding: "20px 16px", background: "rgba(139,105,64,0.06)", border: cardBorder, borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "#6b5b4b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>BUILD THIS SENTENCE</div>
                      <div style={{ fontSize: 16, color: "#c4a484", textAlign: "center", fontWeight: 500 }}>{quizQ.en}</div>
                    </div>
                    <div style={{ minHeight: 56, padding: "12px", background: "rgba(196,164,132,0.03)", border: "1px dashed rgba(196,164,132,0.2)", borderRadius: 10, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {buildSelected.length === 0 && <span style={{ fontSize: 12, color: "#5a4a3a", fontStyle: "italic" }}>Tap words below in order...</span>}
                      {buildSelected.map((b, i) => {
                        const isCorrect = buildChecked && b.origIdx === i;
                        const isWrong = buildChecked && b.origIdx !== i;
                        return (
                          <span key={i} onClick={() => { if (buildChecked) return; setBuildSelected(prev => prev.filter((_, j) => j !== i)); }}
                            className="build-tile" style={{
                              padding: "8px 12px", borderRadius: 8, fontWeight: 600, fontSize: 15,
                              background: isCorrect ? "rgba(76,140,76,0.12)" : isWrong ? "rgba(180,80,60,0.1)" : "rgba(139,105,64,0.15)",
                              border: isCorrect ? "1px solid rgba(76,140,76,0.4)" : isWrong ? "1px solid rgba(180,80,60,0.3)" : "1px solid rgba(139,105,64,0.3)",
                              color: isCorrect ? "#8bc48b" : isWrong ? "#c49090" : "#dbc1a0",
                              textAlign: "center",
                            }}>
                            {b.roma}
                            <div style={{ fontSize: 10, fontFamily: "'Noto Sans JP', sans-serif", color: isCorrect ? "rgba(139,196,139,0.5)" : isWrong ? "rgba(196,144,144,0.5)" : "#6b5b4b", marginTop: 1 }}>{b.word}</div>
                          </span>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, justifyContent: "center" }}>
                      {quizQ.scrambled.map((b, i) => {
                        const used = buildSelected.some(s => s === b);
                        return (
                          <span key={i} onClick={() => { if (used || buildChecked) return; setBuildSelected(prev => [...prev, b]); }}
                            className="build-tile" style={{
                              padding: "10px 14px", borderRadius: 10, fontWeight: 600, fontSize: 16, textAlign: "center",
                              background: used ? "rgba(196,164,132,0.02)" : "rgba(196,164,132,0.08)",
                              border: used ? "1px solid rgba(196,164,132,0.05)" : cardBorder,
                              color: used ? "#3a2a1a" : "#dbc1a0", opacity: used ? 0.3 : 1,
                            }}>
                            {b.roma}
                            <div style={{ fontSize: 10, fontFamily: "'Noto Sans JP', sans-serif", color: "#6b5b4b", marginTop: 2 }}>{b.word}</div>
                            <div style={{ fontSize: 9, color: "#5a4a3a", marginTop: 1 }}>{b.meaning}</div>
                          </span>
                        );
                      })}
                    </div>
                    {buildSelected.length === quizQ.correctOrder.length && !buildChecked && (
                      <button onClick={() => {
                        setBuildChecked(true);
                        const correct = buildSelected.every((s, i) => s.origIdx === i);
                        setQuizScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
                        setQuizAnswered(true);
                      }} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg, rgba(139,105,64,0.25), rgba(139,105,64,0.15))", border: "1px solid rgba(139,105,64,0.4)", borderRadius: 10, color: "#c4a484", cursor: "pointer", fontSize: 14, fontFamily: "'Noto Serif', serif", fontWeight: 600, letterSpacing: 1 }}>
                        Check Order ✓
                      </button>
                    )}
                    {buildChecked && !buildSelected.every((s, i) => s.origIdx === i) && (
                      <div style={{ padding: "12px 16px", background: "rgba(180,80,60,0.08)", border: "1px solid rgba(180,80,60,0.2)", borderRadius: 10, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "#c49090", fontWeight: 600, marginBottom: 6 }}>Correct order:</div>
                        <div style={{ fontSize: 16, color: "#dbc1a0", fontWeight: 600 }}>{quizQ.correctOrder.map(b => b.roma).join("  ")}</div>
                        <div style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#6b5b4b", marginTop: 4 }}>{quizQ.correctOrder.map(b => b.word).join(" ")}</div>
                      </div>
                    )}
                  </>)}

                  {/* ─── PHRASE MATCH ─── */}
                  {quizQ.type === "phrase_match" && (<>
                    <div style={{ padding: "24px 20px", background: "rgba(139,105,64,0.06)", border: cardBorder, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "#6b5b4b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                        {quizDirection === "en-to-jp" ? "How do you say..." : "What does this mean?"}
                      </div>
                      {quizDirection === "en-to-jp" ? (
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#dbc1a0", lineHeight: 1.5 }}>{quizQ.correct.en}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 20, fontWeight: 600, color: "#dbc1a0", lineHeight: 1.5 }}>{quizQ.correct.roma}</div>
                          <div style={{ fontSize: 14, fontFamily: "'Noto Sans JP', sans-serif", color: "#6b5b4b", marginTop: 6 }}>{quizQ.correct.jp}</div>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {quizQ.options.map((opt, i) => {
                        const isCorrect = opt.jp === quizQ.correct.jp;
                        const isSelected = quizSelected?.jp === opt.jp;
                        let bg = cardBg, border = "rgba(196,164,132,0.12)", tc = "#e8ddd3";
                        if (quizAnswered) {
                          if (isCorrect) { bg = "rgba(76,140,76,0.12)"; border = "rgba(76,140,76,0.4)"; tc = "#8bc48b"; }
                          else if (isSelected) { bg = "rgba(180,80,60,0.1)"; border = "rgba(180,80,60,0.3)"; tc = "#c49090"; }
                          else { bg = "rgba(196,164,132,0.02)"; tc = "#5a4a3a"; }
                        }
                        return (
                          <button key={i} className={`quiz-option ${quizAnswered ? "answered" : ""}`}
                            onClick={() => { if (quizAnswered) return; setQuizSelected(opt); setQuizAnswered(true); setQuizScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 })); }}
                            style={{ padding: "14px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 10, color: tc, cursor: quizAnswered ? "default" : "pointer", textAlign: "left", fontSize: 15, display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${quizAnswered && isCorrect ? "rgba(76,140,76,0.5)" : "rgba(196,164,132,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: quizAnswered && isCorrect ? "rgba(76,140,76,0.15)" : "transparent", color: quizAnswered && isCorrect ? "#8bc48b" : "#6b5b4b" }}>
                              {quizAnswered ? (isCorrect ? "✓" : isSelected ? "✕" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                            </span>
                            <div>
                              {quizDirection === "en-to-jp" ? (
                                <>
                                  <span style={{ fontWeight: 600 }}>{opt.roma}</span>
                                  <span style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#6b5b4b", marginLeft: 8 }}>{opt.jp}</span>
                                </>
                              ) : (
                                <span>{opt.en}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>)}

                  {/* ─── LISTENING ─── */}
                  {quizQ.type === "listening" && (<>
                    <div style={{ padding: "24px 20px", background: "rgba(139,105,64,0.06)", border: cardBorder, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "#6b5b4b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>WHAT DID YOU HEAR?</div>
                      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                        <AudioBtn text={quizQ.correct.jp} size={24} />
                        <AudioBtn text={quizQ.correct.jp} slow size={24} />
                      </div>
                      {!quizAnswered && <div style={{ fontSize: 12, color: "#6b5b4b", fontStyle: "italic" }}>Listen and choose the correct meaning</div>}
                      {quizAnswered && (
                        <div style={{ marginTop: 8, animation: "fadeIn 0.3s ease" }}>
                          <div style={{ fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500, color: "#dbc1a0" }}>{quizQ.correct.jp}</div>
                          <div style={{ fontSize: 14, color: "#8b7b6b", fontStyle: "italic", marginTop: 4 }}>{quizQ.correct.roma}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {quizQ.options.map((opt, i) => {
                        const isCorrect = opt.correct;
                        const isSelected = quizSelected === opt;
                        let bg = cardBg, border = "rgba(196,164,132,0.12)", tc = "#e8ddd3";
                        if (quizAnswered) {
                          if (isCorrect) { bg = "rgba(76,140,76,0.12)"; border = "rgba(76,140,76,0.4)"; tc = "#8bc48b"; }
                          else if (isSelected) { bg = "rgba(180,80,60,0.1)"; border = "rgba(180,80,60,0.3)"; tc = "#c49090"; }
                          else { bg = "rgba(196,164,132,0.02)"; tc = "#5a4a3a"; }
                        }
                        return (
                          <button key={i} className={`quiz-option ${quizAnswered ? "answered" : ""}`}
                            onClick={() => { if (quizAnswered) return; setQuizSelected(opt); setQuizAnswered(true); setQuizScore(prev => ({ correct: prev.correct + (opt.correct ? 1 : 0), total: prev.total + 1 })); }}
                            style={{ padding: "14px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 10, color: tc, cursor: quizAnswered ? "default" : "pointer", textAlign: "left", fontSize: 15, display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${quizAnswered && isCorrect ? "rgba(76,140,76,0.5)" : "rgba(196,164,132,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, background: quizAnswered && isCorrect ? "rgba(76,140,76,0.15)" : "transparent", color: quizAnswered && isCorrect ? "#8bc48b" : "#6b5b4b" }}>
                              {quizAnswered ? (isCorrect ? "✓" : isSelected ? "✕" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                            </span>
                            <span>{opt.en}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>)}

                  {/* ─── AFTER ANSWER: Save + Next ─── */}
                  {quizAnswered && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => {
                        let card;
                        if (quizQ.type === "fill_gap" || quizQ.type === "particle_pick") {
                          card = { front: `What is "${quizQ.target.word}" (${quizQ.target.roma})?`, back: `${quizQ.target.roma}: ${quizQ.target.meaning}${quizQ.target.grammarId ? ` — ${GRAMMAR[quizQ.target.grammarId]?.meaning || ""}` : ""}`, en: quizQ.phrase.en, jp: quizQ.phrase.jp, roma: quizQ.phrase.roma };
                        } else if (quizQ.type === "build_it") {
                          card = { front: quizQ.en, back: quizQ.phrase.jp, en: quizQ.en, jp: quizQ.phrase.jp, roma: quizQ.phrase.roma };
                        } else if (quizQ.type === "listening") {
                          card = { front: `🎧 Listen: what does this mean?`, back: `${quizQ.correct.jp}\n${quizQ.correct.roma}\n${quizQ.correct.en}`, en: quizQ.correct.en, jp: quizQ.correct.jp, roma: quizQ.correct.roma };
                        } else {
                          card = { front: quizQ.correct.en, back: quizQ.correct.jp, en: quizQ.correct.en, jp: quizQ.correct.jp, roma: quizQ.correct.roma };
                        }
                        saveCard(card);
                      }} style={{
                        flex: 1, padding: 12, borderRadius: 10, border: cardBorder, background: cardBg,
                        color: "#8b7b6b", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Serif', serif",
                      }}>🃏 Save to Deck</button>
                      <button onClick={() => nextQuiz(quizMode)} style={{
                        flex: 2, padding: 12, background: "linear-gradient(135deg, rgba(139,105,64,0.25), rgba(139,105,64,0.15))",
                        border: "1px solid rgba(139,105,64,0.4)", borderRadius: 10, color: "#c4a484", cursor: "pointer", fontSize: 14, fontFamily: "'Noto Serif', serif", fontWeight: 600,
                      }}>Next →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ DECK TAB ═══ */}
      {activeTab === "deck" && (
        <div style={{ padding: "16px 20px 20px" }}>
          {savedCards.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b5b4b" }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🃏</div>
              <div style={{ fontSize: 15, marginBottom: 6 }}>Your flashcard deck is empty</div>
              <div style={{ fontSize: 12 }}>Save cards from any Practice mode to build a personal review deck</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 10, textAlign: "center" }}>Card {Math.min(reviewIdx + 1, savedCards.length)} of {savedCards.length} · tap to flip</div>
                <div onClick={() => setReviewFlipped(!reviewFlipped)} style={{
                  padding: "32px 20px", minHeight: 160, borderRadius: 14, cursor: "pointer",
                  background: reviewFlipped ? "rgba(139,105,64,0.1)" : "rgba(196,164,132,0.06)",
                  border: reviewFlipped ? "1px solid rgba(139,105,64,0.35)" : cardBorder,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                  transition: "all 0.3s", animation: "fadeIn 0.25s ease",
                }}>
                  {!reviewFlipped ? (
                    <>
                      <div style={{ fontSize: 10, color: "#6b5b4b", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>QUESTION</div>
                      <div style={{ fontSize: 17, color: "#dbc1a0", lineHeight: 1.6, fontWeight: 500 }}>{savedCards[reviewIdx]?.front}</div>
                      {savedCards[reviewIdx]?.en && savedCards[reviewIdx]?.front !== savedCards[reviewIdx]?.en && (
                        <div style={{ fontSize: 13, color: "#8b7b6b", marginTop: 8, fontStyle: "italic" }}>{savedCards[reviewIdx].en}</div>
                      )}
                      {savedCards[reviewIdx]?.jp && !savedCards[reviewIdx]?.front.includes(savedCards[reviewIdx]?.jp) && (
                        <div style={{ fontSize: 15, fontFamily: "'Noto Sans JP', sans-serif", color: "#a08060", marginTop: 6 }}>{savedCards[reviewIdx].jp}</div>
                      )}
                      <div style={{ fontSize: 11, color: "#5a4a3a", marginTop: 12 }}>tap to reveal →</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, color: "#8b6940", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>ANSWER</div>
                      <div style={{ fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif", color: "#c4a484", lineHeight: 1.5, fontWeight: 500, whiteSpace: "pre-line" }}>{savedCards[reviewIdx]?.back}</div>
                      {savedCards[reviewIdx]?.roma && <div style={{ fontSize: 13, color: "#8b7b6b", marginTop: 4, fontStyle: "italic" }}>{savedCards[reviewIdx].roma}</div>}
                      {savedCards[reviewIdx]?.en && <div style={{ fontSize: 14, color: "#a08060", marginTop: 8 }}>{savedCards[reviewIdx].en}</div>}
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
                  <button onClick={() => { setReviewIdx(Math.max(0, reviewIdx - 1)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>← Prev</button>
                  <button onClick={() => { setReviewIdx(Math.min(savedCards.length - 1, reviewIdx + 1)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>Next →</button>
                  <button onClick={() => { setReviewIdx(Math.floor(Math.random() * savedCards.length)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>🔀</button>
                  <button onClick={() => {
                    const text = savedCards.map(c => `${c.front}\t${c.back}`).join("\n");
                    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard! Paste into Anki or any flashcard app."));
                  }} style={{
                    padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder,
                    color: "#8b7b6b", cursor: "pointer", fontSize: 13,
                  }}>📋 Export</button>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#6b5b4b", marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>ALL CARDS IN DECK</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {savedCards.map((card, i) => (
                  <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: reviewIdx === i ? "rgba(139,105,64,0.1)" : cardBg, border: reviewIdx === i ? "1px solid rgba(139,105,64,0.3)" : cardBorder, display: "flex", alignItems: "center", gap: 10 }}>
                    <div onClick={() => { setReviewIdx(i); setReviewFlipped(false); }} style={{ flex: 1, cursor: "pointer" }}>
                      <div style={{ fontSize: 13, color: "#dbc1a0", lineHeight: 1.4 }}>{card.front}</div>
                      <div style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#a08060", marginTop: 2 }}>{card.jp}{card.roma ? ` — ${card.roma}` : ""}</div>
                      {card.en && card.en !== card.front && <div style={{ fontSize: 11, color: "#8b7b6b", marginTop: 2 }}>{card.en}</div>}
                    </div>
                    <button onClick={() => { removeCard(i); if (reviewIdx >= savedCards.length - 1) setReviewIdx(Math.max(0, savedCards.length - 2)); }}
                      style={{ background: "none", border: "none", color: "#6b5b4b", cursor: "pointer", fontSize: 14, padding: 4, opacity: 0.5 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div style={{ padding: 20, textAlign: "center", borderTop: "1px solid rgba(196,164,132,0.08)", marginTop: 20 }}>
        <div style={{ fontSize: 11, color: "#4a3a2a" }}>Built for Jacob's Japan trip · March 22 – April 10, 2026</div>
        <div style={{ fontSize: 10, color: "#3a2a1a", marginTop: 4 }}>Kyushu → Tokyo → Kyoto → Osaka → Kawaguchiko</div>
      </div>
    </div>
  );
}

export default App;