# Registration and Payment Preparation Audit

The site now contains an internal `/register` route backed by a server-side `registrations` table. The form collects only team-registration details required for the event: team name, lead contact, college, team size, domain, and build type. It deliberately does **not** collect card, bank, UPI credential, or QR payment data.

Server-side safeguards include Zod validation, constrained field lengths and values, honeypot filtering, minimum form-completion time, public-request rate limiting, unique registration references, and a pending payment state. Vitest verifies valid submissions and invalid/spam inputs; desktop and 393px mobile visual checks confirm all fields, build selectors, consent, and controls remain visible.

UPI app launch and payment verification are intentionally pending the organiser’s official college QR and a verifiable payment-provider/webhook method. A QR alone can display payment instructions but cannot securely confirm that an arbitrary payment completed.

## QR and Transaction Reference Update

The organiser-supplied college QR was copied into managed web storage and enhanced with contrast, light sharpening, and additional quiet-zone padding without changing its QR payload, modules, logo, or copy. The production registration page now shows this official QR beside clear scan-and-pay instructions.

All displayed registration fields are mandatory, including the transaction ID / UTR. A squad must contain two, three, or four named members; the server validates the selected count against the submitted member names. Software and Hardware records are stored by build type and are exposed only to the organiser account through a protected Excel export with one worksheet per build type. QR payment records are truthfully marked **payment pending** until an organiser verifies the UTR; no automatic bank-side verification is claimed.

## Final isolated validation

- The registration integration test submits a four-member Hardware squad with a UTR to the encrypted-storage boundary, verifies the protected submission contract, and confirms Software and Hardware export rows are available only to an admin context. It uses mocked storage and never writes test data into the live database.
- The encryption test confirms AES-256-GCM ciphertext is unique for repeated input, decrypts with the server secret, detects tampering, and produces a consistent HMAC UTR fingerprint for duplicate prevention.
- The workbook test builds a non-production XLSX workbook and verifies independent **Software squads** and **Hardware squads** sheets. The full quality suite passes along with TypeScript typechecks and Vercel builds.
