const https = require('https');
const fs = require('fs');
const path = require('path');

// For v4.x, the worker is typically .mjs, but we'll save as .js for compatibility
const workerUrl = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
const outputPath = path.join(__dirname, '../public/pdf.worker.min.js');

console.log('Downloading PDF worker from:', workerUrl);

https.get(workerUrl, (response) => {
  if (response.statusCode === 200) {
    const fileStream = fs.createWriteStream(outputPath);
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      const stats = fs.statSync(outputPath);
      console.log(`✅ Worker file downloaded successfully (${(stats.size / 1024).toFixed(2)} KB)`);
      console.log(`Saved to: ${outputPath}`);
    });
  } else if (response.statusCode === 301 || response.statusCode === 302) {
    // Handle redirect
    const redirectUrl = response.headers.location;
    console.log('Following redirect to:', redirectUrl);
    https.get(redirectUrl, (redirectResponse) => {
      const fileStream = fs.createWriteStream(outputPath);
      redirectResponse.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        const stats = fs.statSync(outputPath);
        console.log(`✅ Worker file downloaded successfully (${(stats.size / 1024).toFixed(2)} KB)`);
        console.log(`Saved to: ${outputPath}`);
      });
    });
  } else {
    console.error(`❌ Failed to download: ${response.statusCode} ${response.statusMessage}`);
    process.exit(1);
  }
}).on('error', (error) => {
  console.error('❌ Download error:', error.message);
  process.exit(1);
});

