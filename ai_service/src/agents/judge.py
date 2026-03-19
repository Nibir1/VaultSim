# ai_service/src/agents/judge.py

# Purpose: The isolated LLM-as-a-Judge agent for semantic clue evaluation.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19
# Dependencies: langchain_openai, langchain_core, pydantic

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List
from src.core.config import settings

class JudgeEvaluation(BaseModel):
    """Strict Pydantic schema for the Judge LLM's structured output."""
    newly_uncovered_clues: List[str] = Field(
        description="A list of exact string matches from the 'remaining_clues' list that were semantically uncovered in this turn."
    )
    explanation: str = Field(
        description="A brief explanation of why the user's question or the persona's reply uncovered these clues."
    )

class JudgeAgent:
    """Evaluates the conversation history to semantically match clues and detect win states."""
    
    def __init__(self):
        # Temperature 0.0 enforces strict, deterministic analytical reasoning
        self.llm = ChatOpenAI(
            model=settings.llm_model_judge,
            temperature=0.0,
            api_key=settings.openai_api_key.get_secret_value(), # Safely unwrap Pydantic SecretStr
            request_timeout=15.0
        )
        # Force the LLM to return our specific Pydantic schema
        self.structured_llm = self.llm.with_structured_output(JudgeEvaluation)
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert Semantic Evaluator for a Detective Game. "
                       "The user is asking questions to uncover a hidden story. "
                       "Evaluate the User's Input and the Persona's Reply against the list of REMAINING CLUES. "
                       "If the user's question or the persona's answer semantically proves or uncovers a clue, "
                       "add the EXACT string of that clue to 'newly_uncovered_clues'.\n\n"
                       "Example:\n"
                       "Remaining Clue: 'Was it a USB stick?'\n"
                       "User Input: 'Did you plug in a thumb drive?'\n"
                       "Action: Semantic match! Add 'Was it a USB stick?' to the list."),
            ("human", "REMAINING CLUES TO FIND:\n{remaining}\n\n"
                      "USER INPUT: {user_message}\n\n"
                      "PERSONA REPLY: {persona_reply}\n\n"
                      "Which clues from the remaining list were uncovered?")
        ])
        
        self.chain = self.prompt | self.structured_llm

    def evaluate(
        self, 
        user_message: str, 
        persona_reply: str, 
        required_clues: List[str], 
        already_uncovered_clues: List[str], 
        turn_count: int
    ) -> dict:
        """
        Executes the LLM chain to evaluate semantic clue matches.
        Enforces a forced win if the turn_count reaches the limit (Pity Timer).
        
        Args: user_message, persona_reply (str), required_clues, already_uncovered_clues (List[str]), turn_count (int)
        Returns: dict with newly_uncovered_clues, explanation, and game_status
        Complexity: O(1) network call
        """
        
        # Calculate exactly what the user still needs to find
        remaining_clues = [clue for clue in required_clues if clue not in already_uncovered_clues]

        # Handle the Turn 4 Forced Win (The Pity Timer)
        if turn_count >= 4:
            return {
                "newly_uncovered_clues": remaining_clues, # Grant all remaining clues automatically
                "explanation": "[JUDGE OVERRIDE] Maximum turn count reached. The Persona has confessed the full story. All remaining clues automatically awarded.",
                "game_status": "VICTORY"
            }

        # Catch-all: If they already won on a previous turn but somehow sent another message
        if not remaining_clues:
            return {
                "newly_uncovered_clues": [],
                "explanation": "All clues already discovered.",
                "game_status": "VICTORY"
            }

        # Format the remaining clues as a bulleted string to help the LLM parse them strictly
        formatted_remaining = "\n".join([f"- {clue}" for clue in remaining_clues])

        # Invoke the LangChain evaluation
        result: JudgeEvaluation = self.chain.invoke({
            "remaining": formatted_remaining,
            "user_message": user_message,
            "persona_reply": persona_reply
        })

        # Calculate if this specific turn triggered the win condition naturally
        total_uncovered_after_this_turn = len(already_uncovered_clues) + len(result.newly_uncovered_clues)
        is_victory = total_uncovered_after_this_turn >= len(required_clues)

        return {
            "newly_uncovered_clues": result.newly_uncovered_clues,
            "explanation": result.explanation,
            "game_status": "VICTORY" if is_victory else "IN_PROGRESS"
        }