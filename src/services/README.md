# Core Services & Workers (`src/services/`)

Backend business logic services: ATS parser, Redis SLA queue worker, WebRTC signaling, and email delivery.

---

## 📁 Service Files

| File                 | Description                                                                          |
| :------------------- | :----------------------------------------------------------------------------------- |
| `atsParser.js`       | PDF text extraction and weighted ATS match scoring algorithm                         |
| `slaQueueWorker.js`  | Redis + BullMQ delayed job worker — monitors SLA timers and triggers fallback emails |
| `webrtcSignaling.js` | WebRTC peer connection signaling server for candidate/recruiter video rooms          |
| `emailService.js`    | Transactional email delivery via Nodemailer / SendGrid                               |

---

## 💡 Usage Patterns

### `atsParser` — Score a resume PDF against a job description

```js
const { parseAndScore } = require('../services/atsParser');
const config = require('../config');

const result = await parseAndScore({
  resumeUrl: application.resume_url,
  jobDescription: job.description,
  weights: config.ats.weights, // { skills: 0.5, experience: 0.3, education: 0.2 }
  tier1Threshold: config.ats.tier1Threshold, // e.g. 80
  tier2Threshold: config.ats.tier2Threshold, // e.g. 60
});

// result = { score: 87.5, tier: 'TIER_1' }
```

### `slaQueueWorker` — Add an SLA timer after interview completion

```js
const { addSlaTimer } = require('../services/slaQueueWorker');
const config = require('../config');

await addSlaTimer({
  applicationId: application.id,
  recruiterId: job.recruiter_id,
  slaDays: job.sla_days || config.sla.defaultSlaDays,
});
```

### `emailService` — Send a transactional email

```js
const { sendEmail } = require('../services/emailService');
const config = require('../config');

await sendEmail({
  to: candidate.email,
  subject: 'Update on your HireSync Application',
  html: '<p>Your application status has been updated.</p>',
  from: config.mail.fromAddress,
});
```

---

## ⚙️ Configuration

All service parameters (ATS scoring thresholds, SLA days, SMTP host, Redis URL) are loaded from `src/config/index.js`. Never hardcode values inside service files.
