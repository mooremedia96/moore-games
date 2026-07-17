const PROFANITY_TERMS = [
    "asshole",
    "bastard",
    "bitch",
    "bullshit",
    "cunt",
    "dick",
    "douchebag",
    "fuck",
    "motherfucker",
    "piss",
    "prick",
    "shit",
    "slut",
    "whore",
];

const SPAM_PHRASES = [
    "backlink",
    "buy followers",
    "casino",
    "cheap traffic",
    "crypto investment",
    "first page of google",
    "guest post",
    "increase your traffic",
    "loan offer",
    "make money fast",
    "marketing agency",
    "rank your website",
    "search engine optimization",
    "seo service",
    "sponsored article",
    "viagra",
];

const PLACEHOLDER_NAMES = new Set([
    "anonymous",
    "anon",
    "asdf",
    "fake",
    "guest",
    "n a",
    "no name",
    "none",
    "test",
    "unknown",
]);

const URL_PATTERN =
    /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const HTML_PATTERN = /<\/?[a-z][^>]*>/i;
const EMAIL_IN_TEXT_PATTERN =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function normalizeText(value = "") {
    return String(value)
        .normalize("NFKC")
        .toLowerCase()
        .replaceAll("@", "a")
        .replaceAll("$", "s")
        .replaceAll("0", "o")
        .replaceAll("1", "i")
        .replaceAll("3", "e")
        .replaceAll("4", "a")
        .replaceAll("5", "s")
        .replaceAll("7", "t");
}

function tokenize(value = "") {
    return normalizeText(value)
        .replace(/[._-]+/g, "")
        .match(/[a-z]+/g) || [];
}

function countProfanity(value = "") {
    const words = tokenize(value);

    return words.filter((word) =>
        PROFANITY_TERMS.some(
            (term) =>
                word === term ||
                word.startsWith(`${term}s`) ||
                word.startsWith(`${term}ing`)
        )
    ).length;
}

function calculateSpamScore(contact) {
    const combined = [
        contact.name,
        contact.organization,
        contact.message,
    ].join("\n");

    const normalized = normalizeText(combined);
    const urls = combined.match(URL_PATTERN) || [];
    const includedEmails =
        combined.match(EMAIL_IN_TEXT_PATTERN) || [];

    let score = 0;

    if (urls.length > 2) {
        score += 4;
    } else if (urls.length > 0) {
        score += urls.length;
    }

    const matchingSpamPhrases = SPAM_PHRASES.filter(
        (phrase) => normalized.includes(phrase)
    ).length;

    score += Math.min(matchingSpamPhrases * 2, 6);

    if (HTML_PATTERN.test(combined)) {
        score += 3;
    }

    if (/(.)\1{7,}/i.test(combined)) {
        score += 2;
    }

    if (includedEmails.length > 2) {
        score += 2;
    }

    const letters = combined.match(/[a-z]/gi) || [];
    const uppercaseLetters =
        combined.match(/[A-Z]/g) || [];

    if (
        letters.length >= 40 &&
        uppercaseLetters.length / letters.length > 0.75
    ) {
        score += 2;
    }

    const lines = contact.message
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    if (
        lines.length >= 4 &&
        new Set(lines).size <= Math.ceil(lines.length / 2)
    ) {
        score += 3;
    }

    return score;
}

export function validateHumanName(name = "") {
    const normalized = String(name)
        .normalize("NFKC")
        .trim();

    const letters =
        normalized.match(/\p{L}/gu) || [];
    const placeholder = normalized
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

    if (
        letters.length < 2 ||
        !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(
            normalized
        ) ||
        PLACEHOLDER_NAMES.has(placeholder)
    ) {
        return {
            valid: false,
            message: "Enter your real name.",
        };
    }

    return { valid: true };
}

export function moderateContact(contact) {
    const profanityCount = countProfanity(
        [
            contact.name,
            contact.organization,
            contact.message,
        ].join("\n")
    );

    if (profanityCount > 0) {
        return {
            accepted: false,
            field: "message",
            message:
                "Please remove profanity or abusive language.",
            reason: "profanity",
        };
    }

    if (calculateSpamScore(contact) >= 4) {
        return {
            accepted: false,
            field: "message",
            message:
                "This message appears to be spam. Remove promotional links or repeated content and try again.",
            reason: "spam",
        };
    }

    return {
        accepted: true,
        reason: "accepted",
    };
}
