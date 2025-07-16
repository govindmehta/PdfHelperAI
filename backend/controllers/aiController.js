import mongoose from "mongoose";
import PDF from "../models/PDF.js";
import geminiService from "../services/geminiService.js";
import Conversation from "../models/Conversation.js";
import redis from "../utils/redisClient.js";

export const askQuestion = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId, question } = req.body;

    if (!pdfId || !question) {
      return res.status(400).json({ error: "pdfId and question are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(pdfId)) {
      return res.status(400).json({ error: "Invalid PDF ID format." });
    }

    const cacheKey = `answer:${pdfId}:${question}`;
    const cachedAnswer = await redis.get(cacheKey);
    if (cachedAnswer) {
      console.log("✅ Answer from Redis cache");
      return res.status(200).json({ answer: cachedAnswer });
    }

    const pdf = await PDF.findOne({ _id: pdfId, user: userId });

    if (!pdf) {
      return res.status(404).json({ error: "PDF not found for the given user." });
    }

    const imageSummary =
      (pdf.images || [])
        .map((img, i) => {
          const desc = img.localModelDescription?.trim();
          return desc ? `Image ${i + 1} (page ${img.page}): ${desc}` : null;
        })
        .filter(Boolean)
        .join("\n") || "No image descriptions available.";


const prompt = `
You are a knowledgeable and friendly AI assistant designed to help users understand and analyze the contents of a PDF document. Your response must be tailored to the user's specific question and should draw from the PDF's text and image descriptions whenever relevant.

Guidelines for your response:
- If user is greeting or asking for help, respond warmly and offer assistance.
- Address the user's question directly and thoroughly.
- Use the PDF's extracted text and image descriptions as primary sources.
- If needed, add relevant background knowledge to help clarify the answer.
- Be clear, concise, and user-friendly. Use simple language when explaining complex concepts.
- If the content is not found in the PDF, politely acknowledge it and guide the user accordingly.
- You may use bullet points, numbered lists, or paragraphs to improve readability.

==============================
📄 PDF Text Content:
${pdf.extractedText || "No text extracted from the PDF."}

🖼️ Image Descriptions from Local Model:
${imageSummary}

❓ User's Question / Request:
${question}
==============================

Now, provide a helpful, accurate, and well-structured response based on the above.
`;


    const answer = await geminiService.getCompletion(prompt);

    const conversation = new Conversation({
      user: userId,
      pdf: pdfId,
      question,
      answer,
    });
    await conversation.save();

    await redis.set(cacheKey, answer, 'EX', 60 * 60); // 1 hour cache

    res.status(200).json({ answer });
  } catch (error) {
    console.error("❌ Error in askQuestion:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
};

export const chatWithPDF = async (req, res) => {
  try {
    console.log('🔍 Chat request:', { userId: req.user.userId, body: req.body }); // Debug log
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId, message, conversationId } = req.body;

    if (!pdfId || !message) {
      return res.status(400).json({ error: "pdfId and message are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(pdfId)) {
      return res.status(400).json({ error: "Invalid PDF ID format." });
    }

    const pdf = await PDF.findOne({ _id: pdfId, user: userId });
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found for the given user." });
    }

    // Get or create conversation
    let conversation;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, user: userId });
      console.log('🔍 Found existing conversation:', conversation ? 'Yes' : 'No'); // Debug log
    }
    
    if (!conversation) {
      console.log('🔍 Creating new conversation'); // Debug log
      conversation = new Conversation({
        user: userId,
        pdf: pdfId,
        messages: []
      });
    }

    // Ensure messages array exists (for backward compatibility)
    if (!conversation.messages) {
      console.log('🔍 Initializing messages array'); // Debug log
      conversation.messages = [];
    }

    console.log('🔍 Messages array length before:', conversation.messages.length); // Debug log

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Generate AI response
    const imageSummary = (pdf.images || [])
      .map((img, i) => {
        const desc = img.localModelDescription?.trim();
        return desc ? `Image ${i + 1} (page ${img.page}): ${desc}` : null;
      })
      .filter(Boolean)
      .join("\n") || "No image descriptions available.";

    const prompt = `
You are a knowledgeable and friendly AI assistant designed to help users understand and analyze the contents of a PDF document. Your response must be tailored to the user's specific question and should draw from the PDF's text and image descriptions whenever relevant.
 Provide structured, well-organized responses that are easy to read and understand.


Guidelines for your response:
- If user is greeting or asking for help, respond warmly and offer assistance.
- Address the user's question directly and thoroughly.
- Use the PDF's extracted text and image descriptions as primary sources.
- If needed, add relevant background knowledge to help clarify the answer.
- Be clear, concise, and user-friendly. Use simple language when explaining complex concepts.
- If the content is not found in the PDF, politely acknowledge it and guide the user accordingly.
- You may use bullet points, numbered lists, or paragraphs to improve readability.

RESPONSE FORMAT GUIDELINES:
- Use clear headings followed by colons (e.g., "Key Points:", "Summary:", "Analysis:")
- Use bullet points (•) for lists of items
- Use numbered lists (1., 2., 3.) for step-by-step processes
- Highlight important information with phrases like "Key Point:" or "Important:"
- Structure your response with logical sections
- Use simple, clear language

CONTENT SOURCES:
PDF Text Content:
${pdf.extractedText || "No text extracted from the PDF."}

PDF Description From Local Model:
${imageSummary}

Recent conversation context:
${conversation.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

USER QUESTION:
${message}

Provide a comprehensive, well-structured response that directly addresses the user's question while being easy to read and understand.
`;

    const response = await geminiService.getCompletion(prompt);

    // Ensure messages array still exists before adding AI response
    if (!conversation.messages) {
      conversation.messages = [];
    }

    // Add AI response
    conversation.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    await conversation.save();

    console.log('✅ Conversation saved with', conversation.messages.length, 'messages');
    console.log('🔍 Latest messages:', conversation.messages.slice(-2).map(m => `${m.role}: ${m.content.substring(0, 50)}...`));

    res.status(200).json({ 
      response, 
      conversationId: conversation._id 
    });
  } catch (error) {
    console.error("❌ Error in chatWithPDF:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
};

// Analyze image function (expected by frontend)
export const analyzeImage = async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "imageData is required." });
    }

    // For now, we'll use a simple analysis
    // In the future, this could use image analysis AI models
    const analysis = await geminiService.getCompletion(`
Please analyze this image data and provide a description of what you see.
Note: This is a placeholder analysis. In a full implementation, actual image data would be processed.
Image data provided: ${imageData.substring(0, 100)}...
`);

    res.status(200).json({ analysis });
  } catch (error) {
    console.error("❌ Error in analyzeImage:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
};

// Get conversation history with pagination
export const getConversationHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pdfId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    console.log('🔍 getConversationHistory called:', { userId, pdfId, page, limit });

    if (!pdfId) {
      return res.status(400).json({ error: "pdfId is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(pdfId)) {
      console.log('❌ Invalid PDF ID format');
      return res.status(400).json({ error: "Invalid PDF ID format." });
    }

    // Verify user has access to this PDF
    const pdf = await PDF.findOne({ _id: pdfId, user: userId });
    if (!pdf) {
      console.log('❌ PDF not found or access denied');
      return res.status(404).json({ error: "PDF not found or access denied." });
    }

    console.log('✅ PDF found:', pdf.originalName);

    // Find conversations for this PDF and user
    const conversations = await Conversation.find({ 
      user: userId, 
      pdf: pdfId,
      messages: { $exists: true, $ne: [] } // Only get conversations with messages
    })
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    console.log('🔍 Found conversations:', conversations.length);

    // Flatten all messages from all conversations and sort by timestamp
    let allMessages = [];
    for (const conversation of conversations) {
      if (conversation.messages && conversation.messages.length > 0) {
        console.log('🔍 Processing conversation with', conversation.messages.length, 'messages');
        const messagesWithConversationId = conversation.messages.map(msg => ({
          ...msg.toObject(),
          conversationId: conversation._id,
          timestamp: msg.timestamp || conversation.updatedAt
        }));
        allMessages = [...allMessages, ...messagesWithConversationId];
      }
    }

    console.log('🔍 Total messages found:', allMessages.length);

    // Sort all messages by timestamp (newest first for pagination)
    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate pagination info
    const totalConversations = await Conversation.countDocuments({ 
      user: userId, 
      pdf: pdfId,
      messages: { $exists: true, $ne: [] }
    });

    const hasMore = parseInt(page) * parseInt(limit) < totalConversations;

    console.log('🔍 Sending response:', { 
      messagesCount: allMessages.length, 
      hasMore, 
      totalConversations 
    });

    res.status(200).json({
      messages: allMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore,
        totalConversations
      }
    });
  } catch (error) {
    console.error("❌ Error fetching conversation history:", error);
    res.status(500).json({ error: "Failed to fetch conversation history" });
  }
};

// Generate comprehensive notes from PDF content
export const generateNotes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pdfId } = req.body;

    console.log('🔍 generateNotes called:', { userId, pdfId });

    if (!pdfId) {
      return res.status(400).json({ error: "pdfId is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(pdfId)) {
      console.log('❌ Invalid PDF ID format');
      return res.status(400).json({ error: "Invalid PDF ID format." });
    }

    // Verify user has access to this PDF
    const pdf = await PDF.findOne({ _id: pdfId, user: userId });
    if (!pdf) {
      console.log('❌ PDF not found or access denied');
      return res.status(404).json({ error: "PDF not found or access denied." });
    }

    console.log('✅ PDF found:', pdf.originalName);

    // Get conversation history for context
    const conversations = await Conversation.find({ 
      user: userId, 
      pdf: pdfId,
      messages: { $exists: true, $ne: [] }
    }).sort({ updatedAt: -1 }).limit(5);

    let conversationContext = '';
    if (conversations.length > 0) {
      const recentMessages = conversations.flatMap(conv => 
        conv.messages.slice(-10).map(msg => `${msg.role}: ${msg.content}`)
      );
      conversationContext = recentMessages.join('\n');
    }

    // Generate image summaries
    const imageSummary = (pdf.images || [])
      .map((img, i) => {
        const desc = img.localModelDescription?.trim();
        return desc ? `Image ${i + 1} (page ${img.page}): ${desc}` : null;
      })
      .filter(Boolean)
      .join("\n") || "No image descriptions available.";

    const notesPrompt = `
You are an expert note-taking assistant. Create comprehensive, well-structured notes from the following PDF content.

INSTRUCTIONS:
- Create detailed, organized notes that capture all key information
- Use clear headings and subheadings
- Include bullet points for important details
- Add summaries for each major section
- Highlight key concepts, definitions, and important facts
- Include any relevant examples or case studies mentioned
- Structure the notes in a logical, easy-to-follow format

DOCUMENT INFORMATION:
Title: ${pdf.originalName}

PDF TEXT CONTENT:
${pdf.extractedText || "No text extracted from the PDF."}

IMAGES AND DIAGRAMS:
${imageSummary}

RECENT CONVERSATION CONTEXT (if any):
${conversationContext}

Please generate comprehensive notes that would be useful for studying, reference, or sharing with others. Format the notes with clear structure using headers, bullet points, and numbered lists where appropriate.
`;

    console.log('🔍 Generating notes with AI...');
    const notesContent = await geminiService.getCompletion(notesPrompt);

    // Import Note model
    const Note = (await import("../models/Note.js")).default;

    // Create a new note
    const note = new Note({
      user: userId,
      pdf: pdfId,
      title: `Notes: ${pdf.originalName}`,
      content: notesContent,
      tags: ['auto-generated', 'ai-notes']
    });

    await note.save();

    console.log('✅ Notes generated and saved:', note._id);

    res.status(200).json({
      noteId: note._id,
      title: note.title,
      content: note.content,
      message: "Notes generated successfully!"
    });

  } catch (error) {
    console.error("❌ Error generating notes:", error);
    res.status(500).json({ error: "Failed to generate notes" });
  }
};
