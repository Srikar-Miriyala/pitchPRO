// components/ResultsPanel.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

// Simple Markdown bold parser
const parseMarkdownBold = (text) => {
  if (!text) return text;
  return text.split('**').map((part, index) => 
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part
  );
};

export default function ResultsPanel({ job }){
  const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
  const [status, setStatus] = useState(job?.status || "queued");
  const [pitch, setPitch] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    
    async function poll() {
      const jobId = job.job_id;
      let attempts = 0;
      const maxAttempts = 40;
      
      while (!cancelled && attempts < maxAttempts) {
        try {
          const statusResp = await axios.get(`${API_BASE}/api/v1/pitches/${jobId}/status`);
          const statusData = statusResp.data;
          setStatus(statusData.status);
          
          if (statusData.status === "done") {
            try {
              const pitchResp = await axios.get(`${API_BASE}/api/v1/pitches/${jobId}/pitch`);
              setPitch(pitchResp.data);
            } catch (pitchError) {
              console.error("Failed to fetch pitch data:", pitchError);
            }
            
            if (statusData.download_url) {
              setDownloadUrl(`${API_BASE}${statusData.download_url}`);
            } else if (statusData.has_pptx) {
              setDownloadUrl(`${API_BASE}/static/output/${jobId}/pitch.pptx`);
            }
            break;
          } else if (statusData.status === "error") {
            setError("Job failed during processing");
            break;
          }
        } catch(e) {
          console.warn("Poll error:", e);
          if (attempts > 10) {
            setError("Failed to connect to backend");
            break;
          }
        }
        
        attempts++;
        await new Promise(r => setTimeout(r, 1500));
      }
      
      if (attempts >= maxAttempts && !cancelled) {
        setError("Job timed out");
      }
    }
    
    if (job && job.job_id) {
      poll();
    }
    
    return () => { cancelled = true; };
  }, [job, API_BASE]);

  // Format Indian Rupees with commas
  const formatINR = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    if (amount >= 10000000) {
      return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
    } else if (amount >= 100000) {
      return '₹' + (amount / 100000).toFixed(1) + ' L';
    } else {
      return '₹' + amount.toLocaleString('en-IN');
    }
  };

  // Calculate total funding required from financials
  const calculateTotalFunding = () => {
    if (!pitch?.financials || pitch.financials.length === 0) return 0;
    
    // Use Year 1 cost as total funding requirement
    const year1Cost = pitch.financials[0].cost;
    
    // Ensure it's a reasonable number (not ₹20)
    if (year1Cost && year1Cost < 1000) {
      // If unrealistically low, calculate based on business type
      const businessType = detectBusinessType(pitch);
      const baseAmounts = {
        manufacturing: 700000,
        agriculture: 500000,
        green_energy: 1200000,
        healthcare: 800000,
        education: 400000,
        ecommerce: 300000,
        tech: 500000,
        general: 500000
      };
      return baseAmounts[businessType] || 500000;
    }
    
    return year1Cost || 500000;
  };

  // components/ResultsPanel.jsx - Updated detectBusinessType function
const detectBusinessType = (pitch) => {
  if (!pitch) return 'general';
  
  const content = JSON.stringify(pitch).toLowerCase();
  const idea = pitch.idea?.toLowerCase() || '';
  const elevatorPitch = pitch.elevator_pitch?.toLowerCase() || '';
  const execSummary = pitch.executive_summary?.toLowerCase() || '';
  
  const fullText = idea + ' ' + elevatorPitch + ' ' + execSummary + ' ' + content;
  
  // Tech & Software (should catch AI chatbot)
  if (fullText.includes('ai') || fullText.includes('chatbot') || 
      fullText.includes('software') || fullText.includes('platform') ||
      fullText.includes('digital') || fullText.includes('app') ||
      fullText.includes('saas') || fullText.includes('api') ||
      fullText.includes('algorithm') || fullText.includes('intelligent') ||
      fullText.includes('automation') || fullText.includes('bot') ||
      idea.includes('ai') || idea.includes('chatbot') ||
      idea.includes('software') || idea.includes('platform')) {
    return 'tech';
  }
  // Manufacturing & Construction (more specific keywords)
  else if ((fullText.includes('manufactur') && !fullText.includes('manufactur')) || 
           fullText.includes('factory') || fullText.includes('assembly line') ||
           fullText.includes('production line') || fullText.includes('machinery') ||
           fullText.includes('equipment') || fullText.includes('brick') ||
           fullText.includes('block') || fullText.includes('construction') ||
           fullText.includes('physical product') || fullText.includes('hardware') ||
           (fullText.includes('make') && fullText.includes('product')) ||
           (fullText.includes('produce') && fullText.includes('goods'))) {
    return 'manufacturing';
  }
  // Agriculture & Farming
  else if (fullText.includes('agriculture') || fullText.includes('farm') || 
           fullText.includes('crop') || fullText.includes('cultivat') ||
           fullText.includes('harvest') || fullText.includes('livestock') ||
           idea.includes('agriculture') || idea.includes('farm')) {
    return 'agriculture';
  }
  // Green Energy & Sustainability
  else if (fullText.includes('solar') || fullText.includes('wind') || 
           fullText.includes('renewable') || fullText.includes('energy') ||
           fullText.includes('sustainable') && fullText.includes('energy') ||
           fullText.includes('carbon') || fullText.includes('environmental') ||
           idea.includes('solar') || idea.includes('energy')) {
    return 'green_energy';
  }
  // Healthcare & Medical
  else if (fullText.includes('medical') || fullText.includes('healthcare') || 
           fullText.includes('hospital') || fullText.includes('clinic') ||
           fullText.includes('patient') || fullText.includes('treatment') ||
           fullText.includes('wellness') && fullText.includes('medical') ||
           idea.includes('health') || idea.includes('medical')) {
    return 'healthcare';
  }
  // Education & Learning
  else if (fullText.includes('education') || fullText.includes('learning') || 
           fullText.includes('edtech') || fullText.includes('course') ||
           fullText.includes('student') || fullText.includes('teacher') ||
           fullText.includes('university') || fullText.includes('college') ||
           idea.includes('education') || idea.includes('learning')) {
    return 'education';
  }
  // E-commerce & Retail
  else if (fullText.includes('ecommerce') || fullText.includes('e-commerce') || 
           fullText.includes('marketplace') || fullText.includes('retail') ||
           fullText.includes('online store') || fullText.includes('sell online') ||
           fullText.includes('shopping') || fullText.includes('e-tail') ||
           idea.includes('ecommerce') || idea.includes('marketplace')) {
    return 'ecommerce';
  }
  else {
    return 'general';
  }
};

  // Generate realistic budget details for any business type
  const generateBudgetDetails = (pitch) => {
    if (pitch.budget_breakdown) return pitch.budget_breakdown;
    
    const totalFunding = calculateTotalFunding();
    const businessType = detectBusinessType(pitch);
    
    // Base templates for different business types
    const budgetTemplates = {
      manufacturing: {
        equipment_infrastructure: [
          `**Manufacturing Equipment & Machinery**: ${formatINR(totalFunding * 0.35)}`,
          `**Factory/Production Facility Setup**: ${formatINR(totalFunding * 0.25)}`,
          `**Raw Material Inventory & Storage**: ${formatINR(totalFunding * 0.15)}`,
          `**Quality Control & Testing Equipment**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Production Team & Technicians**: ${formatINR(totalFunding * 0.20)}`,
          `**Quality Control & Operations Staff**: ${formatINR(totalFunding * 0.10)}`,
          `**Management & Administration**: ${formatINR(totalFunding * 0.07)}`
        ],
        marketing_sales: [
          `**Sales & Distribution Network**: ${formatINR(totalFunding * 0.12)}`,
          `**Marketing & Brand Development**: ${formatINR(totalFunding * 0.08)}`,
          `**Trade Shows & Industry Events**: ${formatINR(totalFunding * 0.04)}`
        ],
        legal_operations: [
          `**Factory Licenses & Permits**: ${formatINR(totalFunding * 0.05)}`,
          `**Compliance & Safety Certifications**: ${formatINR(totalFunding * 0.03)}`,
          `**Business Insurance & Legal**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      tech: {
        product_development: [
          `**Platform/App Development**: ${formatINR(totalFunding * 0.35)}`,
          `**Cloud Infrastructure & Hosting**: ${formatINR(totalFunding * 0.15)}`,
          `**Security & Data Protection**: ${formatINR(totalFunding * 0.08)}`,
          `**Third-party API Integrations**: ${formatINR(totalFunding * 0.07)}`
        ],
        team_operations: [
          `**Development Team** (2-3 members): ${formatINR(totalFunding * 0.18)}`,
          `**Essential Support Staff**: ${formatINR(totalFunding * 0.07)}`,
          `**Co-working Space & Utilities**: ${formatINR(totalFunding * 0.05)}`
        ],
        marketing_launch: [
          `**Digital Marketing & User Acquisition**: ${formatINR(totalFunding * 0.12)}`,
          `**Content Creation & SEO**: ${formatINR(totalFunding * 0.05)}`,
          `**Launch Campaign & PR**: ${formatINR(totalFunding * 0.03)}`
        ],
        legal_operations: [
          `**Company Registration & Legal**: ${formatINR(totalFunding * 0.04)}`,
          `**Compliance & Business Insurance**: ${formatINR(totalFunding * 0.03)}`,
          `**Accounting & Professional Services**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      agriculture: {
        equipment_infrastructure: [
          `**Farm Equipment & Machinery**: ${formatINR(totalFunding * 0.25)}`,
          `**IoT Sensors & Monitoring Systems**: ${formatINR(totalFunding * 0.15)}`,
          `**Processing & Storage Facilities**: ${formatINR(totalFunding * 0.12)}`,
          `**Transportation & Logistics**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Agricultural Experts & Technicians**: ${formatINR(totalFunding * 0.18)}`,
          `**Field Operations Team**: ${formatINR(totalFunding * 0.12)}`,
          `**Management & Support Staff**: ${formatINR(totalFunding * 0.06)}`
        ],
        inputs_marketing: [
          `**Seeds, Fertilizers & Inputs**: ${formatINR(totalFunding * 0.15)}`,
          `**Market Development & Sales**: ${formatINR(totalFunding * 0.08)}`,
          `**Quality Testing & Certification**: ${formatINR(totalFunding * 0.04)}`
        ],
        legal_operations: [
          `**Land Agreements & Legal**: ${formatINR(totalFunding * 0.05)}`,
          `**Regulatory Compliance**: ${formatINR(totalFunding * 0.03)}`,
          `**Insurance & Risk Management**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      green_energy: {
        technology_infrastructure: [
          `**Energy Generation Systems**: ${formatINR(totalFunding * 0.30)}`,
          `**Monitoring & Control Systems**: ${formatINR(totalFunding * 0.15)}`,
          `**Energy Storage Solutions**: ${formatINR(totalFunding * 0.10)}`,
          `**Grid Integration & Safety**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Technical Team & Engineers**: ${formatINR(totalFunding * 0.16)}`,
          `**Installation & Maintenance Crew**: ${formatINR(totalFunding * 0.10)}`,
          `**Project Management**: ${formatINR(totalFunding * 0.06)}`
        ],
        permits_marketing: [
          `**Regulatory Permits & Approvals**: ${formatINR(totalFunding * 0.08)}`,
          `**Market Development & Partnerships**: ${formatINR(totalFunding * 0.07)}`,
          `**Community Engagement**: ${formatINR(totalFunding * 0.04)}`
        ],
        legal_operations: [
          `**Legal Structure & Compliance**: ${formatINR(totalFunding * 0.06)}`,
          `**Insurance & Liability Coverage**: ${formatINR(totalFunding * 0.04)}`,
          `**Professional Certifications**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      healthcare: {
        medical_equipment: [
          `**Medical Devices & Equipment**: ${formatINR(totalFunding * 0.28)}`,
          `**Clinic/ Facility Setup**: ${formatINR(totalFunding * 0.20)}`,
          `**IT Systems & Software**: ${formatINR(totalFunding * 0.12)}`,
          `**Medical Supplies & Inventory**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Medical Professionals**: ${formatINR(totalFunding * 0.22)}`,
          `**Support & Admin Staff**: ${formatINR(totalFunding * 0.10)}`,
          `**Training & Development**: ${formatINR(totalFunding * 0.05)}`
        ],
        marketing_operations: [
          `**Patient Acquisition & Marketing**: ${formatINR(totalFunding * 0.09)}`,
          `**Community Outreach**: ${formatINR(totalFunding * 0.04)}`,
          `**Partnership Development**: ${formatINR(totalFunding * 0.03)}`
        ],
        legal_operations: [
          `**Medical Licenses & Compliance**: ${formatINR(totalFunding * 0.07)}`,
          `**Malpractice Insurance**: ${formatINR(totalFunding * 0.05)}`,
          `**Legal & Regulatory**: ${formatINR(totalFunding * 0.03)}`
        ]
      },
      education: {
        platform_content: [
          `**Learning Platform Development**: ${formatINR(totalFunding * 0.25)}`,
          `**Content Creation & Curriculum**: ${formatINR(totalFunding * 0.20)}`,
          `**Technology Infrastructure**: ${formatINR(totalFunding * 0.12)}`,
          `**Learning Tools & Resources**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Educators & Content Creators**: ${formatINR(totalFunding * 0.18)}`,
          `**Technical & Support Team**: ${formatINR(totalFunding * 0.10)}`,
          `**Administration & Operations**: ${formatINR(totalFunding * 0.07)}`
        ],
        marketing_outreach: [
          `**Student Acquisition & Marketing**: ${formatINR(totalFunding * 0.12)}`,
          `**Partnerships with Institutions**: ${formatINR(totalFunding * 0.06)}`,
          `**Community Building**: ${formatINR(totalFunding * 0.04)}`
        ],
        legal_operations: [
          `**Accreditation & Certifications**: ${formatINR(totalFunding * 0.05)}`,
          `**Legal & Compliance**: ${formatINR(totalFunding * 0.03)}`,
          `**Business Registration**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      ecommerce: {
        platform_inventory: [
          `**E-commerce Platform Development**: ${formatINR(totalFunding * 0.22)}`,
          `**Initial Inventory & Stock**: ${formatINR(totalFunding * 0.25)}`,
          `**Warehouse & Storage Setup**: ${formatINR(totalFunding * 0.12)}`,
          `**Payment & Logistics Integration**: ${formatINR(totalFunding * 0.08)}`
        ],
        team_operations: [
          `**Operations & Fulfillment Team**: ${formatINR(totalFunding * 0.15)}`,
          `**Customer Support & Sales**: ${formatINR(totalFunding * 0.10)}`,
          `**Management & Administration**: ${formatINR(totalFunding * 0.06)}`
        ],
        marketing_acquisition: [
          `**Digital Marketing & Advertising**: ${formatINR(totalFunding * 0.16)}`,
          `**Brand Building & Content**: ${formatINR(totalFunding * 0.07)}`,
          `**Customer Acquisition Campaigns**: ${formatINR(totalFunding * 0.05)}`
        ],
        legal_operations: [
          `**Business Registration & Legal**: ${formatINR(totalFunding * 0.04)}`,
          `**Compliance & Taxes**: ${formatINR(totalFunding * 0.03)}`,
          `**Insurance & Risk Management**: ${formatINR(totalFunding * 0.02)}`
        ]
      },
      general: {
        product_development: [
          `**Product/Service Development**: ${formatINR(totalFunding * 0.30)}`,
          `**Technology & Infrastructure**: ${formatINR(totalFunding * 0.15)}`,
          `**Equipment & Tools**: ${formatINR(totalFunding * 0.10)}`
        ],
        team_operations: [
          `**Core Team Members**: ${formatINR(totalFunding * 0.20)}`,
          `**Operations & Support**: ${formatINR(totalFunding * 0.08)}`,
          `**Facility & Utilities**: ${formatINR(totalFunding * 0.07)}`
        ],
        marketing_launch: [
          `**Marketing & Customer Acquisition**: ${formatINR(totalFunding * 0.18)}`,
          `**Brand Development**: ${formatINR(totalFunding * 0.06)}`,
          `**Launch Activities**: ${formatINR(totalFunding * 0.04)}`
        ],
        legal_operations: [
          `**Legal & Business Registration**: ${formatINR(totalFunding * 0.05)}`,
          `**Compliance & Insurance**: ${formatINR(totalFunding * 0.03)}`,
          `**Professional Services**: ${formatINR(totalFunding * 0.02)}`
        ]
      }
    };

    return budgetTemplates[businessType] || budgetTemplates.general;
  };

  // Generate profit basis for any business type
  const generateProfitBasis = (pitch) => {
    if (pitch.profit_basis) return pitch.profit_basis;
    
    const businessType = detectBusinessType(pitch);
    
    const profitTemplates = {
      manufacturing: {
        revenue_streams: [
          "**Product Sales**: Revenue from manufacturing and selling products",
          "**Bulk Contracts**: Long-term supply agreements with construction companies",
          "**Custom Orders**: Premium pricing for specialized/customized products",
          "**Distribution Partnerships**: Revenue from wholesale distribution",
          "**By-product Sales**: Revenue from selling manufacturing by-products"
        ],
        cost_structure: [
          "**Raw Materials**: Cost of fly-ash, earth, cement, and other inputs",
          "**Equipment & Machinery**: Manufacturing equipment maintenance and operation",
          "**Labor Costs**: Production team, technicians, and operational staff",
          "**Facility Operations**: Factory rent, utilities, maintenance"
        ],
        profit_margins: [
          "**Year 1**: -20% to -40% (equipment setup & initial production)",
          "**Year 2**: 15% to 25% (optimized production & scale benefits)", 
          "**Year 3**: 20% to 35% (efficiency gains & market penetration)"
        ],
        scaling_factors: [
          "**Economies of Scale**: Lower per-unit costs with higher production volumes",
          "**Process Optimization**: Improved manufacturing efficiency over time",
          "**Supplier Relationships**: Better raw material pricing with volume",
          "**Automation**: Reduced labor costs through technology adoption"
        ]
      },
      tech: {
        revenue_streams: [
          "**SaaS Subscriptions**: Monthly/Annual recurring revenue",
          "**Transaction Fees**: Commission on platform transactions", 
          "**Premium Features**: Advanced functionality for paying users",
          "**Enterprise Licenses**: Custom solutions for large businesses",
          "**API Access & Data Services**: Revenue from data/API usage"
        ],
        cost_structure: [
          "**Technology Infrastructure**: Servers, cloud services, maintenance",
          "**Team Operations**: Developers, support, essential staff only",
          "**Marketing & Acquisition**: Digital ads, content, partnerships",
          "**Legal & Compliance**: Business registration, licenses, insurance"
        ],
        profit_margins: [
          "**Year 1**: -50% to -70% (product development & user acquisition)",
          "**Year 2**: 15% to 30% (growing user base & recurring revenue)", 
          "**Year 3**: 35% to 50% (scale benefits & reduced costs)"
        ],
        scaling_factors: [
          "**High Gross Margins**: Software has low incremental costs",
          "**Network Effects**: Platform becomes more valuable with more users",
          "**Automation**: Technology reduces manual support and operations",
          "**Data Assets**: User data enables new revenue opportunities"
        ]
      },
      agriculture: {
        revenue_streams: [
          "**Product Sales**: Revenue from agricultural produce",
          "**Contract Farming**: Long-term contracts with buyers",
          "**Value-added Products**: Processed goods with higher margins",
          "**Consulting Services**: Expertise sharing with other farmers",
          "**Carbon Credits**: Revenue from sustainable practices"
        ],
        cost_structure: [
          "**Input Costs**: Seeds, fertilizers, pesticides, labor",
          "**Equipment & Infrastructure**: Machinery, irrigation, storage",
          "**Operations**: Transportation, utilities, maintenance",
          "**Marketing & Distribution**: Market access, logistics, sales"
        ],
        profit_margins: [
          "**Year 1**: -30% to -50% (setup costs & initial operations)",
          "**Year 2**: 20% to 35% (optimized operations & yield improvement)", 
          "**Year 3**: 25% to 40% (scale benefits & premium pricing)"
        ],
        scaling_factors: [
          "**Yield Improvement**: Better practices increase output per acre",
          "**Premium Pricing**: Organic/sustainable certification adds value",
          "**Supply Chain Efficiency**: Reduced waste and better logistics",
          "**Technology Adoption**: IoT and data-driven optimization"
        ]
      },
      green_energy: {
        revenue_streams: [
          "**Energy Sales**: Revenue from electricity generation",
          "**Carbon Credits**: Trading verified emission reductions", 
          "**Consulting Services**: Project development expertise",
          "**Maintenance Contracts**: Ongoing service revenue",
          "**Technology Licensing**: IP revenue from innovations"
        ],
        cost_structure: [
          "**Capital Equipment**: Solar panels, turbines, storage systems",
          "**Installation & Commissioning**: Setup and grid integration",
          "**Operations & Maintenance**: Ongoing monitoring and repairs",
          "**Regulatory Compliance**: Permits, certifications, reporting"
        ],
        profit_margins: [
          "**Year 1**: -40% to -60% (high initial capital investment)",
          "**Year 2**: 15% to 25% (revenue growth & operational efficiency)", 
          "**Year 3**: 30% to 45% (scale benefits & recurring revenue)"
        ],
        scaling_factors: [
          "**Recurring Revenue**: Long-term energy supply contracts",
          "**Technology Improvement**: Falling costs of renewable tech",
          "**Government Incentives**: Subsidies and tax benefits",
          "**Carbon Market Growth**: Increasing value of emissions reduction"
        ]
      },
      healthcare: {
        revenue_streams: [
          "**Service Fees**: Consultations, procedures, treatments",
          "**Subscription Models**: Health plans and membership programs",
          "**Product Sales**: Medical devices, supplements, equipment",
          "**Insurance Partnerships**: Revenue from insurance providers",
          "**Corporate Wellness**: B2B health programs for companies"
        ],
        cost_structure: [
          "**Medical Equipment**: Devices, instruments, technology",
          "**Facility Operations**: Rent, utilities, maintenance",
          "**Professional Staff**: Medical and support team costs",
          "**Supplies & Inventory**: Medical consumables and drugs"
        ],
        profit_margins: [
          "**Year 1**: -40% to -60% (facility setup & equipment investment)",
          "**Year 2**: 20% to 35% (patient volume growth & efficiency)", 
          "**Year 3**: 30% to 45% (brand recognition & premium services)"
        ],
        scaling_factors: [
          "**Premium Services**: Higher-margin specialized treatments",
          "**Technology Efficiency**: Digital health reduces operational costs",
          "**Brand Reputation**: Word-of-mouth reduces acquisition costs",
          "**Partnerships**: Insurance and corporate contracts"
        ]
      },
      education: {
        revenue_streams: [
          "**Course Fees**: Revenue from educational programs",
          "**Subscription Access**: Monthly/Annual platform access",
          "**Corporate Training**: B2B employee development programs",
          "**Certification Fees**: Revenue from accreditation",
          "**Content Licensing**: IP revenue from course materials"
        ],
        cost_structure: [
          "**Content Development**: Course creation and curriculum design",
          "**Platform Technology**: LMS, hosting, mobile apps",
          "**Instruction Team**: Educators and support staff",
          "**Marketing & Outreach**: Student acquisition and branding"
        ],
        profit_margins: [
          "**Year 1**: -45% to -65% (content development & platform build)",
          "**Year 2**: 25% to 40% (student growth & operational scale)", 
          "**Year 3**: 35% to 50% (recurring revenue & brand value)"
        ],
        scaling_factors: [
          "**High Margins**: Digital content has low reproduction costs",
          "**Global Reach**: Online platform enables worldwide student base",
          "**Upsell Opportunities**: Advanced courses and certifications",
          "**Corporate Partnerships**: B2B contracts with companies"
        ]
      },
      ecommerce: {
        revenue_streams: [
          "**Product Sales**: Margin on goods sold through platform",
          "**Marketplace Commission**: Fees from third-party sellers",
          "**Advertising Revenue**: Brand placements and promotions",
          "**Subscription Services**: Premium membership benefits",
          "**Logistics Services**: Revenue from delivery and fulfillment"
        ],
        cost_structure: [
          "**Inventory Costs**: Product procurement and storage",
          "**Platform Technology**: E-commerce platform and apps",
          "**Marketing & Customer Acquisition**: Digital advertising",
          "**Operations & Fulfillment**: Logistics, packaging, delivery"
        ],
        profit_margins: [
          "**Year 1**: -35% to -55% (inventory buildup & customer acquisition)",
          "**Year 2**: 15% to 30% (repeat customers & operational efficiency)", 
          "**Year 3**: 25% to 40% (scale benefits & reduced acquisition costs)"
        ],
        scaling_factors: [
          "**Repeat Business**: Loyal customers with lower acquisition costs",
          "**Private Label**: Higher-margin own-brand products",
          "**Marketplace Growth**: Commission revenue from third-party sellers",
          "**Data Leverage**: Customer insights for better targeting"
        ]
      }
    };

    return profitTemplates[businessType] || profitTemplates.general;
  };

  return (
    <div style={{
      marginTop: 24,
      padding: 24,
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: 16,
      border: '1px solid #475569',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid #475569'
      }}>
        <div>
          <div style={{ fontSize: '0.9em', color: '#94a3b8', marginBottom: 4 }}>Job ID</div>
          <div style={{ 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            color: 'white',
            background: '#475569',
            padding: '4px 12px',
            borderRadius: 8,
            fontSize: '0.9em'
          }}>
            {job.job_id}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9em', color: '#94a3b8', marginBottom: 4 }}>Status</div>
          <div style={{ 
            fontWeight: 'bold', 
            color: status === 'done' ? '#10b981' : '#f59e0b',
            fontSize: '1em'
          }}>
            {status === 'done' ? '✅ Completed' : '⏳ Processing'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#dc2626', 
          color: 'white', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20,
          border: '1px solid #ef4444'
        }}>
          {error}
        </div>
      )}

      {pitch ? (
        <div>
          {/* Business Type Indicator */}
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            borderRadius: 20,
            border: '1px solid #c084fc',
            display: 'inline-block',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{ 
              fontSize: '0.8em', 
              fontWeight: '600', 
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {detectBusinessType(pitch).replace(/_/g, ' ')} Business
            </div>
          </div>

          {/* Tagline */}
          {pitch.tagline && (
            <div style={{
              textAlign: 'center',
              marginBottom: 32,
              padding: 20,
              background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
              borderRadius: 12,
              border: '1px solid #38bdf8'
            }}>
              <div style={{ 
                fontSize: '1.4em', 
                fontWeight: 'bold', 
                color: 'white',
                lineHeight: 1.3
              }}>
                "{pitch.tagline}"
              </div>
            </div>
          )}

          {/* Elevator Pitch */}
          {pitch.elevator_pitch && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                color: 'white', 
                marginBottom: 12, 
                fontSize: '1.2em',
                fontWeight: '600'
              }}>
                Elevator Pitch
              </h3>
              <div style={{
                padding: 16,
                background: '#475569',
                borderRadius: 8,
                border: '1px solid #64748b',
                lineHeight: 1.6,
                color: '#e2e8f0'
              }}>
                {parseMarkdownBold(pitch.elevator_pitch)}
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {pitch.executive_summary && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                color: 'white', 
                marginBottom: 12, 
                fontSize: '1.2em',
                fontWeight: '600'
              }}>
                Executive Summary
              </h3>
              <div style={{
                padding: 16,
                background: '#475569',
                borderRadius: 8,
                border: '1px solid #64748b',
                lineHeight: 1.6,
                color: '#e2e8f0'
              }}>
                {parseMarkdownBold(pitch.executive_summary)}
              </div>
            </div>
          )}

          {/* Financial Projections */}
          {pitch.financials && pitch.financials.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                color: 'white', 
                marginBottom: 16, 
                fontSize: '1.2em',
                fontWeight: '600'
              }}>
                Financial Projections
              </h3>
              
              {/* Total Funding */}
              <div style={{
                marginBottom: 20,
                padding: 16,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                borderRadius: 8,
                border: '1px solid #34d399',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9em', color: '#d1fae5', marginBottom: 4 }}>
                  Total Funding Required
                </div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'white' }}>
                  {formatINR(calculateTotalFunding())}
                </div>
              </div>

              {/* Yearly Breakdown */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                gap: 16 
              }}>
                {pitch.financials.map((year, index) => (
                  <div key={index} style={{
                    padding: 16,
                    background: '#475569',
                    borderRadius: 8,
                    border: '1px solid #64748b',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '0.9em', 
                      color: '#94a3b8', 
                      marginBottom: 8,
                      fontWeight: '500'
                    }}>
                      Year {year.year}
                    </div>
                    <div style={{ 
                      fontSize: '1.2em', 
                      fontWeight: 'bold', 
                      color: 'white',
                      marginBottom: 8
                    }}>
                      {formatINR(year.revenue)}
                    </div>
                    <div style={{ 
                      fontSize: '0.9em', 
                      color: year.profit >= 0 ? '#10b981' : '#ef4444',
                      fontWeight: '600'
                    }}>
                      Profit: {formatINR(year.profit)}
                    </div>
                    <div style={{ 
                      fontSize: '0.8em', 
                      color: '#94a3b8',
                      marginTop: 4
                    }}>
                      Cost: {formatINR(year.cost)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Budget Breakdown */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: 16, 
              fontSize: '1.2em',
              fontWeight: '600'
            }}>
              📊 Detailed Budget Breakdown - {formatINR(calculateTotalFunding())}
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: 16 
            }}>
              {Object.entries(generateBudgetDetails(pitch)).map(([category, details]) => (
                <div key={category} style={{
                  padding: 16,
                  background: '#475569',
                  borderRadius: 8,
                  border: '1px solid #64748b'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#38bdf8', 
                    marginBottom: 12,
                    textTransform: 'capitalize',
                    fontSize: '1.1em',
                    borderBottom: '2px solid #38bdf8',
                    paddingBottom: 4
                  }}>
                    {category.replace(/_/g, ' ')}
                  </div>
                  <ul style={{ 
                    color: '#e2e8f0', 
                    lineHeight: 1.5,
                    fontSize: '0.9em',
                    margin: 0,
                    paddingLeft: 16
                  }}>
                    {details.map((item, index) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        {parseMarkdownBold(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Profit Basis */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ 
              color: 'white', 
              marginBottom: 16, 
              fontSize: '1.2em',
              fontWeight: '600'
            }}>
              💰 Profit Model - How We Make Money
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: 16 
            }}>
              {Object.entries(generateProfitBasis(pitch)).map(([aspect, explanation]) => (
                <div key={aspect} style={{
                  padding: 16,
                  background: '#475569',
                  borderRadius: 8,
                  border: '1px solid #64748b'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#10b981', 
                    marginBottom: 12,
                    textTransform: 'capitalize',
                    fontSize: '1.1em',
                    borderBottom: '2px solid #10b981',
                    paddingBottom: 4
                  }}>
                    {aspect.replace(/_/g, ' ')}
                  </div>
                  <div style={{ 
                    color: '#e2e8f0', 
                    lineHeight: 1.5,
                    fontSize: '0.9em'
                  }}>
                    {Array.isArray(explanation) ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {explanation.map((item, index) => (
                          <li key={index} style={{ marginBottom: 8 }}>
                            {parseMarkdownBold(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      parseMarkdownBold(explanation)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Slides Preview */}
          {pitch.slides && pitch.slides.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                color: 'white', 
                marginBottom: 16, 
                fontSize: '1.2em',
                fontWeight: '600'
              }}>
                Key Slides Preview
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pitch.slides.slice(0, 4).map((slide, index) => (
                  <div key={index} style={{
                    padding: 16,
                    background: '#475569',
                    borderRadius: 8,
                    border: '1px solid #64748b'
                  }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: 'white', 
                      marginBottom: 12, 
                      fontSize: '1.1em',
                      borderLeft: '4px solid #3b82f6',
                      paddingLeft: 12
                    }}>
                      {parseMarkdownBold(slide.title)}
                    </div>
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul style={{ 
                        color: '#e2e8f0', 
                        margin: 0, 
                        paddingLeft: 20, 
                        lineHeight: 1.5 
                      }}>
                        {slide.bullets.slice(0, 3).map((bullet, bulletIndex) => (
                          <li key={bulletIndex} style={{ marginBottom: 6 }}>
                            {parseMarkdownBold(bullet)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : status === 'done' ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#94a3b8',
          background: '#475569',
          borderRadius: 8,
          border: '1px solid #64748b'
        }}>
          <div style={{ fontSize: '1.1em', marginBottom: 8 }}>Loading pitch details...</div>
          <div style={{ fontSize: '0.9em' }}>Please wait while we fetch your pitch data</div>
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#94a3b8',
          background: '#475569',
          borderRadius: 8,
          border: '1px solid #64748b'
        }}>
          <div style={{ fontSize: '1.1em', marginBottom: 8 }}>Generating your pitch deck...</div>
          <div style={{ fontSize: '0.9em' }}>This usually takes 20-60 seconds</div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        marginTop: 32, 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        paddingTop: 20,
        borderTop: '1px solid #475569'
      }}>
        {downloadUrl && (
          <a 
            href={downloadUrl} 
            target="_blank" 
            rel="noreferrer"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: '600',
              border: '1px solid #38bdf8',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            📥 Download PowerPoint
          </a>
        )}
        {job.job_id && (
          <a 
            href={`${API_BASE}/api/v1/pitches/${job.job_id}/pitch`} 
            target="_blank" 
            rel="noreferrer"
            style={{
              padding: '12px 20px',
              background: '#475569',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: '500',
              border: '1px solid #64748b',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            📊 View Raw Data
          </a>
        )}
      </div>
    </div>
  );
}