import { Router, Request, Response } from 'express';
import http from 'http';

const router = Router();

// Fallback knowledge items in case Python service is restarting
const FALLBACK_ANSWERS: Record<string, string> = {
  services:
    "BayFlow certified workshops offer:\n1. **Periodic Maintenance & Oil Change** (Fully synthetic oils, OEM filters, 35-point safety inspection)\n2. **Brake Overhaul & Safety Dynamics** (Pads, rotor resurfacing, ABS calibration)\n3. **Computerized Engine Diagnostics** (OBD-II live telemetry, ECU scanning)\n4. **Transmission & Drivetrain** (ATF flushes, gear overhaul)\n5. **Suspension & 3D Wheel Alignment** (Laser alignment, shock absorbers)\n6. **Air Conditioning & Climate Care** (R134a refrigerant, leak testing)\n7. **Electrical & Battery Health** (Alternator, CCA testing)",
  workflow:
    "BayFlow operates on a transparent 4-step state machine:\n1. **Book Online:** Select car, workshop, and slot at `/book`.\n2. **Diagnostic Check:** Certified technician inspects the car and creates an estimate.\n3. **Customer Approval:** Review quote on `/portal`. Work only begins after you click Approve.\n4. **Repair & QC:** Genuine OEM parts installed, followed by 10km road test and QC certification.",
  tracking:
    "Track your vehicle in real-time at `/portal`:\n• Live 8-stage progress bar\n• 1-click Estimate approval\n• Direct WhatsApp chat with your Service Advisor\n• WebRTC in-app audio calling\n• Itemized invoice and audit trail",
  default:
    "Welcome to BayFlow! I am your AI assistant. You can ask about our automotive repair services, transparent pricing, 4-step repair workflow, or how to track your car at `/portal`.",
};

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  const userQuery = (message || '').trim();

  // 1. Try forwarding to Python Chatbot Microservice (port 5005)
  try {
    const postData = JSON.stringify({ message: userQuery });
    const pyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: 5005,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 2500,
      },
      (pyRes) => {
        let data = '';
        pyRes.on('data', (chunk) => {
          data += chunk;
        });
        pyRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            res.json(parsed);
          } catch (e) {
            handleFallback(userQuery, res);
          }
        });
      }
    );

    pyReq.on('error', () => {
      // Python server not reachable, use fallback
      handleFallback(userQuery, res);
    });

    pyReq.on('timeout', () => {
      pyReq.destroy();
      handleFallback(userQuery, res);
    });

    pyReq.write(postData);
    pyReq.end();
  } catch (err) {
    handleFallback(userQuery, res);
  }
});

function handleFallback(query: string, res: Response) {
  const q = query.toLowerCase();
  let reply = FALLBACK_ANSWERS.default;
  let title = 'BayFlow Platform Assistant';
  let suggestions = ['What services do you offer?', 'How does the workflow work?', 'How to track my car?'];

  if (q.includes('service') || q.includes('repair') || q.includes('oil') || q.includes('brake')) {
    reply = FALLBACK_ANSWERS.services;
    title = 'Automotive Services';
    suggestions = ['How does the workflow work?', 'How much does it cost?', 'Book a service'];
  } else if (q.includes('work') || q.includes('process') || q.includes('step') || q.includes('lifecycle')) {
    reply = FALLBACK_ANSWERS.workflow;
    title = 'BayFlow 4-Step Workflow';
    suggestions = ['How do I track my vehicle?', 'What services do you offer?', 'Book an appointment'];
  } else if (q.includes('track') || q.includes('portal') || q.includes('status') || q.includes('where is')) {
    reply = FALLBACK_ANSWERS.tracking;
    title = 'Live Customer Tracking Portal';
    suggestions = ['How do estimates work?', 'What services are available?', 'Contact advisor'];
  }

  res.json({
    success: true,
    query,
    response: reply,
    title,
    suggestions,
  });
}

export default router;
