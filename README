# Kentucky Watershed Watch (KYWW) - Data Portal

A comprehensive water quality monitoring data portal for Kentucky Watershed Watch volunteers and administrators. This Nuxt.js application provides data entry, visualization, and management tools for stream sampling across Kentucky.

## 🌊 About the Project

Kentucky Watershed Watch is a citizen science program that empowers volunteers to monitor water quality in Kentucky streams. This portal serves as the central hub for:

- **Stream Sample Data Entry**: Water quality measurements (pH, dissolved oxygen, temperature, conductivity, E. coli)
- **Biological Assessments**: Macroinvertebrate surveys for ecosystem health monitoring
- **Habitat Assessments**: Physical stream condition evaluations
- **Site Management**: Interactive mapping and site selection tools
- **User Management**: Volunteer registration, training tracking, and role-based access

## 🏗️ Project Structure

```
/www/prod/kyww_nuxt/
├── layers/
│   └── portal/
│       └── pages/
│           └── portal/
│               ├── biological/
│               │   └── index.vue          # Biological assessment data entry
│               ├── habitat/
│               │   └── index.vue          # Habitat assessment data entry
│               ├── sample/
│               │   ├── index.vue          # Stream sampling data entry (desktop)
│               │   └── index_mobile.vue   # Stream sampling data entry (mobile)
│               ├── hub/
│               │   └── hub-add.vue        # Hub management
│               └── users/
│                   └── index.vue          # User management
├── composables/
│   ├── useKYWWMap.ts                      # Interactive mapping functionality
│   ├── usePublicKYWWMap.ts                # Public map display
│   └── useRBAC.ts                         # Role-based access control
├── components/
│   ├── base/                              # Base UI components
│   ├── blocks/                            # Content blocks
│   └── help/                              # Help system components
└── server/
    └── api/                               # Server-side API endpoints
```

## ✨ Key Features

### Data Entry Forms
- **Stream Sampling**: Comprehensive water quality data collection with photo upload
- **Biological Assessment**: Macroinvertebrate identification and scoring system
- **Habitat Assessment**: Physical stream condition evaluation with scoring rubrics
- **Mobile Responsive**: Optimized forms for field data entry on mobile devices

### Interactive Mapping
- **Site Selection**: ArcGIS-powered mapping for sampling site selection
- **Data Visualization**: Display of historical sampling data and site information
- **Hub Locations**: Network of support hubs across Kentucky basins
- **Site Search**: Search functionality for finding specific monitoring sites

### User Management
- **Role-Based Access**: Different permission levels (samplers, trainers, administrators)
- **Training Tracking**: Monitor volunteer training status and certifications
- **Hub Assignment**: Connect volunteers with local support hubs
- **Equipment Management**: Track equipment distribution and maintenance

### Data Management
- **Real-time Validation**: Form validation for data quality assurance
- **Photo Upload**: Support for field photos with sample submissions
- **Export Capabilities**: Data export for analysis and reporting
- **Historical Tracking**: Long-term data storage and trend analysis

## 🛠️ Technology Stack

- **Frontend**: Nuxt.js 3, Vue.js 3, TypeScript
- **UI Framework**: Nuxt UI, Tailwind CSS
- **Backend**: Directus CMS for data management
- **Mapping**: ArcGIS JavaScript API
- **Authentication**: Directus Authentication
- **File Handling**: Photo upload and management
- **Email**: Automated notifications and welcome emails

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Access to Directus backend
- ArcGIS API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd kyww_nuxt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with required environment variables:
   ```env
   DIRECTUS_URL=your_directus_instance_url
   DIRECTUS_TOKEN=your_directus_token
   NUXT_PUBLIC_DIRECTUS_URL=your_public_directus_url
   # Add other required environment variables
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Local development: `http://localhost:3000`
   - Portal access: `http://localhost:3000/portal`

## 📱 Main Application Pages

### Stream Sample Data Entry (`/portal/sample`)
- Primary data collection form for water quality measurements
- Fields include: temperature, pH, dissolved oxygen, conductivity, E. coli
- Weather conditions, flow conditions, and bacterial source tracking
- Photo upload capability for site documentation
- Mobile-optimized version available

### Biological Assessment (`/portal/biological`)
- Macroinvertebrate identification and counting
- Automated scoring based on indicator species presence
- Integration with site selection mapping
- Weather and habitat condition documentation

### Habitat Assessment (`/portal/habitat`)
- Physical stream condition evaluation
- Scoring rubrics for multiple habitat parameters
- Land use documentation and assessment
- Comprehensive site characterization tools

## 🔐 Security & Access Control

The application implements role-based access control (RBAC) with the following roles:
- **Public**: Limited access to public information
- **Sampler**: Data entry access for assigned sites
- **Trainer**: Enhanced access plus training management
- **Hub Manager**: Regional coordination and user management
- **Administrator**: Full system access and configuration

## 🗺️ Mapping Integration

The application uses ArcGIS JavaScript API for:
- **Interactive Site Selection**: Click-to-select sampling locations
- **Data Visualization**: Display historical sampling data on maps
- **Hub Network Display**: Show support hub locations and services
- **Basin and County Boundaries**: Geographic context for sampling sites

## 📊 Data Flow

1. **User Registration**: Volunteers sign up through invitation system
2. **Training Assignment**: Users assigned to appropriate training tracks
3. **Site Selection**: Interactive map-based site selection
4. **Data Collection**: Field sampling using mobile-optimized forms
5. **Data Validation**: Real-time validation and quality checks
6. **Data Storage**: Secure storage in Directus backend
7. **Visualization**: Data display on public maps and dashboards

## 🔧 Configuration

### Route Rules
```typescript
routeRules: {
  '/auth/**': { ssr: false },
  '/portal/**': { ssr: false, index: false },
}
```

### Component Structure
- Portal components are prefixed with 'Portal'
- Base components provide core UI functionality
- Blocks handle content display and layout

## 📈 Development Notes

- **Authentication**: Client-side only for portal pages (SSR disabled)
- **Mobile First**: Responsive design with mobile-specific optimizations
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Performance**: Optimized for field use with limited connectivity

## 🤝 Contributing

This project supports Kentucky's water quality monitoring efforts. When contributing:

1. Follow Vue.js and Nuxt.js best practices
2. Maintain mobile responsiveness
3. Test data validation thoroughly
4. Consider field usage conditions
5. Maintain accessibility standards

## 📞 Support

For questions about the Kentucky Watershed Watch program:
- Website: [kywater.org](https://kywater.org)
- Email: contact@kywater.org
- Data Portal: [kyww.uky.edu](https://kyww.uky.edu)

## 🌍 Impact

This platform supports citizen scientists across Kentucky in monitoring water quality, contributing to:
- Environmental protection and awareness
- Community engagement in watershed stewardship
- Scientific data collection for research and policy
- Education about water quality issues

---

**Kentucky Watershed Watch** - Empowering citizens to protect Kentucky's water resources through community-based monitoring and education.
