# Core Services & Workers (`src/services/`)

Contains backend business logic services, ATS parser algorithms, Redis background queue workers, and WebRTC signaling logic.

## 📁 Services Breakdown

- `atsParser.js`: PDF document text extraction and weighted keyword match scoring algorithm.
- `slaQueueWorker.js`: Redis + BullMQ background queue delayed worker monitoring SLA decision timers and triggering automated fallback emails.
- `webrtcSignaling.js`: WebRTC peer connection signaling server for video rooms.
- `emailService.js`: Transactional email delivery service (Nodemailer / SendGrid) for SLA notifications and candidate updates.
