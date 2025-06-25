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

function App() {
  //const [greetMsg, setGreetMsg] = useState("");
  //const [name, setName] = useState("");

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <div className="App">
      {/* Render the interactive test page */}
      <TestPage />
    </div>
  );
}

export default App;
