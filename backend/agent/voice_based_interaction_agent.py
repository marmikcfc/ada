import enum
import os
import sys
import asyncio
from typing import Any

import cv2
import numpy as np
from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import Frame, InputImageRawFrame, OutputImageRawFrame, LLMTextFrame, TTSSpeakFrame, TTSTextFrame, LLMFullResponseEndFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport
from pipecat.observers.loggers.llm_log_observer import LLMLogObserver

load_dotenv(override=True)

def load_voice_agent_prompt() -> str:
    """Load the voice agent system prompt from the prompts directory."""
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "voice_agent_system.txt")
    try:
        with open(prompt_path, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        # Fallback to default prompt if file not found
        return "You are a helpful assistant. Respond with a concise, 2-sentence answer to the user's query. Your response will be spoken out loud. Do not use any special formatting like XML or Markdown."

class VoiceInterfaceAgent:
    def __init__(self, webrtc_connection, raw_llm_output_queue: asyncio.Queue):
        self.webrtc_connection = webrtc_connection
        self.raw_llm_output_queue = raw_llm_output_queue

    async def process_downstream_display(self, assistant_response: str, history: Any):
        logger.info(f"--- process_downstream_display (payload for Thesys) ---")
        logger.info(f"History (for Thesys context): {history}")
        logger.info(f"Assistant Spoken Response (for Thesys): {assistant_response}")
        logger.info(f"----------------------------------------------------------")
        
        try:
            # This payload structure is expected by the modified visualization_processor in main.py
            payload = {"assistant_response": assistant_response.strip(), "history": history}
            await self.raw_llm_output_queue.put(payload)
            logger.info(f"Enqueued to raw_llm_output_queue: {payload}")
        except Exception as e:
            logger.error(f"Error enqueuing to raw_llm_output_queue: {e}")

    async def run(self):
        # Load the system instruction from prompt file
        system_instruction = load_voice_agent_prompt()
        
        transport_params = TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_out_10ms_chunks=2,
            vad_analyzer=SileroVADAnalyzer(),
        )

        pipecat_transport = SmallWebRTCTransport(
            webrtc_connection=self.webrtc_connection, params=transport_params
        )

        # llm = GeminiMultimodalLiveLLMService(
        #     api_key=os.getenv("GOOGLE_API_KEY"),
        #     voice_id="Puck",  # Aoede, Charon, Fenrir, Kore, Puck
        #     transcribe_user_audio=True,
        #     system_instruction=system_instruction,
        # )

        llm = OpenAILLMService(
            api_key=os.getenv("OPENAI_API_KEY"),
            model="gpt-4o-mini"
        )

        # Speech-to-Text using Deepgram via Pipecat
        stt = DeepgramSTTService(
            api_key=os.getenv("DEEPGRAM_API_KEY")
        )

        # Text-to-Speech using Cartesia (British Reading Lady)
        tts = CartesiaTTSService(
            api_key=os.getenv("CARTESIA_API_KEY"),
            voice_id="71a7ad14-091c-4e8e-a314-022ece01c121",
        )
        context = OpenAILLMContext(
            [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": "Start by greeting the user warmly and introducing yourself."},
            ],
        )

        context_aggregator = llm.create_context_aggregator(context)

        # RTVI events for Pipecat client UI
        rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

        response_aggregator = ResponseAggregatorProcessor(context, self)
            

        # Build the pipeline with XmlSplitProcessor after the LLM service
        pipeline = Pipeline(
            [
                pipecat_transport.input(),
                rtvi,
                stt,  # Speech-To-Text
                context_aggregator.user(),
                llm,  # LLM service
                response_aggregator, # New processor
                tts,  # Text-To-Speech
                pipecat_transport.output(),
                context_aggregator.assistant(),
            ]
        )

        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                observers=[RTVIObserver(rtvi), LLMLogObserver()],
            ),
        )

        @rtvi.event_handler("on_client_ready")
        async def on_client_ready(rtvi):
            logger.info("Pipecat client ready.")
            await rtvi.set_bot_ready()
            await task.queue_frames([context_aggregator.user().get_context_frame()])

        @pipecat_transport.event_handler("on_client_connected")
        async def on_client_connected(transport, client):
            logger.info("Pipecat Client connected")

        @pipecat_transport.event_handler("on_client_disconnected")
        async def on_client_disconnected(transport, client):
            logger.info("Pipecat Client disconnected")

        @pipecat_transport.event_handler("on_client_closed")
        async def on_client_closed(transport, client):
            logger.info("Pipecat Client closed")
            await task.cancel()

        runner = PipelineRunner(handle_sigint=False)
        await runner.run(task)

# Define ResponseAggregatorProcessor (can be outside or an inner class if preferred)
class ResponseAggregatorProcessor(FrameProcessor):
    def __init__(self, context: OpenAILLMContext, agent_instance: VoiceInterfaceAgent):
        super().__init__()
        self.context = context
        self.agent_instance = agent_instance
        self.current_assistant_response_buffer = ""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        # Default behavior is to pass the frame through if not handled by a specific condition.
        # This ensures other frames (like LLMTextEndFrame, etc.) are passed if not explicitly handled.

        if isinstance(frame, LLMTextFrame):
            self.current_assistant_response_buffer += frame.text
            # Push TTSTextFrame for TTS service to speak out the text chunk by chunk
            await self.push_frame(TTSTextFrame(text=frame.text), direction)
            return  # LLMTextFrame is consumed here and converted to TTSTextFrame

        if isinstance(frame, LLMFullResponseEndFrame):
            if self.current_assistant_response_buffer:
                last_user_message_content = "User input not found"  # Default
                # Iterate backwards through the context to find the last user message
                current_messages = self.context.get_messages()
                # if current_messages:
                #     for i in range(len(current_messages) - 1, -1, -1):
                #         msg = current_messages[i]
                #         if msg["role"] == "user":
                #             last_user_message_content = msg["content"]
                #             break
                
                await self.agent_instance.process_downstream_display(
                    # user_input=last_user_message_content,
                    assistant_response=self.current_assistant_response_buffer.strip(),
                    history=current_messages[1:]
                )
                # Reset buffer after processing the full response
                self.current_assistant_response_buffer = ""
            
            # Pass the LLMFullResponseEndFrame itself downstream
            await self.push_frame(frame, direction)
            return

        # For all other frames not specifically handled above, pass them through.
        await self.push_frame(frame, direction) 