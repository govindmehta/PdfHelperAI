// controllers/noteController.js
import PDFDocument from 'pdfkit';
import Note from '../models/Note.js';
import PDF from "../models/PDF.js";
import path from 'path';
import fs from 'fs';
import geminiService from "../services/geminiService.js";


export const generateNotes = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId } = req.body;

    if (!pdfId) {
      return res.status(400).json({ error: "pdfId is required." });
    }

    const pdf = await PDF.findOne({ _id: pdfId, user: userId });

    if (!pdf) {
      return res.status(404).json({ error: "PDF not found for this user." });
    }

    const imageDescriptions = (pdf.images || [])
      .map((img, i) => {
        const desc = img.localModelDescription?.trim();
        return desc ? `Image ${i + 1} (Page ${img.page}): ${desc}` : null;
      })
      .filter(Boolean)
      .join("\n") || "No image descriptions.";

    const prompt = `
You are a helpful assistant. Based on the PDF content and image descriptions below, generate high-quality, concise study notes. Use bullet points and structure them clearly.

PDF Text:
${pdf.extractedText || "No text content."}

Image Descriptions:
${imageDescriptions}
`;

    const generatedContent = await geminiService.getCompletion(prompt);

    const title = `AI Notes for ${pdf.originalName || 'PDF'}`;

    const newNote = new Note({
      user: userId,
      pdf: pdfId,
      title,
      content: generatedContent,
    });

    await newNote.save();

    res.status(201).json({
      message: "Notes generated successfully.",
      note: newNote,
    });
  } catch (error) {
    console.error("❌ Error generating notes:", error);
    res.status(500).json({ error: "Failed to generate notes." });
  }
};


export const downloadNotesPDF = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId } = req.query;

    const filter = { user: userId };
    if (pdfId) {
      filter.pdf = pdfId;
    }

    const notes = await Note.find(filter).populate('pdf').sort({ createdAt: -1 });

    if (!notes || notes.length === 0) {
      return res.status(404).json({ error: 'No notes found.' });
    }

    // Create a PDF document with enhanced formatting
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });
    
    let filename = 'AI_Notes_Collection.pdf';
    
    if (pdfId) {
      const pdf = await PDF.findById(pdfId);
      filename = `AI_Notes_${pdf?.originalName?.replace(/\.pdf$/i, '') || 'PDF'}.pdf`;
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the PDF to response
    doc.pipe(res);

    // Add title page
    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor('#1f2937')
       .text('Notes Collection', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Add subtitle
    doc.font('Helvetica')
       .fontSize(16)
       .fillColor('#6b7280')
       .text(`Generated on ${new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       })}`, { align: 'center' });
    
    doc.moveDown(0.5);
    
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#6b7280')
       .text(`Total Notes: ${notes.length}`, { align: 'center' });

    doc.moveDown(2);

    // Add table of contents
    doc.font('Helvetica-Bold')
       .fontSize(18)
       .fillColor('#1f2937')
       .text('Table of Contents', { align: 'left' });
    
    doc.moveDown(1);
    
    notes.forEach((note, index) => {
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#374151')
         .text(`${index + 1}. ${note.title}`, { continued: true })
         .text(`...............${index + 2}`, { align: 'right' });
      doc.moveDown(0.3);
    });

    // Start new page for content
    doc.addPage();

    // Process each note
    notes.forEach((note, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Note header
      doc.font('Helvetica-Bold')
         .fontSize(20)
         .fillColor('#2563eb')
         .text(`${index + 1}. ${note.title}`, { align: 'left' });
      
      doc.moveDown(0.5);

      // Add subtitle line
      doc.strokeColor('#e5e7eb')
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown(1);

      // Add metadata
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#6b7280');
      
      if (note.pdf) {
        doc.text(`Source PDF: ${note.pdf.originalName}`, { align: 'left' });
      }
      
      doc.text(`Created: ${new Date(note.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, { align: 'right' });
      
      if (note.tags && note.tags.length > 0) {
        doc.moveDown(0.3);
        doc.text(`Tags: ${note.tags.join(', ')}`, { align: 'left' });
      }

      doc.moveDown(1.5);

      // Process content with enhanced formatting
      const content = note.content;
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
          doc.moveDown(0.5);
          continue;
        }
        
        // Handle headers (lines ending with ':')
        if (line.endsWith(':') && line.length > 3 && !line.includes('http')) {
          doc.font('Helvetica-Bold')
             .fontSize(14)
             .fillColor('#1f2937')
             .text(line.replace(':', ''), { continued: false });
          
          // Add underline
          doc.strokeColor('#3b82f6')
             .lineWidth(1)
             .moveTo(50, doc.y + 2)
             .lineTo(50 + doc.widthOfString(line.replace(':', '')), doc.y + 2)
             .stroke();
          
          doc.moveDown(0.8);
          continue;
        }
        
        // Handle bullet points
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          doc.font('Helvetica')
             .fontSize(11)
             .fillColor('#374151')
             .text('• ', { continued: true, indent: 20 })
             .text(line.replace(/^[•\-*]\s*/, ''), { continued: false });
          doc.moveDown(0.4);
          continue;
        }
        
        // Handle numbered lists
        if (line.match(/^\d+\.\s/)) {
          const match = line.match(/^(\d+)\.\s(.+)$/);
          if (match) {
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#3b82f6')
               .text(match[1] + '. ', { continued: true, indent: 20 })
               .font('Helvetica')
               .fillColor('#374151')
               .text(match[2], { continued: false });
            doc.moveDown(0.4);
            continue;
          }
        }
        
        // Handle key points
        if (line.toLowerCase().includes('key point') || 
            line.toLowerCase().includes('important') || 
            line.toLowerCase().includes('note:') ||
            line.toLowerCase().includes('summary:')) {
          
          // Add background highlight
          doc.rect(45, doc.y - 5, 505, 18)
             .fillColor('#fef3c7')
             .fill();
          
          doc.font('Helvetica-Bold')
             .fontSize(11)
             .fillColor('#92400e')
             .text('💡 ' + line, { continued: false });
          doc.moveDown(0.8);
          continue;
        }
        
        // Regular paragraphs
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#374151')
           .text(line, { 
             continued: false,
             lineGap: 3,
             paragraphGap: 6
           });
        doc.moveDown(0.5);
      }
    });

    // Add footer on last page
    doc.moveDown(2);
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('#9ca3af')
       .text('Generated by PDF Helper AI', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error("❌ Error downloading notes:", error);
    res.status(500).json({ error: "Failed to download notes." });
  }
};

// CRUD Operations for Notes

// Create a new note
export const createNote = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { title, content, pdfId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }

    const newNote = new Note({
      user: userId,
      pdf: pdfId || null,
      title,
      content,
    });

    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error("❌ Error creating note:", error);
    res.status(500).json({ error: "Failed to create note." });
  }
};

// Get all notes (optionally filtered by pdfId)
export const getNotes = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId } = req.query;

    const filter = { user: userId };
    if (pdfId) {
      filter.pdf = pdfId;
    }

    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error("❌ Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes." });
  }
};

// Get a single note by ID
export const getNote = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("❌ Error fetching note:", error);
    res.status(500).json({ error: "Failed to fetch note." });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required." });
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, user: userId },
      { title, content, updatedAt: new Date() },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("❌ Error updating note:", error);
    res.status(500).json({ error: "Failed to update note." });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { id } = req.params;

    const note = await Note.findOneAndDelete({ _id: id, user: userId });
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    res.status(200).json({ message: "Note deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note." });
  }
};

// Download individual note as PDF file with enhanced formatting
export const downloadNote = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const note = await Note.findOne({ _id: id, user: userId }).populate('pdf');
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    // Create a PDF document with enhanced formatting
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Generate filename
    const filename = `${note.title.replace(/[^a-zA-Z0-9\s]/g, '_')}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe the PDF to response
    doc.pipe(res);

    // Add header with enhanced styling
    doc.font('Helvetica-Bold')
       .fontSize(24)
       .fillColor('#2563eb')
       .text(note.title, { align: 'center' });
    
    doc.moveDown(0.5);

    // Add subtitle line
    doc.strokeColor('#e5e7eb')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown(1);

    // Add metadata section
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#6b7280');
    
    if (note.pdf) {
      doc.text(`Source PDF: ${note.pdf.originalName}`, { align: 'left' });
    }
    
    doc.text(`Created: ${new Date(note.createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, { align: 'right' });
    
    if (note.tags && note.tags.length > 0) {
      doc.moveDown(0.3);
      doc.text(`Tags: ${note.tags.join(', ')}`, { align: 'left' });
    }

    doc.moveDown(1.5);

    // Add content with enhanced formatting
    const content = note.content;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        doc.moveDown(0.5);
        continue;
      }
      
      // Handle headers (lines ending with ':')
      if (line.endsWith(':') && line.length > 3 && !line.includes('http')) {
        doc.font('Helvetica-Bold')
           .fontSize(16)
           .fillColor('#1f2937')
           .text(line.replace(':', ''), { continued: false });
        
        // Add underline
        doc.strokeColor('#3b82f6')
           .lineWidth(1)
           .moveTo(50, doc.y + 2)
           .lineTo(50 + doc.widthOfString(line.replace(':', '')), doc.y + 2)
           .stroke();
        
        doc.moveDown(0.8);
        continue;
      }
      
      // Handle bullet points
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#374151')
           .text('• ', { continued: true, indent: 20 })
           .text(line.replace(/^[•\-*]\s*/, ''), { continued: false });
        doc.moveDown(0.4);
        continue;
      }
      
      // Handle numbered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          doc.font('Helvetica-Bold')
             .fontSize(12)
             .fillColor('#3b82f6')
             .text(match[1] + '. ', { continued: true, indent: 20 })
             .font('Helvetica')
             .fillColor('#374151')
             .text(match[2], { continued: false });
          doc.moveDown(0.4);
          continue;
        }
      }
      
      // Handle sub-bullets (indented)
      if (line.match(/^\s{2,}[•\-*]/)) {
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#4b5563')
           .text('◦ ', { continued: true, indent: 40 })
           .text(line.replace(/^\s*[•\-*]\s*/, ''), { continued: false });
        doc.moveDown(0.3);
        continue;
      }
      
      // Handle key points or important notes
      if (line.toLowerCase().includes('key point') || 
          line.toLowerCase().includes('important') || 
          line.toLowerCase().includes('note:') ||
          line.toLowerCase().includes('summary:')) {
        
        // Add background highlight
        doc.rect(45, doc.y - 5, 505, 20)
           .fillColor('#fef3c7')
           .fill();
        
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor('#92400e')
           .text('💡 ' + line, { continued: false });
        doc.moveDown(0.8);
        continue;
      }
      
      // Handle code blocks or technical content
      if (line.includes('```') || line.includes('code:')) {
        doc.rect(45, doc.y - 5, 505, 15)
           .fillColor('#f3f4f6')
           .fill();
        
        doc.font('Courier')
           .fontSize(10)
           .fillColor('#1f2937')
           .text(line.replace(/```/g, ''), { continued: false });
        doc.moveDown(0.5);
        continue;
      }
      
      // Regular paragraphs
      doc.font('Helvetica')
         .fontSize(12)
         .fillColor('#374151')
         .text(line, { 
           continued: false,
           lineGap: 4,
           paragraphGap: 8
         });
      doc.moveDown(0.6);
    }

    // Add footer
    doc.moveDown(2);
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown(0.5);
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('#9ca3af')
       .text('Generated by PDF Helper AI', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error downloading note as PDF:', error);
    res.status(500).json({ error: 'Failed to download note as PDF' });
  }
};