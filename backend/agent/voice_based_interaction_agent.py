import enum
import os
import sys
import asyncio
from typing import Any
import uuid

import cv2
import numpy as np
from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import Frame, InputImageRawFrame, OutputImageRawFrame, LLMTextFrame, TTSTextFrame, LLMFullResponseEndFrame, TranscriptionFrame
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
from pipecat.processors.transcript_processor import TranscriptProcessor
from pipecat.transports.network.webrtc_connection import SmallWebRTCConnection
import json

# Import chat history manager
from app.chat_history_manager import chat_history_manager
# Helpers for immediate UI update
from app.queues import (
    create_simple_card_content,
    create_immediate_voice_response,
    enqueue_llm_message,
)

load_dotenv(override=True)

def load_voice_agent_prompt() -> str:
    """Load the voice agent system prompt from the prompts directory and inject available tools."""
    prompt_path = os.path.join(os.path.dirname(__file__), "..", "..", "prompts", "voice_agent_system.txt")
    mcp_config_path = os.path.join(os.path.dirname(__file__), "..", "..", "mcp_servers.json")
    
    try:
        # Load the base prompt template
        with open(prompt_path, "r") as f:
            prompt_template = f.read().strip()
        
        # Load MCP servers configuration to get available tools
        available_tools_text = ""
        try:
            with open(mcp_config_path, "r") as f:
                mcp_config = json.load(f)
            
            # Extract enabled servers and their descriptions
            enabled_servers = mcp_config.get("servers", {})
            if enabled_servers:
                tools_list = []
                for server_name, server_config in enabled_servers.items():
                    # Check if server URL has required environment variables
                    url = server_config.get("url", "")
                    if "{SMITHERY_API_KEY}" in url and not os.getenv("SMITHERY_API_KEY"):
                        logger.warning(f"Skipping {server_name} - SMITHERY_API_KEY not set")
                        continue
                    
                    description = server_config.get("description", f"{server_name} capabilities")
                    tools_list.append(f"- {server_name.title()}: {description}")
                
                if tools_list:
                    available_tools_text = "\n".join(tools_list)
                else:
                    available_tools_text = "- General assistance and conversation capabilities"
            else:
                available_tools_text = "- General assistance and conversation capabilities"
                
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"Could not load MCP configuration for voice prompt: {e}")
            available_tools_text = "- General assistance and conversation capabilities"
        
        # Replace the placeholder with actual tools information
        final_prompt = prompt_template.replace("{AVAILABLE_TOOLS}", available_tools_text)
        
        logger.info(f"Voice agent prompt loaded with {len(enabled_servers)} available tools")
        return final_prompt
        
    except FileNotFoundError:
        # Fallback to default prompt if file not found
        logger.warning(f"Voice agent prompt file not found at {prompt_path}, using fallback")
        return "You are a helpful assistant. Respond with a concise, 2-sentence answer to the user's query. Your response will be spoken out loud. Do not use any special formatting like XML or Markdown."

class VoiceInterfaceAgent:
    def __init__(self, webrtc_connection: SmallWebRTCConnection, raw_llm_output_queue: asyncio.Queue, llm_message_queue: asyncio.Queue = None):
        # Initialize voice agent identifiers and queues
        self.webrtc_connection = webrtc_connection
        self.raw_llm_output_queue = raw_llm_output_queue
        self.llm_message_queue = llm_message_queue
        # Use the WebRTC pc_id as thread_id if available, otherwise generate a new one
        self.thread_id = getattr(webrtc_connection, 'pc_id', None) or str(uuid.uuid4())
        logger.info(f"Voice agent initialized with thread_id: {self.thread_id}")
        # Store pipeline task reference for TTS injection
        self.pipeline_task = None

    async def process_downstream_display(self, assistant_response: str, history: Any):
        logger.info(f"--- process_downstream_display (payload for Thesys) ---")
        logger.info(f"History (for Thesys context): {history}")
        logger.info(f"Assistant Spoken Response (for Thesys): {assistant_response}")
        logger.info(f"----------------------------------------------------------")
        
        try:
            if self.raw_llm_output_queue is None:
                logger.warning("raw_llm_output_queue not available, cannot send response for visualization")
                return
                
            # Include metadata for visualization processor (source and thread_id)
            payload = {
                "assistant_response": assistant_response.strip(),
                "history": history,
                "metadata": {
                    # Use the canonical label expected by the visualization
                    # processor so that its early-exit de-duplication logic
                    # triggers correctly.
                    "source": "voice-agent",
                    "thread_id": self.thread_id
                }
            }
            await self.raw_llm_output_queue.put(payload)
            logger.info(f"Enqueued to raw_llm_output_queue: {payload}")
        except Exception as e:
            logger.error(f"Error enqueuing to raw_llm_output_queue: {e}")

    async def send_user_transcription_to_frontend(self, transcription_text: str):
        """Send user transcription directly to the frontend message queue."""
        logger.info(f"--- send_user_transcription_to_frontend ---")
        logger.info(f"User transcription: {transcription_text}")
        logger.info(f"-----------------------------------------------")
        
        try:
            if self.llm_message_queue is None:
                logger.warning("llm_message_queue not available, cannot send user transcription to frontend")
                return
                
            user_message = {
                "id": str(uuid.uuid4()),
                "role": "user", 
                "type": "user_transcription",
                "content": transcription_text
            }
            
            # Add to chat history manager
            await chat_history_manager.add_user_message(self.thread_id, transcription_text, user_message["id"])
            logger.info(f"Added user transcription to chat history for thread {self.thread_id}")
            
            await self.llm_message_queue.put(user_message)
            logger.info(f"User transcription sent to frontend: {user_message}")
        except Exception as e:
            logger.error(f"Error sending user transcription to frontend: {e}")

    async def inject_tts_voice_over(self, voice_text: str):
        """
        Inject voice-over text directly into the TTS pipeline using TTSTextFrame.
        This is called by the visualization processor when MCP generates voice-over text.
        """
        logger.info(f"--- inject_tts_voice_over ---")
        logger.info(f"Voice-over text: {voice_text}")
        logger.info(f"--------------------------------")
        
        try:
            if not self.pipeline_task:
                logger.error("Pipeline task not initialized, cannot inject TTS voice-over")
                return
                
            if not voice_text or not voice_text.strip():
                logger.warning("Empty voice text provided, skipping TTS injection")
                return
                
            # Create TTSTextFrame - this will cause the bot to speak the text without adding to LLM context
            tts_frame = TTSTextFrame(text=f"{voice_text.strip()} ")
            
            # Queue the frame to the pipeline task
            await self.pipeline_task.queue_frames([tts_frame])
            logger.info(f"Successfully injected TTS voice-over frame: '{voice_text[:100]}...'")
            
        except Exception as e:
            logger.error(f"Error injecting TTS voice-over: {e}")

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

        transcript = TranscriptProcessor()

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
                transcript.user(),
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

        
        @transcript.event_handler("on_transcript_update")
        async def handle_transcript_update(processor, frame):
            # Each message contains role (user/assistant), content, and timestamp
            for message in frame.messages:
                logger.info(f"Capturing transcriber logs [{message.timestamp}] {message.role}: {message.content}")
                
                # Add to chat history based on role
                if message.role == "user":
                    # Add user message to chat history
                    await chat_history_manager.add_user_message(self.thread_id, message.content)
                    # Send to frontend
                    await self.send_user_transcription_to_frontend(message.content)
                elif message.role == "assistant":
                    # Add assistant message to chat history
                    await chat_history_manager.add_assistant_message(self.thread_id, message.content)

        # Store pipeline task reference for TTS injection
        self.pipeline_task = task

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
                # Add the complete assistant response to chat history
                assistant_response = self.current_assistant_response_buffer.strip()
                await chat_history_manager.add_assistant_message(
                    self.agent_instance.thread_id,
                    assistant_response
                )

                # ------------------------------------------------------------------
                # FAST-PATH UI UPDATE: push a simple Card to the frontend **now**
                # ------------------------------------------------------------------
                try:
                    simple_content = create_simple_card_content(assistant_response)
                    immediate_msg = create_immediate_voice_response(
                        content=simple_content,
                        voice_text=None,
                    )
                    # Prefer the agent-scoped queue if supplied, otherwise fall back
                    # to the global enqueue helper.
                    if self.agent_instance.llm_message_queue is not None:
                        await self.agent_instance.llm_message_queue.put(immediate_msg)
                    else:
                        await enqueue_llm_message(immediate_msg)
                    logger.info(
                        f"Sent immediate_voice_response to frontend (id={immediate_msg['id']})"
                    )
                except Exception as e:
                    logger.error(f"Error sending immediate voice response: {e}")

                logger.info(f"Added assistant response to chat history for thread {self.agent_instance.thread_id}")
                
                # Get conversation history from chat history manager instead of context
                conversation_history = await chat_history_manager.get_recent_history(self.agent_instance.thread_id)
                
                # Process downstream display with the real conversation history
                await self.agent_instance.process_downstream_display(
                    assistant_response=assistant_response,
                    history=conversation_history
                )
                
                # Reset buffer after processing the full response
                self.current_assistant_response_buffer = ""
            
            # Pass the LLMFullResponseEndFrame itself downstream
            await self.push_frame(frame, direction)
            return

        # For all other frames not specifically handled above, pass them through.
        await self.push_frame(frame, direction)
