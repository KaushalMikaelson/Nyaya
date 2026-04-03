import express from 'express';
import { authenticate } from '../middleware/auth';
import Groq from 'groq-sdk';
import 'dotenv/config';

const router = express.Router();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Mock Database of Lawyers
const LAWYERS = [
  {
    id: "l_1",
    name: "Adv. Rajesh Kumar",
    specialties: ["Criminal Law", "Bail", "White Collar Crimes"],
    experienceYears: 12,
    location: "New Delhi",
    rating: 4.8,
    hourlyRate: 5000,
    about: "Specializes in high-profile criminal cases and serious felonies. Strong track record for bail hearings."
  },
  {
    id: "l_2",
    name: "Adv. Sunita Sharma",
    specialties: ["Family Law", "Divorce", "Child Custody", "Maintenance"],
    experienceYears: 15,
    location: "Mumbai",
    rating: 4.9,
    hourlyRate: 4000,
    about: "Compassionate family lawyer focusing on amicable settlements, mutual consent divorce, and child welfare."
  },
  {
    id: "l_3",
    name: "Adv. Vikram Desai",
    specialties: ["Corporate Law", "Startups", "Contracts", "IPR"],
    experienceYears: 8,
    location: "Bengaluru",
    rating: 4.7,
    hourlyRate: 6000,
    about: "Former top-tier firm associate now helping startups scale. Deals with mergers, IP protection, and complex corporate contracts."
  },
  {
    id: "l_4",
    name: "Adv. Anjali Verma",
    specialties: ["Property Law", "Real Estate Disputes", "Inheritance"],
    experienceYears: 20,
    location: "Pune",
    rating: 4.6,
    hourlyRate: 3500,
    about: "Veteran in real estate disputes, tenant-landlord conflicts, and drafting water-tight property wills."
  },
  {
    id: "l_5",
    name: "Adv. Rakesh Iyer",
    specialties: ["Cyber Law", "Data Privacy", "Online Fraud"],
    experienceYears: 6,
    location: "Hyderabad",
    rating: 4.8,
    hourlyRate: 4500,
    about: "Tech-savvy lawyer dedicated to cybercrime, crypto scams, and GDPR/DPDP Act compliances."
  },
  {
    id: "l_6",
    name: "Adv. Priya Singh",
    specialties: ["Labor & Employment Law", "Wrongful Termination", "POSH"],
    experienceYears: 10,
    location: "Gurugram",
    rating: 4.9,
    hourlyRate: 3000,
    about: "Fierce advocate for employee rights, handling wrongful terminations, workplace harassment, and severance negotiations."
  }
];

router.get('/lawyers', authenticate, (req, res) => {
  res.json({ lawyers: LAWYERS });
});

router.post('/match', authenticate, async (req, res) => {
  try {
    const { caseDescription } = req.body;

    if (!caseDescription) {
      return res.status(400).json({ error: "Case description is required." });
    }

    // AI Matching Logic
    const prompt = `
You are an expert AI Legal Matchmaker for the Indian platform "Nyaay".
The user has provided the following case description or legal issue:
"${caseDescription}"

You have access to the following list of verified lawyers:
${JSON.stringify(LAWYERS, null, 2)}

Analyze the user's issue and recommend the top 3 best-suited lawyers from the list.
Rank them based on relevance to the legal specialties, experience, and context of the issue.

Return ONLY a valid JSON array of objects. Do not include markdown codeblocks or any extra text.
Each object should have:
- "lawyerId": the ID of the lawyer
- "matchScore": an integer from 1 to 100 indicating percentage match
- "reason": A brief 1-2 sentence convincing reason why this lawyer is a good fit for this specific case.
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" } // Using json object to enforce format
    });

    const aiResponseText = completion.choices[0]?.message?.content || "{}";
    
    // Fallback parsing just in case response format encapsulates it in a top level key
    let parsedMatch;
    try {
      parsedMatch = JSON.parse(aiResponseText);
      // If the LLM returns {"matches": [...]}, unwrap it
      if (!Array.isArray(parsedMatch) && typeof parsedMatch === 'object') {
        const key = Object.keys(parsedMatch)[0];
        parsedMatch = parsedMatch[key];
      }
    } catch (e) {
       console.error("Failed to parse groq output", e);
       parsedMatch = [
           { lawyerId: "l_1", matchScore: 85, reason: "Fallback default matching." },
           { lawyerId: "l_2", matchScore: 80, reason: "Fallback default matching." }
       ];
    }

    // Merge match data with full lawyer objects
    const recommendations = (parsedMatch || []).map((match: any) => {
      const lawyerDeets = LAWYERS.find(l => l.id === match.lawyerId);
      return {
        ...lawyerDeets,
        matchScore: match.matchScore,
        matchReason: match.reason
      };
    }).filter((l: any) => l.name); // Filter out any bad matches where ID didn't match

    res.json({ recommendations });
  } catch (error) {
    console.error("Error matching lawyers:", error);
    res.status(500).json({ error: "Failed to process matching request" });
  }
});

export default router;
