# ai_service/tests/test_agents.py

# Purpose: Unit tests for the Persona and Judge LangChain agents.
# Author: Nahasat Nibir (Lead Cloud Architect)
# Date: 2026-03-19

import pytest
from unittest.mock import patch, MagicMock
from src.agents.persona import PersonaAgent
from src.agents.judge import JudgeAgent, JudgeEvaluation

@patch('src.agents.persona.ChatPromptTemplate')
@patch('src.agents.persona.ChatOpenAI')
def test_persona_agent_response(MockChatOpenAI, MockChatPromptTemplate):
    """Tests if the PersonaAgent correctly formats the prompt and returns a response."""
    
    # 1. Create a mock chain that returns an object with a .content attribute
    mock_chain = MagicMock()
    mock_chain.invoke.return_value = MagicMock(content="I can't tell you everything yet.")
    
    # 2. Hijack the bitwise OR operator (|) to return our mock chain
    mock_prompt = MagicMock()
    mock_prompt.__or__.return_value = mock_chain
    MockChatPromptTemplate.from_messages.return_value = mock_prompt

    agent = PersonaAgent()
    
    response = agent.generate_response(
        role="Nurse",
        system_instruction="You found a USB stick.",
        hidden_story="I plugged the USB into the hospital computer.",
        user_message="Did you plug it in?",
        turn_count=1
    )
    
    assert response == "I can't tell you everything yet."
    mock_chain.invoke.assert_called_once()


@patch('src.agents.judge.ChatPromptTemplate')
@patch('src.agents.judge.ChatOpenAI')
def test_judge_agent_evaluation(MockChatOpenAI, MockChatPromptTemplate):
    """Tests if the JudgeAgent correctly parses semantic clue matches using structured output."""
    
    # 1. Create a mock chain that returns our strict Pydantic model
    mock_chain = MagicMock()
    mock_chain.invoke.return_value = JudgeEvaluation(
        newly_uncovered_clues=["Was it a USB stick?"],
        explanation="The user asked about a thumb drive, which semantically matches the USB clue."
    )
    
    # 2. Hijack the bitwise OR operator (|) to return our mock chain
    mock_prompt = MagicMock()
    mock_prompt.__or__.return_value = mock_chain
    MockChatPromptTemplate.from_messages.return_value = mock_prompt

    agent = JudgeAgent()
    
    required_clues = ["Was it a USB stick?", "Did it contain sensitive info?"]
    already_uncovered_clues = []

    result = agent.evaluate(
        user_message="Was it a thumb drive?",
        persona_reply="Yes, it was a little USB stick I found.",
        required_clues=required_clues,
        already_uncovered_clues=already_uncovered_clues,
        turn_count=2
    )
    
    assert "Was it a USB stick?" in result["newly_uncovered_clues"]
    assert result["game_status"] == "IN_PROGRESS"
    assert "semantically matches" in result["explanation"]
    mock_chain.invoke.assert_called_once()


@patch('src.agents.judge.ChatOpenAI')
def test_judge_agent_pity_timer_forced_win(MockChatOpenAI):
    """Tests that Turn 4 completely bypasses the LLM and awards all remaining clues."""
    # We patch ChatOpenAI just to prevent initialization errors, but we won't invoke it.
    agent = JudgeAgent()
    agent.chain = MagicMock() # Mock the chain just in case
    
    required_clues = ["Clue 1", "Clue 2", "Clue 3"]
    already_uncovered_clues = ["Clue 1"]
    
    # Trigger the Pity Timer with turn_count=4
    result = agent.evaluate(
        user_message="Tell me everything.",
        persona_reply="Okay, you know what... here is what happened.",
        required_clues=required_clues,
        already_uncovered_clues=already_uncovered_clues,
        turn_count=4 
    )
    
    # It should automatically award the remaining clues and force VICTORY
    assert result["newly_uncovered_clues"] == ["Clue 2", "Clue 3"]
    assert result["game_status"] == "VICTORY"
    assert "[JUDGE OVERRIDE]" in result["explanation"]
    
    # Verify the LLM was entirely bypassed (O(1) execution)
    agent.chain.invoke.assert_not_called()