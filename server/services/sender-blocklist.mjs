import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CONFIG_DIRECTORY = new URL(
    "../config/",
    import.meta.url
);

function loadList(filename) {
    const path = fileURLToPath(
        new URL(filename, CONFIG_DIRECTORY)
    );

    try {
        return new Set(
            readFileSync(path, "utf8")
                .split(/\r?\n/)
                .map((entry) =>
                    entry
                        .split("#", 1)[0]
                        .trim()
                        .toLowerCase()
                        .replace(/^\*\./, "")
                )
                .filter(Boolean)
        );
    } catch (error) {
        console.error(
            `Unable to load ${filename}:`,
            error?.code || error?.message || error
        );

        return new Set();
    }
}

const BLOCKED_EMAILS = loadList(
    "blocked-emails.txt"
);
const BLOCKED_DOMAINS = loadList(
    "blocked-domains.txt"
);
const ALLOWED_DOMAINS = loadList(
    "allowed-domains.txt"
);

function domainMatches(domain, entries) {
    return [...entries].some(
        (entry) =>
            domain === entry ||
            domain.endsWith(`.${entry}`)
    );
}

export function checkSenderBlocklist(email = "") {
    const normalizedEmail = String(email)
        .normalize("NFKC")
        .trim()
        .toLowerCase();
    const separatorIndex =
        normalizedEmail.lastIndexOf("@");
    const domain =
        separatorIndex >= 0
            ? normalizedEmail.slice(
                separatorIndex + 1
            )
            : "";

    if (BLOCKED_EMAILS.has(normalizedEmail)) {
        return {
            allowed: false,
            reason: "blocked-email",
        };
    }

    if (
        domain &&
        domainMatches(domain, ALLOWED_DOMAINS)
    ) {
        return {
            allowed: true,
            reason: "allowed-domain",
        };
    }

    if (
        domain &&
        domainMatches(domain, BLOCKED_DOMAINS)
    ) {
        return {
            allowed: false,
            reason: "blocked-domain",
        };
    }

    return {
        allowed: true,
        reason: "not-listed",
    };
}
