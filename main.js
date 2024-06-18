import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const promptInput = document.querySelector('textarea[name="prompt"]');
  const output = document.querySelector('.output');

  const imageUpload = document.getElementById('imageUpload');
  imageUpload.addEventListener('change', function() {
    const file = imageUpload.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      const imageDataUrl = e.target.result;
      const imagePreview = document.getElementById('imagePreview');
      imagePreview.src = imageDataUrl;
      const imageValue = document.getElementById('imageValue');
      imageValue.value = imageDataUrl;
    };

    reader.readAsDataURL(file);
  });

  form.onsubmit = async ev => {
    ev.preventDefault();
    output.innerHTML = '<p>Let me think about it...</p>';

    try {
      const imageUrl = document.getElementById('imageValue').value;
      const imageBase64 = await fetch(imageUrl)
        .then(r => r.arrayBuffer())
        .then(a => Base64.fromByteArray(new Uint8Array(a)));

      const contents = [
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: promptInput.value,
            },
            {
              type: 'image_url',
              image_url: `data:image/png;base64,${imageBase64}`,
            },
          ],
        }),
      ];

      const vision = new ChatGoogleGenerativeAI({
        modelName: 'gemini-1.0-pro-vision-latest',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      async function displayTypewriterText(element, text, speed) {
        element.innerHTML = ''; // Clear previous content
        for (let i = 0; i < text.length; i++) {
          element.innerHTML += text.charAt(i);
          await new Promise(resolve => setTimeout(resolve, speed));
        }
      }

      async function main() {
        const streamRes = await vision.stream(contents);
        const buffer = [];
        const md = new MarkdownIt();
        const outputElement = document.querySelector('.output');
        const speed = 50; 

        for await (const chunk of streamRes) {
          buffer.push(chunk.content);
          const renderedMarkdown = md.render(buffer.join(''));
          await displayTypewriterText(outputElement, renderedMarkdown, speed);
        }
      }

      await main();

    } catch (e) {
      output.innerHTML += '<hr>' + e;
    }
  };
});
