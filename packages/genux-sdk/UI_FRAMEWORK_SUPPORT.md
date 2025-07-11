# UI Framework Support Documentation

## Overview

GenUX SDK supports generating UI content optimized for different CSS frameworks (Tailwind, Chakra UI, Material UI, etc.) without requiring complex adapters. The backend generates framework-specific HTML with appropriate classes, and the frontend renders it directly.

## Architecture

```
┌─────────────────────────────────────┐
│          User's Application          │
│   (Has Tailwind/Chakra/etc. setup)  │
│                                      │
│  import { Genux } from 'genux-sdk'   │
│  <Genux uiFramework="tailwind" />   │
└─────────────────────────────────────┘
                 │ Sends framework preference
                 ▼
┌─────────────────────────────────────┐
│            GenUX SDK                 │
│                                      │
│  • FlexibleContentRenderer          │
│  • Global interaction handlers       │
│  • Framework preference passing     │
└─────────────────────────────────────┘
                 │ WebSocket + headers
                 ▼
┌─────────────────────────────────────┐
│             Backend                  │
│                                      │
│  • UIStyleGenerator                  │
│  • Framework-aware LLM prompts      │
│  • Class generation utilities       │
└─────────────────────────────────────┘
```

## Usage

### 1. Frontend Setup

```typescript
import { Genux } from 'genux-sdk';

function App() {
  return (
    <Genux
      webrtcURL="/api/offer"
      websocketURL="/ws/messages"
      options={{
        uiFramework: 'tailwind',  // or 'chakra', 'mui', 'antd', 'inline'
        // ... other options
      }}
    />
  );
}
```

### 2. Backend Response Format

The backend generates HTML with framework-specific classes:

```python
# Backend example
def generate_form_ui(framework='tailwind'):
    if framework == 'tailwind':
        return {
            "type": "text_chat_response",
            "htmlContent": """
            <div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">User Preferences</h2>
                <form id="user-prefs-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input 
                            type="email" 
                            name="email"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Theme Preference
                        </label>
                        <select 
                            name="theme"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>
                    <button 
                        type="submit"
                        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs-form')"
                    >
                        Save Preferences
                    </button>
                </form>
            </div>
            """,
            "contentType": "html"
        }
    
    elif framework == 'chakra':
        return {
            "type": "text_chat_response",
            "htmlContent": """
            <div data-chakra-component="Box" style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 24px;">
                <h2 data-chakra-component="Heading" style="font-size: 24px; font-weight: bold; color: #1a202c; margin-bottom: 16px;">
                    User Preferences
                </h2>
                <form id="user-prefs-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div data-chakra-component="FormControl">
                        <label data-chakra-component="FormLabel" style="font-size: 14px; font-weight: 500; color: #4a5568; margin-bottom: 4px; display: block;">
                            Email Address
                        </label>
                        <input 
                            type="email" 
                            name="email"
                            data-chakra-component="Input"
                            style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; transition: border-color 0.2s;"
                            placeholder="you@example.com"
                        />
                    </div>
                    <button 
                        type="submit"
                        data-chakra-component="Button"
                        style="width: 100%; background: #3182ce; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; transition: background-color 0.2s;"
                        onclick="window.genuxSDK.handleFormSubmit(event, 'user-prefs-form')"
                    >
                        Save Preferences
                    </button>
                </form>
            </div>
            """,
            "contentType": "html"
        }
```

### 3. Interaction Handling

Interactive elements use global handlers:

```html
<!-- Form submission -->
<form onsubmit="window.genuxSDK.handleFormSubmit(event, 'form-id')">
  <!-- form fields -->
</form>

<!-- Button clicks -->
<button onclick="window.genuxSDK.handleButtonClick(event, 'action-type', {key: 'value'})">
  Click me
</button>

<!-- Input changes (for real-time updates) -->
<input onchange="window.genuxSDK.handleInputChange(event, 'field-name')" />
```

## Frontend Implementation Requirements

### 1. Update GenuxProps Interface

```typescript
// In src/types/index.ts
export interface GenuxOptions {
  // ... existing options
  
  /** UI framework preference for backend-generated content */
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'antd' | 'bootstrap' | 'inline';
  
  /** Custom interaction handlers */
  onFormSubmit?: (formId: string, formData: FormData) => void;
  onButtonClick?: (actionType: string, context: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
}
```

### 2. Update ConnectionService

```typescript
// In src/core/ConnectionService.ts
export class ConnectionService extends EventEmitter {
  private uiFramework: string = 'inline';
  
  constructor(websocketURL: string, webrtcURL?: string, options: ConnectionOptions = {}) {
    super();
    this.websocketURL = websocketURL;
    this.webrtcURL = webrtcURL;
    this.uiFramework = options.uiFramework || 'inline';
    // ... existing constructor code
    
    // Setup global interaction handlers
    this.setupGlobalHandlers();
  }
  
  private async connectWebSocket(): Promise<void> {
    try {
      this.webSocket = new WebSocket(this.websocketURL);
      
      // Send UI framework preference in connection message
      this.webSocket.onopen = () => {
        console.log(`[WS:${this.wsConnectionId}] Connected to WebSocket`);
        this.setConnectionState('connected');
        
        // Send framework preference
        this.send({
          type: 'client_config',
          uiFramework: this.uiFramework
        });
        
        this.emit(ConnectionEvent.CONNECTED);
      };
      
      // ... rest of existing code
    } catch (error) {
      // ... existing error handling
    }
  }
  
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;
    
    // Create global genuxSDK object
    (window as any).genuxSDK = {
      handleFormSubmit: this.handleFormSubmit.bind(this),
      handleButtonClick: this.handleButtonClick.bind(this),
      handleInputChange: this.handleInputChange.bind(this),
      sendInteraction: this.sendInteraction.bind(this)
    };
  }
  
  private handleFormSubmit(event: Event, formId: string): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Convert FormData to object
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    this.sendInteraction('form_submit', {
      formId,
      formData: data,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.options.onFormSubmit) {
      this.options.onFormSubmit(formId, formData);
    }
  }
  
  private handleButtonClick(event: Event, actionType: string, context: any = {}): void {
    event.preventDefault();
    
    this.sendInteraction('button_click', {
      actionType,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.options.onButtonClick) {
      this.options.onButtonClick(actionType, context);
    }
  }
  
  private handleInputChange(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    
    this.sendInteraction('input_change', {
      fieldName,
      value,
      timestamp: new Date().toISOString()
    });
    
    // Call custom handler if provided
    if (this.options.onInputChange) {
      this.options.onInputChange(fieldName, value);
    }
  }
  
  private sendInteraction(type: string, context: any): void {
    this.send({
      type: 'user_interaction',
      interactionType: type,
      context
    });
  }
}
```

### 3. Update Genux Component

```typescript
// In src/components/Genux.tsx
export default function Genux({
  webrtcURL,
  websocketURL,
  bubbleEnabled = true,
  showThreadManager = false,
  allowFullScreen = false,
  disableVoice = false,
  options = {}
}: GenuxProps) {
  // ... existing code
  
  // Pass uiFramework to connection service
  const connectionOptions = {
    uiFramework: options.uiFramework,
    onFormSubmit: options.onFormSubmit,
    onButtonClick: options.onButtonClick,
    onInputChange: options.onInputChange,
    // ... other options
  };
  
  // ... rest of existing component code
}
```

### 4. Enhanced FlexibleContentRenderer

The existing FlexibleContentRenderer already supports HTML content, but we should ensure it handles the framework-specific HTML properly:

```typescript
// In src/components/core/FlexibleContentRenderer.tsx
export const FlexibleContentRenderer: React.FC<FlexibleContentRendererProps> = ({
  content,
  c1Content,
  htmlContent,
  reactContent,
  contentType = 'auto',
  onC1Action,
  isStreaming = false,
  crayonTheme = {},
  allowDangerousHtml = false,
  htmlSanitizeOptions = {}
}) => {
  // ... existing code for content type detection
  
  // For HTML content, preserve framework classes
  case 'html':
    const html = htmlContent || content || '';
    const processedHtml = sanitizeHtml(html);
    
    return (
      <div 
        className="genux-html-content genux-framework-content"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
    
  // ... rest of existing code
};
```

### 5. Backend Message Protocol

The backend should send framework-optimized content:

```python
# Backend integration example
class GenuxBackend:
    def __init__(self):
        self.ui_framework = 'inline'  # Default
    
    async def handle_client_config(self, message):
        """Handle client configuration including UI framework preference"""
        self.ui_framework = message.get('uiFramework', 'inline')
        logger.info(f"Client UI framework set to: {self.ui_framework}")
    
    def generate_ui_response(self, content_description):
        """Generate UI optimized for the client's framework"""
        generator = UIStyleGenerator(self.ui_framework)
        return generator.create_html(content_description)

class UIStyleGenerator:
    def __init__(self, framework='inline'):
        self.framework = framework
    
    def create_button(self, text, variant='primary', action=None):
        if self.framework == 'tailwind':
            base_classes = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2"
            variant_classes = {
                'primary': "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
                'secondary': "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
                'danger': "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            }
            classes = f"{base_classes} {variant_classes.get(variant, variant_classes['primary'])}"
            
            onclick = f"window.genuxSDK.handleButtonClick(event, '{action}', {{}})" if action else ""
            
            return f'<button class="{classes}" onclick="{onclick}">{text}</button>'
        
        elif self.framework == 'chakra':
            # Generate Chakra-style HTML with data attributes and inline styles
            styles = self.get_chakra_button_styles(variant)
            onclick = f"window.genuxSDK.handleButtonClick(event, '{action}', {{}})" if action else ""
            
            return f'<button data-chakra-component="Button" style="{styles}" onclick="{onclick}">{text}</button>'
        
        else:
            # Inline styles fallback
            styles = self.get_inline_button_styles(variant)
            onclick = f"window.genuxSDK.handleButtonClick(event, '{action}', {{}})" if action else ""
            
            return f'<button style="{styles}" onclick="{onclick}">{text}</button>'
```

## Testing the Implementation

### 1. Test with Different Frameworks

```typescript
// Test with Tailwind
<Genux 
  options={{ uiFramework: 'tailwind' }}
  websocketURL="/ws/messages"
/>

// Test with inline styles
<Genux 
  options={{ uiFramework: 'inline' }}
  websocketURL="/ws/messages"
/>
```

### 2. Test Interactions

Type "html" in chat and verify:
1. HTML renders with correct framework classes
2. Button clicks send proper interaction messages
3. Form submissions collect and send form data
4. Real-time input changes work (if implemented)

### 3. Verify Backend Integration

Check that backend receives:
```json
{
  "type": "client_config",
  "uiFramework": "tailwind"
}
```

And interaction messages:
```json
{
  "type": "user_interaction",
  "interactionType": "form_submit",
  "context": {
    "formId": "user-prefs-form",
    "formData": {
      "email": "user@example.com",
      "theme": "dark"
    },
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

## Interactive Elements & Context Collection

### Smart Interaction System

GenUX supports rich interactions similar to C1Components but works with any UI framework. The system automatically collects relevant context and sends it to the backend.

#### Basic Usage

```html
<!-- Backend generates HTML with data-action attributes -->
<form id="user-prefs-form">
  <input name="email" type="email" placeholder="Email" />
  <select name="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
  <button type="submit" data-action="save_preferences">
    Save
  </button>
</form>

<!-- Button with explicit context -->
<button 
  data-action="reset_preferences" 
  data-context='{"confirmRequired": true}'
>
  Reset to Defaults
</button>

<!-- Real-time interactions -->
<input 
  name="search" 
  data-action="search_live"
  data-trigger="input"
  data-debounce="300"
  placeholder="Search as you type..."
/>
```

#### Automatic Context Collection

The SDK automatically collects rich context for each interaction:

```json
{
  "type": "user_interaction",
  "action": "save_preferences",
  "context": {
    "timestamp": "2024-01-20T10:30:00Z",
    "elementType": "button",
    "formData": {
      "email": "user@example.com",
      "theme": "dark"
    },
    "formId": "user-prefs-form",
    "clickPosition": { "x": 245, "y": 180 }
  }
}
```

#### Advanced Interaction Features

**1. Real-time Interactions**
```html
<!-- Live preview -->
<input 
  data-action="live_preview"
  data-trigger="input"
  data-debounce="500"
/>

<!-- Auto-save -->
<textarea 
  data-action="save_draft"
  data-trigger="input"
  data-debounce="2000"
></textarea>
```

**2. Conditional Actions**
```html
<!-- Only enabled when form is valid -->
<button 
  data-action="submit_order"
  data-condition="form-valid"
  data-context='{"requiresConfirmation": true}'
>
  Place Order
</button>
```

**3. File Upload Support**
```html
<input 
  type="file"
  data-action="upload_document"
  data-context='{"allowedTypes": ["pdf", "doc"], "maxSize": "10MB"}'
  accept=".pdf,.doc,.docx"
/>
```

**4. Multi-step Workflows**
```html
<button 
  data-action="next_step"
  data-context='{"currentStep": 1, "totalSteps": 3, "stepData": {"name": "value"}}'
>
  Next: Review Order
</button>
```

#### Backend Integration

```python
class InteractionHandler:
    async def handle_user_interaction(self, message):
        action = message.get("action")
        context = message.get("context", {})
        
        if action == "save_preferences":
            form_data = context.get("formData", {})
            user_id = context.get("userId")
            
            # Process the data
            await self.save_user_preferences(user_id, form_data)
            
            # Send response with UI updates
            return {
                "type": "text_chat_response",
                "content": f"✅ Preferences saved! Theme: {form_data.get('theme')}",
                "uiUpdates": [
                    {
                        "selector": "#save-btn",
                        "property": "disabled", 
                        "value": True,
                        "duration": 2000
                    }
                ]
            }
            
        elif action == "search_live":
            search_term = context.get("value", "")
            results = await self.search_products(search_term)
            
            return {
                "type": "text_chat_response",
                "htmlContent": self.render_search_results(results),
                "targetSelector": "#search-results"
            }
```

#### Context Collection Details

The interaction system automatically collects:

- **Form Data**: All form fields when interacting with form elements
- **Element Info**: Type, name, value, position
- **Event Data**: Click position, key pressed, etc.
- **Custom Context**: From `data-context` attributes
- **Timing**: Timestamp and debouncing for real-time interactions

### Supported Interaction Types

| Trigger | Description | Use Cases |
|---------|-------------|-----------|
| `click` | Button/link clicks (default) | Submit, navigate, toggle |
| `submit` | Form submissions | Save data, search, login |
| `change` | Input value changes | Dropdowns, checkboxes |
| `input` | Real-time text input | Live search, auto-save |
| `focus` | Element gains focus | Load data, show help |
| `blur` | Element loses focus | Validate, save draft |

### Data Attributes Reference

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-action` | Action name to send to backend | `"save_preferences"` |
| `data-context` | Additional context as JSON | `'{"type": "urgent"}'` |
| `data-trigger` | Event type (default: click) | `"input"`, `"change"` |
| `data-debounce` | Delay in ms for real-time events | `"300"` |
| `data-condition` | Condition for enabling action | `"form-valid"` |

## Implementation Status ✅

All features have been successfully implemented:

1. ✅ **Types**: Added `uiFramework`, `onFormSubmit`, `onButtonClick`, `onInputChange` to `GenuxOptions`
2. ✅ **ConnectionService**: 
   - Added framework preference transmission via `client_config` message
   - Implemented global `window.genuxSDK` handlers
   - Added `user_interaction` message sending
3. ✅ **Genux Component**: Passes all UI framework options through `useGenuxClient` to ConnectionService
4. ✅ **FlexibleContentRenderer**: 
   - Enhanced to preserve framework CSS classes
   - Added support for interaction attributes (`onclick`, `onsubmit`, etc.)
   - Enabled `data-*` attributes for framework components
5. ✅ **Backend Integration**: 
   - Added `client_config` handler for framework preference
   - Added `user_interaction` handler with responses
   - Updated debug route with "form" and "list" test cases
6. ✅ **Demo**: Created comprehensive UIFrameworkDemo showing all features

## Current Implementation Details

### Frontend Changes

**ConnectionService.ts**
- Added `setupGlobalHandlers()` to create `window.genuxSDK` object
- Implemented `handleFormSubmit()`, `handleButtonClick()`, `handleInputChange()`
- Sends `client_config` on WebSocket connection
- Sends `user_interaction` messages with full context

**FlexibleContentRenderer.tsx**
- Updated allowed attributes to include event handlers
- Enabled `ALLOW_DATA_ATTR: true` in DOMPurify config
- Added `genux-framework-content` CSS class for styling

**GenuxOptions Interface**
```typescript
{
  uiFramework?: 'tailwind' | 'chakra' | 'mui' | 'antd' | 'bootstrap' | 'inline';
  onFormSubmit?: (formId: string, formData: FormData) => void;
  onButtonClick?: (actionType: string, context: any) => void;
  onInputChange?: (fieldName: string, value: any) => void;
}
```

### Backend Changes

**chat.py Debug Route**
- Added "form" case: Registration form with all input types
- Added "list" case: Clickable action list with context
- Both use inline styles for testing

**WebSocket Handler**
- Handles `client_config` messages and logs framework preference
- Handles `user_interaction` messages with three types:
  - `form_submit`: Returns success with submitted data
  - `button_click`: Returns action confirmation
  - `input_change`: Logs changes (no response by default)

### Testing the Implementation

1. **Run the Example App**: `pnpm dev` in `/example`
2. **Select UI Framework Demo**: From the demo router
3. **Test Framework Selection**: Choose inline/Tailwind/Chakra
4. **Test Interactions**:
   - Type "form" → Fill and submit → See data echoed back
   - Type "list" → Click items → See action confirmations
   - Check browser console for all events

### Global SDK Methods

```javascript
window.genuxSDK = {
  handleFormSubmit: (event, formId) => { /* ... */ },
  handleButtonClick: (event, actionType, context) => { /* ... */ },
  handleInputChange: (event, fieldName) => { /* ... */ },
  sendInteraction: (type, context) => { /* ... */ }
}
```

The implementation is complete and ready for production use!