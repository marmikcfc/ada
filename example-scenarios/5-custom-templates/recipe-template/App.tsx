import React, { useState, useEffect } from 'react';
import { useGenuxCore, GenuxCore, CustomTemplateRenderer } from 'genux-sdk';
import './App.css';

/**
 * Example 5a: Custom Template Rendering - Recipe Card
 * 
 * This demonstrates how to use Genux SDK with your own custom templates
 * instead of using the default C1Component rendering.
 * 
 * Features:
 * - Custom HTML template for recipe cards
 * - JSON data binding to template
 * - No dependency on C1Component
 * - Full control over styling and layout
 */
function App() {
  const [recipeQuery, setRecipeQuery] = useState('');
  
  // Define the HTML template for recipe cards
  const recipeTemplate = `
    <div class="recipe-card">
      <div class="recipe-image-container">
        <img src="{{image}}" alt="{{title}}" class="recipe-image" />
      </div>
      <div class="recipe-content">
        <h2 class="recipe-title">{{title}}</h2>
        <div class="recipe-meta">
          <span class="recipe-time">⏱️ {{cookTime}} mins</span>
          <span class="recipe-difficulty">{{difficulty}}</span>
          <span class="recipe-servings">🍽️ Serves {{servings}}</span>
        </div>
        <div class="recipe-description">{{description}}</div>
        
        <h3 class="recipe-section-title">Ingredients</h3>
        <ul class="recipe-ingredients">
          {{#each ingredients}}
            <li class="recipe-ingredient">{{amount}} {{unit}} {{name}}</li>
          {{/each}}
        </ul>
        
        <h3 class="recipe-section-title">Instructions</h3>
        <ol class="recipe-steps">
          {{#each steps}}
            <li class="recipe-step">{{this}}</li>
          {{/each}}
        </ol>
        
        <div class="recipe-tips">
          <h3 class="recipe-section-title">Tips</h3>
          <p>{{tips}}</p>
        </div>
      </div>
    </div>
  `;
  
  // Define the CSS for recipe cards
  const recipeStyles = `
    .recipe-card {
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background: white;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .recipe-image-container {
      height: 240px;
      overflow: hidden;
    }
    
    .recipe-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .recipe-content {
      padding: 24px;
    }
    
    .recipe-title {
      font-size: 24px;
      margin: 0 0 12px 0;
      color: #2d3748;
    }
    
    .recipe-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #4a5568;
    }
    
    .recipe-description {
      margin-bottom: 24px;
      line-height: 1.6;
      color: #4a5568;
    }
    
    .recipe-section-title {
      font-size: 18px;
      margin: 0 0 12px 0;
      color: #2d3748;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    
    .recipe-ingredients {
      margin: 0 0 24px 0;
      padding-left: 20px;
    }
    
    .recipe-ingredient {
      margin-bottom: 8px;
      color: #4a5568;
    }
    
    .recipe-steps {
      margin: 0 0 24px 0;
      padding-left: 20px;
    }
    
    .recipe-step {
      margin-bottom: 12px;
      line-height: 1.6;
      color: #4a5568;
    }
    
    .recipe-tips {
      background: #f7fafc;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }
    
    .recipe-tips p {
      margin: 0;
      color: #4a5568;
    }
  `;
  
  // Get core functionality from the hook
  const {
    // State
    messages,
    isLoading,
    
    // Actions
    sendText,
    
    // Custom template handling
    registerTemplate,
    getTemplateData,
  } = useGenuxCore({
    webrtcURL: '/api/webrtc',
    websocketURL: '/api/ws',
    templates: [
      {
        id: 'recipe',
        html: recipeTemplate,
        css: recipeStyles,
      }
    ]
  });
  
  // Register the template on mount
  useEffect(() => {
    registerTemplate('recipe', recipeTemplate, recipeStyles);
  }, [registerTemplate]);
  
  // Handle recipe search
  const handleRecipeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipeQuery.trim() && !isLoading) {
      // Send a special command to indicate we want a recipe response
      sendText(`[TEMPLATE:recipe] ${recipeQuery}`);
      setRecipeQuery('');
    }
  };
  
  // Get the latest recipe data if available
  const latestRecipeData = getTemplateData('recipe');
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Genux SDK - Custom Recipe Template</h1>
        <p>
          This example shows how to use custom HTML templates instead of C1Component
          for rendering structured data like recipes.
        </p>
      </header>
      
      <main className="app-content">
        {/* Recipe search form */}
        <form className="recipe-search-form" onSubmit={handleRecipeSearch}>
          <input
            type="text"
            className="recipe-search-input"
            value={recipeQuery}
            onChange={(e) => setRecipeQuery(e.target.value)}
            placeholder="Search for a recipe (e.g., 'chocolate cake', 'pasta carbonara')"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="recipe-search-button"
            disabled={!recipeQuery.trim() || isLoading}
          >
            {isLoading ? 'Searching...' : 'Find Recipe'}
          </button>
        </form>
        
        {/* Recipe template renderer */}
        {latestRecipeData ? (
          <div className="recipe-container">
            <CustomTemplateRenderer
              templateId="recipe"
              data={latestRecipeData}
            />
          </div>
        ) : (
          <div className="no-recipe">
            <p>Search for a recipe to see the custom template in action.</p>
            <p className="recipe-examples">Try: "tiramisu", "beef stir fry", "vegetable curry"</p>
          </div>
        )}
        
        <div className="info-card">
          <h2>Integration Code</h2>
          <pre className="code-block">
            {`import { useGenuxCore, CustomTemplateRenderer } from 'genux-sdk';

// 1. Define your HTML template with placeholders
const recipeTemplate = \`
  <div class="recipe-card">
    <img src="{{image}}" alt="{{title}}" />
    <h2>{{title}}</h2>
    <div class="meta">
      <span>⏱️ {{cookTime}} mins</span>
      <span>🍽️ Serves {{servings}}</span>
    </div>
    <ul class="ingredients">
      {{#each ingredients}}
        <li>{{amount}} {{unit}} {{name}}</li>
      {{/each}}
    </ul>
    <ol class="steps">
      {{#each steps}}
        <li>{{this}}</li>
      {{/each}}
    </ol>
  </div>
\`;

// 2. Define CSS for your template
const recipeStyles = \`
  .recipe-card { /* your styles */ }
\`;

// 3. Register template with Genux
const {
  registerTemplate,
  getTemplateData,
  sendText
} = useGenuxCore({
  webrtcURL: '/api/webrtc',
  websocketURL: '/api/ws',
  templates: [
    {
      id: 'recipe',
      html: recipeTemplate,
      css: recipeStyles
    }
  ]
});

// 4. Send request with template indicator
sendText('[TEMPLATE:recipe] chocolate cake');

// 5. Render template with data
const recipeData = getTemplateData('recipe');

return (
  <div>
    {recipeData && (
      <CustomTemplateRenderer
        templateId="recipe"
        data={recipeData}
      />
    )}
  </div>
);`}
          </pre>
        </div>
        
        <div className="info-card">
          <h2>How It Works</h2>
          <ol className="explanation-list">
            <li>
              <strong>Define Template:</strong> Create HTML with Handlebars-style placeholders
              (<code>{{title}}</code>, <code>{{#each ingredients}}</code>, etc.)
            </li>
            <li>
              <strong>Register Template:</strong> Tell Genux about your template with a unique ID
            </li>
            <li>
              <strong>Request Data:</strong> Send message with <code>[TEMPLATE:recipe]</code> prefix
            </li>
            <li>
              <strong>Backend Processing:</strong> AI generates structured JSON matching your template
            </li>
            <li>
              <strong>Render Template:</strong> <code>CustomTemplateRenderer</code> binds JSON to your HTML
            </li>
          </ol>
          <p className="note">
            <strong>Note:</strong> This approach gives you complete control over the UI without
            relying on C1Component, perfect for consistent, branded experiences.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
