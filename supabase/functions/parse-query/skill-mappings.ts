
// Advanced skill recognition with deeper semantic mapping and contextual understanding
export const ADVANCED_SKILL_MAPPINGS = {
  // Programming Languages with ecosystem
  'javascript': {
    variants: ['js', 'ecmascript', 'es6', 'es2015', 'es2020'],
    ecosystem: ['node.js', 'nodejs', 'react', 'vue', 'angular', 'typescript'],
    related: ['html', 'css', 'json', 'npm'],
    context: ['frontend', 'backend', 'fullstack'],
    seniority_indicators: ['vanilla js', 'modern javascript', 'es6+']
  },
  'typescript': {
    variants: ['ts'],
    ecosystem: ['javascript', 'node.js', 'react', 'angular', 'nest.js'],
    related: ['type safety', 'static typing'],
    context: ['frontend', 'backend', 'fullstack'],
    seniority_indicators: ['advanced typescript', 'type system', 'generics']
  },
  'python': {
    variants: ['py'],
    ecosystem: ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
    related: ['data science', 'machine learning', 'web development', 'automation'],
    context: ['backend', 'data', 'ai', 'automation'],
    seniority_indicators: ['pythonic', 'async/await', 'decorators']
  },
  'react': {
    variants: ['reactjs', 'react.js'],
    ecosystem: ['jsx', 'next.js', 'nextjs', 'redux', 'hooks', 'context'],
    related: ['javascript', 'typescript', 'html', 'css'],
    context: ['frontend', 'spa', 'ui'],
    seniority_indicators: ['react hooks', 'context api', 'performance optimization']
  },
  'node.js': {
    variants: ['nodejs', 'node'],
    ecosystem: ['express', 'nest.js', 'fastify', 'npm', 'yarn'],
    related: ['javascript', 'typescript', 'api', 'microservices'],
    context: ['backend', 'api', 'microservices'],
    seniority_indicators: ['event loop', 'streams', 'clustering']
  },
  
  // Cloud & DevOps with advanced understanding
  'aws': {
    variants: ['amazon web services'],
    ecosystem: ['ec2', 's3', 'lambda', 'ecs', 'eks', 'rds', 'cloudformation'],
    related: ['cloud', 'devops', 'serverless', 'microservices'],
    context: ['cloud', 'infrastructure', 'devops'],
    seniority_indicators: ['aws certified', 'multi-region', 'cost optimization']
  },
  'kubernetes': {
    variants: ['k8s'],
    ecosystem: ['docker', 'helm', 'istio', 'prometheus', 'grafana'],
    related: ['containerization', 'orchestration', 'microservices'],
    context: ['devops', 'infrastructure', 'scalability'],
    seniority_indicators: ['cluster management', 'service mesh', 'operators']
  },
  'docker': {
    variants: ['containerization'],
    ecosystem: ['kubernetes', 'docker-compose', 'dockerfile'],
    related: ['devops', 'microservices', 'deployment'],
    context: ['devops', 'deployment', 'infrastructure'],
    seniority_indicators: ['multi-stage builds', 'security scanning', 'optimization']
  }
};

export const LOCATION_VARIATIONS = {
  'san francisco': ['sf', 'bay area', 'silicon valley'],
  'new york': ['nyc', 'new york city', 'manhattan'],
  'los angeles': ['la', 'los angeles'],
  'seattle': ['seattle, wa'],
  'austin': ['austin, tx'],
  'boston': ['boston, ma'],
  'chicago': ['chicago, il'],
  'denver': ['denver, co'],
  'remote': ['work from home', 'wfh', 'telecommute', 'distributed']
};

export const SENIORITY_INDICATORS = {
  'junior': ['junior', 'entry level', 'graduate', 'new grad', '0-2 years', 'trainee'],
  'mid': ['mid level', 'intermediate', '2-5 years', 'regular', 'standard'],
  'senior': ['senior', 'experienced', '5+ years', 'expert', 'advanced'],
  'lead': ['lead', 'team lead', 'tech lead', 'principal', 'staff'],
  'architect': ['architect', 'solution architect', 'principal architect', 'chief'],
  'manager': ['manager', 'engineering manager', 'team manager', 'director']
};

export const ROLE_VARIATIONS = {
  'software engineer': ['developer', 'programmer', 'coder', 'software developer'],
  'frontend developer': ['frontend engineer', 'ui developer', 'client side developer'],
  'backend developer': ['backend engineer', 'server side developer', 'api developer'],
  'fullstack developer': ['full stack engineer', 'fullstack engineer', 'full-stack developer'],
  'devops engineer': ['site reliability engineer', 'sre', 'platform engineer', 'infrastructure engineer'],
  'data scientist': ['ml engineer', 'machine learning engineer', 'ai engineer'],
  'product manager': ['pm', 'product owner', 'product lead'],
  'designer': ['ui designer', 'ux designer', 'product designer', 'visual designer']
};
