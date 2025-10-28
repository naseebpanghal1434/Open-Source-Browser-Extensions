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

  // Background with gradient effect (simulated)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#007AFF');
  gradient.addColorStop(1, '#0051D5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Note paper background
  ctx.fillStyle = '#FFFFFF';
  const padding = size * 0.15;
  const noteWidth = size - (padding * 2);
  const noteHeight = size - (padding * 2);
  const cornerSize = size * 0.15;

  // Draw note paper with rounded corners
  ctx.beginPath();
  ctx.moveTo(padding + cornerSize, padding);
  ctx.lineTo(padding + noteWidth - cornerSize, padding);
  ctx.arcTo(padding + noteWidth, padding, padding + noteWidth, padding + cornerSize, cornerSize * 0.3);
  ctx.lineTo(padding + noteWidth, padding + noteHeight - cornerSize);
  ctx.arcTo(padding + noteWidth, padding + noteHeight, padding + noteWidth - cornerSize, padding + noteHeight, cornerSize * 0.3);
  ctx.lineTo(padding + cornerSize, padding + noteHeight);
  ctx.arcTo(padding, padding + noteHeight, padding, padding + noteHeight - cornerSize, cornerSize * 0.3);
  ctx.lineTo(padding, padding + cornerSize);
  ctx.arcTo(padding, padding, padding + cornerSize, padding, cornerSize * 0.3);
  ctx.closePath();
  ctx.fill();

  // Add subtle shadow to note
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetX = size * 0.02;
  ctx.shadowOffsetY = size * 0.02;

  // Draw note lines
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = size * 0.015;

  const lineCount = Math.floor(size / 16);
  const lineSpacing = noteHeight / (lineCount + 1);
  const lineStartX = padding + (noteWidth * 0.15);
  const lineEndX = padding + (noteWidth * 0.85);

  for (let i = 1; i <= lineCount; i++) {
    const y = padding + (lineSpacing * i);
    ctx.beginPath();
    ctx.moveTo(lineStartX, y);
    ctx.lineTo(lineEndX, y);
    ctx.stroke();
  }

  // Draw a pencil icon in the corner
  const pencilSize = size * 0.35;
  const pencilX = padding + noteWidth - pencilSize * 0.7;
  const pencilY = padding + noteHeight - pencilSize * 0.7;

  // Pencil body
  ctx.fillStyle = '#FFD700';
  ctx.save();
  ctx.translate(pencilX, pencilY);
  ctx.rotate(Math.PI / 4);

  // Pencil rectangle
  ctx.fillRect(-pencilSize * 0.15, -pencilSize * 0.5, pencilSize * 0.3, pencilSize * 0.8);

  // Pencil tip
  ctx.fillStyle = '#2C2C2C';
  ctx.beginPath();
  ctx.moveTo(-pencilSize * 0.15, pencilSize * 0.3);
  ctx.lineTo(0, pencilSize * 0.5);
  ctx.lineTo(pencilSize * 0.15, pencilSize * 0.3);
  ctx.closePath();
  ctx.fill();

  // Pencil eraser
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(-pencilSize * 0.15, -pencilSize * 0.5, pencilSize * 0.3, pencilSize * 0.15);

  ctx.restore();

  // Add a small "Q" for Quick Notes (for larger icons)
  if (size >= 48) {
    ctx.fillStyle = '#007AFF';
    ctx.font = `bold ${size * 0.25}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Q', padding + (noteWidth * 0.1), padding + (noteHeight * 0.1));
  }

  // Save icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icons/icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
});

console.log('All icons generated successfully!');
