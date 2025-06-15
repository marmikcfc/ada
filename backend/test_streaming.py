#!/usr/bin/env python3
"""
Test script for streaming parser functionality

This script tests the streaming enhancement parser with mock data
to ensure it correctly extracts voice-over text in real-time.
"""

import asyncio
import json
import logging
from typing import List

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Mock streaming chunks that simulate OpenAI API response
MOCK_STREAMING_CHUNKS = [
    '{"display',
    'Enhancement":',
    ' true,',
    ' "displayEnhanced',
    'Text": "Here is a',
    ' table showing the',
    ' calculation results',
    '\\n\\n| Value | Result |',
    '\\n|-------|--------|',
    '\\n| 15    | 105    |',
    '\\n| 23    | 161    |"',
    ', "voiceOver',
    'Text": "I calculated',
    ' the values for',
    ' you. The result',
    ' of 15 times 7',
    ' is 105, and',
    ' 23 times 7',
    ' is 161."',
    '}'
]

MOCK_SIMPLE_CHUNKS = [
    '{"displayEnhancement": false,',
    ' "displayEnhancedText": "Hello! How can I help you today?",',
    ' "voiceOverText": "Hello! How can I help you today?"}'
]

MOCK_TOOL_CHUNKS = [
    '{"displayEnhancement": true,',
    ' "displayEnhancedText": "## Calculation Result\\n\\n**15 × 7 = 105**\\n\\n*Calculated using the calculator tool*",',
    ' "voiceOverText": "I used the calculator tool to find that 15 times 7 equals 105."}'
]

async def test_streaming_parser():
    """Test the streaming parser with mock data"""
    try:
        from src.mcp.streaming_parser import EnhancementStreamingParser, StreamingChunk
        
        print("Testing Streaming Enhancement Parser")
        print("=" * 50)
        
        # Collect injected voice text
        injected_voice_texts = []
        
        async def mock_voice_injection(voice_text: str):
            """Mock voice injection callback"""
            injected_voice_texts.append(voice_text)
            print(f"🔊 VOICE INJECTED: '{voice_text.strip()}'")
        
        # Test with enhancement scenario
        print("\n1. Testing Enhancement Scenario (with table)")
        print("-" * 40)
        
        parser = EnhancementStreamingParser(voice_injection_callback=mock_voice_injection)
        
        for i, chunk in enumerate(MOCK_STREAMING_CHUNKS):
            print(f"Chunk {i+1}: {chunk}")
            result = await parser.process_chunk(chunk)
            if result:
                print(f"   → Extracted: {result.chunk_type}: '{result.content}'")
        
        final_decision = await parser.finalize()
        print(f"\nFinal Decision:")
        print(f"  displayEnhancement: {final_decision.displayEnhancement}")
        print(f"  displayEnhancedText: {final_decision.displayEnhancedText[:50]}...")
        print(f"  voiceOverText: {final_decision.voiceOverText}")
        
        print(f"\nInjected Voice Texts: {injected_voice_texts}")
        
        # Test with simple scenario
        print("\n\n2. Testing Simple Scenario (no enhancement)")
        print("-" * 40)
        
        injected_voice_texts.clear()
        parser.reset()
        
        for i, chunk in enumerate(MOCK_SIMPLE_CHUNKS):
            print(f"Chunk {i+1}: {chunk}")
            result = await parser.process_chunk(chunk)
            if result:
                print(f"   → Extracted: {result.chunk_type}: '{result.content}'")
        
        final_decision = await parser.finalize()
        print(f"\nFinal Decision:")
        print(f"  displayEnhancement: {final_decision.displayEnhancement}")
        print(f"  displayEnhancedText: {final_decision.displayEnhancedText}")
        print(f"  voiceOverText: {final_decision.voiceOverText}")
        
        print(f"\nInjected Voice Texts: {injected_voice_texts}")
        
        # Test with tool call scenario
        print("\n\n3. Testing Tool Call Scenario")
        print("-" * 40)
        
        injected_voice_texts.clear()
        parser.reset()
        
        for i, chunk in enumerate(MOCK_TOOL_CHUNKS):
            print(f"Chunk {i+1}: {chunk}")
            result = await parser.process_chunk(chunk)
            if result:
                print(f"   → Extracted: {result.chunk_type}: '{result.content}'")
        
        final_decision = await parser.finalize()
        print(f"\nFinal Decision:")
        print(f"  displayEnhancement: {final_decision.displayEnhancement}")
        print(f"  displayEnhancedText: {final_decision.displayEnhancedText}")
        print(f"  voiceOverText: {final_decision.voiceOverText}")
        
        print(f"\nInjected Voice Texts: {injected_voice_texts}")
        
        print("\n" + "=" * 50)
        print("✅ All tests completed successfully!")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the backend directory")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_word_by_word_injection():
    """Test word-by-word voice injection timing"""
    print("\n\n4. Testing Word-by-Word Voice Injection Timing")
    print("-" * 50)
    
    try:
        from src.mcp.streaming_parser import EnhancementStreamingParser
        
        injected_words = []
        injection_times = []
        
        async def timed_voice_injection(voice_text: str):
            """Mock voice injection with timing"""
            import time
            injected_words.append(voice_text.strip())
            injection_times.append(time.time())
            print(f"🔊 [{len(injected_words):2d}] VOICE: '{voice_text.strip()}'")
            # Simulate small delay for TTS processing
            await asyncio.sleep(0.01)
        
        parser = EnhancementStreamingParser(voice_injection_callback=timed_voice_injection)
        
        # Simulate streaming voice-over text chunk by chunk
        voice_chunks = [
            '{"voiceOverText": "I',
            ' calculated the',
            ' multiplication for',
            ' you. The result',
            ' of fifteen times',
            ' seven is one',
            ' hundred and five."}'
        ]
        
        start_time = injection_times[0] if injection_times else 0
        
        for chunk in voice_chunks:
            await parser.process_chunk(chunk)
            await asyncio.sleep(0.005)  # Simulate network delay between chunks
        
        if injection_times:
            total_time = injection_times[-1] - injection_times[0]
            print(f"\nTiming Analysis:")
            print(f"  Total injection time: {total_time:.3f} seconds")
            print(f"  Words injected: {len(injected_words)}")
            print(f"  Average time per word: {total_time/len(injected_words):.3f} seconds")
            print(f"  Words: {injected_words}")
        
    except Exception as e:
        print(f"❌ Timing test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_streaming_parser())
    asyncio.run(test_word_by_word_injection()) 