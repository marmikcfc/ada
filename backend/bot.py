import enum
import os
import sys
import asyncio

import cv2
import numpy as np
from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import Frame, InputImageRawFrame, OutputImageRawFrame, LLMTextFrame, TTSSpeakFrame, TTSTextFrame
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



class SpokenContentState(enum.Enum):
    """
    Enum for the state of the spoken content.
    """
    NOT_STARTED = "NOT_STARTED"
    SPOKEN = "SPOKEN"
    PAUSED = "PAUSED"
    COMPLETE = "COMPLETE"

SYSTEM_INSTRUCTION = f"""
You are an assistant that ALWAYS responds with exactly one well-formed XML document following this schema:

<RESPONSE>
  <SPOKEN>Concise message for voice output. This will be passed to the TTS service, so ensure there's no emojis or markdown formatting.</SPOKEN>
  <DISPLAY>This is the content that will be displayed on the screen. It should be a string in markdown format.</DISPLAY>
</RESPONSE>
Ensure <SPOKEN> comes first and <DISPLAY> content clearly describes the UI. Respond ONLY with this XML.
"""


class VoiceInterfaceAgent:
    def __init__(self, webrtc_connection, display_queue: asyncio.Queue):
        self.webrtc_connection = webrtc_connection
        self.display_queue = display_queue

    async def run(self):
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
        #     system_instruction=SYSTEM_INSTRUCTION,
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
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": "Start by greeting the user warmly and introducing yourself."},
            ],
        )

        context_aggregator = llm.create_context_aggregator(context)

        # RTVI events for Pipecat client UI
        rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

        class XmlSplitProcessor(FrameProcessor):
            def __init__(self, display_queue: asyncio.Queue):
                super().__init__()
                self.display_queue = display_queue
                
                self.processing_buffer = ""  # Buffer for incoming text, processed for SPOKEN
                self.spoken_content_state = SpokenContentState.NOT_STARTED
                self.end_spoken_tag = ""
                

            async def _remove_display_content_and_send(self, xml_string: str):
                modified_xml_for_queue = xml_string  # Default to original string
                start_tag = "<DISPLAY>"
                end_tag = "</DISPLAY>"

                try:
                    start_index = xml_string.find(start_tag)
                    if start_index != -1:
                        end_index = xml_string.find(end_tag, start_index + len(start_tag))
                        if end_index != -1:
                            modified_xml_for_queue = xml_string[start_index + len(start_tag):end_index]
                            logger.debug("DISPLAY tag content cleared using string operations.")
                        else:
                            logger.warning(f"'{end_tag}' not found after '{start_tag}'. Sending XML as is.")
                    else:
                        logger.warning(f"'{start_tag}' not found. Sending XML as is.")
                    
                    logger.debug(f"Sending to display_queue: {modified_xml_for_queue}...")
                    await self.display_queue.put(modified_xml_for_queue)

                except Exception as e:  # Catch any other unexpected errors
                    logger.error(f"Error during string manipulation or queue operation: {e}. XML snippet: '{xml_string[:150]}...'")
                    logger.warning("Sending original, unmodified XML to display_queue due to processing error.")
                    await self.display_queue.put(xml_string) # Fallback to sending the original string

            async def process_frame(self, frame: Frame, direction: FrameDirection):
                await super().process_frame(frame, direction)

                if not isinstance(frame, LLMTextFrame):
                    await self.push_frame(frame)  # Pass non-LLM frames through
                    return
                
                
                logger.debug(f"Raw LLMTextFrame content: {frame.text}, {self.processing_buffer}, {self.spoken_content_state}") # Optional: for debugging raw input
                self.processing_buffer += frame.text

                # Check for interruption scenario (two <RESPONSE> tags)
                if self.processing_buffer.count("<RESPONSE>") >= 2:
                    logger.info("Detected interruption: Multiple <RESPONSE> tags found")
                    logger.debug(f"Interruption detected in buffer: '{self.processing_buffer}'")
                    
                    # Reset the state
                    self.processing_buffer = self.processing_buffer[self.processing_buffer.rfind("<RESPONSE>"):]
                    self.spoken_content_state = SpokenContentState.NOT_STARTED
                    self.end_spoken_tag = ""
                    
                
                
                if self.spoken_content_state == SpokenContentState.NOT_STARTED:
                    logger.debug(f"Not currently streaming spoken content. Buffer: '{self.processing_buffer}'")
                    if "<SPOKEN>" in self.processing_buffer:
                        logger.debug(f"<SPOKEN> detected in buffer. Set is_currently_streaming_spoken_content=True. Buffer: '{self.processing_buffer}'")
                        arr = self.processing_buffer.split("<SPOKEN>")
                        if len(arr) > 1 and len(arr[-1]) > 0:
                            logger.debug(f"Passing spoken frame through: {arr[-1]}")
                            await self.push_frame(TTSTextFrame(text=arr[-1]))
                            self.spoken_content_state = SpokenContentState.SPOKEN

                elif self.spoken_content_state == SpokenContentState.PAUSED:
                    self.end_spoken_tag += frame.text
                    logger.debug(f"Currently streaming but PAUSED. Appending to end_spoken_tag. Current end_spoken_tag: '{self.end_spoken_tag}', incoming text: '{frame.text}'")
                    len_end_spoken_tag = len(self.end_spoken_tag)
                    if len_end_spoken_tag == 2 and self.end_spoken_tag == "</":
                        return
                    elif len_end_spoken_tag == 3 and self.end_spoken_tag == "</S":
                        return
                    elif len_end_spoken_tag == 4 and self.end_spoken_tag == "</SP":
                        return
                    elif len_end_spoken_tag == 5 and self.end_spoken_tag == "</SPO":
                        return
                    elif len_end_spoken_tag == 6 and self.end_spoken_tag == "</SPOK":
                        return
                    elif len_end_spoken_tag == 7 and self.end_spoken_tag == "</SPOKE":
                        return
                    elif len_end_spoken_tag == 8 and self.end_spoken_tag == "</SPOKEN" or  "</SPOKEN>" in self.end_spoken_tag:
                        self.end_spoken_tag = ""
                        self.spoken_content_state = SpokenContentState.COMPLETE
                        return
                    else:
                        logger.debug(f"Passing spoken frame through as we paused for no reason: {self.end_spoken_tag}")
                        self.spoken_content_state = SpokenContentState.SPOKEN
                        await self.push_frame(TTSTextFrame(text=self.end_spoken_tag))
                        self.end_spoken_tag = ""                
                elif self.spoken_content_state == SpokenContentState.SPOKEN:
                    if "<" not in frame.text or "</" not in frame.text:
                        logger.debug(f"Passing spoken frame through: {frame.text}")
                        await self.push_frame(frame)
                    else:
                        self.spoken_content_state = SpokenContentState.PAUSED
                        start_index_for_text = 0
                        # Check if the frame ends with < or </ and is more than 2 characters long
                        if len(frame.text) > 2 and (frame.text.endswith("<") or frame.text.endswith("</")):
                            # Extract all text except the last 1 or 2 characters
                            text_to_speak = frame.text[:-1] if frame.text.endswith("<") else frame.text[:-2]
                            start_index_for_text =  len(text_to_speak)
                            logger.debug(f"Sending partial text to TTS before pause: {text_to_speak}")
                            await self.push_frame(TTSTextFrame(text=text_to_speak))
                        self.end_spoken_tag += frame.text[start_index_for_text:]
                
                if "<DISPLAY>" in self.processing_buffer and "</DISPLAY>" in self.processing_buffer and "</RESPONSE>" in self.processing_buffer:
                    logger.debug(f"Processing full response for display: {self.processing_buffer[:200]}...")
                    await self._remove_display_content_and_send(self.processing_buffer)
                    self.processing_buffer = ""
                    self.spoken_content_state = SpokenContentState.NOT_STARTED
            

        # Build the pipeline with XmlSplitProcessor after the LLM service
        pipeline = Pipeline(
            [
                pipecat_transport.input(),
                rtvi,
                stt,  # Speech-To-Text
                context_aggregator.user(),
                llm,  # LLM service
                XmlSplitProcessor(self.display_queue),
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
