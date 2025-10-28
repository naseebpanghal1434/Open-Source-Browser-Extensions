const fs = require('fs');
const { createCanvas } = require('canvas');

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

// Icon sizes
const sizes = [16, 48, 128];

// Generate icons
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#007AFF';
  ctx.fillRect(0, 0, size, size);

  // Note icon
  ctx.fillStyle = '#FFFFFF';
  const padding = size * 0.2;
  const width = size - (padding * 2);
  const height = size - (padding * 2);
  
  // Draw note shape
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding + width, padding);
  ctx.lineTo(padding + width, padding + height);
  ctx.lineTo(padding, padding + height);
  ctx.closePath();
  ctx.fill();

  // Draw lines
  ctx.fillStyle = '#007AFF';
  const lineHeight = height / 4;
  const lineWidth = width * 0.8;
  const lineX = padding + (width - lineWidth) / 2;
  
  for (let i = 0; i < 3; i++) {
    const lineY = padding + lineHeight * (i + 0.5);
    ctx.fillRect(lineX, lineY, lineWidth, lineHeight * 0.2);
  }

  // Save icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
}); 