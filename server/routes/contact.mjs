import { sendContactEmail } from "../services/email.mjs";
import {
    moderateContact,
    validateHumanName,
} from "../services/moderation.mjs";
import { validateEmailDomain } from "../services/email-validation.mjs";

const EMAIL_PATTERN =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INQUIRY_TYPES = new Set([
    "Sponsorship",
    "Collaboration",
    "Press or interview",
    "Other",
]);

function cleanSingleLine(value) {
    return typeof value === "string"
        ? value
            .replaceAll("\0", "")
            .replace(/[\r\n]+/g, " ")
            .trim()
        : "";
}

function cleanMessage(value) {
    return typeof value === "string"
        ? value
            .replaceAll("\0", "")
            .replace(/\r\n?/g, "\n")
            .trim()
        : "";
}

function validateContact(body = {}) {
    const contact = {
        name: cleanSingleLine(body.name),
        email: cleanSingleLine(body.email)
            .toLowerCase(),
        organization:
            cleanSingleLine(body.organization),
        inquiryType:
            cleanSingleLine(body.inquiryType),
        message: cleanMessage(body.message),
    };

    const errors = {};

    if (
        contact.name.length < 2 ||
        contact.name.length > 80
    ) {
        errors.name =
            "Enter a name between 2 and 80 characters.";
    } else {
        const nameResult = validateHumanName(
            contact.name
        );

        if (!nameResult.valid) {
            errors.name = nameResult.message;
        }
    }

    if (
        contact.email.length > 254 ||
        !EMAIL_PATTERN.test(contact.email) ||
        contact.email.includes("..")
    ) {
        errors.email =
            "Enter a valid email address.";
    }

    if (contact.organization.length > 100) {
        errors.organization =
            "Keep the organization name under 100 characters.";
    }

    if (!INQUIRY_TYPES.has(contact.inquiryType)) {
        errors.inquiryType =
            "Select a valid inquiry type.";
    }

    if (
        contact.message.length < 20 ||
        contact.message.length > 3000
    ) {
        errors.message =
            "Enter a message between 20 and 3,000 characters.";
    }

    return {
        contact,
        errors,
        isBot:
            cleanSingleLine(body.website).length > 0,
    };
}

export async function submitContact(
    request,
    response
) {
    const {
        contact,
        errors,
        isBot,
    } = validateContact(request.body);

    response.set({
        "Cache-Control": "no-store",
        Pragma: "no-cache",
    });

    // Silently accept bot-trap submissions without sending email.
    if (isBot) {
        return response.status(202).json({
            message: "Your message was received.",
        });
    }

    if (Object.keys(errors).length > 0) {
        return response.status(400).json({
            error:
                "Please correct the highlighted fields.",
            fields: errors,
        });
    }

    const moderation = moderateContact(contact);

    if (!moderation.accepted) {
        console.warn(
            "Contact submission rejected:",
            moderation.reason
        );

        return response.status(400).json({
            error:
                "Please correct the highlighted fields.",
            fields: {
                [moderation.field]:
                    moderation.message,
            },
        });
    }

    const emailDomainResult =
        await validateEmailDomain(contact.email);

    if (!emailDomainResult.valid) {
        return response.status(400).json({
            error:
                "Please correct the highlighted fields.",
            fields: {
                email: emailDomainResult.message,
            },
        });
    }

    try {
        await sendContactEmail(contact);

        return response.status(202).json({
            message:
                "Thanks! Your business inquiry was sent.",
        });
    } catch (error) {
        console.error(
            "Contact form delivery error:",
            error?.code || error?.message || error
        );

        if (
            error?.code ===
            "CONTACT_EMAIL_NOT_CONFIGURED"
        ) {
            return response.status(503).json({
                error:
                    "The contact form is temporarily unavailable.",
            });
        }

        return response.status(502).json({
            error:
                "Your message could not be delivered. Please try again later.",
        });
    }
}
