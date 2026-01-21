
import { generatePreviewRuntime } from "./src/lib/preview-runtime-generator";

// Mock the dependencies and component
const code = `
import { Calendar } from "lucide-react";

export default function MyComponent() {
  return <Calendar />;
}
`;

// Helper function to replicate StaticThumbnail logic (since we can't import the component directly easily in standalone script without mocking React)
// I will copy relevant parts of generateHtmlDocument from StaticThumbnail.tsx

function generateTestHtml() {
    const { mode, runtimeCode, error } = generatePreviewRuntime(code);

    console.log("Runtime Mode:", mode);
    console.log("Error:", error);

    if (!runtimeCode) {
        console.log("No runtime code generated");
        return;
    }

    const runtimeLiteral = JSON.stringify(runtimeCode)
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029")
        .replace(/<\/script/gi, "<\\/script");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>body { background: #000; color: #fff; }</style>
        </head>
        <body>
          <div id="root-wrapper">
            <div id="root"></div>
          </div>
          <script type="module">
            const root = document.getElementById('root');
            // ...
            const code = ${runtimeLiteral};
            console.log("Code length:", code.length);
          </script>
        </body>
      </html>
    `;

    console.log("Generated HTML:");
    console.log(html);
}

generateTestHtml();
