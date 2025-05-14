# Charli.chat (Private YC Review Repo)

👋 Hi YC — this is the full source code for [charli.chat](https://charli.chat), a real-time peer-to-peer language fluency platform built solo over 4,000 hours.

Charli.chat lets language learners pay native speakers $0.25/minute to correct their mistakes *while they speak* — a live correction model enforced by bell notifications, video chat, and smart escrow.

## 🔑 What We've Built

- ⚡️ Real-time peer-to-peer video chat (via Huddle01)
- 🔔 Bell-button interaction to log and flag learner mistakes
- 🔒 Escrow + session integrity logic enforced by Lit Protocol (PKP/NFT burn + Lit Actions)
- 🧠 Post-session LLM-based error detection and feedback scorecards (Whisper + LLaMA)
- 🌐 Durable Object–based backend on Cloudflare Workers (fully serverless)
- 💳 Stripe integration, DAI wallet abstraction via Lit
- 🧪 RoboTeacher for internal simulation of peer feedback

## 📊 Why It Works

Charli combines the motivation of human conversation with the precision of AI feedback. Learners speak, get corrected, and improve — fast. Native speakers get paid instantly and fairly. No tutors, no grammar drills, no fluff.

## 🔍 How to Explore This Repo

- `apps/vite-frontend/` — Frontend (React + Tailwind)
- `apps/learner-assessment-worker/` — Durable Objects, ASR, and LLM pipeline
- `apps/session-time-tracker/`- Durable Objects consumuing Huddle01 webhooks calling Lit Actions 
- `apps/supabase/` — Database migrations, edge functions, RLS
- `apps/LitActions/` - IPFS deployed, immutible javascript functions, runnning in Lit Network nodes  
- `apps/robo-test-mode` - Experminatal RoboTeacher for internal testing with public potential
- `scripts/` — Deployment Orchestrator, PKP provisioning, session automation, test harnesses

Everything described in our YC application and video is implemented here.

## 👨‍💻 Built by

**Zach Michaels** — Founder, engineer, and producer  
charli.chat | [LinkedIn](https://linkedin.com/in/zachgmichaels)  
