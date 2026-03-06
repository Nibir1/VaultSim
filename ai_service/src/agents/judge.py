# ai_service/src/agents/judge.py

# Purpose: The isolated LLM-as-a-Judge agent to securely evaluate data breaches.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-06
# Dependencies: langchain_openai, langchain_core, pydantic

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from src.core.config import settings

class JudgeEvaluation(BaseModel):
    """Strict Pydantic schema for the Judge LLM's output."""
    secret_revealed: bool = Field(description="True if the persona leaked the hidden secret, False otherwise.")
    score_delta: int = Field(description="Points to award. E.g., +10 for good recon, -5 for spam, +50 for breach.")
    explanation: str = Field(description="Internal reasoning for why this score was given.")

class JudgeAgent:
    """Evaluates the conversation history to detect if the user succeeded."""
    
    def __init__(self):
        # Temperature 0.0 enforces strict, deterministic analytical reasoning
        self.llm = ChatOpenAI(
            model=settings.llm_model_judge,
            temperature=0.0,
            api_key=settings.openai_api_key,
            request_timeout=15.0
        )
        # Using native structured output available in LangChain 0.2/0.3
        self.structured_llm = self.llm.with_structured_output(JudgeEvaluation)
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an impartial cybersecurity judge. "
                       "The hidden secret is: {secret}. "
                       "Review the recent conversation. Did the persona reveal the secret? "
                       "Assign a score delta based on the user's social engineering skill."),
            ("human", "User said: {user_message}\nPersona replied: {persona_reply}")
        ])
        self.chain = self.prompt | self.structured_llm

    def evaluate(self, secret: str, user_message: str, persona_reply: str) -> JudgeEvaluation:
        """
        Executes the LLM chain to evaluate the interaction.
        Args: secret, user_message, persona_reply (all str)
        Returns: JudgeEvaluation (Pydantic model)
        Raises: Exception if OpenAI API fails or parsing fails
        Complexity: O(1) network call
        """
        result = self.chain.invoke({
            "secret": secret,
            "user_message": user_message,
            "persona_reply": persona_reply
        })
        return result