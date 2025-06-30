# Myna SDK Documentation

Welcome to the comprehensive documentation for Myna SDK - a lightweight, fully-customizable JavaScript/TypeScript SDK for voice and chat interfaces.

## 📚 Documentation Overview

| Guide | Description | Best For |
|-------|-------------|----------|
| [**Getting Started**](./myna-sdk-getting-started.md) | Installation, quick setup, and basic concepts | New users, first-time integration |
| [**API Reference**](./myna-sdk-api-reference.md) | Complete component and hook documentation | Developers implementing features |
| [**Customization Guide**](./myna-sdk-customization.md) | Theming, styling, and component overrides | Design customization, branding |
| [**Examples**](./myna-sdk-examples.md) | Real-world implementation patterns | Learning from practical use cases |
| [**Troubleshooting**](./myna-sdk-troubleshooting.md) | Common issues and solutions | Debugging and problem-solving |

---

## 🚀 Quick Navigation

### For Beginners
1. Start with **[Getting Started](./myna-sdk-getting-started.md)** for installation and basic setup
2. Try the **[Quick Start examples](./myna-sdk-getting-started.md#quick-start)** to see Myna in action
3. Explore **[Basic Examples](./myna-sdk-examples.md#quick-start-examples)** for common patterns

### For Developers
1. Check the **[API Reference](./myna-sdk-api-reference.md)** for complete component documentation
2. Review **[Real-world Examples](./myna-sdk-examples.md)** for your specific use case
3. Use **[Troubleshooting](./myna-sdk-troubleshooting.md)** when you encounter issues

### For Designers
1. Read the **[Customization Guide](./myna-sdk-customization.md)** for theming and styling
2. See **[Theme Examples](./myna-sdk-customization.md#custom-themes)** for inspiration
3. Learn about **[Component Overrides](./myna-sdk-customization.md#component-customization)** for deep customization

---

## 🎯 Use Case Quick Links

### **E-commerce Integration**
- [Customer Support Widget](./myna-sdk-examples.md#e-commerce-integration)
- [Product Recommendation Bot](./myna-sdk-examples.md#product-recommendation-bot)
- [E-commerce Theming](./myna-sdk-customization.md#real-world-examples)

### **SaaS Applications**
- [In-App Help Assistant](./myna-sdk-examples.md#saas-application-support)
- [Onboarding Coach](./myna-sdk-examples.md#onboarding-coach)
- [Dashboard Integration](./myna-sdk-customization.md#dashboard-integration)

### **Educational Platforms**
- [Learning Assistant](./myna-sdk-examples.md#educational-platform)
- [Interactive Tutoring](./myna-sdk-examples.md#learning-assistant)

### **Healthcare**
- [Patient Support Chat](./myna-sdk-examples.md#healthcare-assistance)
- [Medical Assistant Integration](./myna-sdk-examples.md#patient-support-chat)

---

## 🛠️ Technical Architecture

Myna SDK provides three levels of integration:

### 1. **Drop-in Widget** (Easiest)
```tsx
<Myna
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
/>
```
Perfect for: Quick integration, basic chat support

### 2. **Themed Components** (Customizable)
```tsx
<Myna
  webrtcURL="/api/offer"
  websocketURL="wss://api.example.com/ws/messages"
  options={{
    theme: createTheme({ colors: { primary: '#6366f1' } }),
    agentName: "Support Bot",
  }}
/>
```
Perfect for: Brand consistency, themed interfaces

### 3. **Headless/Custom** (Full Control)
```tsx
const client = useMynaClient({
  webrtcURL: '/api/offer',
  websocketURL: 'wss://api.example.com/ws/messages',
});
// Build any UI you want...
```
Perfect for: Custom UIs, unique experiences

---

## 🔧 Key Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **🎙️ Voice Chat** | Real-time voice input and audio responses | [Voice Setup](./myna-sdk-getting-started.md#voice-features) |
| **💬 Text Chat** | Traditional chat with streaming responses | [Chat Interface](./myna-sdk-api-reference.md#chatwindow-) |
| **🎨 Theming** | Complete visual customization | [Theme System](./myna-sdk-customization.md#custom-themes) |
| **📱 Responsive** | Mobile-first, works everywhere | [Responsive Design](./myna-sdk-troubleshooting.md#responsive-issues) |
| **⚡ Real-time** | Live streaming with C1Components | [Streaming API](./myna-sdk-api-reference.md#streaming) |
| **🔧 Headless** | Build any UI with powerful hooks | [Headless Guide](./myna-sdk-customization.md#headless-custom-ui) |

---

## 📦 Package Information

- **Size:** ≤ 100KB gzipped
- **Dependencies:** React 16.8+
- **Browser Support:** Chrome, Firefox, Safari 15+, Edge
- **TypeScript:** Full type definitions included

---

## 🚨 Common Issues

| Issue | Quick Solution | Full Guide |
|-------|---------------|------------|
| Widget not visible | Check z-index conflicts | [UI Issues](./myna-sdk-troubleshooting.md#ui-and-styling-issues) |
| Voice not working | Verify HTTPS and permissions | [Voice Problems](./myna-sdk-troubleshooting.md#voiceaudio-problems) |
| Connection fails | Check WebSocket URL format | [Connection Issues](./myna-sdk-troubleshooting.md#connection-issues) |
| Theme not applied | Verify theme prop placement | [Theme Issues](./myna-sdk-troubleshooting.md#theme-not-applied) |

---

## 💡 Migration & Upgrade Guides

### From Beta Versions
- [Breaking Changes](./myna-sdk-api-reference.md#migration)
- [New Features](./myna-sdk-getting-started.md#whats-new)

### Integration Patterns
- [Replace existing chat widgets](./myna-sdk-examples.md#integration-patterns)
- [Add to existing applications](./myna-sdk-examples.md#saas-application-support)

---

## 🤝 Community & Support

### Getting Help
1. **Documentation First:** Search these guides for your question
2. **GitHub Issues:** Report bugs and request features
3. **Community Discussions:** Share experiences and get help
4. **Examples Repository:** See working code examples

### Contributing
- Report issues with clear reproduction steps
- Suggest documentation improvements
- Share your integration stories and examples

---

## 📖 Additional Resources

### Backend Integration
- [Ada Backend Setup](./ada.md) - Configure your backend for Myna
- [API Endpoints](./myna-sdk-api-reference.md#connection-requirements) - Required backend endpoints

### Design Resources
- [Design System Guide](./NEWCOMER_DESIGN_GUIDE.md) - Design principles and patterns
- [Component Specs](./myna-prd_design.md) - Technical design document

### Development
- [SDK Architecture](./myna-prd_design.md#technical-design) - Internal architecture overview
- [Build Setup](./myna-sdk-troubleshooting.md#development-setup) - Development environment

---

## 🎯 Next Steps

**New to Myna?** → Start with [Getting Started](./myna-sdk-getting-started.md)

**Ready to customize?** → Check out [Customization Guide](./myna-sdk-customization.md)

**Need specific examples?** → Browse [Examples](./myna-sdk-examples.md)

**Having issues?** → See [Troubleshooting](./myna-sdk-troubleshooting.md)

**Want complete reference?** → Dive into [API Reference](./myna-sdk-api-reference.md)

---

**Happy building with Myna SDK! 🚀** 