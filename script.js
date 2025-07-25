const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageLoader = document.getElementById('imageLoader');
const scaleInput = document.getElementById('scale');
const result = document.getElementById('result');

let image = new Image();
let points = [];

let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;

let isPanning = false;
let startPan = { x: 0, y: 0 };
let currentImageIndex = 0;
let predefinedMaps = [];



function redraw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(scaleFactor, 0, 0, scaleFactor, offsetX, offsetY); // Apply pan/zoom(pan not implemented yet)
  ctx.drawImage(image, 0, 0);

  // Draw points
  for (let pt of points) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4 / scaleFactor, 0, 2 * Math.PI); // scale-independent size
    ctx.fillStyle = 'red';
    ctx.fill();
  }

  // If 2 points, draw line
  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2 / scaleFactor;
    ctx.stroke();
  }
}



imageLoader.addEventListener('change', function (e) {
  const reader = new FileReader();
  reader.onload = function (event) {
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      redraw();
      points = [];
      result.textContent = "Click two points on the image.";
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

function loadMap(map) {
  scaleFactor = 1;
  offsetX = 0;
  offsetY = 0;
  const img = new Image();
  img.src = map.src;
  img.onload = () => {
    image = img;
    canvas.width = img.width;
    canvas.height = img.height;
    scaleInput.value = map.scale;
    redraw();
    points = [];
    result.textContent = "Click two points on the map.";
  };
  img.onerror = () => {
    console.error(`Failed to load image: ${map.src}`);
    result.textContent = `Failed to load map: ${map.name}`;
  };
}
function updateMapName() {
  const mapName = document.getElementById('mapname');
  if (predefinedMaps.length > 0) {
    mapName.textContent = predefinedMaps[currentImageIndex].name;
  } else {
    mapName.textContent = "No maps loaded";
  }
}
async function loadPreloadedMap() {
  const response = await fetch('maps_scale.json');
  predefinedMaps = await response.json();
  if(predefinedMaps.length > 0) {
    loadMap(predefinedMaps[0]);
    updateMapName();
  }
  else {
    alert("No maps found in maps_scale.json");
  }
}
canvas.addEventListener('click', function (e) {
  if (!scaleInput.value || isNaN(scaleInput.value)) {
    alert("Please enter a valid scale (meters per pixel).");
    return;
  }

  const rect = canvas.getBoundingClientRect();

  // Convert screen coordinates to canvas coordinates, accounting for CSS scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;

  // Convert canvas coordinates to image coordinates (undo zoom & pan)
  const x = (canvasX - offsetX) / scaleFactor;
  const y = (canvasY - offsetY) / scaleFactor;

  points.push({ x, y });

  redraw(); // Draw everything again (with new point)

  if (points.length === 2) {
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const scale = parseFloat(scaleInput.value) / 50;
    const realDist = pixelDist * scale;

    result.textContent = `Distance: ${realDist.toFixed(2)} meters`;

    // Reset points after drawing line
    setTimeout(() => points = [], 0);
  }
});

canvas.addEventListener('mousedown', function (e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  isPanning = true;
  startPan.x = (e.clientX - rect.left) * scaleX - offsetX;
  startPan.y = (e.clientY - rect.top) * scaleY - offsetY;
});
canvas.addEventListener('mousemove', function (e) {
  if (isPanning) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    offsetX = (e.clientX - rect.left) * scaleX - startPan.x;
    offsetY = (e.clientY - rect.top) * scaleY - startPan.y;
    redraw();
  }
});
canvas.addEventListener('mouseup', function () {
  isPanning = false;
});
canvas.addEventListener('mouseleave', function () {
  isPanning = false;
});

document.getElementById('previous').addEventListener('click', () => {
  if (predefinedMaps.length === 0) return;
  currentImageIndex = (currentImageIndex - 1 + predefinedMaps.length) % predefinedMaps.length;
  loadMap(predefinedMaps[currentImageIndex]);
  updateMapName();
});

document.getElementById('next').addEventListener('click', () => {
  if (predefinedMaps.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % predefinedMaps.length;
  loadMap(predefinedMaps[currentImageIndex]);
  updateMapName();
});


canvas.addEventListener('wheel', function (e) {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const zoomIntensity = 0.1;
  const mouseX = ((e.clientX - rect.left) * scaleX - offsetX) / scaleFactor;
  const mouseY = ((e.clientY - rect.top) * scaleY - offsetY) / scaleFactor;

  if (e.deltaY < 0) {
    scaleFactor *= (1 + zoomIntensity);
  } else {
    scaleFactor *= (1 - zoomIntensity);
  }

  // Zoom around mouse position
  offsetX = (e.clientX - rect.left) * scaleX - mouseX * scaleFactor;
  offsetY = (e.clientY - rect.top) * scaleY - mouseY * scaleFactor;

  redraw();
});

document.addEventListener('DOMContentLoaded', () => {
  loadPreloadedMap();
});
