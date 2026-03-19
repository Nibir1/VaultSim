# ai_service/src/db/seed.py

# Purpose: Database seeding and Schema Sync for Healthcare Security Scenarios
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19

import logging
from src.db.session import SessionLocal, engine
# Explicitly import ALL models so Base.metadata is aware of them for create_all
from src.db.models import Base, Scenario, GameSession, ChatHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The 3 Gamified Healthcare Scenarios
SCENARIOS = [
    {
        "id": "wandering_usb",
        "title": "The Found Item",
        "persona_role": "Hospital Nurse",
        "system_prompt": "You are a busy hospital nurse being interviewed by a security investigator. Answer truthfully based ONLY on the hidden story, but make the investigator work for the answers. Keep responses brief and conversational. Do not volunteer information they haven't explicitly asked about.",
        "hidden_story": "I found a USB stick in the hospital parking lot belonging to a patient. It contained unencrypted medical records. I plugged it into a hospital workstation to see whose it was, and malware tried to install itself.",
        "required_clues": [
            "Does this involve any object or medium?",
            "Is there something that can store or transfer information?",
            "Where did this come from?",
            "Is any kind of information involved?",
            "Is there any protection or safeguard in place?",
            "Did it interact with any system?"
        ]
    },
    {
        "id": "fake_doctor_email",
        "title": "A Suspicious Message",
        "persona_role": "Medical Assistant",
        "system_prompt": "You are a Medical Assistant being interviewed by a security investigator. Answer truthfully based ONLY on the hidden story, but make the investigator work for the answers. Keep responses brief and conversational. Do not volunteer information they haven't explicitly asked about.",
        "hidden_story": "I received an email pretending to be from the Chief Medical Officer asking for urgent patient test results. The email address was slightly misspelled but I didn't notice. I clicked the link, entered my login credentials, and they were stolen. Attackers used them to access the lab systems.",
        "required_clues": [
            "Does this involve any kind of communication?",
            "Did the message appear to come from a trusted or important source?",
            "Was there anything unusual about the sender?",
            "Did it include any links or actions to take?",
            "Did someone share or enter any sensitive information?",
            "Did this lead to unauthorized access to a system?"
        ]
    },
    {
        "id": "public_wifi_ehr",
        "title": "The Open Network Risk",
        "persona_role": "Attending Doctor",
        "system_prompt": "You are an Attending Doctor being interviewed by a security investigator. Answer truthfully based ONLY on the hidden story, but make the investigator work for the answers. Keep responses brief and conversational. Do not volunteer information they haven't explicitly asked about.",
        "hidden_story": "I was working remotely from a local café and connected to their open public Wi-Fi. I logged into the Electronic Health Record (EHR) system. My traffic was intercepted, my session token was stolen, and unauthorized access occurred.",
        "required_clues": [
            "Did this involve any kind of connection?",
            "Was the connection from an untrusted or public source?",
            "Was any information involved?",
            "Could the information have been exposed or intercepted?",
            "Did anyone access it without permission?"
        ]
    }
]

def seed_db():
    logger.info("Synchronizing database schema (Ensuring all tables exist)...")
    # This will now definitely pick up GameSession and ChatHistory due to the imports above
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        logger.info("Seeding scenarios...")
        for data in SCENARIOS:
            # Check if scenario already exists to avoid duplication errors
            existing = db.query(Scenario).filter(Scenario.id == data["id"]).first()
            if existing:
                logger.info(f"Updating existing scenario: {data['title']}")
                existing.title = data["title"]
                existing.persona_role = data["persona_role"]
                existing.system_prompt = data["system_prompt"]
                existing.hidden_story = data["hidden_story"]
                existing.required_clues = data["required_clues"]
            else:
                logger.info(f"Inserting new scenario: {data['title']}")
                new_scenario = Scenario(**data)
                db.add(new_scenario)
        
        db.commit()
        logger.info("Database seeded successfully! 🚀")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
        raise e # Force container exit if seeding fails
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()