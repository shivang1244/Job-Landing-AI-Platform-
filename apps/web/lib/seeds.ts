import { ExperienceLevel, JobPosting } from "@/lib/types";
import { nowIso } from "@/lib/data-store";
import { tokenize } from "@/lib/matching";

type Company = {
  name: string;
  country: string;
  city: string;
  size: "startup" | "small" | "medium" | "enterprise";
  domain: string;
  careersUrl: string;
  siteUrl: string;
  linkedinCompanyUrl: string;
  hrInbox?: string;
  tags: string[];
};

type RoleTemplate = {
  title: string;
  experienceLevel: ExperienceLevel;
  tags: string[];
  salary?: string;
  description: string;
};

type JobBoard = {
  name: string;
  source: string;
  searchUrl: (query: string, location: string) => string;
  siteUrl: string;
};

const companies: Company[] = [
  { name: "Zoho", country: "India", city: "Chennai", size: "enterprise", domain: "saas ai", careersUrl: "https://www.zoho.com/careers/", siteUrl: "https://www.zoho.com", linkedinCompanyUrl: "https://www.linkedin.com/company/zoho-corporation", tags: ["ai", "saas", "automation", "python"] },
  { name: "Freshworks", country: "India", city: "Chennai", size: "enterprise", domain: "saas automation", careersUrl: "https://www.freshworks.com/company/careers/", siteUrl: "https://www.freshworks.com", linkedinCompanyUrl: "https://www.linkedin.com/company/freshworks-inc-", tags: ["saas", "data", "analytics", "automation"] },
  { name: "Postman", country: "India", city: "Bengaluru", size: "medium", domain: "developer tools", careersUrl: "https://www.postman.com/company/careers/", siteUrl: "https://www.postman.com", linkedinCompanyUrl: "https://www.linkedin.com/company/postman-platform", tags: ["developer", "tools", "automation", "api"] },
  { name: "Razorpay", country: "India", city: "Bengaluru", size: "medium", domain: "fintech ai", careersUrl: "https://razorpay.com/jobs/", siteUrl: "https://razorpay.com", linkedinCompanyUrl: "https://www.linkedin.com/company/razorpay", tags: ["fintech", "ai", "data", "analytics"] },
  { name: "CRED", country: "India", city: "Bengaluru", size: "medium", domain: "fintech", careersUrl: "https://careers.cred.club/", siteUrl: "https://cred.club", linkedinCompanyUrl: "https://www.linkedin.com/company/cred-club", tags: ["fintech", "ml", "data", "product"] },
  { name: "Meesho", country: "India", city: "Bengaluru", size: "medium", domain: "ecommerce data", careersUrl: "https://careers.meesho.com/", siteUrl: "https://www.meesho.io", linkedinCompanyUrl: "https://www.linkedin.com/company/meesho", tags: ["ecommerce", "data", "ml", "analytics"] },
  { name: "Flipkart", country: "India", city: "Bengaluru", size: "enterprise", domain: "ecommerce ai", careersUrl: "https://www.flipkartcareers.com/#!/joblist", siteUrl: "https://www.flipkart.com", linkedinCompanyUrl: "https://www.linkedin.com/company/flipkart", tags: ["ecommerce", "ai", "analytics", "product"] },
  { name: "PhonePe", country: "India", city: "Bengaluru", size: "enterprise", domain: "fintech automation", careersUrl: "https://www.phonepe.com/careers/", siteUrl: "https://www.phonepe.com", linkedinCompanyUrl: "https://www.linkedin.com/company/phonepe", tags: ["fintech", "automation", "data", "python"] },
  { name: "Groww", country: "India", city: "Bengaluru", size: "medium", domain: "fintech data", careersUrl: "https://groww.in/careers", siteUrl: "https://groww.in", linkedinCompanyUrl: "https://www.linkedin.com/company/groww-app", tags: ["fintech", "data", "analytics", "python"] },
  { name: "Navi", country: "India", city: "Bengaluru", size: "medium", domain: "fintech", careersUrl: "https://navi.com/careers", siteUrl: "https://navi.com", linkedinCompanyUrl: "https://www.linkedin.com/company/navitechnologies", tags: ["fintech", "data", "ml", "sql"] },
  { name: "Wipro", country: "India", city: "Bengaluru", size: "enterprise", domain: "consulting ai", careersUrl: "https://careers.wipro.com/careers-home/", siteUrl: "https://www.wipro.com", linkedinCompanyUrl: "https://www.linkedin.com/company/wipro", tags: ["ai", "consulting", "cloud", "automation"] },
  { name: "Infosys", country: "India", city: "Pune", size: "enterprise", domain: "consulting data", careersUrl: "https://www.infosys.com/careers/job-opportunities.html", siteUrl: "https://www.infosys.com", linkedinCompanyUrl: "https://www.linkedin.com/company/infosys", tags: ["data", "analytics", "python", "automation"] },
  { name: "Tata Consultancy Services", country: "India", city: "Mumbai", size: "enterprise", domain: "consulting ai", careersUrl: "https://www.tcs.com/careers", siteUrl: "https://www.tcs.com", linkedinCompanyUrl: "https://www.linkedin.com/company/tata-consultancy-services", tags: ["ai", "data", "python", "fresher"] },
  { name: "Accenture", country: "India", city: "Bengaluru", size: "enterprise", domain: "consulting", careersUrl: "https://www.accenture.com/in-en/careers/jobsearch", siteUrl: "https://www.accenture.com", linkedinCompanyUrl: "https://www.linkedin.com/company/accenture", tags: ["data", "analytics", "sql", "python"] },
  { name: "Deloitte", country: "India", city: "Hyderabad", size: "enterprise", domain: "consulting ai", careersUrl: "https://www.deloitte.com/global/en/careers/job-search.html", siteUrl: "https://www.deloitte.com", linkedinCompanyUrl: "https://www.linkedin.com/company/deloitte", tags: ["ai", "cloud", "analytics", "python"] },
  { name: "Capgemini", country: "India", city: "Bengaluru", size: "enterprise", domain: "consulting engineering", careersUrl: "https://careers.capgemini.com/in-en/jobs/", siteUrl: "https://www.capgemini.com", linkedinCompanyUrl: "https://www.linkedin.com/company/capgemini", tags: ["engineering", "mlops", "ai", "data"] },
  { name: "IBM", country: "Global", city: "Remote", size: "enterprise", domain: "ai cloud", careersUrl: "https://www.ibm.com/careers/search?field_keyword=ai", siteUrl: "https://www.ibm.com", linkedinCompanyUrl: "https://www.linkedin.com/company/ibm", tags: ["ai", "nlp", "cloud", "data"] },
  { name: "Microsoft", country: "India", city: "Hyderabad", size: "enterprise", domain: "cloud ai", careersUrl: "https://jobs.careers.microsoft.com/global/en/search?q=artificial%20intelligence", siteUrl: "https://www.microsoft.com", linkedinCompanyUrl: "https://www.linkedin.com/company/microsoft", tags: ["ai", "azure", "python", "cloud"] },
  { name: "Google", country: "Global", city: "Remote", size: "enterprise", domain: "ai research", careersUrl: "https://careers.google.com/jobs/results/?q=machine%20learning", siteUrl: "https://careers.google.com", linkedinCompanyUrl: "https://www.linkedin.com/company/google", tags: ["research", "ml", "nlp", "ai"] },
  { name: "Amazon", country: "India", city: "Bengaluru", size: "enterprise", domain: "cloud mlops", careersUrl: "https://www.amazon.jobs/en/search?base_query=machine%20learning", siteUrl: "https://www.amazon.jobs", linkedinCompanyUrl: "https://www.linkedin.com/company/amazon", tags: ["mlops", "aws", "python", "automation"] },
  { name: "NVIDIA", country: "Global", city: "Remote", size: "enterprise", domain: "ai gpu", careersUrl: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", siteUrl: "https://www.nvidia.com", linkedinCompanyUrl: "https://www.linkedin.com/company/nvidia", tags: ["deep learning", "computer vision", "ai", "research"] },
  { name: "ServiceNow", country: "India", city: "Hyderabad", size: "enterprise", domain: "automation", careersUrl: "https://careers.servicenow.com/jobs", siteUrl: "https://www.servicenow.com", linkedinCompanyUrl: "https://www.linkedin.com/company/servicenow", tags: ["automation", "ai", "workflow", "product"] },
  { name: "Atlassian", country: "Global", city: "Remote", size: "enterprise", domain: "developer tools", careersUrl: "https://www.atlassian.com/company/careers/all-jobs", siteUrl: "https://www.atlassian.com", linkedinCompanyUrl: "https://www.linkedin.com/company/atlassian", tags: ["developer", "tools", "data", "product"] },
  { name: "Cohere", country: "Global", city: "Remote", size: "startup", domain: "llm", careersUrl: "https://cohere.com/careers", siteUrl: "https://cohere.com", linkedinCompanyUrl: "https://www.linkedin.com/company/cohere-ai", tags: ["generative ai", "llm", "nlp", "research"] },
  { name: "Hugging Face", country: "Global", city: "Remote", size: "startup", domain: "open source ai", careersUrl: "https://huggingface.co/join-us", siteUrl: "https://huggingface.co", linkedinCompanyUrl: "https://www.linkedin.com/company/huggingface", tags: ["generative ai", "nlp", "transformers", "open source"] },
  { name: "Scale AI", country: "Global", city: "Remote", size: "startup", domain: "data ai", careersUrl: "https://scale.com/careers", siteUrl: "https://scale.com", linkedinCompanyUrl: "https://www.linkedin.com/company/scaleai", tags: ["data", "ai", "ml", "ops"] },
  { name: "Weights & Biases", country: "Global", city: "Remote", size: "startup", domain: "mlops", careersUrl: "https://wandb.ai/site/careers", siteUrl: "https://wandb.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/wandb", tags: ["mlops", "monitoring", "data", "python"] },
  { name: "Aisera", country: "India", city: "Bengaluru", size: "medium", domain: "enterprise ai", careersUrl: "https://aisera.com/company/careers/", siteUrl: "https://aisera.com", linkedinCompanyUrl: "https://www.linkedin.com/company/aisera", tags: ["generative ai", "nlp", "automation", "enterprise"] },
  { name: "Observe.AI", country: "India", city: "Bengaluru", size: "medium", domain: "voice ai", careersUrl: "https://www.observe.ai/careers", siteUrl: "https://www.observe.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/observe-ai", tags: ["speech", "nlp", "ai", "analytics"] },
  { name: "Yellow.ai", country: "India", city: "Bengaluru", size: "medium", domain: "conversational ai", careersUrl: "https://yellow.ai/careers/", siteUrl: "https://yellow.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/yellowdotai", tags: ["generative ai", "nlp", "chatbot", "automation"] },
  { name: "Sarvam AI", country: "India", city: "Bengaluru", size: "startup", domain: "foundation models", careersUrl: "https://www.sarvam.ai/careers", siteUrl: "https://www.sarvam.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/sarvam-ai", tags: ["llm", "research", "nlp", "ai"] },
  { name: "Krutrim", country: "India", city: "Bengaluru", size: "startup", domain: "llm", careersUrl: "https://www.olacabs.com/krutrim", siteUrl: "https://www.olacabs.com/krutrim", linkedinCompanyUrl: "https://www.linkedin.com/company/krutrim", tags: ["llm", "nlp", "ai", "research"] },
  { name: "Murf AI", country: "India", city: "Bengaluru", size: "startup", domain: "speech ai", careersUrl: "https://murf.ai/careers", siteUrl: "https://murf.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/murf-ai", tags: ["speech", "ai", "nlp", "python"] },
  { name: "Glean", country: "Global", city: "Remote", size: "startup", domain: "enterprise search", careersUrl: "https://www.glean.com/careers", siteUrl: "https://www.glean.com", linkedinCompanyUrl: "https://www.linkedin.com/company/gleanwork", tags: ["search", "nlp", "rag", "enterprise"] },
  { name: "Perplexity", country: "Global", city: "Remote", size: "startup", domain: "search ai", careersUrl: "https://www.perplexity.ai/careers", siteUrl: "https://www.perplexity.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/perplexity-ai", tags: ["search", "generative ai", "rag", "ml"] },
  { name: "Stability AI", country: "Global", city: "Remote", size: "startup", domain: "generative ai", careersUrl: "https://stability.ai/careers", siteUrl: "https://stability.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/stability-ai", tags: ["generative ai", "computer vision", "research", "deep learning"] },
  { name: "OpenCV.ai", country: "Global", city: "Remote", size: "small", domain: "computer vision", careersUrl: "https://opencv.ai/careers/", siteUrl: "https://opencv.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/opencv-ai", tags: ["computer vision", "opencv", "deep learning", "python"] },
  { name: "Skit.ai", country: "India", city: "Bengaluru", size: "startup", domain: "voice ai", careersUrl: "https://skit.ai/careers", siteUrl: "https://skit.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/skit-ai", tags: ["speech", "nlp", "python", "ai"] },
  { name: "Uniphore", country: "India", city: "Chennai", size: "medium", domain: "voice ai", careersUrl: "https://www.uniphore.com/careers/", siteUrl: "https://www.uniphore.com", linkedinCompanyUrl: "https://www.linkedin.com/company/uniphore", tags: ["speech", "nlp", "ai", "analytics"] },
  { name: "Fractal", country: "India", city: "Mumbai", size: "medium", domain: "ai analytics", careersUrl: "https://fractal.ai/careers/", siteUrl: "https://fractal.ai", linkedinCompanyUrl: "https://www.linkedin.com/company/fractal-analytics", tags: ["analytics", "data science", "ml", "python"] },
  { name: "Tiger Analytics", country: "India", city: "Chennai", size: "medium", domain: "analytics ai", careersUrl: "https://www.tigeranalytics.com/careers/", siteUrl: "https://www.tigeranalytics.com", linkedinCompanyUrl: "https://www.linkedin.com/company/tiger-analytics", tags: ["analytics", "data science", "python", "sql"] },
  { name: "LatentView", country: "India", city: "Chennai", size: "medium", domain: "analytics", careersUrl: "https://www.latentview.com/careers/", siteUrl: "https://www.latentview.com", linkedinCompanyUrl: "https://www.linkedin.com/company/latentview-analytics", tags: ["analytics", "data", "python", "sql"] },
  { name: "MathCo", country: "India", city: "Bengaluru", size: "medium", domain: "decision intelligence", careersUrl: "https://themathcompany.com/careers", siteUrl: "https://themathcompany.com", linkedinCompanyUrl: "https://www.linkedin.com/company/themathcompany", tags: ["analytics", "ai", "data science", "python"] },
  { name: "Turing", country: "Global", city: "Remote", size: "medium", domain: "talent ai", careersUrl: "https://www.turing.com/jobs", siteUrl: "https://www.turing.com", linkedinCompanyUrl: "https://www.linkedin.com/company/turingcom", tags: ["remote", "python", "developer", "ai"] },
  { name: "ThoughtSpot", country: "India", city: "Bengaluru", size: "medium", domain: "analytics search", careersUrl: "https://www.thoughtspot.com/careers", siteUrl: "https://www.thoughtspot.com", linkedinCompanyUrl: "https://www.linkedin.com/company/thoughtspot", tags: ["search", "analytics", "ai", "python"] },
  { name: "Clari", country: "India", city: "Bengaluru", size: "medium", domain: "revenue ai", careersUrl: "https://www.clari.com/company/careers/", siteUrl: "https://www.clari.com", linkedinCompanyUrl: "https://www.linkedin.com/company/clari", tags: ["ai", "data", "product", "automation"] },
  { name: "Nutanix", country: "India", city: "Bengaluru", size: "enterprise", domain: "cloud", careersUrl: "https://www.nutanix.com/company/careers", siteUrl: "https://www.nutanix.com", linkedinCompanyUrl: "https://www.linkedin.com/company/nutanix", tags: ["cloud", "automation", "data", "python"] },
  { name: "Juspay", country: "India", city: "Bengaluru", size: "medium", domain: "payments", careersUrl: "https://juspay.io/careers", siteUrl: "https://juspay.io", linkedinCompanyUrl: "https://www.linkedin.com/company/juspay", tags: ["fintech", "python", "data", "automation"] },
  { name: "ShareChat", country: "India", city: "Bengaluru", size: "medium", domain: "social ai", careersUrl: "https://sharechat.com/careers", siteUrl: "https://sharechat.com", linkedinCompanyUrl: "https://www.linkedin.com/company/sharechat", tags: ["nlp", "ml", "data", "product"] },
  { name: "Myntra", country: "India", city: "Bengaluru", size: "enterprise", domain: "ecommerce fashion", careersUrl: "https://careers.myntra.com/", siteUrl: "https://www.myntra.com", linkedinCompanyUrl: "https://www.linkedin.com/company/myntra", tags: ["ecommerce", "analytics", "ai", "data"] },
  { name: "Paytm", country: "India", city: "Noida", size: "enterprise", domain: "fintech", careersUrl: "https://paytm.com/careers/", siteUrl: "https://paytm.com", linkedinCompanyUrl: "https://www.linkedin.com/company/paytm", tags: ["fintech", "data", "python", "analytics"] },
  { name: "Airtel IQ", country: "India", city: "Gurugram", size: "enterprise", domain: "communications ai", careersUrl: "https://www.airtel.com/careers/", siteUrl: "https://www.airtel.in", linkedinCompanyUrl: "https://www.linkedin.com/company/airtel", tags: ["automation", "ai", "speech", "data"] },
  { name: "Swiggy", country: "India", city: "Bengaluru", size: "enterprise", domain: "logistics ai", careersUrl: "https://careers.swiggy.com/#/", siteUrl: "https://www.swiggy.com", linkedinCompanyUrl: "https://www.linkedin.com/company/swiggy-in", tags: ["data", "ai", "analytics", "product"] },
  { name: "Zomato", country: "India", city: "Gurugram", size: "enterprise", domain: "consumer internet", careersUrl: "https://www.zomato.com/careers", siteUrl: "https://www.zomato.com", linkedinCompanyUrl: "https://www.linkedin.com/company/zomato", tags: ["data", "analytics", "ai", "product"] },
  { name: "PayU", country: "India", city: "Bengaluru", size: "enterprise", domain: "fintech", careersUrl: "https://corporate.payu.com/careers/", siteUrl: "https://corporate.payu.com", linkedinCompanyUrl: "https://www.linkedin.com/company/payu", tags: ["fintech", "data", "python", "ml"] },
  { name: "Happiest Minds", country: "India", city: "Bengaluru", size: "medium", domain: "digital engineering", careersUrl: "https://www.happiestminds.com/careers/", siteUrl: "https://www.happiestminds.com", linkedinCompanyUrl: "https://www.linkedin.com/company/happiest-minds-technologies", tags: ["automation", "ai", "cloud", "python"] },
  { name: "Persistent Systems", country: "India", city: "Pune", size: "enterprise", domain: "engineering ai", careersUrl: "https://www.persistent.com/careers/", siteUrl: "https://www.persistent.com", linkedinCompanyUrl: "https://www.linkedin.com/company/persistent-systems", tags: ["engineering", "data", "ai", "python"] },
  { name: "LTIMindtree", country: "India", city: "Mumbai", size: "enterprise", domain: "consulting engineering", careersUrl: "https://careers.ltimindtree.com/", siteUrl: "https://www.ltimindtree.com", linkedinCompanyUrl: "https://www.linkedin.com/company/ltimindtree", tags: ["data", "ai", "analytics", "cloud"] }
];

const roleTemplates: RoleTemplate[] = [
  { title: "Software Engineer Intern", experienceLevel: "level0", tags: ["software engineering", "dsa", "javascript", "java"], description: "Entry-level software role focused on coding fundamentals, debugging, APIs, and team collaboration." },
  { title: "Junior Software Engineer", experienceLevel: "level0", tags: ["software engineering", "backend", "frontend", "git"], description: "Fresher-friendly software role covering feature development, testing, and production support." },
  { title: "Backend Developer", experienceLevel: "level0", tags: ["backend", "nodejs", "express", "sql"], description: "Backend-focused role involving API development, databases, and scalable service integration." },
  { title: "Frontend Developer", experienceLevel: "level0", tags: ["frontend", "react", "javascript", "typescript"], description: "Frontend role building responsive UI, component systems, and product-facing web features." },
  { title: "Machine Learning Intern", experienceLevel: "level0", tags: ["machine learning", "python", "intern", "ai"], description: "Entry-level machine learning role focused on Python, experimentation, model evaluation, and practical project delivery." },
  { title: "AI Intern", experienceLevel: "level0", tags: ["ai", "python", "intern", "automation"], description: "Fresher-friendly AI role involving prototyping, prompt iteration, data preparation, and product experimentation." },
  { title: "Associate Data Scientist", experienceLevel: "level0", tags: ["data science", "analytics", "python", "sql"], description: "Associate data scientist role requiring analytics fundamentals, SQL, Python, and communication with business stakeholders." },
  { title: "Junior AI Engineer", experienceLevel: "level0", tags: ["ai", "python", "engineering", "fresher"], description: "Junior AI engineering role with emphasis on coding ability, ML basics, and project-based delivery." },
  { title: "NLP Engineer", experienceLevel: "level1", tags: ["nlp", "transformers", "llm", "python"], description: "NLP role centered on text processing, retrieval, fine-tuning, and shipping production-ready language systems." },
  { title: "AI Engineer", experienceLevel: "level1", tags: ["ai", "python", "cloud", "automation"], description: "AI engineer role focused on model integration, production APIs, evaluation, and cloud-based deployment." },
  { title: "MLOps Engineer", experienceLevel: "level1", tags: ["mlops", "docker", "kubernetes", "monitoring"], description: "MLOps role with CI/CD, deployment workflows, observability, and scalable model-serving pipelines." },
  { title: "Data Scientist", experienceLevel: "level1", tags: ["data science", "machine learning", "analytics", "sql"], description: "Hands-on data science role using experimentation, feature engineering, Python, and analytics storytelling." },
  { title: "Applied AI Engineer", experienceLevel: "level1", tags: ["generative ai", "rag", "llm", "python"], description: "Applied AI role delivering retrieval, summarization, prompt design, and user-facing AI features." },
  { title: "Computer Vision Engineer", experienceLevel: "level1", tags: ["computer vision", "opencv", "deep learning", "python"], description: "Computer vision engineering role with image pipelines, detection models, model evaluation, and deployment." },
  { title: "Software Engineer", experienceLevel: "level1", tags: ["software engineering", "backend", "frontend", "api"], description: "General software engineering role focused on end-to-end feature delivery, quality, and maintainability." },
  { title: "Full Stack Developer", experienceLevel: "level1", tags: ["full stack", "react", "nodejs", "sql"], description: "Full-stack role delivering frontend and backend features, API integrations, and scalable product workflows." },
  { title: "Backend Engineer", experienceLevel: "level1", tags: ["backend", "microservices", "nodejs", "sql"], description: "Backend engineering role with service design, data modeling, and production API ownership." },
  { title: "Frontend Engineer", experienceLevel: "level1", tags: ["frontend", "react", "nextjs", "typescript"], description: "Frontend engineering role emphasizing UX implementation, performance, and component architecture." },
  { title: "Senior AI Engineer", experienceLevel: "level2", tags: ["ai", "architecture", "mlops", "leadership"], description: "Senior AI role requiring architectural ownership, reliability, mentoring, and cross-functional delivery." },
  { title: "Applied Scientist", experienceLevel: "level2", tags: ["research", "machine learning", "nlp", "deep learning"], description: "Research-heavy role requiring rigorous experimentation, strong math foundations, and production impact." },
  { title: "Senior Software Engineer", experienceLevel: "level2", tags: ["software engineering", "architecture", "backend", "system design"], description: "Senior software role requiring architectural ownership, code quality leadership, and scalable system delivery." },
  { title: "Tech Lead", experienceLevel: "level2", tags: ["software engineering", "leadership", "architecture", "backend"], description: "Technical leadership role guiding roadmap execution, design decisions, and cross-team delivery." }
];

const jobBoards: JobBoard[] = [
  {
    name: "LinkedIn Jobs",
    source: "linkedin",
    siteUrl: "https://www.linkedin.com/jobs",
    searchUrl: (query, location) =>
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location || "Remote")}`
  },
  {
    name: "Indeed",
    source: "indeed",
    siteUrl: "https://www.indeed.com",
    searchUrl: (query, location) =>
      `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location || "Remote")}`
  },
  {
    name: "Naukri",
    source: "naukri",
    siteUrl: "https://www.naukri.com",
    searchUrl: (query, location) =>
      `https://www.naukri.com/${encodeURIComponent(query).replace(/%20/g, "-")}-jobs-in-${encodeURIComponent(location || "india").replace(/%20/g, "-")}`
  },
  {
    name: "Foundit",
    source: "foundit",
    siteUrl: "https://www.foundit.in",
    searchUrl: (query, location) =>
      `https://www.foundit.in/srp/results?query=${encodeURIComponent(query)}&locations=${encodeURIComponent(location || "India")}`
  },
  {
    name: "Glassdoor",
    source: "glassdoor",
    siteUrl: "https://www.glassdoor.com",
    searchUrl: (query, location) =>
      `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}&locT=C&locId=&locKeyword=${encodeURIComponent(location || "Remote")}`
  },
  {
    name: "Wellfound",
    source: "wellfound",
    siteUrl: "https://wellfound.com/jobs",
    searchUrl: (query) => `https://wellfound.com/jobs?query=${encodeURIComponent(query)}`
  },
  {
    name: "Hirist",
    source: "hirist",
    siteUrl: "https://www.hirist.com",
    searchUrl: (query) => `https://www.hirist.com/search/${encodeURIComponent(query).replace(/%20/g, "-")}`
  },
  {
    name: "Instahyre",
    source: "instahyre",
    siteUrl: "https://www.instahyre.com",
    searchUrl: (query) => `https://www.instahyre.com/search-jobs/?q=${encodeURIComponent(query)}`
  }
];

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
}

function levelDistance(left: ExperienceLevel, right: ExperienceLevel): number {
  const weight = (level: ExperienceLevel) => (level === "level0" ? 0 : level === "level1" ? 1 : 2);
  return Math.abs(weight(left) - weight(right));
}

function intersects(tokens: string[], tags: string[]): boolean {
  if (tokens.length === 0) {
    return true;
  }

  return tags.some((tag) => {
    const tagTokens = tokenize(tag);
    return tokens.some(
      (token) =>
        tag.includes(token) ||
        token.includes(tag) ||
        tagTokens.includes(token) ||
        tagTokens.some((tagToken) => tagToken.includes(token) || token.includes(tagToken))
    );
  });
}

function overlapCount(tokens: string[], tags: string[]): number {
  return tags.filter((tag) => {
    const tagTokens = tokenize(tag);
    return tokens.some(
      (token) =>
        tag.includes(token) ||
        token.includes(tag) ||
        tagTokens.includes(token) ||
        tagTokens.some((tagToken) => tagToken.includes(token) || token.includes(tagToken))
    );
  }).length;
}

function normalizePostingWindowDays(value: number): number {
  if (value <= 1 / 24) {
    return 1 / 24;
  }

  if (value <= 3) {
    return 3;
  }

  if (value <= 7) {
    return 7;
  }

  return 15;
}

function matchesCountry(company: Company, countryFilter: string): boolean {
  if (countryFilter === "global") {
    return true;
  }

  return company.country.toLowerCase() === "global" || company.country.toLowerCase().includes(countryFilter);
}

function matchesLocation(company: Company, locationFilter: string): boolean {
  if (!locationFilter || locationFilter === "all") {
    return true;
  }

  if (locationFilter === "remote") {
    return (
      company.city.toLowerCase() === "remote" ||
      company.country.toLowerCase() === "global" ||
      ["startup", "medium", "enterprise"].includes(company.size)
    );
  }

  return (
    company.city.toLowerCase().includes(locationFilter) ||
    company.city.toLowerCase() === "remote" ||
    company.country.toLowerCase() === "global"
  );
}

function createPostedAt(ageDays: number): string {
  return new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000).toISOString();
}

export function generateSeedJobs(input: {
  location: string;
  country: string;
  domain: string;
  resumeSkills: string[];
  resumeRoles: string[];
  experienceLevel: ExperienceLevel;
  postingWindowDays: number;
  count?: number;
}): JobPosting[] {
  const count = input.count ?? 30;
  const postingWindowDays = normalizePostingWindowDays(input.postingWindowDays);
  const searchTokens = tokenize(`${input.domain} ${input.resumeSkills.join(" ")} ${input.resumeRoles.join(" ")}`)
    .filter((token) => token.length > 2)
    .slice(0, 16);

  const countryFilter = input.country.toLowerCase();
  const locationFilter = input.location.toLowerCase();

  const candidateRows = companies.flatMap((company, companyIndex) =>
    roleTemplates.map((role, roleIndex) => {
      const overlap = overlapCount(searchTokens, role.tags);
      const companyOverlap = overlapCount(searchTokens, company.tags);

      const ageSeed = ((companyIndex * 5 + roleIndex * 3) % 15) + (role.experienceLevel === "level0" ? 0.04 : 0.5);
      const ageDays = Number(ageSeed.toFixed(2));

      return {
        company,
        role,
        overlap: overlap + companyOverlap,
        levelGap: levelDistance(input.experienceLevel, role.experienceLevel),
        ageDays
      };
    })
  );

  return candidateRows
    .filter((row) => matchesCountry(row.company, countryFilter))
    .filter((row) => matchesLocation(row.company, locationFilter))
    .filter((row) => row.ageDays <= postingWindowDays)
    .filter((row) => intersects(searchTokens, [...row.role.tags, ...row.company.tags]))
    .sort((left, right) => {
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap;
      }

      if (left.levelGap !== right.levelGap) {
        return left.levelGap - right.levelGap;
      }

      return left.ageDays - right.ageDays;
    })
    .slice(0, count)
    .map((row) => {
      const searchQuery = encodeURIComponent(`${row.role.title} ${row.company.name}`);

      return {
        id: stableId("job", `${row.company.name}-${row.role.title}-${row.company.careersUrl}`),
        source: row.company.size === "startup" ? "startup_careers" : "company_career_page",
        title: row.role.title,
        company: row.company.name,
        country: row.company.country,
        location: row.company.city,
        remoteType: row.company.city === "Remote" || row.company.country === "Global" ? "remote" : row.company.size === "enterprise" ? "hybrid" : "onsite",
        postedAt: createPostedAt(row.ageDays),
        applyUrl: `${row.company.careersUrl}${row.company.careersUrl.includes("?") ? "&" : "?"}q=${searchQuery}`,
        companySite: row.company.siteUrl,
        companyContactEmail: row.company.hrInbox,
        publicRecruiterProfiles: [row.company.linkedinCompanyUrl],
        salary: row.role.salary,
        visaSponsorship: row.company.country === "Global" ? "unknown" : "no",
        experienceLevel: row.role.experienceLevel,
        description: `${row.role.description} Skills emphasized: ${row.role.tags.join(", ")}. Company focus: ${row.company.domain}.`,
        risk: "low"
      };
    });
}

export function generateOutreachCompanies(input: {
  domain: string;
  resumeSkills: string[];
  resumeRoles: string[];
  country: string;
  location: string;
  experienceLevel: ExperienceLevel;
  count?: number;
}) {
  const searchTokens = tokenize(`${input.domain} ${input.resumeSkills.join(" ")} ${input.resumeRoles.join(" ")}`)
    .filter((token) => token.length > 2)
    .slice(0, 16);
  const countryFilter = input.country.toLowerCase();
  const locationFilter = input.location.toLowerCase();
  const count = input.count ?? 50;

  return companies
    .filter((company) => matchesCountry(company, countryFilter))
    .filter((company) => matchesLocation(company, locationFilter))
    .map((company) => {
      const companySignals = [...company.tags, ...tokenize(company.domain)];
      const matchCount = overlapCount(searchTokens, companySignals);
      const sizeBoost = company.size === "startup" ? 1 : company.size === "medium" ? 0.6 : 0.3;

      return {
        company,
        matchCount,
        score: matchCount + sizeBoost
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.company.name.localeCompare(right.company.name);
    })
    .slice(0, count)
    .map((row) => ({
      company: row.company.name,
      website: row.company.siteUrl,
      domainFit: row.matchCount >= 3 ? "High" : row.matchCount >= 1 ? "Medium" : "Broad",
      officialContact: row.company.careersUrl,
      publicRecruiterProfile: row.company.linkedinCompanyUrl,
      contactName: "Recruiting Team",
      companyType: row.company.domain,
      companySize: row.company.size
    }));
}

export function generateJobBoardSearchJobs(input: {
  location: string;
  country: string;
  domain: string;
  resumeSkills: string[];
  resumeRoles: string[];
  experienceLevel: ExperienceLevel;
  postingWindowDays: number;
  count?: number;
}): JobPosting[] {
  const count = input.count ?? 40;
  const searchTokens = tokenize(`${input.domain} ${input.resumeSkills.join(" ")} ${input.resumeRoles.join(" ")}`)
    .filter((token) => token.length > 2)
    .slice(0, 10);

  const candidateRoles = roleTemplates
    .filter((role) => levelDistance(input.experienceLevel, role.experienceLevel) <= 1)
    .sort((left, right) => {
      const leftScore = overlapCount(searchTokens, left.tags);
      const rightScore = overlapCount(searchTokens, right.tags);
      return rightScore - leftScore;
    })
    .slice(0, 6);

  const location = input.location || "Remote";
  const country = input.country || "Global";
  const jobs: JobPosting[] = [];

  for (const role of candidateRoles) {
    for (const board of jobBoards) {
      const query = `${role.title} ${input.domain}`.trim();
      const applyUrl = board.searchUrl(query, location);
      jobs.push({
        id: stableId("board_job", `${board.source}-${role.title}-${location}-${query}`),
        source: board.source,
        title: role.title,
        company: board.name,
        country,
        location,
        remoteType: location.toLowerCase() === "remote" ? "remote" : "hybrid",
        postedAt: createPostedAt(0.04),
        applyUrl,
        companySite: board.siteUrl,
        publicRecruiterProfiles: [],
        visaSponsorship: "unknown",
        experienceLevel: role.experienceLevel,
        description: `Live board query for ${role.title}. Keywords: ${searchTokens.slice(0, 6).join(", ")}.`,
        risk: "low"
      });
    }
  }

  return jobs.slice(0, count);
}

export function createDefaultInterviewPack(jobTitle: string, company: string) {
  return {
    questions: [
      `Tell us about yourself and why ${company}.`,
      `Describe a project where you delivered measurable impact as a ${jobTitle}.`,
      "How do you prioritize speed vs quality under deadlines?"
    ],
    starAnswers: [
      "Situation: team had slow analytics process. Task: reduce turnaround time. Action: automated reporting and validation. Result: cycle time reduced significantly.",
      "Situation: model quality needed improvement. Task: increase reliability. Action: improved data quality checks and evaluation process. Result: better consistency in production."
    ],
    domainQuestions: [
      "How do you evaluate model drift and what actions do you take?",
      "When would you choose retrieval augmented generation over fine-tuning?"
    ],
    plan30_60_90: [
      "30 days: understand systems, stakeholders, and current KPIs.",
      "60 days: ship one scoped improvement tied to business metric.",
      "90 days: own a roadmap area and mentor on best practices."
    ]
  };
}

export function riskReasons(risk: "low" | "medium" | "high"): string[] {
  if (risk === "low") {
    return ["Trusted public careers page", "No suspicious wording", "Known company domain"];
  }

  if (risk === "medium") {
    return ["Posting details partially available", "Manual verification recommended"];
  }

  return ["Potential source mismatch", "Unverified posting details"];
}

export function nowPlusDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildReminderDraft(company: string, title: string, day: number): string {
  return `Hi ${company} team, I wanted to follow up on my ${title} application submitted ${day} days ago. I remain very interested and would value the opportunity to discuss how I can contribute.`;
}

export function getNowIso() {
  return nowIso();
}
