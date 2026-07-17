import {
    resolve4,
    resolve6,
    resolveMx,
} from "node:dns/promises";
import { domainToASCII } from "node:url";
import { checkSenderBlocklist } from "./sender-blocklist.mjs";

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const DNS_TIMEOUT = 3000;
const emailDomainCache = new Map();

function getCachedResult(domain) {
    const cached = emailDomainCache.get(domain);

    if (
        cached &&
        Date.now() - cached.checkedAt < CACHE_DURATION
    ) {
        return cached.result;
    }

    emailDomainCache.delete(domain);
    return null;
}

function cacheResult(domain, result) {
    emailDomainCache.set(domain, {
        checkedAt: Date.now(),
        result,
    });

    return result;
}

function withTimeout(promise) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            const error = new Error(
                "Email-domain lookup timed out."
            );
            error.code = "DNS_CHECK_TIMEOUT";

            setTimeout(() => {
                reject(error);
            }, DNS_TIMEOUT).unref?.();
        }),
    ]);
}

async function hasAddressRecord(domain) {
    const results = await Promise.allSettled([
        withTimeout(resolve4(domain)),
        withTimeout(resolve6(domain)),
    ]);

    return results.some(
        (result) =>
            result.status === "fulfilled" &&
            result.value.length > 0
    );
}

export async function validateEmailDomain(email = "") {
    const senderCheck =
        checkSenderBlocklist(email);

    if (!senderCheck.allowed) {
        return {
            valid: false,
            message:
                "This email address cannot be used.",
        };
    }

    const separatorIndex = email.lastIndexOf("@");
    const rawDomain =
        separatorIndex >= 0
            ? email.slice(separatorIndex + 1)
            : "";
    const domain = domainToASCII(
        rawDomain.toLowerCase()
    );

    if (!domain) {
        return {
            valid: false,
            message: "Enter a valid email address.",
        };
    }

    const cached = getCachedResult(domain);

    if (cached) {
        return cached;
    }

    try {
        const mailServers = await withTimeout(
            resolveMx(domain)
        );

        if (
            mailServers.some(
                (record) =>
                    record.exchange?.length > 0 &&
                    record.exchange !== "."
            )
        ) {
            return cacheResult(domain, {
                valid: true,
                verified: true,
            });
        }
    } catch (error) {
        if (
            !["ENODATA", "ENOTFOUND"].includes(
                error?.code
            )
        ) {
            // Do not block a legitimate sender because of a
            // temporary DNS outage.
            return {
                valid: true,
                verified: false,
            };
        }
    }

    try {
        if (await hasAddressRecord(domain)) {
            return cacheResult(domain, {
                valid: true,
                verified: true,
            });
        }
    } catch {
        // The invalid result below is intentionally generic.
    }

    return cacheResult(domain, {
        valid: false,
        message:
            "That email domain does not appear to receive email.",
    });
}
