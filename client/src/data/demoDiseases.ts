// Demo disease responses for deployed environment when AI is unavailable
export const demoDiseases = [
  {
    name: 'Healthy Plant',
    confidence: 'High',
    symptoms: 'The plant appears to be healthy with typical coloration and no visible signs of damage, lesions, or fungal growth.',
    treatment: 'No treatment is necessary as the plant appears healthy.',
    prevention: 'To maintain healthy plants in KZN, ensure regular pruning, adequate watering, and balanced fertilization. Monitor for pests and diseases regularly.',
    severity: 'info',
  },
  {
    name: 'Early Blight',
    confidence: 'High',
    symptoms: 'Brown circular lesions with concentric rings on lower leaves, progressing upward. Yellow halo around lesions.',
    treatment: '1. Remove infected leaves immediately. 2. Apply mancozeb or chlorothalonil fungicide every 7-10 days. 3. Improve air circulation. 4. Avoid overhead irrigation.',
    prevention: '1. Rotate crops annually. 2. Use disease-resistant varieties. 3. Mulch soil to prevent spore splash. 4. Remove plant debris.',
    severity: 'warning',
  },
  {
    name: 'Powdery Mildew',
    confidence: 'High',
    symptoms: 'White powdery coating on leaves, stems, and flowers. Leaves may curl and become distorted.',
    treatment: '1. Apply sulfur dust or potassium bicarbonate spray. 2. Improve air circulation by pruning. 3. Reduce humidity. 4. Spray every 7-10 days.',
    prevention: '1. Maintain proper plant spacing. 2. Avoid overhead watering. 3. Remove infected leaves. 4. Plant in sunny locations.',
    severity: 'warning',
  },
  {
    name: 'Leaf Spot Disease',
    confidence: 'High',
    symptoms: 'Brown circular lesions with yellow halos on leaf surfaces, progressing from lower to upper leaves.',
    treatment: '1. Apply copper oxychloride fungicide every 7-10 days. 2. Remove infected leaves immediately. 3. Improve air circulation. 4. Avoid overhead irrigation.',
    prevention: '1. Rotate crops annually. 2. Use disease-resistant varieties. 3. Maintain proper spacing. 4. Clean up fallen leaves.',
    severity: 'warning',
  },
  {
    name: 'Bacterial Wilt',
    confidence: 'High',
    symptoms: 'Sudden wilting of leaves and stems despite adequate moisture. Vascular discoloration when stem is cut.',
    treatment: '1. Remove and destroy infected plants immediately. 2. Disinfect tools between cuts. 3. No chemical cure available. 4. Focus on prevention.',
    prevention: '1. Control insect vectors (flea beetles, cucumber beetles). 2. Use resistant varieties. 3. Rotate crops. 4. Remove weeds.',
    severity: 'critical',
  },
  {
    name: 'Rust',
    confidence: 'High',
    symptoms: 'Orange or brown pustules on leaf undersides. Yellow spots on upper leaf surface.',
    treatment: '1. Apply sulfur or copper fungicide. 2. Remove infected leaves. 3. Improve air circulation. 4. Spray every 7-14 days.',
    prevention: '1. Plant resistant varieties. 2. Avoid overhead watering. 3. Remove infected leaves. 4. Maintain proper spacing.',
    severity: 'warning',
  },
  {
    name: 'Anthracnose',
    confidence: 'High',
    symptoms: 'Dark sunken lesions on fruits and leaves. Pink spore masses visible in wet conditions.',
    treatment: '1. Apply copper oxychloride or mancozeb fungicide. 2. Remove infected fruit and leaves. 3. Improve air circulation. 4. Avoid overhead irrigation.',
    prevention: '1. Use disease-resistant varieties. 2. Rotate crops. 3. Remove plant debris. 4. Maintain proper spacing.',
    severity: 'warning',
  },
  {
    name: 'Mosaic Virus',
    confidence: 'High',
    symptoms: 'Mottled yellow and green patterns on leaves. Leaf distortion and stunted growth.',
    treatment: '1. Remove and destroy infected plants. 2. Control aphid vectors. 3. No chemical cure. 4. Focus on prevention.',
    prevention: '1. Use resistant varieties. 2. Control aphids with insecticide. 3. Remove weeds. 4. Sanitize tools.',
    severity: 'critical',
  },
  {
    name: 'Root Rot',
    confidence: 'High',
    symptoms: 'Wilting despite adequate moisture. Soft, dark roots. Foul smell from soil.',
    treatment: '1. Improve soil drainage. 2. Reduce watering frequency. 3. Remove affected plants. 4. Apply fungicide to soil.',
    prevention: '1. Ensure good drainage. 2. Avoid overwatering. 3. Rotate crops. 4. Use well-draining soil.',
    severity: 'critical',
  },
  {
    name: 'Armyworm Damage',
    confidence: 'High',
    symptoms: 'Irregular holes in leaves. Presence of green caterpillars. Frass (droppings) on leaves.',
    treatment: '1. Apply Bt (Bacillus thuringiensis) spray. 2. Use Coragen or Ampligo insecticide. 3. Hand-pick caterpillars. 4. Scout weekly.',
    prevention: '1. Monitor plants regularly. 2. Remove weeds. 3. Use pheromone traps. 4. Encourage natural predators.',
    severity: 'warning',
  },
];

export function getRandomDisease() {
  return demoDiseases[Math.floor(Math.random() * demoDiseases.length)];
}

export function formatDiseaseResponse(disease: typeof demoDiseases[0]): string {
  return `**🦠 DISEASE NAME:** ${disease.name}\n**📊 CONFIDENCE:** ${disease.confidence}\n**🌿 SYMPTOMS:** ${disease.symptoms}\n**💊 TREATMENT:** ${disease.treatment}\n**🛡️ PREVENTION:** ${disease.prevention}`;
}
