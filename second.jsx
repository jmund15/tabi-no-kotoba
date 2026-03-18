import { useState, useMemo, useCallback, useEffect, useRef } from "react";

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

// ─── TYPE COLORS ────────────────────────────────────────────────────
const TYPE_COLORS = {
  particle: { bg: "rgba(100,160,220,0.12)", border: "rgba(100,160,220,0.35)", text: "#7db8e0", label: "Particle" },
  copula: { bg: "rgba(180,130,220,0.12)", border: "rgba(180,130,220,0.35)", text: "#c4a0e0", label: "Copula" },
  verb: { bg: "rgba(120,190,120,0.12)", border: "rgba(120,190,120,0.35)", text: "#90c490", label: "Verb" },
  "verb form": { bg: "rgba(120,190,120,0.12)", border: "rgba(120,190,120,0.35)", text: "#90c490", label: "Verb Form" },
  "verb ending": { bg: "rgba(120,190,120,0.12)", border: "rgba(120,190,120,0.35)", text: "#90c490", label: "Verb Ending" },
  auxiliary: { bg: "rgba(220,180,100,0.12)", border: "rgba(220,180,100,0.35)", text: "#d4b870", label: "Auxiliary" },
  expression: { bg: "rgba(220,150,100,0.12)", border: "rgba(220,150,100,0.35)", text: "#d4a070", label: "Expression" },
  "question word": { bg: "rgba(220,120,160,0.12)", border: "rgba(220,120,160,0.35)", text: "#d490a0", label: "Question" },
  pronoun: { bg: "rgba(160,200,180,0.12)", border: "rgba(160,200,180,0.35)", text: "#a0c8b4", label: "Pronoun" },
  negation: { bg: "rgba(200,100,100,0.12)", border: "rgba(200,100,100,0.35)", text: "#c49090", label: "Negation" },
};

// ─── AUDIO ──────────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find(v => v.lang.startsWith("ja"));
  if (jaVoice) utterance.voice = jaVoice;
  window.speechSynthesis.speak(utterance);
}

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
  // Build wrong options from other grammar entries
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
  // Ensure it's actually scrambled
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

const QUIZ_MODES = [
  { id: "fill_gap", label: "Fill the Gap", icon: "🧩", desc: "Pick the missing word from a real phrase" },
  { id: "particle_pick", label: "Particle Pick", icon: "🔗", desc: "Choose the correct particle for the sentence" },
  { id: "build_it", label: "Build It", icon: "🏗️", desc: "Arrange scrambled words into correct order" },
  { id: "phrase_match", label: "Translate", icon: "🔄", desc: "Match phrases to their meanings" },
];

// ─── MAIN APP ───────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeCategory, setActiveCategory] = useState("Essentials");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => new Set());
  const [expandedPhrase, setExpandedPhrase] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(new Set());
  const [activeGrammarId, setActiveGrammarId] = useState(null);
  const grammarRef = useRef(null);

  // Quiz state
  const [quizMode, setQuizMode] = useState(null); // null = mode picker
  const [quizQ, setQuizQ] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizDirection, setQuizDirection] = useState("en-to-jp");
  // Build It state
  const [buildSelected, setBuildSelected] = useState([]);
  const [buildChecked, setBuildChecked] = useState(false);
  // Flashcard deck
  const [savedCards, setSavedCards] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewFlipped, setReviewFlipped] = useState(false);

  const toggleFav = useCallback((key) => { setFavorites(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }, []);
  const toggleBreakdown = useCallback((key) => { setShowBreakdown(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); }, []);

  const navigateToGrammar = useCallback((grammarId) => {
    setActiveGrammarId(grammarId); setActiveTab("grammar");
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
    setQuizQ(q); setQuizAnswered(false); setQuizSelected(null); setBuildSelected([]); setBuildChecked(false);
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
      `}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "32px 24px 20px", textAlign: "center", borderBottom: "1px solid rgba(196,164,132,0.15)", background: "linear-gradient(180deg, rgba(139,90,43,0.12) 0%, transparent 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 12, right: 20, fontSize: 40, opacity: 0.06, fontFamily: "'Zen Antique', serif" }}>日本語</div>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "#8b6940", marginBottom: 8, fontFamily: "'Noto Serif', serif" }}>Japan Travel Phrasebook</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #c4a484, #dbc1a0, #8b6940)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Zen Antique', 'Noto Serif', serif", marginBottom: 4 }}>旅の言葉</h1>
        <div style={{ fontSize: 13, color: "#8b7b6b", fontStyle: "italic" }}>Tabi no Kotoba — Words for the Journey</div>
        <div style={{ fontSize: 11, color: "#6b5b4b", marginTop: 4 }}>{Object.values(PHRASES).reduce((s, c) => s + c.phrases.length, 0)} phrases · {grammarEntryCount} grammar entries · tap any word to explore</div>
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(196,164,132,0.12)", background: "rgba(0,0,0,0.15)" }}>
        {[{ id: "browse", label: "Phrases", icon: "📖" }, { id: "grammar", label: "Grammar", icon: "📐" }, { id: "practice", label: "Practice", icon: "🎯" }, { id: "deck", label: `Deck${savedCards.length ? ` (${savedCards.length})` : ""}`, icon: "🃏" }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "12px 4px", background: activeTab === tab.id ? "rgba(196,164,132,0.1)" : "transparent",
            border: "none", borderBottom: activeTab === tab.id ? "2px solid #8b6940" : "2px solid transparent",
            color: activeTab === tab.id ? "#c4a484" : "#6b5b4b", cursor: "pointer", fontSize: 11, fontFamily: "'Noto Serif', serif", fontWeight: activeTab === tab.id ? 600 : 400,
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ═══ SEARCH ═══ */}
      {(activeTab === "browse" || activeTab === "grammar") && (
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{ position: "relative", background: "rgba(196,164,132,0.06)", border: "1px solid rgba(196,164,132,0.15)", borderRadius: 8, overflow: "hidden" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
            <input type="text" placeholder={activeTab === "grammar" ? "Search grammar..." : "Search phrases..."} value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "12px 12px 12px 38px", background: "transparent", border: "none", color: "#e8ddd3", fontSize: 14, fontFamily: "'Noto Serif', serif", outline: "none" }} />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(196,164,132,0.15)", border: "none", color: "#8b7b6b", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
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

      {/* ═══ GRAMMAR TAB ═══ */}
      {activeTab === "grammar" && (
        <div style={{ padding: "12px 20px 20px" }}>
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

      {/* ═══ PRACTICE TAB ═══ */}
      {activeTab === "practice" && (
        <div style={{ padding: "16px 20px 20px" }}>
          {!quizMode ? (
            /* ─── Mode Picker ─── */
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

              {/* Pronunciation Tips */}
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
            /* ─── Active Quiz ─── */
            <div>
              {/* Quiz header */}
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

              {/* Phrase match direction toggle */}
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
                  {/* ─── FILL THE GAP ─── */}
                  {(quizQ.type === "fill_gap" || quizQ.type === "particle_pick") && (<>
                    <div style={{ padding: "20px 16px", background: "rgba(139,105,64,0.06)", border: cardBorder, borderRadius: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "#6b5b4b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                        {quizQ.type === "fill_gap" ? "FILL THE MISSING WORD" : "PICK THE RIGHT PARTICLE"}
                      </div>
                      {/* Romaji-primary sentence with gap */}
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
                      {/* Small kana reference underneath */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 10 }}>
                        {quizQ.phrase.breakdown.map((b, i) => (
                          <span key={i} style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: i === quizQ.targetIdx ? (quizAnswered ? "#8b7b6b" : "#5a4a3a") : "#6b5b4b" }}>
                            {i === quizQ.targetIdx ? (quizAnswered ? quizQ.target.word : "？") : b.word}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 14, color: "#c4a484", textAlign: "center", fontWeight: 500 }}>{quizQ.en}</div>
                    </div>
                    {/* Options — romaji primary, meaning shown, kana small */}
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
                    {/* Answer slots — romaji primary */}
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
                    {/* Available tiles — romaji prominent, kana + meaning small */}
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
                    {/* Check button */}
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
                        <div style={{ fontSize: 16, color: "#dbc1a0", fontWeight: 600 }}>
                          {quizQ.correctOrder.map(b => b.roma).join("  ")}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif", color: "#6b5b4b", marginTop: 4 }}>
                          {quizQ.correctOrder.map(b => b.word).join(" ")}
                        </div>
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

                  {/* ─── AFTER ANSWER: Save + Next ─── */}
                  {quizAnswered && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => {
                        let card;
                        if (quizQ.type === "fill_gap" || quizQ.type === "particle_pick") {
                          card = { front: `What is "${quizQ.target.word}" (${quizQ.target.roma})?`, back: `${quizQ.target.roma}: ${quizQ.target.meaning}${quizQ.target.grammarId ? ` — ${GRAMMAR[quizQ.target.grammarId]?.meaning || ""}` : ""}`, en: quizQ.phrase.en, jp: quizQ.phrase.jp, roma: quizQ.phrase.roma };
                        } else if (quizQ.type === "build_it") {
                          card = { front: quizQ.en, back: quizQ.phrase.jp, en: quizQ.en, jp: quizQ.phrase.jp, roma: quizQ.phrase.roma };
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
              {/* Flashcard review */}
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
                      <div style={{ fontSize: 20, fontFamily: "'Noto Sans JP', sans-serif", color: "#c4a484", lineHeight: 1.5, fontWeight: 500 }}>{savedCards[reviewIdx]?.back}</div>
                      {savedCards[reviewIdx]?.roma && <div style={{ fontSize: 13, color: "#8b7b6b", marginTop: 4, fontStyle: "italic" }}>{savedCards[reviewIdx].roma}</div>}
                      {savedCards[reviewIdx]?.en && <div style={{ fontSize: 14, color: "#a08060", marginTop: 8 }}>{savedCards[reviewIdx].en}</div>}
                    </>
                  )}
                </div>
                {/* Navigation */}
                <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
                  <button onClick={() => { setReviewIdx(Math.max(0, reviewIdx - 1)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>← Prev</button>
                  <button onClick={() => { setReviewIdx(Math.min(savedCards.length - 1, reviewIdx + 1)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>Next →</button>
                  <button onClick={() => { setReviewIdx(Math.floor(Math.random() * savedCards.length)); setReviewFlipped(false); }}
                    style={{ padding: "8px 20px", borderRadius: 8, background: cardBg, border: cardBorder, color: "#8b7b6b", cursor: "pointer", fontSize: 13 }}>🔀</button>
                </div>
              </div>

              {/* Card list */}
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

export default App;