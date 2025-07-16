# PDF Helper AI 📄🤖

A modern, AI-powered PDF management and interaction platform built with Next.js and Express.js. Upload, analyze, and chat with your PDF documents using advanced AI technology.

## ✨ Features

- 🚀 **AI-Powered PDF Chat**: Interact with your PDF documents using advanced AI
- 🧠 **Qwen2-VL-2B-Instruct Model**: Local vision-language model for advanced PDF understanding
- 🤖 **Multi-Model AI Integration**: Google Generative AI + Qwen2-VL for optimal performance
- 📱 **Modern UI/UX**: Beautiful, responsive design with glass morphism effects
- 🔍 **Smart Analysis**: Extract insights and analyze PDF content with AI
- 📝 **Note Management**: Create and manage notes from your PDFs
- 🖼️ **Image Extraction**: Extract and analyze images from PDF documents
- 💬 **Conversational AI**: Natural language processing for interactive discussions
- 🎯 **Context-Aware Responses**: AI maintains conversation history for meaningful interactions
- 📊 **Automated Summarization**: Generate intelligent summaries of PDF content
- 🔐 **User Authentication**: Secure user management with JWT
- 📊 **Dashboard**: Centralized management of all your PDFs and notes
- 🌐 **RESTful API**: Well-documented API with Swagger/OpenAPI

## 🤖 AI & Machine Learning

### Generative AI Integration
Our PDF Helper AI leverages cutting-edge generative AI technologies to provide intelligent document interaction:

- **🧠 Qwen2-VL-2B-Instruct**: Advanced vision-language model deployed locally for superior PDF understanding and multimodal analysis
- **🌟 Google Generative AI (Gemini)**: Integrated for advanced reasoning, content generation, and multi-modal understanding
- **🔄 Hybrid AI Architecture**: Combines the power of cloud-based GenAI with local custom models for optimal performance and privacy

### Qwen2-VL-2B-Instruct Model Features
- **👁️ Vision-Language Understanding**: Specialized model capable of processing both text and visual content from PDFs
- **📄 Document Analysis**: Optimized for document understanding with 2B parameters for efficient local inference
- **🖼️ Image Comprehension**: Advanced visual reasoning capabilities for charts, diagrams, and images within PDFs
- **💡 Instruction Following**: Fine-tuned for following complex instructions and providing detailed responses
- **⚡ Lightweight Architecture**: 2B parameter model optimized for local deployment with minimal resource requirements
- **🔒 Privacy-First**: Runs entirely offline, ensuring document confidentiality and data security

### Custom Model Features
- **📚 Vision-Language Processing**: Qwen2-VL-2B-Instruct model trained for comprehensive document understanding
- **🏠 Local Deployment**: Runs entirely on-premise for maximum privacy and data security
- **⚡ Optimized Inference**: GPU-accelerated processing with model quantization for fast responses
- **🔒 Privacy-First**: All document processing happens locally, ensuring confidentiality
- **🎯 Multimodal Understanding**: Enhanced capability for processing text, images, charts, and diagrams in PDFs
- **📊 Efficient Architecture**: 2B parameter model provides excellent performance with minimal resource usage

### AI-Powered Features
- **💬 Intelligent Conversations**: Natural language interface for document queries and analysis
- **📊 Smart Summarization**: Automatic generation of key insights and executive summaries
- **🔍 Semantic Search**: Advanced content discovery using vector embeddings and similarity matching
- **🖼️ Multimodal Analysis**: Process both text and images within PDFs using OCR and vision models
- **🎨 Content Generation**: Create structured notes, outlines, and reports from PDF content
- **🔮 Predictive Analysis**: AI suggests relevant questions and topics based on document context
- **📈 Performance Optimization**: Continuous model improvement through feedback loops and usage analytics

### Technical Implementation
- **Qwen2-VL-2B-Instruct**: Local vision-language model for document understanding and analysis
- **LM Studio SDK**: Local model management and inference optimization
- **Redis Vector Store**: Efficient storage and retrieval of document embeddings
- **Custom Training Pipeline**: Automated model fine-tuning and deployment workflow
- **API Gateway**: Seamless integration between multiple AI models and services

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Zustand** - State management
- **React Hot Toast** - Notifications

### Backend
- **Express.js** - Web framework for Node.js
- **MongoDB** - NoSQL database with Mongoose ODM
- **Google Generative AI** - AI integration
- **Redis** - Caching and session management
- **JWT** - Authentication
- **Multer** - File upload handling
- **PDF-Parse** - PDF text extraction
- **Tesseract.js** - OCR for image text extraction

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database
- Redis server
- Google Generative AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/govindmehta/pdfHelper.git
   cd pdfHelper
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

   Create a `.env` file in the backend directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/pdfhelper
   JWT_SECRET=your-jwt-secret-key
   GOOGLE_API_KEY=your-google-generative-ai-key
   REDIS_URL=redis://localhost:6379
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## 📁 Project Structure

```
pdfhelper/
├── backend/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middlewares/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── uploads/         # File uploads
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js app router
│   │   ├── components/  # React components
│   │   └── lib/         # Utility libraries
│   ├── public/          # Static assets
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### PDF Management
- `POST /api/pdfs/upload` - Upload PDF file
- `GET /api/pdfs` - Get user's PDFs
- `GET /api/pdfs/:id` - Get specific PDF
- `DELETE /api/pdfs/:id` - Delete PDF

### AI Chat
- `POST /api/ai/chat` - Chat with PDF content
- `GET /api/ai/conversation/:pdfId` - Get conversation history

### Notes
- `POST /api/notes` - Create note
- `GET /api/notes` - Get user's notes
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

## 🎨 UI Components

- **Landing Page**: Modern hero section with gradient animations
- **Dashboard**: Glass morphism design with PDF management
- **Chat Interface**: Real-time AI conversation with structured responses
- **Authentication**: Clean login/register forms
- **AI Response**: Structured content parsing with icons and formatting

## 🔒 Security Features

- JWT-based authentication
- Input validation and sanitization
- File upload restrictions
- CORS configuration
- Rate limiting (recommended for production)

## 📱 Responsive Design

- Mobile-first approach
- Breakpoint-specific layouts
- Touch-friendly interactions
- Optimized performance

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred database
2. Configure Redis instance
3. Set environment variables
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Google Generative AI for powerful AI capabilities
- The open-source community for amazing tools and libraries
- Contributors who help improve this project

## 📞 Support

For support, please create an issue in the GitHub repository or contact the maintainers.

---

Made with ❤️ by [Govind Mehta](https://github.com/govindmehta)
