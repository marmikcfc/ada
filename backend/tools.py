"""
Built-in tools for the GenUI SDK backend.
These are local Python functions that get integrated into the MCP client as available tools.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

# Google Images search - requires: pip install google-images-search
try:
    from google_images_search import GoogleImagesSearch
    GOOGLE_IMAGES_AVAILABLE = True
except ImportError:
    GOOGLE_IMAGES_AVAILABLE = False
    logging.warning("google-images-search not available. Install with: pip install google-images-search")

logger = logging.getLogger(__name__)

@dataclass
class ImageSearchResult:
    """Result from image search."""
    url: str
    title: str
    alt_text: str
    width: Optional[int] = None
    height: Optional[int] = None

class ImageSearchTool:
    """Google Images search tool."""
    
    def __init__(self):
        """Initialize the image search tool."""
        self.gis = None
        if GOOGLE_IMAGES_AVAILABLE:
            # Get API credentials from environment
            api_key = os.getenv('GOOGLE_API_KEY')
            cse_id = os.getenv('GOOGLE_CSE_ID')
            
            if api_key and cse_id:
                try:
                    self.gis = GoogleImagesSearch(api_key, cse_id)
                    logger.info("Google Images Search initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize Google Images Search: {e}")
                    self.gis = None
            else:
                logger.warning("GOOGLE_API_KEY or GOOGLE_CSE_ID not set in environment")
    
    async def get_image_src(self, alt_text: str, size: str = "medium") -> str:
        """
        Get the image src URL for the given alt text.
        
        Args:
            alt_text: The alt text/search query for the image
            size: Image size filter ('small', 'medium', 'large', 'xlarge')
            
        Returns:
            The URL of the first matching image
        """
        if not self.gis:
            raise RuntimeError("Google Images Search not available. Check API credentials.")
        
        try:
            # Search parameters
            search_params = {
                'q': alt_text,
                'num': 1,
                'fileType': 'jpg|png|gif|bmp|svg',
                'safe': 'active',
                'imgSize': size.upper() if size in ['small', 'medium', 'large', 'xlarge'] else 'MEDIUM'
            }
            
            # Perform search
            self.gis.search(search_params=search_params)
            
            # Get results
            if self.gis.results():
                first_result = self.gis.results()[0]
                logger.info(f"Found image for '{alt_text}': {first_result.url}")
                return first_result.url
            else:
                logger.warning(f"No images found for '{alt_text}'")
                return ""
                
        except Exception as e:
            logger.error(f"Error searching for images with query '{alt_text}': {e}")
            raise RuntimeError(f"Image search failed: {str(e)}")
    
    async def get_images(self, alt_text: str, size: str = "medium", num_results: int = 5) -> List[ImageSearchResult]:
        """
        Get multiple images for the given alt text.
        
        Args:
            alt_text: The alt text/search query for images
            size: Image size filter ('small', 'medium', 'large', 'xlarge')
            num_results: Number of results to return (max 10)
            
        Returns:
            List of ImageSearchResult objects
        """
        if not self.gis:
            raise RuntimeError("Google Images Search not available. Check API credentials.")
        
        try:
            # Limit results to reasonable number
            num_results = min(num_results, 10)
            
            # Search parameters
            search_params = {
                'q': alt_text,
                'num': num_results,
                'fileType': 'jpg|png|gif|bmp|svg',
                'safe': 'active',
                'imgSize': size.upper() if size in ['small', 'medium', 'large', 'xlarge'] else 'MEDIUM'
            }
            
            # Perform search
            self.gis.search(search_params=search_params)
            
            # Convert results
            results = []
            for result in self.gis.results():
                image_result = ImageSearchResult(
                    url=result.url,
                    title=getattr(result, 'title', '') or alt_text,
                    alt_text=alt_text,
                    width=getattr(result, 'width', None),
                    height=getattr(result, 'height', None)
                )
                results.append(image_result)
            
            logger.info(f"Found {len(results)} images for '{alt_text}'")
            return results
            
        except Exception as e:
            logger.error(f"Error searching for images with query '{alt_text}': {e}")
            raise RuntimeError(f"Image search failed: {str(e)}")

# Global instance
_image_search_tool = ImageSearchTool()

# Direct function exports for easy integration
async def get_image_src(alt_text: str, size: str = "medium") -> str:
    """Direct function to get single image URL."""
    return await _image_search_tool.get_image_src(alt_text, size)

async def get_images(alt_text: str, size: str = "medium", num_results: int = 5) -> List[Dict[str, Any]]:
    """Direct function to get multiple images as dict list."""
    results = await _image_search_tool.get_images(alt_text, size, num_results)
    return [
        {
            "url": result.url,
            "title": result.title,
            "alt_text": result.alt_text,
            "width": result.width,
            "height": result.height
        }
        for result in results
    ]