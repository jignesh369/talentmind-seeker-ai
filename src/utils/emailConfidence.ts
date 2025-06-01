
export function calculateEmailConfidence(email: string, source: string, candidate: any): {
  score: number;
  level: 'high' | 'medium' | 'low';
  type: 'personal' | 'work' | 'generic' | 'mailing_list';
} {
  if (!email) {
    return { score: 0, level: 'low', type: 'generic' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  const localPart = email.split('@')[0]?.toLowerCase();
  
  // Check for mailing list patterns
  if (localPart.includes('subscribe') || localPart.includes('unsubscribe') || 
      localPart.includes('noreply') || localPart.includes('no-reply')) {
    return { score: 20, level: 'low', type: 'mailing_list' };
  }

  // Personal email domains (high confidence if name matches)
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  if (personalDomains.includes(domain)) {
    const nameWords = candidate.name?.toLowerCase().split(' ') || [];
    const hasNameMatch = nameWords.some(word => localPart.includes(word.substring(0, 3)));
    return { 
      score: hasNameMatch ? 95 : 75, 
      level: hasNameMatch ? 'high' : 'medium', 
      type: 'personal' 
    };
  }

  // Generic company domains
  const genericDomains = ['microsoft.com', 'google.com', 'amazon.com', 'meta.com', 'apple.com'];
  if (genericDomains.includes(domain)) {
    return { score: 40, level: 'low', type: 'generic' };
  }

  // Work email (company domain)
  if (domain && !personalDomains.includes(domain)) {
    return { score: 85, level: 'high', type: 'work' };
  }

  return { score: 50, level: 'medium', type: 'generic' };
}

export function getEmailConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'low': return 'text-red-600 bg-red-100';
  }
}

export function getEmailConfidenceIcon(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return '✓';
    case 'medium': return '⚠';
    case 'low': return '⚡';
  }
}
