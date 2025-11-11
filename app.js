const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to replace Yale with Fale while preserving case
function replaceYalePreservingCase(text) {
  return text.replace(/YALE/g, 'FALE')
             .replace(/Yale/g, 'Fale')
             .replace(/yale/g, 'fale');
}

// Function to process HTML and replace Yale with Fale in text content
function processHtml(html) {
  const $ = cheerio.load(html);
  
  // Process text nodes in the body
  $('body *').contents().filter(function() {
    return this.nodeType === 3; // Text nodes only
  }).each(function() {
    // Replace text content but not in URLs or attributes
    const text = $(this).text();
    const newText = replaceYalePreservingCase(text);
    if (text !== newText) {
      $(this).replaceWith(newText);
    }
  });
  
  // Process title separately
  const title = replaceYalePreservingCase($('title').text());
  $('title').text(title);
  
  return {
    html: $.html(),
    title: title
  };
}

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Process the HTML to replace Yale with Fale
    const { html: processedHtml, title } = processHtml(html);
    
    return res.json({ 
      success: true, 
      content: processedHtml,
      title: title,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Export app and functions for testing
module.exports = app;
module.exports.replaceYalePreservingCase = replaceYalePreservingCase;
module.exports.processHtml = processHtml;

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}
