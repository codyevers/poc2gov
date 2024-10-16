// Define the fisheye force function within this scope
export function fisheyeForce(centerX, centerY, strength = 0.5, radius = 30) {
  return (alpha) => {
    nodes.forEach((node) => {
      // Calculate distance of the node from the center
      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply fisheye scaling based on distance
      const effectRadius = Math.max(1, radius - distance); // scaling radius
      const scaleFactor = 1 + strength * (effectRadius / radius);

      node.x = centerX + dx * scaleFactor;
      node.y = centerY + dy * scaleFactor;
    });
  };
}

// Define the walleye force function within this scope
export function walleyeForce(centerX, centerY, maxRadius) {
  return (alpha) => {
    nodes.forEach((node) => {
      // Calculate the distance of the node from the center
      const dx = node.x - centerX;
      const dy = node.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If node is outside max radius, pull it back in
      if (distance > maxRadius) {
        const pullFactor = maxRadius / distance; // Scale to max radius
        node.x = centerX + dx * pullFactor;
        node.y = centerY + dy * pullFactor;
      }
    });
  };
}
