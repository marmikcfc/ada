# Changelog

All notable changes to the Genux SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-19

### 🎉 Added

#### **Component Override System**
- **NEW**: Complete component override system allowing replacement of any UI component
- **NEW**: `ComponentOverrides` interface with support for all major components:
  - `ChatButton` - Replace floating chat button/bubble
  - `ChatWindow` - Replace entire chat interface
  - `ChatMessage` - Replace individual message bubbles  
  - `ChatComposer` - Replace message input area
  - `VoiceButton` - Replace voice toggle button
- **NEW**: `components` prop in `GenuxOptions` for passing component overrides
- **NEW**: Cascading component overrides through component hierarchy
- **NEW**: Type-safe component props interfaces for all overrideable components

#### **Default Component Exports**
- **NEW**: `DefaultChatButton` export for extending default button
- **NEW**: `DefaultChatWindow` export for extending default window  
- **NEW**: `DefaultChatMessage` export for extending default messages
- **NEW**: `DefaultChatComposer` export for extending default composer
- **NEW**: `DefaultBubbleWidget` export for extending default bubble
- **NEW**: `/components/defaults/` module with all default implementations
- **NEW**: Extended prop interfaces: `ExtendedChatWindowProps`, `ExtendedChatComposerProps`, etc.

#### **Enhanced Thread Manager**
- **NEW**: Dedicated "New conversation" row at top of thread list
- **NEW**: Visual distinction with dashed border and plus icon for new conversation button
- **NEW**: "Creating conversation..." loading state display
- **NEW**: Automatic duplicate thread filtering to prevent multiple identical threads
- **NEW**: `hideHeader` prop in `ThreadManagerProps` for embedded usage scenarios
- **NEW**: Enhanced hover states and visual feedback for thread interactions

#### **Documentation & Examples**
- **NEW**: Comprehensive [Release Notes](./docs/genux-sdk-release-notes.md) with full v2.0 overview
- **NEW**: [Component Overrides Quick Start](./docs/genux-sdk-component-overrides-quick-start.md) guide
- **NEW**: Complete component override examples in customization guide
- **NEW**: Working example file `component-overrides.tsx` with full implementation
- **NEW**: Advanced patterns documentation (conditional overrides, theme integration)

### 🔧 Changed

#### **Component Architecture**
- **ENHANCED**: `Genux` component now resolves and applies component overrides
- **ENHANCED**: `ChatWindow` component accepts and passes through `componentOverrides` prop
- **ENHANCED**: `CustomChatComposer` component supports `VoiceButton` overrides
- **ENHANCED**: All components now support cascading override system

#### **Thread Manager Improvements**
- **IMPROVED**: Thread list now shows "New conversation" as first item instead of header button
- **IMPROVED**: Removed duplicate "New" button from header to avoid UI confusion
- **IMPROVED**: Thread filtering prevents duplicate entries from appearing
- **IMPROVED**: Better visual hierarchy with dedicated space for creating conversations

#### **Type System Enhancements**
- **ENHANCED**: `GenuxOptions` interface includes `components` property
- **ENHANCED**: `ThreadManagerProps` interface includes `hideHeader` property
- **ENHANCED**: `ExtendedChatComposerProps` interface includes `componentOverrides` property
- **ENHANCED**: All component prop interfaces exported for external use

#### **Documentation Updates**
- **UPDATED**: Main README with v2.0 features and component override examples
- **UPDATED**: Customization guide with complete component override documentation
- **UPDATED**: API reference with new interfaces and prop definitions
- **ENHANCED**: Examples with real-world implementation patterns

### 🐛 Fixed

#### **UI/UX Issues**
- **FIXED**: Duplicate "Conversations" headers in thread manager sidebar
- **FIXED**: Confusing UI with multiple new conversation buttons
- **FIXED**: Thread list showing duplicate conversation entries
- **FIXED**: Inconsistent visual hierarchy in thread management interface

#### **Component Issues**
- **FIXED**: Missing prop forwarding for component overrides
- **FIXED**: TypeScript errors when using custom components
- **FIXED**: Improper component resolution in override system

### 📦 Package Changes

#### **New Exports**
```tsx
// Component overrides
export { ComponentOverrides } from './types';

// Default components  
export {
  DefaultChatButton,
  DefaultChatWindow,
  DefaultChatMessage,
  DefaultChatComposer,
  DefaultBubbleWidget,
} from './components/defaults';

// Extended prop types
export type {
  ExtendedChatWindowProps,
  ExtendedChatComposerProps, 
  ExtendedChatMessageProps,
  BubbleWidgetProps,
} from './components/defaults';
```

#### **Enhanced Interfaces**
```tsx
// GenuxOptions with component overrides
interface GenuxOptions {
  components?: Partial<ComponentOverrides>;
  // ... existing options
}

// ComponentOverrides interface
interface ComponentOverrides {
  ChatButton: React.ComponentType<ChatButtonProps>;
  ChatWindow: React.ComponentType<ChatWindowProps>;
  ChatMessage: React.ComponentType<ChatMessageProps>;
  ChatComposer: React.ComponentType<ChatComposerProps>;
  VoiceButton: React.ComponentType<VoiceButtonProps>;
}

// ThreadManagerProps with header control
interface ThreadManagerProps {
  hideHeader?: boolean;
  // ... existing props
}
```

### 🚀 Migration Guide

#### **From 1.x to 2.0**

**✅ No Breaking Changes** - All existing code continues to work unchanged.

**New Optional Features:**
1. **Add component overrides** for custom styling:
   ```tsx
   <Genux options={{ components: { ChatButton: MyButton } }} />
   ```

2. **Use enhanced thread manager** (automatic improvements):
   ```tsx
   <Genux showThreadManager={true} /> // Improved automatically
   ```

3. **Access default components** for extending:
   ```tsx
   import { DefaultChatButton } from 'genux-sdk';
   ```

### 🎯 Examples Added

#### **Complete Custom Interface**
- Gradient chat button with hover animations
- Dark-themed chat window with custom styling  
- Animated message bubbles with streaming indicators
- Enhanced composer with emoji support
- Custom voice button with state animations

#### **Extending Default Components**
- Notification badge overlay on default button
- Timestamp wrapper for default messages
- Theme-aware component implementations

#### **Advanced Patterns**
- Conditional component selection based on user role/device
- Multiple override sets for different themes
- Integration with external theme systems

---

### 🔮 Coming Next

- **Draggable chat window functionality**
- **ShadCN design system integration** 
- **Enhanced mobile component optimizations**
- **More granular customization hooks**
- **Performance optimizations for large thread lists**

---

### 📚 Resources

- **[Release Notes](./docs/genux-sdk-release-notes.md)** - Complete feature overview
- **[Quick Start](./docs/genux-sdk-component-overrides-quick-start.md)** - Get started in 5 minutes
- **[Customization Guide](./docs/genux-sdk-customization.md)** - Complete customization documentation
- **[Examples](./docs/genux-sdk-examples.md)** - Real-world implementation patterns

---

*For questions or support, check our [Troubleshooting Guide](./docs/genux-sdk-troubleshooting.md) or review the examples for common patterns.* 