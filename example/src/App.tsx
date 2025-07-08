import "./App.css";
/**
 * Import the demo page that lets us toggle between
 *  • bubbleEnabled = true  (floating widget)
 *  • bubbleEnabled = false (full-screen chat)
 *
 * TestPage lives next to this file so we can iterate quickly without
 * having to rebuild the SDK bundle each change.
 */
import TestPage from "./TestPage";
// import ExampleWithNewComponents from "./ExampleWithNewComponents";
import Genux from "../../packages/genux-sdk/src/components/Genux";
import "@crayonai/react-ui/styles/index.css";

function App() {
  //const [greetMsg, setGreetMsg] = useState("");
  //const [name, setName] = useState("");

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <div className="App">
      {/* New Component Architecture Demo */}
      {/* <ExampleWithNewComponents /> */}
      
      {/* Legacy demos - commented out to show new architecture */}
      <TestPage />
      
       {/* Original Genux SDK Component - Now uses new FloatingWidget internally */}
       <Genux
        webrtcURL="/api/offer"
        websocketURL="/ws/messages"
        bubbleEnabled={true}
        showThreadManager={true}
        allowFullScreen={true}
        options={{
          agentName: "Ada",
          agentSubtitle: "Your intelligent AI assistant",
          logoUrl: "/ada-brain-icon.svg",
          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          primaryColor: "#667eea",
          accentColor: "#5a67d8",
          threadManagerTitle: "Chat History",
          enableThreadManager: true,
          startCallButtonText: "🎤 Start Voice Chat",
          endCallButtonText: "🔇 End Voice Chat",
          connectingText: "Connecting to Ada...",
        }}
      />

    </div>
  );
}

export default App;
