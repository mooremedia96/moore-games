import nodemailer from "nodemailer";

let contactTransport = null;

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getContactTransport() {
    if (contactTransport) {
        return contactTransport;
    }

    const user = process.env.CONTACT_EMAIL_USER;
    const appPassword =
        process.env.CONTACT_EMAIL_APP_PASSWORD
            ?.replace(/\s+/g, "");

    if (!user || !appPassword) {
        const error = new Error(
            "Contact email credentials are not configured."
        );
        error.code = "CONTACT_EMAIL_NOT_CONFIGURED";
        throw error;
    }

    contactTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user,
            pass: appPassword,
        },
        tls: {
            minVersion: "TLSv1.2",
        },
    });

    return contactTransport;
}

export async function sendContactEmail(contact) {
    const transport = getContactTransport();
    const fromAddress = process.env.CONTACT_EMAIL_USER;
    const toAddress = process.env.CONTACT_TO_EMAIL;

    if (!toAddress) {
        const error = new Error(
            "Contact recipient is not configured."
        );
        error.code = "CONTACT_EMAIL_NOT_CONFIGURED";
        throw error;
    }

    const organizationLine = contact.organization
        ? `Organization: ${contact.organization}\n`
        : "";

    const text = [
        "New Moore Games business inquiry",
        "",
        `Name: ${contact.name}`,
        `Email: ${contact.email}`,
        organizationLine.trimEnd(),
        `Inquiry type: ${contact.inquiryType}`,
        "",
        "Message:",
        contact.message,
        "",
        `Submitted: ${new Date().toISOString()}`,
    ]
        .filter(Boolean)
        .join("\n");

    const organizationHtml = contact.organization
        ? `<p><strong>Organization:</strong> ${escapeHtml(contact.organization)}</p>`
        : "";

    const htmlMessage = escapeHtml(contact.message)
        .replaceAll("\n", "<br />");

    const html = `
        <main style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="font-size: 22px;">New Moore Games business inquiry</h1>
            <p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
            ${organizationHtml}
            <p><strong>Inquiry type:</strong> ${escapeHtml(contact.inquiryType)}</p>
            <hr style="border: 0; border-top: 1px solid #d1d5db;" />
            <p>${htmlMessage}</p>
        </main>
    `;

    return transport.sendMail({
        from: `"Moore Games Website" <${fromAddress}>`,
        to: toAddress,
        replyTo: {
            name: contact.name,
            address: contact.email,
        },
        subject:
            `Moore Games ${contact.inquiryType} inquiry from ${contact.name}`,
        text,
        html,
    });
}
