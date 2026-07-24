import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Predefined skill dictionary — keyword -> { name, category }
const SKILL_DICTIONARY: Record<string, { name: string; category: string }> = {
  // Programming Languages
  "javascript": { name: "JavaScript", category: "Programming Languages" },
  "typescript": { name: "TypeScript", category: "Programming Languages" },
  "python": { name: "Python", category: "Programming Languages" },
  "java": { name: "Java", category: "Programming Languages" },
  "c++": { name: "C++", category: "Programming Languages" },
  "c#": { name: "C#", category: "Programming Languages" },
  "\\bc\\b": { name: "C", category: "Programming Languages" },
  "go": { name: "Go", category: "Programming Languages" },
  "golang": { name: "Go", category: "Programming Languages" },
  "rust": { name: "Rust", category: "Programming Languages" },
  "ruby": { name: "Ruby", category: "Programming Languages" },
  "php": { name: "PHP", category: "Programming Languages" },
  "swift": { name: "Swift", category: "Programming Languages" },
  "kotlin": { name: "Kotlin", category: "Programming Languages" },
  "scala": { name: "Scala", category: "Programming Languages" },
  "r": { name: "R", category: "Programming Languages" },
  "matlab": { name: "MATLAB", category: "Programming Languages" },
  "perl": { name: "Perl", category: "Programming Languages" },
  "dart": { name: "Dart", category: "Programming Languages" },
  "objective-c": { name: "Objective-C", category: "Programming Languages" },
  "sql": { name: "SQL", category: "Programming Languages" },
  "bash": { name: "Bash", category: "Programming Languages" },
  "shell": { name: "Shell Scripting", category: "Programming Languages" },
  "html": { name: "HTML", category: "Programming Languages" },
  "html5": { name: "HTML5", category: "Programming Languages" },
  "css": { name: "CSS", category: "Programming Languages" },
  "css3": { name: "CSS3", category: "Programming Languages" },
  "sass": { name: "Sass", category: "Programming Languages" },
  "less": { name: "Less", category: "Programming Languages" },

  // Frameworks & Libraries
  "react": { name: "React", category: "Frameworks & Libraries" },
  "react.js": { name: "React", category: "Frameworks & Libraries" },
  "next.js": { name: "Next.js", category: "Frameworks & Libraries" },
  "nextjs": { name: "Next.js", category: "Frameworks & Libraries" },
  "angular": { name: "Angular", category: "Frameworks & Libraries" },
  "vue": { name: "Vue.js", category: "Frameworks & Libraries" },
  "vue.js": { name: "Vue.js", category: "Frameworks & Libraries" },
  "svelte": { name: "Svelte", category: "Frameworks & Libraries" },
  "node.js": { name: "Node.js", category: "Frameworks & Libraries" },
  "nodejs": { name: "Node.js", category: "Frameworks & Libraries" },
  "express": { name: "Express.js", category: "Frameworks & Libraries" },
  "nestjs": { name: "NestJS", category: "Frameworks & Libraries" },
  "django": { name: "Django", category: "Frameworks & Libraries" },
  "flask": { name: "Flask", category: "Frameworks & Libraries" },
  "fastapi": { name: "FastAPI", category: "Frameworks & Libraries" },
  "spring": { name: "Spring", category: "Frameworks & Libraries" },
  "spring boot": { name: "Spring Boot", category: "Frameworks & Libraries" },
  "rails": { name: "Ruby on Rails", category: "Frameworks & Libraries" },
  "laravel": { name: "Laravel", category: "Frameworks & Libraries" },
  ".net": { name: ".NET", category: "Frameworks & Libraries" },
  "asp.net": { name: "ASP.NET", category: "Frameworks & Libraries" },
  "flutter": { name: "Flutter", category: "Frameworks & Libraries" },
  "react native": { name: "React Native", category: "Frameworks & Libraries" },
  "tensorflow": { name: "TensorFlow", category: "Frameworks & Libraries" },
  "pytorch": { name: "PyTorch", category: "Frameworks & Libraries" },
  "keras": { name: "Keras", category: "Frameworks & Libraries" },
  "scikit-learn": { name: "Scikit-learn", category: "Frameworks & Libraries" },
  "sklearn": { name: "Scikit-learn", category: "Frameworks & Libraries" },
  "pandas": { name: "Pandas", category: "Frameworks & Libraries" },
  "numpy": { name: "NumPy", category: "Frameworks & Libraries" },
  "opencv": { name: "OpenCV", category: "Frameworks & Libraries" },
  "jquery": { name: "jQuery", category: "Frameworks & Libraries" },
  "bootstrap": { name: "Bootstrap", category: "Frameworks & Libraries" },
  "tailwind": { name: "Tailwind CSS", category: "Frameworks & Libraries" },
  "tailwindcss": { name: "Tailwind CSS", category: "Frameworks & Libraries" },
  "material-ui": { name: "Material UI", category: "Frameworks & Libraries" },
  "redux": { name: "Redux", category: "Frameworks & Libraries" },
  "graphql": { name: "GraphQL", category: "Frameworks & Libraries" },

  // Cloud & DevOps
  "aws": { name: "AWS", category: "Cloud & DevOps" },
  "amazon web services": { name: "AWS", category: "Cloud & DevOps" },
  "azure": { name: "Azure", category: "Cloud & DevOps" },
  "gcp": { name: "Google Cloud Platform", category: "Cloud & DevOps" },
  "google cloud": { name: "Google Cloud Platform", category: "Cloud & DevOps" },
  "docker": { name: "Docker", category: "Cloud & DevOps" },
  "kubernetes": { name: "Kubernetes", category: "Cloud & DevOps" },
  "k8s": { name: "Kubernetes", category: "Cloud & DevOps" },
  "terraform": { name: "Terraform", category: "Cloud & DevOps" },
  "ansible": { name: "Ansible", category: "Cloud & DevOps" },
  "jenkins": { name: "Jenkins", category: "Cloud & DevOps" },
  "ci/cd": { name: "CI/CD", category: "Cloud & DevOps" },
  "github actions": { name: "GitHub Actions", category: "Cloud & DevOps" },
  "gitlab ci": { name: "GitLab CI", category: "Cloud & DevOps" },
  "circleci": { name: "CircleCI", category: "Cloud & DevOps" },
  "nginx": { name: "Nginx", category: "Cloud & DevOps" },
  "apache": { name: "Apache", category: "Cloud & DevOps" },
  "linux": { name: "Linux", category: "Cloud & DevOps" },
  "ubuntu": { name: "Ubuntu", category: "Cloud & DevOps" },
  "heroku": { name: "Heroku", category: "Cloud & DevOps" },
  "vercel": { name: "Vercel", category: "Cloud & DevOps" },
  "netlify": { name: "Netlify", category: "Cloud & DevOps" },
  "serverless": { name: "Serverless", category: "Cloud & DevOps" },
  "lambda": { name: "AWS Lambda", category: "Cloud & DevOps" },

  // Databases
  "postgresql": { name: "PostgreSQL", category: "Databases" },
  "postgres": { name: "PostgreSQL", category: "Databases" },
  "mysql": { name: "MySQL", category: "Databases" },
  "mongodb": { name: "MongoDB", category: "Databases" },
  "redis": { name: "Redis", category: "Databases" },
  "sqlite": { name: "SQLite", category: "Databases" },
  "oracle": { name: "Oracle DB", category: "Databases" },
  "sql server": { name: "SQL Server", category: "Databases" },
  "dynamodb": { name: "DynamoDB", category: "Databases" },
  "cassandra": { name: "Cassandra", category: "Databases" },
  "elasticsearch": { name: "Elasticsearch", category: "Databases" },
  "firebase": { name: "Firebase", category: "Databases" },
  "supabase": { name: "Supabase", category: "Databases" },
  "neo4j": { name: "Neo4j", category: "Databases" },

  // Tools & Platforms
  "git": { name: "Git", category: "Tools & Platforms" },
  "github": { name: "GitHub", category: "Tools & Platforms" },
  "gitlab": { name: "GitLab", category: "Tools & Platforms" },
  "bitbucket": { name: "Bitbucket", category: "Tools & Platforms" },
  "jira": { name: "Jira", category: "Tools & Platforms" },
  "confluence": { name: "Confluence", category: "Tools & Platforms" },
  "figma": { name: "Figma", category: "Tools & Platforms" },
  "sketch": { name: "Sketch", category: "Tools & Platforms" },
  "adobe xd": { name: "Adobe XD", category: "Tools & Platforms" },
  "photoshop": { name: "Photoshop", category: "Tools & Platforms" },
  "illustrator": { name: "Illustrator", category: "Tools & Platforms" },
  "postman": { name: "Postman", category: "Tools & Platforms" },
  "vs code": { name: "VS Code", category: "Tools & Platforms" },
  "visual studio": { name: "Visual Studio", category: "Tools & Platforms" },
  "intellij": { name: "IntelliJ IDEA", category: "Tools & Platforms" },
  "eclipse": { name: "Eclipse", category: "Tools & Platforms" },
  "slack": { name: "Slack", category: "Tools & Platforms" },
  "trello": { name: "Trello", category: "Tools & Platforms" },
  "notion": { name: "Notion", category: "Tools & Platforms" },

  // Data & Analytics
  "machine learning": { name: "Machine Learning", category: "Data & Analytics" },
  "deep learning": { name: "Deep Learning", category: "Data & Analytics" },
  "data science": { name: "Data Science", category: "Data & Analytics" },
  "data analysis": { name: "Data Analysis", category: "Data & Analytics" },
  "data analytics": { name: "Data Analytics", category: "Data & Analytics" },
  "nlp": { name: "Natural Language Processing", category: "Data & Analytics" },
  "natural language processing": { name: "Natural Language Processing", category: "Data & Analytics" },
  "computer vision": { name: "Computer Vision", category: "Data & Analytics" },
  "tableau": { name: "Tableau", category: "Data & Analytics" },
  "power bi": { name: "Power BI", category: "Data & Analytics" },
  "excel": { name: "Excel", category: "Data & Analytics" },
  "spark": { name: "Apache Spark", category: "Data & Analytics" },
  "hadoop": { name: "Hadoop", category: "Data & Analytics" },
  "kafka": { name: "Kafka", category: "Data & Analytics" },
  "airflow": { name: "Apache Airflow", category: "Data & Analytics" },
  "etl": { name: "ETL", category: "Data & Analytics" },
  "data mining": { name: "Data Mining", category: "Data & Analytics" },
  "statistics": { name: "Statistics", category: "Data & Analytics" },
  "ai": { name: "Artificial Intelligence", category: "Data & Analytics" },
  "artificial intelligence": { name: "Artificial Intelligence", category: "Data & Analytics" },

  // Soft Skills
  "leadership": { name: "Leadership", category: "Soft Skills" },
  "communication": { name: "Communication", category: "Soft Skills" },
  "teamwork": { name: "Teamwork", category: "Soft Skills" },
  "problem solving": { name: "Problem Solving", category: "Soft Skills" },
  "problem-solving": { name: "Problem Solving", category: "Soft Skills" },
  "critical thinking": { name: "Critical Thinking", category: "Soft Skills" },
  "time management": { name: "Time Management", category: "Soft Skills" },
  "project management": { name: "Project Management", category: "Soft Skills" },
  "agile": { name: "Agile", category: "Soft Skills" },
  "scrum": { name: "Scrum", category: "Soft Skills" },
  "kanban": { name: "Kanban", category: "Soft Skills" },
  "collaboration": { name: "Collaboration", category: "Soft Skills" },
  "mentoring": { name: "Mentoring", category: "Soft Skills" },
  "presentation": { name: "Presentation", category: "Soft Skills" },
  "negotiation": { name: "Negotiation", category: "Soft Skills" },

  // Domain Knowledge
  "finance": { name: "Finance", category: "Domain Knowledge" },
  "healthcare": { name: "Healthcare", category: "Domain Knowledge" },
  "e-commerce": { name: "E-commerce", category: "Domain Knowledge" },
  "ecommerce": { name: "E-commerce", category: "Domain Knowledge" },
  "marketing": { name: "Marketing", category: "Domain Knowledge" },
  "seo": { name: "SEO", category: "Domain Knowledge" },
  "fintech": { name: "FinTech", category: "Domain Knowledge" },
  "saas": { name: "SaaS", category: "Domain Knowledge" },
  "blockchain": { name: "Blockchain", category: "Domain Knowledge" },
  "cybersecurity": { name: "Cybersecurity", category: "Domain Knowledge" },
  "security": { name: "Security", category: "Domain Knowledge" },
  "devops": { name: "DevOps", category: "Domain Knowledge" },

  // Testing
  "jest": { name: "Jest", category: "Other Technical" },
  "mocha": { name: "Mocha", category: "Other Technical" },
  "cypress": { name: "Cypress", category: "Other Technical" },
  "selenium": { name: "Selenium", category: "Other Technical" },
  "playwright": { name: "Playwright", category: "Other Technical" },
  "junit": { name: "JUnit", category: "Other Technical" },
  "pytest": { name: "Pytest", category: "Other Technical" },
  "tdd": { name: "TDD", category: "Other Technical" },
  "rest api": { name: "REST API", category: "Other Technical" },
  "restful": { name: "RESTful APIs", category: "Other Technical" },
  "microservices": { name: "Microservices", category: "Other Technical" },
  "websockets": { name: "WebSockets", category: "Other Technical" },
  "oauth": { name: "OAuth", category: "Other Technical" },
  "jwt": { name: "JWT", category: "Other Technical" },

  // ===== Mechanical Engineering =====
  "solidworks": { name: "SolidWorks", category: "Mechanical Engineering" },
  "ansys": { name: "ANSYS", category: "Mechanical Engineering" },
  "autocad": { name: "AutoCAD", category: "Mechanical Engineering" },
  "catia": { name: "CATIA", category: "Mechanical Engineering" },
  "creo": { name: "Creo", category: "Mechanical Engineering" },
  "inventor": { name: "Autodesk Inventor", category: "Mechanical Engineering" },
  "thermodynamics": { name: "Thermodynamics", category: "Mechanical Engineering" },
  "finite element analysis": { name: "Finite Element Analysis (FEA)", category: "Mechanical Engineering" },
  "\\bfea\\b": { name: "Finite Element Analysis (FEA)", category: "Mechanical Engineering" },
  "computational fluid dynamics": { name: "Computational Fluid Dynamics (CFD)", category: "Mechanical Engineering" },
  "\\bcfd\\b": { name: "Computational Fluid Dynamics (CFD)", category: "Mechanical Engineering" },
  "kinematics": { name: "Kinematics", category: "Mechanical Engineering" },
  "dynamics of machinery": { name: "Dynamics of Machinery", category: "Mechanical Engineering" },
  "fluid mechanics": { name: "Fluid Mechanics", category: "Mechanical Engineering" },
  "heat transfer": { name: "Heat Transfer", category: "Mechanical Engineering" },
  "gd&t": { name: "GD&T", category: "Mechanical Engineering" },
  "geometric dimensioning": { name: "GD&T", category: "Mechanical Engineering" },
  "cnc": { name: "CNC Programming", category: "Mechanical Engineering" },
  "lathe": { name: "Lathe Operation", category: "Mechanical Engineering" },
  "milling": { name: "Milling", category: "Mechanical Engineering" },
  "hvac": { name: "HVAC Design", category: "Mechanical Engineering" },
  "welding": { name: "Welding", category: "Mechanical Engineering" },
  "quality control": { name: "Quality Control", category: "Mechanical Engineering" },

  // ===== Civil Engineering =====
  "staad": { name: "STAAD Pro", category: "Civil Engineering" },
  "staad pro": { name: "STAAD Pro", category: "Civil Engineering" },
  "revit": { name: "Revit", category: "Civil Engineering" },
  "etabs": { name: "ETABS", category: "Civil Engineering" },
  "civil 3d": { name: "AutoCAD Civil 3D", category: "Civil Engineering" },
  "sap2000": { name: "SAP2000", category: "Civil Engineering" },
  "primavera": { name: "Primavera", category: "Civil Engineering" },
  "geotechnical": { name: "Geotechnical Analysis", category: "Civil Engineering" },
  "structural dynamics": { name: "Structural Dynamics", category: "Civil Engineering" },
  "rcc design": { name: "RCC Design", category: "Civil Engineering" },
  "reinforced concrete": { name: "RCC Design", category: "Civil Engineering" },
  "soil mechanics": { name: "Soil Mechanics", category: "Civil Engineering" },
  "structural analysis": { name: "Structural Analysis", category: "Civil Engineering" },
  "site surveying": { name: "Site Surveying", category: "Civil Engineering" },
  "quantity estimation": { name: "Quantity Estimation", category: "Civil Engineering" },
  "bar bending schedule": { name: "Bar Bending Schedule", category: "Civil Engineering" },
  "\\bbbs\\b": { name: "Bar Bending Schedule", category: "Civil Engineering" },
  "\\bgis\\b": { name: "GIS", category: "Civil Engineering" },
  "total station": { name: "Total Station", category: "Civil Engineering" },
  "construction management": { name: "Construction Management", category: "Civil Engineering" },

  // ===== Electrical Engineering =====
  "simulink": { name: "Simulink", category: "Electrical Engineering" },
  "etap": { name: "ETAP", category: "Electrical Engineering" },
  "pscad": { name: "PSCAD", category: "Electrical Engineering" },
  "orcad": { name: "OrCAD", category: "Electrical Engineering" },
  "pspice": { name: "PSpice", category: "Electrical Engineering" },
  "power systems": { name: "Power Systems", category: "Electrical Engineering" },
  "control systems": { name: "Control Systems", category: "Electrical Engineering" },
  "high voltage": { name: "High Voltage Engineering", category: "Electrical Engineering" },
  "switchgear": { name: "Switchgear & Protection", category: "Electrical Engineering" },
  "electrical machines": { name: "Electrical Machines", category: "Electrical Engineering" },
  "circuit theory": { name: "Circuit Theory", category: "Electrical Engineering" },
  "power electronics": { name: "Power Electronics", category: "Electrical Engineering" },
  "\\bplc\\b": { name: "PLC", category: "Electrical Engineering" },
  "programmable logic controller": { name: "PLC", category: "Electrical Engineering" },
  "scada": { name: "SCADA", category: "Electrical Engineering" },
  "panel design": { name: "Panel Design", category: "Electrical Engineering" },
  "microcontrollers": { name: "Microcontrollers", category: "Electrical Engineering" },

  // ===== ECE / Electronics =====
  "verilog": { name: "Verilog", category: "Electronics & Communication" },
  "vhdl": { name: "VHDL", category: "Electronics & Communication" },
  "cadence virtuoso": { name: "Cadence Virtuoso", category: "Electronics & Communication" },
  "altium": { name: "Altium Designer", category: "Electronics & Communication" },
  "kicad": { name: "KiCAD", category: "Electronics & Communication" },
  "embedded c": { name: "Embedded C", category: "Electronics & Communication" },
  "keil": { name: "Keil", category: "Electronics & Communication" },
  "digital signal processing": { name: "Digital Signal Processing (DSP)", category: "Electronics & Communication" },
  "\\bdsp\\b": { name: "Digital Signal Processing (DSP)", category: "Electronics & Communication" },
  "microprocessors": { name: "Microprocessors", category: "Electronics & Communication" },
  "vlsi": { name: "VLSI Design", category: "Electronics & Communication" },
  "signal integrity": { name: "Signal Integrity", category: "Electronics & Communication" },
  "rf communication": { name: "RF Communication", category: "Electronics & Communication" },
  "antenna theory": { name: "Antenna Theory", category: "Electronics & Communication" },
  "wireless networks": { name: "Wireless Networks", category: "Electronics & Communication" },
  "oscilloscope": { name: "Oscilloscope", category: "Electronics & Communication" },
  "logic analyzer": { name: "Logic Analyzer", category: "Electronics & Communication" },
  "spectrum analyzer": { name: "Spectrum Analyzer", category: "Electronics & Communication" },
  "pcb layout": { name: "PCB Layout", category: "Electronics & Communication" },
  "soldering": { name: "Soldering", category: "Electronics & Communication" },

  // ===== CS Core Concepts =====
  "data structures": { name: "Data Structures & Algorithms", category: "Computer Science Core" },
  "\\bdsa\\b": { name: "Data Structures & Algorithms", category: "Computer Science Core" },
  "algorithms": { name: "Algorithms", category: "Computer Science Core" },
  "system design": { name: "System Design", category: "Computer Science Core" },
  "object-oriented programming": { name: "OOP", category: "Computer Science Core" },
  "\\boop\\b": { name: "OOP", category: "Computer Science Core" },
  "operating systems": { name: "Operating Systems", category: "Computer Science Core" },
  "computer networks": { name: "Computer Networks", category: "Computer Science Core" },

  // ===== AI/ML/LLM =====
  "hugging face": { name: "Hugging Face Transformers", category: "AI / ML / LLM" },
  "transformers": { name: "Hugging Face Transformers", category: "AI / ML / LLM" },
  "langchain": { name: "LangChain", category: "AI / ML / LLM" },
  "llamaindex": { name: "LlamaIndex", category: "AI / ML / LLM" },
  "scipy": { name: "SciPy", category: "AI / ML / LLM" },
  "jupyter": { name: "Jupyter", category: "AI / ML / LLM" },
  "mlflow": { name: "MLflow", category: "AI / ML / LLM" },
  "weights & biases": { name: "Weights & Biases", category: "AI / ML / LLM" },
  "wandb": { name: "Weights & Biases", category: "AI / ML / LLM" },
  "\\bcnn\\b": { name: "Convolutional Neural Networks", category: "AI / ML / LLM" },
  "convolutional neural": { name: "Convolutional Neural Networks", category: "AI / ML / LLM" },
  "\\brnn\\b": { name: "Recurrent Neural Networks", category: "AI / ML / LLM" },
  "recurrent neural": { name: "Recurrent Neural Networks", category: "AI / ML / LLM" },
  "transformer architecture": { name: "Transformer Architecture", category: "AI / ML / LLM" },
  "attention mechanism": { name: "Attention Mechanisms", category: "AI / ML / LLM" },
  "feature engineering": { name: "Feature Engineering", category: "AI / ML / LLM" },
  "fine-tuning": { name: "Fine-Tuning", category: "AI / ML / LLM" },
  "fine tuning": { name: "Fine-Tuning", category: "AI / ML / LLM" },
  "retrieval-augmented generation": { name: "RAG", category: "AI / ML / LLM" },
  "\\brag\\b": { name: "RAG", category: "AI / ML / LLM" },
  "prompt engineering": { name: "Prompt Engineering", category: "AI / ML / LLM" },

  // ===== Data Engineering =====
  "databricks": { name: "Databricks", category: "Data Engineering" },
  "snowflake": { name: "Snowflake", category: "Data Engineering" },
  "\\bdbt\\b": { name: "dbt", category: "Data Engineering" },
  "luigi": { name: "Luigi", category: "Data Engineering" },
  "bigquery": { name: "Google BigQuery", category: "Data Engineering" },
  "redshift": { name: "Amazon Redshift", category: "Data Engineering" },
  "clickhouse": { name: "ClickHouse", category: "Data Engineering" },
  "data modeling": { name: "Data Modeling", category: "Data Engineering" },
  "star schema": { name: "Star Schema", category: "Data Engineering" },
  "snowflake schema": { name: "Snowflake Schema", category: "Data Engineering" },
  "data lake": { name: "Data Lakes", category: "Data Engineering" },
  "data governance": { name: "Data Governance", category: "Data Engineering" },
  "distributed computing": { name: "Distributed Computing", category: "Data Engineering" },

  // ===== Data Analytics =====
  "looker": { name: "Looker", category: "Data Analytics" },
  "qlik": { name: "Qlik Sense", category: "Data Analytics" },
  "\\bvba\\b": { name: "Excel VBA", category: "Data Analytics" },
  "\\bdax\\b": { name: "DAX", category: "Data Analytics" },
  "power query": { name: "Power Query", category: "Data Analytics" },
  "exploratory data analysis": { name: "EDA", category: "Data Analytics" },
  "\\beda\\b": { name: "EDA", category: "Data Analytics" },
  "a/b testing": { name: "A/B Testing", category: "Data Analytics" },
  "business intelligence": { name: "Business Intelligence", category: "Data Analytics" },
  "dashboard": { name: "Dashboard Design", category: "Data Analytics" },
  "\\bkpi\\b": { name: "KPI Tracking", category: "Data Analytics" },
  "cohort analysis": { name: "Cohort Analysis", category: "Data Analytics" },

  // ===== Cybersecurity =====
  "wireshark": { name: "Wireshark", category: "Cybersecurity" },
  "metasploit": { name: "Metasploit", category: "Cybersecurity" },
  "nmap": { name: "Nmap", category: "Cybersecurity" },
  "burp suite": { name: "Burp Suite", category: "Cybersecurity" },
  "splunk": { name: "Splunk", category: "Cybersecurity" },
  "snort": { name: "Snort", category: "Cybersecurity" },
  "nessus": { name: "Nessus", category: "Cybersecurity" },
  "penetration testing": { name: "Penetration Testing", category: "Cybersecurity" },
  "vulnerability assessment": { name: "Vulnerability Assessment", category: "Cybersecurity" },
  "network security": { name: "Network Security", category: "Cybersecurity" },
  "cryptography": { name: "Cryptography", category: "Cybersecurity" },
  "incident response": { name: "Incident Response", category: "Cybersecurity" },
  "\\bsiem\\b": { name: "SIEM", category: "Cybersecurity" },
  "\\biam\\b": { name: "Identity & Access Management", category: "Cybersecurity" },
  "\\bsoc\\b": { name: "SOC Operations", category: "Cybersecurity" },
  "zero trust": { name: "Zero Trust Architecture", category: "Cybersecurity" },
  "owasp": { name: "OWASP Top 10", category: "Cybersecurity" },

  // ===== IoT =====
  "arduino": { name: "Arduino", category: "IoT" },
  "raspberry pi": { name: "Raspberry Pi", category: "IoT" },
  "esp32": { name: "ESP32", category: "IoT" },
  "esp8266": { name: "ESP8266", category: "IoT" },
  "stm32": { name: "STM32", category: "IoT" },
  "mqtt": { name: "MQTT", category: "IoT" },
  "coap": { name: "CoAP", category: "IoT" },
  "zigbee": { name: "Zigbee", category: "IoT" },
  "lorawan": { name: "LoRaWAN", category: "IoT" },
  "\\bble\\b": { name: "Bluetooth Low Energy", category: "IoT" },
  "modbus": { name: "Modbus", category: "IoT" },
  "embedded systems": { name: "Embedded Systems", category: "IoT" },
  "edge computing": { name: "Edge Computing", category: "IoT" },
  "firmware": { name: "Firmware Development", category: "IoT" },
  "\\brtos\\b": { name: "RTOS", category: "IoT" },
  "aws iot": { name: "AWS IoT", category: "IoT" },
  "azure iot": { name: "Azure IoT Hub", category: "IoT" },

  // ===== Blockchain =====
  "ethereum": { name: "Ethereum", category: "Blockchain" },
  "hyperledger": { name: "Hyperledger Fabric", category: "Blockchain" },
  "solana": { name: "Solana", category: "Blockchain" },
  "hardhat": { name: "Hardhat", category: "Blockchain" },
  "truffle": { name: "Truffle", category: "Blockchain" },
  "web3.js": { name: "Web3.js", category: "Blockchain" },
  "ethers.js": { name: "Ethers.js", category: "Blockchain" },
  "solidity": { name: "Solidity", category: "Blockchain" },
  "vyper": { name: "Vyper", category: "Blockchain" },
  "smart contracts": { name: "Smart Contracts", category: "Blockchain" },
  "dapp": { name: "dApps", category: "Blockchain" },
  "proof of stake": { name: "Proof of Stake", category: "Blockchain" },
  "proof of work": { name: "Proof of Work", category: "Blockchain" },
  "erc-20": { name: "ERC-20", category: "Blockchain" },
  "erc-721": { name: "ERC-721", category: "Blockchain" },
  "\\bdefi\\b": { name: "DeFi", category: "Blockchain" },
  "zero-knowledge": { name: "Zero-Knowledge Proofs", category: "Blockchain" },

  // ===== Biotechnology =====
  "polymerase chain reaction": { name: "PCR", category: "Biotechnology" },
  "\\bpcr\\b": { name: "PCR", category: "Biotechnology" },
  "\\bhplc\\b": { name: "HPLC", category: "Biotechnology" },
  "gel electrophoresis": { name: "Gel Electrophoresis", category: "Biotechnology" },
  "cell culture": { name: "Cell Culture", category: "Biotechnology" },
  "fermentation": { name: "Fermentation", category: "Biotechnology" },
  "mass spectrometry": { name: "Mass Spectrometry", category: "Biotechnology" },
  "western blot": { name: "Western Blotting", category: "Biotechnology" },
  "blast": { name: "BLAST", category: "Biotechnology" },
  "pymol": { name: "PyMOL", category: "Biotechnology" },
  "bioconductor": { name: "Bioconductor", category: "Biotechnology" },
  "snapgene": { name: "SnapGene", category: "Biotechnology" },
  "bioinformatics": { name: "Bioinformatics", category: "Biotechnology" },
  "crispr": { name: "CRISPR", category: "Biotechnology" },
  "molecular biology": { name: "Molecular Biology", category: "Biotechnology" },
  "immunology": { name: "Immunology", category: "Biotechnology" },
  "recombinant dna": { name: "Recombinant DNA Technology", category: "Biotechnology" },

  // ===== Mass Communication & Media =====
  "premiere pro": { name: "Adobe Premiere Pro", category: "Mass Communication & Media" },
  "final cut": { name: "Final Cut Pro", category: "Mass Communication & Media" },
  "davinci resolve": { name: "DaVinci Resolve", category: "Mass Communication & Media" },
  "audacity": { name: "Audacity", category: "Mass Communication & Media" },
  "lightroom": { name: "Lightroom", category: "Mass Communication & Media" },
  "investigative journalism": { name: "Investigative Journalism", category: "Mass Communication & Media" },
  "copywriting": { name: "Copywriting", category: "Mass Communication & Media" },
  "video editing": { name: "Video Editing", category: "Mass Communication & Media" },
  "media planning": { name: "Media Planning", category: "Mass Communication & Media" },
  "broadcast": { name: "Broadcast Operations", category: "Mass Communication & Media" },
  "scriptwriting": { name: "Scriptwriting", category: "Mass Communication & Media" },
  "public relations": { name: "Public Relations", category: "Mass Communication & Media" },
  "content strategy": { name: "Content Strategy", category: "Mass Communication & Media" },
  "digital marketing": { name: "Digital Marketing", category: "Mass Communication & Media" },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSkills(text: string): Array<{ name: string; category: string; proficiencyHint: string }> {
  const lower = text.toLowerCase();
  const found = new Map<string, { name: string; category: string; count: number }>();

  for (const [keyword, meta] of Object.entries(SKILL_DICTIONARY)) {
    // If keyword already looks like regex (contains \b), use as-is; else build word-boundary pattern
    let pattern: RegExp;
    if (keyword.startsWith("\\b")) {
      pattern = new RegExp(keyword, "gi");
    } else {
      const escaped = escapeRegex(keyword);
      // Use lookaround-ish boundaries for tokens containing symbols like +, #, .
      pattern = new RegExp(`(^|[^a-z0-9+#.])${escaped}(?![a-z0-9+#])`, "gi");
    }
    const matches = lower.match(pattern);
    if (matches && matches.length > 0) {
      const existing = found.get(meta.name);
      if (existing) {
        existing.count += matches.length;
      } else {
        found.set(meta.name, { name: meta.name, category: meta.category, count: matches.length });
      }
    }
  }

  return Array.from(found.values()).map((s) => ({
    name: s.name,
    category: s.category,
    proficiencyHint: s.count >= 3 ? "Advanced" : s.count === 2 ? "Intermediate" : "Beginner",
  }));
}

function detectExperienceLevel(text: string): string {
  const lower = text.toLowerCase();

  // Look for years of experience
  const yearMatches = [...lower.matchAll(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi)];
  let maxYears = 0;
  for (const m of yearMatches) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > maxYears) maxYears = n;
  }

  if (maxYears >= 8) return "Staff/Principal";
  if (maxYears >= 5) return "Senior Level";
  if (maxYears >= 2) return "Mid Level";
  if (maxYears > 0) return "Entry Level";

  // Fallback: keyword hints
  if (/\b(principal|staff engineer|architect|distinguished)\b/i.test(text)) return "Staff/Principal";
  if (/\b(senior|sr\.|lead|manager)\b/i.test(text)) return "Senior Level";
  if (/\b(intern|internship|junior|jr\.|trainee|student|fresher|graduate)\b/i.test(text)) return "Entry Level";
  if (/\b(mid[- ]level|software engineer|developer|analyst)\b/i.test(text)) return "Mid Level";

  return "Entry Level";
}

function extractJobTitles(text: string): string[] {
  const titles = new Set<string>();
  const patterns = [
    /\b(Software Engineer|Software Developer|Full[- ]Stack Developer|Frontend Developer|Front[- ]End Developer|Backend Developer|Back[- ]End Developer|Web Developer|Mobile Developer|iOS Developer|Android Developer|Data Scientist|Data Analyst|Data Engineer|Machine Learning Engineer|ML Engineer|AI Engineer|DevOps Engineer|Site Reliability Engineer|SRE|Cloud Engineer|Security Engineer|QA Engineer|Test Engineer|Product Manager|Project Manager|Program Manager|Engineering Manager|Technical Lead|Tech Lead|Team Lead|Solutions Architect|Software Architect|Systems Analyst|Business Analyst|UX Designer|UI Designer|Product Designer|Graphic Designer|Intern|Consultant|Research Scientist|Research Engineer|Database Administrator|DBA|Network Engineer|Systems Engineer)\b/gi,
  ];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) {
      for (const m of matches) {
        // Normalize casing
        titles.add(m.replace(/\s+/g, " ").trim());
      }
    }
  }
  return Array.from(titles).slice(0, 10);
}

function extractIndustries(text: string): string[] {
  const industries = new Set<string>();
  const map: Record<string, string> = {
    "fintech": "FinTech",
    "finance": "Finance",
    "banking": "Banking",
    "healthcare": "Healthcare",
    "health tech": "HealthTech",
    "e-commerce": "E-commerce",
    "ecommerce": "E-commerce",
    "retail": "Retail",
    "education": "Education",
    "edtech": "EdTech",
    "gaming": "Gaming",
    "media": "Media",
    "entertainment": "Entertainment",
    "telecommunications": "Telecommunications",
    "logistics": "Logistics",
    "manufacturing": "Manufacturing",
    "automotive": "Automotive",
    "aerospace": "Aerospace",
    "energy": "Energy",
    "insurance": "Insurance",
    "real estate": "Real Estate",
    "consulting": "Consulting",
    "government": "Government",
    "non-profit": "Non-profit",
    "saas": "SaaS",
    "technology": "Technology",
  };
  const lower = text.toLowerCase();
  for (const [kw, name] of Object.entries(map)) {
    if (lower.includes(kw)) industries.add(name);
  }
  if (industries.size === 0) industries.add("Technology");
  return Array.from(industries);
}

function buildSummary(
  skills: Array<{ name: string }>,
  experienceLevel: string,
  jobTitles: string[],
  industries: string[],
): string {
  const topSkills = skills.slice(0, 5).map((s) => s.name).join(", ");
  const roleText = jobTitles.length > 0 ? jobTitles.slice(0, 2).join(" / ") : "professional";
  const industryText = industries.length > 0 ? industries.slice(0, 2).join(" and ") : "technology";
  return `${experienceLevel} ${roleText} with experience across ${industryText}. Core strengths include ${topSkills || "various technical skills"}. Well-suited for roles that leverage this technical background.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_RESUME_CHARS = 50000;
    if (resumeText.length > MAX_RESUME_CHARS) {
      return new Response(
        JSON.stringify({ error: `Resume text too long (max ${MAX_RESUME_CHARS} characters)` }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing resume locally, text length:', resumeText.length);

    const skills = extractSkills(resumeText);
    const experienceLevel = detectExperienceLevel(resumeText);
    const jobTitles = extractJobTitles(resumeText);
    const industries = extractIndustries(resumeText);
    const summary = buildSummary(skills, experienceLevel, jobTitles, industries);

    if (skills.length === 0) {
      // Provide a small fallback so downstream flows still work
      skills.push(
        { name: "Communication", category: "Soft Skills", proficiencyHint: "Intermediate" },
        { name: "Problem Solving", category: "Soft Skills", proficiencyHint: "Intermediate" },
      );
    }

    const parsedResume = {
      skills,
      experienceLevel,
      jobTitles,
      industries,
      summary,
    };

    console.log(`Extracted ${skills.length} skills, level: ${experienceLevel}`);

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-resume:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
