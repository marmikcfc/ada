"""
HTML Template Generators for Different UI Frameworks

This module provides utilities to generate framework-specific HTML for simple responses,
avoiding the need to mix C1Components with HTML-based providers.
"""

from typing import Dict, Any


def create_simple_message_html(message: str, framework: str = "tailwind") -> str:
    """
    Create HTML for a simple text message using the specified UI framework.
    
    Args:
        message: The text message to display
        framework: UI framework ("tailwind", "shadcn", "inline")
    
    Returns:
        HTML string for the message
    """
    if framework == "tailwind":
        return f"""
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-2xl">
            <p class="text-gray-800 text-sm leading-relaxed">{message}</p>
        </div>
        """.strip()
    
    elif framework == "shadcn":
        return f"""
        <div class="rounded-lg border bg-card text-card-foreground shadow-sm max-w-2xl">
            <div class="p-4">
                <p class="text-sm text-muted-foreground leading-relaxed">{message}</p>
            </div>
        </div>
        """.strip()
    
    else:  # inline or unknown
        return f"""
        <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 640px;">
            <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">{message}</p>
        </div>
        """.strip()


def create_error_message_html(error_message: str, framework: str = "tailwind") -> str:
    """
    Create HTML for an error message using the specified UI framework.
    
    Args:
        error_message: The error message to display
        framework: UI framework ("tailwind", "shadcn", "inline")
    
    Returns:
        HTML string for the error message
    """
    if framework == "tailwind":
        return f"""
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">Processing Error</h3>
                    <p class="mt-1 text-sm text-red-700">{error_message}</p>
                </div>
            </div>
        </div>
        """.strip()
    
    elif framework == "shadcn":
        return f"""
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive max-w-2xl">
            <div class="p-4">
                <div class="flex items-start space-x-3">
                    <svg class="h-5 w-5 text-destructive mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                    <div>
                        <h3 class="font-medium text-sm">Processing Error</h3>
                        <p class="text-sm mt-1">{error_message}</p>
                    </div>
                </div>
            </div>
        </div>
        """.strip()
    
    else:  # inline or unknown
        return f"""
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; max-width: 640px;">
            <div style="display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; color: #dc2626;">⚠️</div>
                <div>
                    <h3 style="font-weight: 600; font-size: 14px; color: #991b1b; margin: 0 0 4px 0;">Processing Error</h3>
                    <p style="font-size: 14px; color: #dc2626; margin: 0; line-height: 1.5;">{error_message}</p>
                </div>
            </div>
        </div>
        """.strip()


def create_loading_message_html(message: str = "Processing...", framework: str = "tailwind") -> str:
    """
    Create HTML for a loading message using the specified UI framework.
    
    Args:
        message: The loading message to display
        framework: UI framework ("tailwind", "shadcn", "inline")
    
    Returns:
        HTML string for the loading message
    """
    if framework == "tailwind":
        return f"""
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-blue-700">{message}</p>
                </div>
            </div>
        </div>
        """.strip()
    
    elif framework == "shadcn":
        return f"""
        <div class="rounded-lg border border-blue-200 bg-blue-50 text-blue-900 max-w-2xl">
            <div class="p-4">
                <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p class="text-sm">{message}</p>
                </div>
            </div>
        </div>
        """.strip()
    
    else:  # inline or unknown
        return f"""
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; max-width: 640px;">
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 12px; color: #2563eb;">⏳</div>
                <p style="font-size: 14px; color: #1d4ed8; margin: 0; line-height: 1.5;">{message}</p>
            </div>
        </div>
        """.strip()


def escape_html(text: str) -> str:
    """
    Escape HTML special characters to prevent XSS.
    
    Args:
        text: Text to escape
        
    Returns:
        HTML-escaped text
    """
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;"))


def ensure_html_wrapped(html_content: str, framework: str = "tailwind") -> str:
    """
    Ensure HTML content is properly wrapped in a framework-appropriate container.
    
    Args:
        html_content: The HTML content to check and potentially wrap
        framework: UI framework ("tailwind", "shadcn", "chakra", "mui", "bootstrap", "inline")
        
    Returns:
        HTML content wrapped in appropriate container if needed
    """
    # Strip whitespace for checking
    content = html_content.strip()
    
    # If content is empty, return it as-is
    if not content:
        return content
    
    # Check if content already starts with a div or other block element
    # This is a simple check - content starting with these tags is likely already properly wrapped
    if content.lower().startswith(('<div', '<section', '<article', '<main', '<header', '<footer', '<aside', '<nav')):
        return content
    
    # Check if it's already a complete HTML structure
    if content.lower().startswith('<!doctype') or content.lower().startswith('<html'):
        return content
    
    # If it's inline content or fragment, wrap it appropriately
    return _wrap_html_fragment(content, framework)


def _wrap_html_fragment(html_fragment: str, framework: str) -> str:
    """
    Wrap HTML fragment in framework-appropriate container.
    
    Args:
        html_fragment: The HTML fragment to wrap
        framework: UI framework
        
    Returns:
        Wrapped HTML content
    """
    if framework == "tailwind":
        return f"""
        <div class="w-full max-w-4xl mx-auto p-4">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {html_fragment}
            </div>
        </div>
        """.strip()
    
    elif framework == "shadcn":
        return f"""
        <div class="w-full max-w-4xl mx-auto p-4">
            <div class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                {html_fragment}
            </div>
        </div>
        """.strip()
    
    elif framework == "chakra":
        return f"""
        <div class="chakra-container" style="width: 100%; max-width: 1024px; margin: 0 auto; padding: 16px;">
            <div class="chakra-box" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden;">
                {html_fragment}
            </div>
        </div>
        """.strip()
    
    elif framework == "mui":
        return f"""
        <div class="MuiContainer-root MuiContainer-maxWidthLg" style="width: 100%; max-width: 1024px; margin: 0 auto; padding: 16px;">
            <div class="MuiPaper-root MuiPaper-elevation1" style="background: white; border-radius: 8px; box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12); overflow: hidden;">
                {html_fragment}
            </div>
        </div>
        """.strip()
    
    elif framework == "bootstrap":
        return f"""
        <div class="container" style="max-width: 1024px;">
            <div class="card" style="border: 1px solid rgba(0,0,0,.125); border-radius: 0.375rem; background: white; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); overflow: hidden;">
                {html_fragment}
            </div>
        </div>
        """.strip()
    
    else:  # inline or unknown
        return f"""
        <div style="width: 100%; max-width: 1024px; margin: 0 auto; padding: 16px;">
            <div style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
                {html_fragment}
            </div>
        </div>
        """.strip()


def create_interactive_form_html(framework: str = "tailwind") -> str:
    """
    Create HTML for a sample interactive form (for testing).
    
    Args:
        framework: UI framework ("tailwind", "shadcn", "inline")
    
    Returns:
        HTML string for an interactive form
    """
    if framework == "tailwind":
        return """
        <div class="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-md">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Contact Form</h2>
            <form onsubmit="window.geuiSDK.handleFormSubmit(event, 'contact-form')">
                <div class="mb-4">
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" id="name" name="name" required 
                           onchange="window.geuiSDK.handleInputChange(event, 'name')"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                           placeholder="Your name">
                </div>
                <div class="mb-4">
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" id="email" name="email" required 
                           onchange="window.geuiSDK.handleInputChange(event, 'email')"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                           placeholder="your@email.com">
                </div>
                <div class="mb-6">
                    <label for="message" class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea id="message" name="message" rows="3" required
                              onchange="window.geuiSDK.handleInputChange(event, 'message')"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                              placeholder="Your message..."></textarea>
                </div>
                <button type="submit" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                    Send Message
                </button>
            </form>
        </div>
        """.strip()
    
    elif framework == "shadcn":
        return """
        <div class="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md">
            <div class="p-6">
                <h2 class="text-lg font-semibold mb-4">Contact Form</h2>
                <form onsubmit="window.geuiSDK.handleFormSubmit(event, 'contact-form')" class="space-y-4">
                    <div>
                        <label for="name" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                        <input type="text" id="name" name="name" required 
                               onchange="window.geuiSDK.handleInputChange(event, 'name')"
                               class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                               placeholder="Your name">
                    </div>
                    <div>
                        <label for="email" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                        <input type="email" id="email" name="email" required 
                               onchange="window.geuiSDK.handleInputChange(event, 'email')"
                               class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                               placeholder="your@email.com">
                    </div>
                    <div>
                        <label for="message" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Message</label>
                        <textarea id="message" name="message" rows="3" required
                                  onchange="window.geuiSDK.handleInputChange(event, 'message')"
                                  class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                  placeholder="Your message..."></textarea>
                    </div>
                    <button type="submit" 
                            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
                        Send Message
                    </button>
                </form>
            </div>
        </div>
        """.strip()
    
    else:  # inline
        return """
        <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 448px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px 0;">Contact Form</h2>
            <form onsubmit="window.geuiSDK.handleFormSubmit(event, 'contact-form')">
                <div style="margin-bottom: 16px;">
                    <label for="name" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">Name</label>
                    <input type="text" id="name" name="name" required 
                           onchange="window.geuiSDK.handleInputChange(event, 'name')"
                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;" 
                           placeholder="Your name">
                </div>
                <div style="margin-bottom: 16px;">
                    <label for="email" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">Email</label>
                    <input type="email" id="email" name="email" required 
                           onchange="window.geuiSDK.handleInputChange(event, 'email')"
                           style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;" 
                           placeholder="your@email.com">
                </div>
                <div style="margin-bottom: 24px;">
                    <label for="message" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">Message</label>
                    <textarea id="message" name="message" rows="3" required
                              onchange="window.geuiSDK.handleInputChange(event, 'message')"
                              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; box-sizing: border-box;" 
                              placeholder="Your message..."></textarea>
                </div>
                <button type="submit" 
                        style="width: 100%; background: #2563eb; color: white; font-weight: 500; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Send Message
                </button>
            </form>
        </div>
        """.strip()