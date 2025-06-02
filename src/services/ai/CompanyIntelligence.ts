
export interface CompanyProfile {
  name: string;
  isUnicorn: boolean;
  isStartup: boolean;
  fundingStage: string;
  valuation?: number;
  employeeCount: number;
  techStack: string[];
  cultureIndicators: string[];
  hiringSignals: string[];
}

export class CompanyIntelligence {
  private openaiApiKey: string;
  private unicornCompanies: Set<string>;
  private wellKnownStartups: Set<string>;

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.initializeKnownCompanies();
  }

  private initializeKnownCompanies() {
    // Known unicorn companies (sample list - in production, this would be more comprehensive)
    this.unicornCompanies = new Set([
      'byju\'s', 'paytm', 'ola', 'swiggy', 'razorpay', 'freshworks', 'zomato',
      'policybazaar', 'zerodha', 'cred', 'unacademy', 'vedantu', 'postman',
      'browserstack', 'innovaccer', 'mindtickle', 'icertis', 'mobikwik'
    ]);

    // Known startup companies
    this.wellKnownStartups = new Set([
      'flipkart', 'myntra', 'bigbasket', 'grofers', 'blinkit', 'meesho',
      'urban company', 'lenskart', 'nykaa', 'boat', 'mamaearth', 'sugar cosmetics'
    ]);
  }

  async analyzeCompany(companyName: string): Promise<CompanyProfile | null> {
    if (!companyName || companyName.trim().length === 0) return null;

    const normalizedName = companyName.toLowerCase().trim();

    // Quick check against known lists
    const isKnownUnicorn = this.unicornCompanies.has(normalizedName);
    const isKnownStartup = this.wellKnownStartups.has(normalizedName) || isKnownUnicorn;

    if (isKnownUnicorn || isKnownStartup) {
      return {
        name: companyName,
        isUnicorn: isKnownUnicorn,
        isStartup: isKnownStartup,
        fundingStage: isKnownUnicorn ? 'series-c+' : 'early-stage',
        employeeCount: isKnownUnicorn ? 1000 : 100,
        techStack: [],
        cultureIndicators: isKnownStartup ? ['fast-paced', 'innovative', 'growth-oriented'] : [],
        hiringSignals: []
      };
    }

    // Use AI for unknown companies
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a company intelligence expert. Analyze the company and return detailed information.
              
Return ONLY valid JSON:
{
  "name": "company name",
  "isUnicorn": true|false,
  "isStartup": true|false,
  "fundingStage": "seed|series-a|series-b|series-c|ipo|established",
  "employeeCount": estimated_number,
  "techStack": ["tech1", "tech2"],
  "cultureIndicators": ["culture1", "culture2"],
  "hiringSignals": ["actively hiring", "rapid growth"]
}`
            },
            {
              role: 'user',
              content: `Analyze this company: "${companyName}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return this.validateCompanyProfile(parsed, companyName);
      } catch (parseError) {
        console.error('Failed to parse company analysis:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Company analysis failed:', error);
      return null;
    }
  }

  private validateCompanyProfile(parsed: any, originalName: string): CompanyProfile {
    return {
      name: originalName,
      isUnicorn: Boolean(parsed.isUnicorn),
      isStartup: Boolean(parsed.isStartup),
      fundingStage: parsed.fundingStage || 'unknown',
      employeeCount: typeof parsed.employeeCount === 'number' ? parsed.employeeCount : 100,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      cultureIndicators: Array.isArray(parsed.cultureIndicators) ? parsed.cultureIndicators : [],
      hiringSignals: Array.isArray(parsed.hiringSignals) ? parsed.hiringSignals : []
    };
  }

  isUnicornCompany(companyName: string): boolean {
    return this.unicornCompanies.has(companyName.toLowerCase().trim());
  }

  isStartupEcosystem(companyName: string): boolean {
    const normalized = companyName.toLowerCase().trim();
    return this.unicornCompanies.has(normalized) || this.wellKnownStartups.has(normalized);
  }
}
