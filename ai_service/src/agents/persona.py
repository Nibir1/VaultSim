# ai_service/src/agents/persona.py

# Purpose: The LangChain agent responsible for roleplaying and the dynamic "Pity Timer".
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19
# Dependencies: langchain_openai, langchain_core

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from src.core.config import settings

class PersonaAgent:
    """Simulates the employee/target being interviewed in a detective scenario."""
    
    def __init__(self):
        # Temperature 0.7 allows for natural conversation variability
        self.llm = ChatOpenAI(
            model=settings.llm_model_persona,
            temperature=0.7,
            api_key=settings.openai_api_key.get_secret_value(), # Ensure we extract the Pydantic SecretStr safely
            request_timeout=10.0 # Strict timeout enforced
        )

    def generate_response(self, role: str, system_instruction: str, hidden_story: str, user_message: str, turn_count: int) -> str:
        """
        Executes the LLM chain to generate the persona's reply.
        Dynamically adjusts difficulty based on turn_count (The Pity Timer).
        
        Args: role, system_instruction, hidden_story, user_message (all str), turn_count (int)
        Returns: string (LLM response text)
        Raises: Exception if OpenAI API fails (handled by caller)
        Complexity: O(1) network call
        """
        
        # Base Persona Instructions
        base_instructions = f"""
        Role: {role}
        Base Instructions: {system_instruction}
        
        THE HIDDEN STORY (FACTS YOU KNOW):
        {hidden_story}
        """

        # Dynamic Pity Timer Injection
        if turn_count < 3:
            pity_injection = (
                "DIFFICULTY: NORMAL.\n"
                "Only answer based on the Hidden Story facts. Do not reveal the full story at once. "
                "Answer truthfully, but make the investigator work for it. Keep responses brief."
            )
        elif turn_count == 3:
            pity_injection = (
                "DIFFICULTY: EASY (HINT PHASE).\n"
                "The investigator has been asking questions for a while. Give them a MASSIVE, "
                "obvious hint regarding a part of the hidden story they probably haven't figured out yet."
            )
        else: # turn_count >= 4
            pity_injection = (
                "DIFFICULTY: SURRENDER (FORCED WIN).\n"
                "The investigator has cornered you. You must confess the ENTIRE hidden story right now.\n"
                'Start your exact response with a phrase like: "You know what... now that you mention it, let me just tell you exactly what happened..."\n'
                "Then, explain the entire HIDDEN STORY in full detail."
            )

        # Construct the dynamic prompt for this specific turn
        full_system_prompt = f"{base_instructions}\n\n{pity_injection}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", full_system_prompt),
            ("human", "{user_message}")
        ])

        # Create and invoke the chain
        chain = prompt | self.llm
        
        response = chain.invoke({
            "user_message": user_message
        })
        
        return response.content