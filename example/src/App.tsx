import "./App.css";
import DemoRouter from "./DemoRouter";
import "@crayonai/react-ui/styles/index.css";

/**
 * Main App component now showcases the 4 supported use cases
 * through an interactive demo router. Users can explore:
 * 
 * 1. SaaS Onboarding Widget - Floating widget for customer support
 * 2. Chat-Only Interface - Embedded text chat without voice
 * 3. Voice Bot Experience - Voice-focused with fullscreen mode  
 * 4. Custom UI Design - Complete component customization
 * 
 * Each demo shows real implementation code and working examples.
 */

function App() {
  return (
    <div className="App">
      <DemoRouter />
    </div>
  );
}

export default App;