import {
  useEffect,
  useRef,
  useState,
} from "react";

const EMPTY_FORM = {
  name: "",
  email: "",
  organization: "",
  inquiryType: "Sponsorship",
  message: "",
  website: "",
};

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise(
    (resolve, reject) => {
      const existingScript = document.querySelector(
        `script[src="${TURNSTILE_SCRIPT_URL}"]`
      );
      const script =
        existingScript ||
        document.createElement("script");

      function handleLoad() {
        if (window.turnstile) {
          resolve(window.turnstile);
          return;
        }

        reject(
          new Error(
            "Cloudflare security verification did not initialize."
          )
        );
      }

      function handleError() {
        turnstileScriptPromise = null;
        reject(
          new Error(
            "Cloudflare security verification could not load."
          )
        );
      }

      script.addEventListener("load", handleLoad, {
        once: true,
      });
      script.addEventListener("error", handleError, {
        once: true,
      });

      if (!existingScript) {
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  );

  return turnstileScriptPromise;
}

function validateBeforeSubmit(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const message = form.message.trim();

  if (name.length < 2) {
    errors.name = "Enter your name.";
  }

  if (
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    email.includes("..")
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (message.length < 20) {
    errors.message =
      "Enter a message of at least 20 characters.";
  }

  return errors;
}

function ContactForm({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [turnstileToken, setTurnstileToken] =
    useState("");
  const [turnstileError, setTurnstileError] =
    useState("");

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = [
          ...dialogRef.current.querySelectorAll(
            "button:not(:disabled), input:not([tabindex='-1']), select, textarea, [href]"
          ),
        ];

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;
    const siteKey =
      import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

    setTurnstileToken("");
    setTurnstileError("");

    if (!siteKey) {
      setTurnstileError(
        "Security verification is not configured."
      );
      return undefined;
    }

    loadTurnstile()
      .then((turnstile) => {
        if (
          cancelled ||
          !turnstileContainerRef.current
        ) {
          return;
        }

        turnstileWidgetRef.current =
          turnstile.render(
            turnstileContainerRef.current,
            {
              sitekey: siteKey,
              action: "contact_form",
              theme: "dark",
              appearance: "interaction-only",
              size: window.matchMedia(
                "(max-width: 380px)"
              ).matches
                ? "compact"
                : "flexible",
              callback(token) {
                if (cancelled) {
                  return;
                }

                setTurnstileToken(token);
                setTurnstileError("");
              },
              "expired-callback"() {
                if (cancelled) {
                  return;
                }

                setTurnstileToken("");
                setTurnstileError(
                  "The security check expired. Please complete it again."
                );
              },
              "error-callback"() {
                if (cancelled) {
                  return;
                }

                setTurnstileToken("");
                setTurnstileError(
                  "Security verification failed to load. Please try again."
                );
              },
            }
          );
      })
      .catch((error) => {
        if (!cancelled) {
          setTurnstileError(error.message);
        }
      });

    return () => {
      cancelled = true;

      if (
        turnstileWidgetRef.current !== null &&
        window.turnstile
      ) {
        window.turnstile.remove(
          turnstileWidgetRef.current
        );
      }

      turnstileWidgetRef.current = null;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function closeForm() {
    onClose();

    window.setTimeout(() => {
      setStatus("idle");
      setStatusMessage("");
      setFieldErrors({});
      setTurnstileToken("");
      setTurnstileError("");
    }, 200);
  }

  function resetTurnstile() {
    setTurnstileToken("");

    if (
      turnstileWidgetRef.current !== null &&
      window.turnstile
    ) {
      window.turnstile.reset(
        turnstileWidgetRef.current
      );
    }
  }

  async function submitForm(event) {
    event.preventDefault();

    if (status === "sending") {
      return;
    }

    const localErrors = validateBeforeSubmit(form);

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setStatus("error");
      setStatusMessage(
        "Please add your name, a valid email, and a complete message."
      );
      return;
    }

    if (!turnstileToken) {
      setTurnstileError(
        "Please complete the security verification."
      );
      return;
    }

    setStatus("sending");
    setStatusMessage("");
    setFieldErrors({});

    const apiUrl = import.meta.env.PROD
      ? import.meta.env.VITE_API_URL?.replace(/\/$/, "")
      : "";

    try {
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          turnstileToken,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result.fields) {
          setFieldErrors(result.fields);
        }

        throw new Error(
          result.error ||
          "Your message could not be sent."
        );
      }

      setStatus("success");
      setStatusMessage(
        result.message ||
        "Thanks! Your business inquiry was sent."
      );
      setForm(EMPTY_FORM);
    } catch (error) {
      resetTurnstile();
      setStatus("error");
      setStatusMessage(
        error.message ||
        "Your message could not be sent."
      );
    }
  }

  return (
    <div
      className="contact-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeForm();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="contact-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        aria-describedby="contact-description"
      >
        <button
          ref={closeButtonRef}
          className="contact-close"
          type="button"
          onClick={closeForm}
          aria-label="Close business contact form"
        >
          ×
        </button>

        <div className="contact-heading">
          <span>BUSINESS CONTACT</span>
          <h2 id="contact-title">Let’s work together</h2>
          <p id="contact-description">
            For sponsorships, collaborations, press, and other
            professional inquiries.
          </p>
        </div>

        {status === "success" ? (
          <div
            className="contact-success"
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">✓</span>
            <h3>Message sent</h3>
            <p>{statusMessage}</p>
            <button
              className="contact-submit"
              type="button"
              onClick={closeForm}
            >
              Close
            </button>
          </div>
        ) : (
          <form
            className="contact-form"
            onSubmit={submitForm}
            noValidate
          >
            <div className="contact-field-row">
              <label className="contact-field">
                <span>Name</span>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={updateField}
                  autoComplete="name"
                  minLength="2"
                  maxLength="80"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <small>{fieldErrors.name}</small>
                )}
              </label>

              <label className="contact-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  maxLength="254"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && (
                  <small>{fieldErrors.email}</small>
                )}
              </label>
            </div>

            <label className="contact-field">
              <span>Company or organization <em>Optional</em></span>
              <input
                name="organization"
                type="text"
                value={form.organization}
                onChange={updateField}
                autoComplete="organization"
                maxLength="100"
                aria-invalid={Boolean(fieldErrors.organization)}
              />
              {fieldErrors.organization && (
                <small>{fieldErrors.organization}</small>
              )}
            </label>

            <label className="contact-field">
              <span>Inquiry type</span>
              <select
                name="inquiryType"
                value={form.inquiryType}
                onChange={updateField}
                required
                aria-invalid={Boolean(fieldErrors.inquiryType)}
              >
                <option>Sponsorship</option>
                <option>Collaboration</option>
                <option>Press or interview</option>
                <option>Other</option>
              </select>
              {fieldErrors.inquiryType && (
                <small>{fieldErrors.inquiryType}</small>
              )}
            </label>

            <label className="contact-field">
              <span>Message</span>
              <span className="contact-message-hint">
                Helpful details: goals • deliverables • timeline • budget • links
              </span>
              <textarea
                name="message"
                value={form.message}
                onChange={updateField}
                minLength="20"
                maxLength="3000"
                rows="6"
                required
                aria-invalid={Boolean(fieldErrors.message)}
              />
              <span className="contact-character-count">
                {form.message.length}/3000
              </span>
              {fieldErrors.message && (
                <small>{fieldErrors.message}</small>
              )}
            </label>

            <label
              className="contact-honeypot"
              aria-hidden="true"
            >
              Website
              <input
                name="website"
                type="text"
                value={form.website}
                onChange={updateField}
                tabIndex="-1"
                autoComplete="off"
              />
            </label>

            <div className="contact-turnstile-wrap">
              <div
                ref={turnstileContainerRef}
                className="contact-turnstile"
                aria-label="Security verification"
              />
              {turnstileError && (
                <small
                  className="contact-turnstile-error"
                  role="alert"
                >
                  {turnstileError}
                </small>
              )}
            </div>

            {status === "error" && (
              <p
                className="contact-status contact-status-error"
                role="alert"
              >
                {statusMessage}
              </p>
            )}

            <button
              className="contact-submit"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending…"
                : "Send business inquiry"}
            </button>

            <p className="contact-privacy">
              Your information is used only to respond to this inquiry.
              Spam, abusive language, and profanity are not accepted.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}

export default ContactForm;
