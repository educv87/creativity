import { Jimp } from 'jimp';

async function processImage() {
  try {
    const image = await Jimp.read('./public/tshirt_base.png');
    
    // Iterate over all pixels
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red   = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue  = this.bitmap.data[idx + 2];
      
      // If the pixel is very light (white background), make it transparent
      if (red > 240 && green > 240 && blue > 240) {
          this.bitmap.data[idx + 3] = 0; // Set alpha to 0
      }
    });

    image.write('./public/tshirt_base.png');
    console.log("Background removed successfully!");
  } catch (error) {
    console.error("Error processing image:", error);
  }
}

processImage();
