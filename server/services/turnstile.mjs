const SITEVERIFY_URL =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "contact_form";
const VERIFY_TIMEOUT = 8000;

function getExpectedHostnames() {
    return new Set(
        (
            process.env.TURNSTILE_EXPECTED_HOSTNAMES ||
            "mooremedia96.github.io"
        )
            .split(",")
            .map((hostname) =>
                hostname.trim().toLowerCase()
            )
            .filter(Boolean)
    );
}

function getVisitorIp(request) {
    return (
        request.get("cf-connecting-ip") ||
        request.ip ||
        ""
    );
}

export async function verifyTurnstile(
    token,
    request
) {
    const secret =
        process.env.TURNSTILE_SECRET_KEY?.trim();

    if (!secret) {
        console.error(
            "TURNSTILE_SECRET_KEY is not configured."
        );

        return {
            success: false,
            unavailable: true,
            reason: "not-configured",
        };
    }

    if (
        typeof token !== "string" ||
        token.length < 1 ||
        token.length > 2048
    ) {
        return {
            success: false,
            unavailable: false,
            reason: "missing-token",
        };
    }

    const body = new URLSearchParams({
        secret,
        response: token,
    });

    const visitorIp = getVisitorIp(request);

    if (visitorIp) {
        body.set("remoteip", visitorIp);
    }

    try {
        const verificationResponse = await fetch(
            SITEVERIFY_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                body,
                signal:
                    AbortSignal.timeout(
                        VERIFY_TIMEOUT
                    ),
            }
        );

        if (!verificationResponse.ok) {
            throw new Error(
                `Turnstile returned ${verificationResponse.status}.`
            );
        }

        const result =
            await verificationResponse.json();

        if (!result.success) {
            console.warn(
                "Turnstile rejected a contact submission:",
                result["error-codes"] || []
            );

            return {
                success: false,
                unavailable: false,
                reason: "challenge-failed",
            };
        }

        const expectedHostnames =
            getExpectedHostnames();
        const hostname =
            String(result.hostname || "")
                .toLowerCase();

        if (!expectedHostnames.has(hostname)) {
            console.warn(
                "Turnstile hostname mismatch:",
                hostname || "(missing)"
            );

            return {
                success: false,
                unavailable: false,
                reason: "hostname-mismatch",
            };
        }

        if (
            result.action &&
            result.action !== EXPECTED_ACTION
        ) {
            console.warn(
                "Turnstile action mismatch:",
                result.action
            );

            return {
                success: false,
                unavailable: false,
                reason: "action-mismatch",
            };
        }

        return {
            success: true,
            unavailable: false,
            reason: "verified",
        };
    } catch (error) {
        console.error(
            "Turnstile verification error:",
            error?.name || error?.message || error
        );

        return {
            success: false,
            unavailable: true,
            reason: "verification-unavailable",
        };
    }
}
