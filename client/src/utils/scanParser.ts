export interface ScanSections {
  disease:    string | null;
  confidence: string | null;
  symptoms:   string | null;
  treatment:  string | null;
  prevention: string | null;
  isStructured: boolean;
}

export function parseScanSections(text: string): ScanSections {
  if (!text) return { disease: null, confidence: null, symptoms: null, treatment: null, prevention: null, isStructured: false };

  const lines = text.split('\n');
  const sections: Record<string, string[]> = {};
  let current: string | null = null;

  for (const line of lines) {
    // Matches: **[optional emoji/space] HEADER NAME:** content
    // Handles variations like **🦠 DISEASE NAME:** or ** 🦠 DISEASE NAME:**
    const headerMatch = line.match(/^\*\*.*?([A-Z][A-Z\s]+):\*\*\s*(.*)/);
    if (headerMatch) {
      current = headerMatch[1].trim();
      const rest = headerMatch[2].trim();
      sections[current] = rest ? [rest] : [];
    } else if (current && line.trim()) {
      sections[current].push(line.trim());
    }
  }

  const find = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(sections).find(([k]) => k.includes(key));
      if (found) return found[1].join('\n').trim() || null;
    }
    return null;
  };

  const disease    = find('DISEASE');
  const confidence = find('CONFIDENCE');
  const symptoms   = find('SYMPTOMS');
  const treatment  = find('TREATMENT');
  const prevention = find('PREVENTION');

  return {
    disease,
    confidence,
    symptoms,
    treatment,
    prevention,
    isStructured: !!(disease && (symptoms || treatment)),
  };
}
