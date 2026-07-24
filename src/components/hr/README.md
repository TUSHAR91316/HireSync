# HR / Company Portal Components (`src/components/hr/`)

This directory houses all frontend components specific to the **HR / Recruiter Portal** interface role.

## 📁 Component Directory Structure

- `HRDashboard.jsx` / `tsx`: Main HR/Recruiter dashboard shell.
- `JobCreationForm.jsx`: Job posting form with upstream eligibility hard filters (experience, batch year, degree stream, notice period, SLA days).
- `ATSTieringDashboard.jsx`: Candidate pool view displaying Tier-1 (Ideal Match), Tier-2 (Conditional), and Tier-3 (Ineligible) breakdowns.
- `ResumeScorecardModal.jsx`: Parsed resume detailed breakdown and match percentage breakdown view.
- `TestScorecard.jsx`: Auto-graded candidate test results and question-by-question breakdown.
- `RecruiterVideoRoom.jsx`: Embedded WebRTC video call room with split-screen live recruiter evaluation scorecard.
- `SLAAlertCenter.jsx`: Active SLA countdown warning center (T-48h, T-24h alerts) and manual decision override buttons.
