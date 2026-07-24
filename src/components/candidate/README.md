# Candidate Portal Components (`src/components/candidate/`)

This directory houses all frontend components specific to the **Candidate Portal** interface role.

## 📁 Component Directory Structure

- `CandidateDashboard.jsx` / `tsx`: Main candidate dashboard shell with persistent navigation.
- `CandidateProfileForm.jsx`: Profile form for uploading resume, years of experience, batch year, degree stream, and notice period.
- `JobFeed.jsx`: Job search & discovery feed displaying real-time eligibility badges (`Eligible`, `Skill Unlock Available`, `Ineligible`).
- `SkillUnlockModal.jsx`: Timed 15-minute skill assessment unlock modal for candidates in the experience buffer zone.
- `PipelineTracker.jsx`: Stage-by-stage live application status tracker (`Applied` -> `Screened` -> `Assessment` -> `Interview` -> `Decision`).
- `AssessmentPortal.jsx`: In-app timed skill testing interface.
- `CandidateVideoRoom.jsx`: Embedded WebRTC video room for candidate interviews.
