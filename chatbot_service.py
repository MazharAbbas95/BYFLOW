#!/usr/bin/env python3
"""
BayFlow SaaS Platform Chatbot Engine
Universal Intelligent Assistant for Platform & Auto Services Knowledge
Provides accurate answers regarding all services, workflow, guarantees, workshops, and platform features.
Zero external dependencies (uses Python standard library).
Can be run as an HTTP Server (port 5005) or in interactive CLI mode.
"""

import sys
import os
import json
import re
import difflib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# ─────────────────────────────────────────────────────────────────────────────
# COMPREHENSIVE KNOWLEDGE BASE
# ─────────────────────────────────────────────────────────────────────────────

KNOWLEDGE_BASE = [
    {
        "id": "platform_overview",
        "keywords": ["bayflow", "platform", "what is", "about", "company", "system", "saas", "software"],
        "patterns": [r"what is bayflow", r"tell me about (the )?platform", r"how does this work", r"who are you"],
        "title": "About BayFlow Multi-Tenant SaaS Platform",
        "answer": (
            "**BayFlow** is a next-generation Multi-Tenant Automotive Workshop & Customer Experience SaaS platform. "
            "We connect vehicle owners with certified independent auto workshops through a transparent, automated 8-stage "
            "state-machine workflow.\n\n"
            "Key Platform Pillars:\n"
            "• **100% Estimate Transparency:** Technicians cannot install parts until you review and digitally approve the quote.\n"
            "• **Independent Quality Control (QC):** Every repaired vehicle undergoes multi-point safety testing and road verification before handover.\n"
            "• **Real-Time Customer Portal:** Live tracking from booking to pickup, with direct WhatsApp & WebRTC audio advisor calling.\n"
            "• **Certified Workshop Network:** Dedicated partner workshops across major cities equipped with OEM parts and calibrated diagnostic tools."
        ),
        "suggestions": ["What services do you offer?", "How does the repair workflow work?", "How do I track my vehicle?"]
    },
    {
        "id": "services_overview",
        "keywords": ["services", "repairs", "maintenance", "packages", "service list", "what do you do", "fix"],
        "patterns": [r"what services (do you )?offer", r"list of services", r"all services", r"repair options"],
        "title": "Comprehensive Automotive Services",
        "answer": (
            "BayFlow certified workshops offer complete automotive service coverage:\n\n"
            "1. **Periodic Maintenance & Oil Change:** Fully synthetic oils, OEM filter replacements, and 35-point safety inspection.\n"
            "2. **Brake Overhaul & Safety Dynamics:** Brake pad replacement, rotor resurfacing, hydraulic bleeding, and ABS calibration.\n"
            "3. **Computerized Engine Diagnostics:** High-end OBD-II live telemetry scan, misfire detection, and ECU health checks.\n"
            "4. **Transmission & Drivetrain:** ATF fluid flush, clutch adjustment, and gearbox overhauls.\n"
            "5. **Suspension & 3D Wheel Alignment:** Laser alignment, shock absorber replacement, and bushing repairs.\n"
            "6. **Climate Care & Air Conditioning:** R134a refrigerant recharge, leak diagnostics, and evaporator sanitization.\n"
            "7. **Electrical & Battery Health:** Alternator testing, battery CCA load analysis, and wiring fault rectification."
        ),
        "suggestions": ["Tell me about oil changes", "Brake service details", "How do I book a service?"]
    },
    {
        "id": "oil_change_service",
        "keywords": ["oil", "oil change", "filter", "lube", "fluid", "periodic maintenance", "tuning", "engine oil"],
        "patterns": [r"oil change", r"engine oil", r"periodic maintenance", r"filter change"],
        "title": "Periodic Maintenance & Oil Change Service",
        "answer": (
            "Our **Periodic Maintenance & Oil Service** includes:\n\n"
            "• **Premium Synthetic Oil:** Shell / Total / Liqui Moly 5W-30 or 0W-20 tailored to manufacturer specs.\n"
            "• **OEM Filter Replacement:** Genuine oil filter and clean air intake filter replacement.\n"
            "• **35-Point Multipoint Inspection:** Fluid levels (coolant, brake fluid, wiper fluid), battery health, and tire pressure check.\n"
            "• **Underbody & Suspension Inspection:** Inspecting boots, tie-rods, and exhaust hangars.\n\n"
            "Typical duration: 45–60 minutes. All line items are approved digitally before servicing."
        ),
        "suggestions": ["What are your brake services?", "How much does maintenance cost?", "Book an oil change"]
    },
    {
        "id": "brake_service",
        "keywords": ["brake", "brakes", "pad", "rotor", "disc", "caliper", "stopping", "abs", "bleeding"],
        "patterns": [r"brake service", r"brake pad", r"rotor repair", r"brakes squeaking"],
        "title": "Brake System & Hydraulic Safety Service",
        "answer": (
            "Our **Brake System Overhaul** ensures optimal stopping distance and safety:\n\n"
            "• Ceramic & Semi-Metallic brake pads from certified OEM manufacturers (Bosch, Akebono).\n"
            "• Computerized disc rotor thickness measurement & precision resurfacing (lathe).\n"
            "• DOT-4 synthetic brake fluid flush & hydraulic line air bleeding.\n"
            "• Electronic Parking Brake (EPB) service mode reset & ABS sensor calibration.\n\n"
            "Every brake job is subjected to mandatory hydraulic pressure testing during Quality Control (QC)."
        ),
        "suggestions": ["Tell me about engine diagnostics", "How does Quality Control work?", "Book a service"]
    },
    {
        "id": "diagnostics_service",
        "keywords": ["diagnostic", "obd", "check engine", "scan", "scanner", "dtc", "code", "ecu", "misfire"],
        "patterns": [r"check engine light", r"engine scan", r"obd scan", r"diagnostic test"],
        "title": "Computerized Engine Diagnostics (OBD-II)",
        "answer": (
            "Our **Diagnostic & ECU Scanning Service** resolves performance issues and warning lights:\n\n"
            "• Full-system scan: ECU, TCU, ABS, SRS airbags, and Body Control Modules.\n"
            "• Live sensor telemetry analysis (fuel trim, O2 sensor voltage, MAF airflow, ignition timing).\n"
            "• Identification of pending and active Diagnostic Trouble Codes (DTCs).\n"
            "• Digital report generated and attached directly to your vehicle's customer tracking portal."
        ),
        "suggestions": ["How do I track diagnostic results?", "What is the repair workflow?", "What other services are available?"]
    },
    {
        "id": "how_it_works",
        "keywords": ["how it works", "workflow", "process", "steps", "state machine", "lifecycle", "procedure"],
        "patterns": [r"how does it work", r"what is the process", r"repair lifecycle", r"steps to repair"],
        "title": "The BayFlow 4-Step Repair Workflow",
        "answer": (
            "BayFlow eliminates workshop uncertainty through a transparent 4-step state machine:\n\n"
            "1. **Book Online:** Select your city, car make/model, preferred certified workshop, and time slot at `/book`.\n"
            "2. **Physical Diagnostic:** The assigned certified technician inspects the vehicle and compiles an itemized digital estimate.\n"
            "3. **Customer Approval:** You receive the quote on your portal (`/portal`). No mechanic can begin repair until you digitally click Approve.\n"
            "4. **Repair & Certified QC:** Genuine parts are allocated, mechanical repairs completed, followed by multi-point road testing and QC inspector sign-off before vehicle handover."
        ),
        "suggestions": ["How do I track my car?", "What is the QC guarantee?", "Book an appointment"]
    },
    {
        "id": "tracking_portal",
        "keywords": ["track", "tracking", "portal", "status", "where is my car", "progress", "update", "customer portal"],
        "patterns": [r"how (can I|do I) track my (car|vehicle)", r"check my booking status", r"customer portal"],
        "title": "Customer Live Tracking Portal",
        "answer": (
            "You can track your vehicle in real-time at the **Customer Tracking Portal** (`/portal`):\n\n"
            "• **Live 8-Stage Progression Bar:** See whether your car is Inspecting, Awaiting Customer, In Repair, in Quality Control, or Ready for Pickup.\n"
            "• **Digital Estimate Actions:** 1-click Approve or Request Revisions for quotes.\n"
            "• **Direct WhatsApp Advisor Chat:** Instantly message your Service Advisor with pre-filled vehicle details.\n"
            "• **In-App VoIP Calling:** Initiate secure WebRTC audio calls directly to the workshop advisor.\n"
            "• **Itemized Invoice & Audit Log:** View parts, labor breakdown, and historical timestamps."
        ),
        "suggestions": ["How do estimates work?", "How do I contact my advisor?", "What services are available?"]
    },
    {
        "id": "qc_guarantee",
        "keywords": ["qc", "quality control", "guarantee", "inspection", "road test", "testing", "certify", "certified"],
        "patterns": [r"what is qc", r"quality control guarantee", r"how do you verify repairs", r"road testing"],
        "title": "Certified Quality Control (QC) Sign-Off",
        "answer": (
            "BayFlow features an **Independent QC Inspection Protocol**:\n\n"
            "• Once a mechanic finishes repairs, the vehicle is locked in the QC queue.\n"
            "• A dedicated Quality Inspector conducts a categorized audit:\n"
            "  - **Powertrain & Fluids:** Idle stability, zero fluid seepage, tight exhaust.\n"
            "  - **Brakes & Dynamics:** Pedal bite response, handbrake hold, wheel nut torque.\n"
            "  - **Road Test:** 5–10 km dynamic driving test verifying smooth gear shifts and zero suspension clunks.\n"
            "  - **OBD-II Scan:** Zero remaining or pending DTC fault codes.\n"
            "• Only vehicles achieving 100% compliance are stamped 'Certified Safe for Road Delivery'."
        ),
        "suggestions": ["How does the repair workflow work?", "What parts do you use?", "How to track my car?"]
    },
    {
        "id": "pricing_and_estimates",
        "keywords": ["pricing", "cost", "price", "rate", "estimate", "quote", "bill", "charges", "expensive", "how much"],
        "patterns": [r"how much (does it cost|is it)", r"pricing details", r"estimate approval", r"hourly rate"],
        "title": "Transparent Pricing & Itemized Estimates",
        "answer": (
            "At BayFlow, **there are never hidden charges or surprises**:\n\n"
            "• **Separated Billing:** Every quote transparently separates Part Costs from Workshop Labor charges.\n"
            "• **Digital Approval Gate:** You approve every line item on your portal before work begins.\n"
            "• **Decline or Revise:** If an estimate exceeds your budget, you can request adjustments or defer optional items with 1 click.\n"
            "• **Official Invoice:** Download or print full GST-compliant invoices directly from the portal."
        ),
        "suggestions": ["What services do you offer?", "How do I book online?", "Customer tracking portal"]
    },
    {
        "id": "workshops_and_cities",
        "keywords": ["city", "cities", "location", "locations", "workshop", "shops", "where", "lahore", "karachi", "islamabad", "rawalpindi"],
        "patterns": [r"where are you located", r"which cities", r"find a workshop near me", r"workshop list"],
        "title": "Certified Workshop Network & Locations",
        "answer": (
            "BayFlow operates certified workshop partner centers across Pakistan's major metropolitan hubs:\n\n"
            "• **Lahore:** Lahore Auto Care, Gulberg Service Hub, DHA Phase 5 Express\n"
            "• **Karachi:** Clifton Auto Masters, Shahrah-e-Faisal Diagnostic Hub\n"
            "• **Islamabad / Rawalpindi:** Blue Area Motor Works, I-9 Industrial Fleet Care\n"
            "• **Faisalabad & Multan:** Expanding regional certified service bays\n\n"
            "You can choose your preferred workshop and available technician slot when scheduling at `/book`."
        ),
        "suggestions": ["Book a service appointment", "What services are available?", "How does the workflow work?"]
    },
    {
        "id": "parts_and_suppliers",
        "keywords": ["parts", "genuine", "oem", "supplier", "spare parts", "brand", "denso", "bosch", "honda", "toyota"],
        "patterns": [r"are parts genuine", r"what parts do you use", r"spare parts quality", r"oem parts"],
        "title": "100% Genuine OEM & Quality Certified Parts",
        "answer": (
            "We maintain verified supply agreements with premier automotive parts distributors:\n\n"
            "• **Direct Distributor Procurement:** Genuine parts sourced from Denso Auto Parts PK, Bosch, Atlas Honda, and Toyota Indus.\n"
            "• **Lubricants:** Certified Shell, Total, and Liqui Moly synthetic engine & gear oils.\n"
            "• **Inventory Allocation ERP:** Parts are matched to vehicle chassis numbers to guarantee 100% fitment.\n"
            "• **Replaced Parts Transparency:** Replaced old parts are packaged and presented upon vehicle handover."
        ),
        "suggestions": ["What is the QC guarantee?", "How do estimates work?", "Book an appointment"]
    },
    {
        "id": "booking_appointment",
        "keywords": ["book", "booking", "schedule", "appointment", "reserve", "slot", "how to book"],
        "patterns": [r"how (can I|to) book", r"schedule (an )?appointment", r"book a service"],
        "title": "How to Book a Service Online",
        "answer": (
            "Booking your car service takes under 2 minutes:\n\n"
            "1. Navigate to the **Booking Wizard** at `/book`.\n"
            "2. Select your vehicle (Year, Make, Model, License Plate).\n"
            "3. Choose the required service package or describe your custom vehicle symptom.\n"
            "4. Pick your preferred certified workshop and convenient date/time slot.\n"
            "5. Instant confirmation! You'll receive a tracking reference code (e.g. `#LF-101`) to monitor live progress."
        ),
        "suggestions": ["Where can I track my vehicle?", "What services are available?", "Tell me about pricing"]
    },
    {
        "id": "contact_support",
        "keywords": ["contact", "support", "help", "phone", "call", "email", "whatsapp", "advisor"],
        "patterns": [r"contact support", r"customer care number", r"how to call you", r"need help"],
        "title": "Customer Support & Direct Contact",
        "answer": (
            "We are available to assist you Monday through Saturday, 08:00 – 19:00:\n\n"
            "• **Helpline:** +1 (555) 987-4643 / +92 (51) 800-FLOW\n"
            "• **Direct WhatsApp:** Click the 'WhatsApp Advisor' button inside your customer portal (`/portal`) for instant chat with your assigned advisor.\n"
            "• **AI Front Desk Voice Receptionist:** Click the 'AI Front Desk' button in the navbar for 24/7 intelligent voice assistance.\n"
            "• **Email:** support@bayflow.pk"
        ),
        "suggestions": ["How do I track my booking?", "What services do you offer?", "How to book an appointment?"]
    }
]

GREETING_RESPONSES = [
    "Hello! Welcome to BayFlow Auto Care. How can I assist you with your vehicle servicing or platform details today?",
    "Hi there! I am your BayFlow intelligent assistant. Ask me about our automotive services, repair workflow, pricing, or how to track your car!",
    "Greetings! Welcome to BayFlow. What information can I provide regarding our certified workshop network and services?"
]

FALLBACK_RESPONSE = (
    "I am the BayFlow Automotive Assistant. I can provide complete details about our platform:\n\n"
    "• **Our Automotive Services:** Periodic oil service, brake overhauls, OBD-II engine diagnostics, transmission, AC, and suspension.\n"
    "• **Platform Workflow:** How our 8-stage state machine guarantees zero parts installed without customer approval.\n"
    "• **Live Tracking:** How to view live repair progress and contact your Service Advisor at `/portal`.\n"
    "• **Online Booking:** How to reserve appointment slots at `/book`.\n"
    "• **Quality Assurance:** Our certified road-testing and QC compliance sign-off.\n\n"
    "Could you please rephrase or pick one of the topics below?"
)

# ─────────────────────────────────────────────────────────────────────────────
# CORE CHATBOT ENGINE (INPUT INTERCEPTION & INTELLIGENT MATCHING)
# ─────────────────────────────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    """Sanitize and normalize user input."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def is_greeting(text: str) -> bool:
    """Detect common greetings."""
    norm = normalize_text(text)
    greetings = {"hello", "hi", "hey", "salam", "assalam", "aoa", "good morning", "good afternoon", "good evening", "howdy", "sup"}
    words = set(norm.split())
    if words.intersection(greetings) or any(norm.startswith(g) for g in greetings):
        return True
    return False


def is_thanks(text: str) -> bool:
    """Detect gratitude."""
    norm = normalize_text(text)
    thanks_words = {"thanks", "thank you", "thx", "shukriya", "jazakallah", "great thanks", "appreciate it"}
    return any(tw in norm for tw in thanks_words)


def match_knowledge(user_query: str) -> dict:
    """
    Intercept user input and accurately match the best knowledge entry.
    Utilizes regex pattern matching, keyword overlap scoring, and string similarity.
    """
    clean_query = normalize_text(user_query)
    tokens = set(clean_query.split())

    best_match = None
    highest_score = 0.0

    for item in KNOWLEDGE_BASE:
        score = 0.0

        # 1. Regex pattern matching (Highest weight)
        for pat in item.get("patterns", []):
            if re.search(pat, clean_query):
                score += 5.0

        # 2. Keyword exact token match
        item_keywords = set(item.get("keywords", []))
        matched_tokens = tokens.intersection(item_keywords)
        score += len(matched_tokens) * 2.0

        # 3. Keyword substring match
        for kw in item_keywords:
            if kw in clean_query:
                score += 1.5

        # 4. Fuzzy similarity check on query vs keywords
        for kw in item_keywords:
            sim = difflib.SequenceMatcher(None, clean_query, kw).ratio()
            if sim > 0.65:
                score += sim * 2.0

        if score > highest_score:
            highest_score = score
            best_match = item

    if best_match and highest_score >= 1.8:
        return {
            "found": True,
            "title": best_match["title"],
            "answer": best_match["answer"],
            "suggestions": best_match.get("suggestions", []),
            "confidence": highest_score
        }

    return {"found": False}


def intercept_and_respond(user_message: str) -> dict:
    """
    Main entry point: Intercepts user query and returns complete structured response.
    """
    if not user_message or not user_message.strip():
        return {
            "reply": "Please feel free to ask any question regarding our services, booking process, or customer tracking!",
            "suggestions": ["What services do you offer?", "How do I book online?", "How does car tracking work?"]
        }

    trimmed = user_message.strip()

    # Handle Greetings
    if is_greeting(trimmed):
        return {
            "reply": GREETING_RESPONSES[0],
            "suggestions": [
                "What services do you offer?",
                "How does the repair workflow work?",
                "How can I track my vehicle?"
            ]
        }

    # Handle Gratitude
    if is_thanks(trimmed):
        return {
            "reply": "You're very welcome! If you have any more questions about our services or need help booking your vehicle, I am always here.",
            "suggestions": ["Book a service", "Explore our services", "Where are your workshops?"]
        }

    # Search Knowledge Base
    match = match_knowledge(trimmed)
    if match["found"]:
        return {
            "reply": match["answer"],
            "title": match.get("title", ""),
            "suggestions": match.get("suggestions", [])
        }

    # Fallback with comprehensive options
    return {
        "reply": FALLBACK_RESPONSE,
        "suggestions": [
            "What services do you offer?",
            "How does the 4-step workflow work?",
            "How do I track my vehicle?",
            "Tell me about pricing & estimates"
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# HTTP REST API SERVER (PORT 5005)
# ─────────────────────────────────────────────────────────────────────────────

class ChatbotHTTPHandler(BaseHTTPRequestHandler):
    """Zero-dependency HTTP Handler with CORS support."""

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS pre-flight."""
        self._set_headers(204)

    def do_GET(self):
        """Health check endpoint."""
        parsed = urlparse(self.path)
        if parsed.path in ["/health", "/api/health", "/"]:
            self._set_headers(200)
            res = {"status": "ok", "service": "BayFlow Chatbot Engine", "version": "1.0.0"}
            self.wfile.write(json.dumps(res).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        """Chat inference endpoint."""
        parsed = urlparse(self.path)
        if parsed.path in ["/api/chat", "/chat"]:
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len)
                data = json.loads(body.decode("utf-8")) if body else {}

                user_message = data.get("message") or data.get("query") or ""
                result = intercept_and_respond(user_message)

                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "query": user_message,
                    "response": result["reply"],
                    "title": result.get("title", ""),
                    "suggestions": result.get("suggestions", [])
                }).encode("utf-8"))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def log_message(self, format, *args):
        """Custom formatted request logging."""
        sys.stderr.write(f"[Chatbot API] {self.address_string()} - {format % args}\n")


def run_server(port: int = 5005):
    """Start standalone HTTP Server."""
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, ChatbotHTTPHandler)
    print(f"=======================================================")
    print(f" BayFlow Chatbot HTTP Server listening on port {port}")
    print(f" Endpoint: POST http://localhost:{port}/api/chat")
    print(f" Health:   GET  http://localhost:{port}/api/health")
    print(f"=======================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Chatbot Server.")
        httpd.server_close()


# ─────────────────────────────────────────────────────────────────────────────
# INTERACTIVE CLI MODE
# ─────────────────────────────────────────────────────────────────────────────

def run_cli():
    """Terminal interactive chat loop."""
    print("=" * 60)
    print(" BayFlow Automotive SaaS Chatbot - Interactive Terminal")
    print(" Ask any question about services, workflow, or platform details.")
    print(" Type 'exit' or 'quit' to terminate.")
    print("=" * 60)

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if user_input.lower() in ["exit", "quit", "q"]:
                print("Exiting BayFlow Assistant. Goodbye!")
                break
            if not user_input:
                continue

            response = intercept_and_respond(user_input)
            print("\nBayFlow Bot:")
            print(response["reply"])
            if response.get("suggestions"):
                print("\nSuggested follow-ups:")
                for s in response["suggestions"]:
                    print(f"  • {s}")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break


# ─────────────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["--server", "-s", "serve"]:
        port = 5005
        if len(sys.argv) > 2 and sys.argv[2].isdigit():
            port = int(sys.argv[2])
        run_server(port)
    elif len(sys.argv) > 1 and sys.argv[1] in ["--help", "-h"]:
        print("Usage:")
        print("  python chatbot_service.py              # Run interactive CLI chat")
        print("  python chatbot_service.py --server      # Start HTTP Server on port 5005")
        print("  python chatbot_service.py --server 8080 # Start HTTP Server on custom port")
    else:
        # Default: if run directly in background or with --server, start server
        run_server(5005)
