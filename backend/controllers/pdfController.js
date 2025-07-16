import fs from 'fs/promises';
import path from 'path';
import PDF from '../models/PDF.js';
import Note from '../models/Note.js';
import Conversation from '../models/Conversation.js';
import { extractTextFromPDF } from '../utils/pdfUtils.js';
import { analyzeImagesLocally } from '../model/imageAnalysis.js';
import { exec } from 'child_process';
import redis from '../utils/redisClient.js';



const convertPDFToImages = async (pdfPath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join('utils', 'convertToImages.py');
    exec(`python "${scriptPath}" "${pdfPath}"`, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      try {
        const images = JSON.parse(stdout); // expect list of { page, imageUrl }
        resolve(images);
      } catch (e) {
        reject(`Failed to parse images: ${stdout}`);
      }
    });
  });
};

export const uploadPDF = async (req, res) => {
  try {
    console.log('🔍 JWT Decoded User:', req.user); // Debug log
    const userId = req.user.userId; // ✅ Use userId from JWT token
    console.log('🔍 Extracted userId:', userId); // Debug log
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'PDF file is required' });

    const filePath = file.path;
    const stats = await fs.stat(filePath);
    const extractedText = await extractTextFromPDF(filePath);

    const imageList = await convertPDFToImages(filePath);
    const imagesWithDescriptions = await analyzeImagesLocally(imageList);

    const newPDF = new PDF({
      user: userId,
      filename: file.filename,
      originalName: file.originalname,
      fileSize: stats.size,
      fileType: file.mimetype,
      extractedText,
      images: imagesWithDescriptions,
      imageCount: imagesWithDescriptions.length,
    });

    await newPDF.save();

    // Format response to match frontend expectations
    const responseData = {
      _id: newPDF._id,
      filename: newPDF.filename,
      originalName: newPDF.originalName,
      size: newPDF.fileSize,
      uploadDate: newPDF.createdAt,
      userId: newPDF.user,
      extractedText: newPDF.extractedText,
      images: newPDF.images
    };

    res.status(201).json(responseData);
  } catch (err) {
    console.error('❌ Upload Error:', err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};



export const getUserPDFs = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token

    const pdfs = await PDF.find({ user: userId }).sort({ createdAt: -1 });
    
    // Format response to match frontend expectations
    const formattedPdfs = pdfs.map(pdf => ({
      _id: pdf._id,
      filename: pdf.filename,
      originalName: pdf.originalName,
      size: pdf.fileSize,
      uploadDate: pdf.createdAt,
      userId: pdf.user,
      extractedText: pdf.extractedText,
      images: pdf.images
    }));

    res.status(200).json(formattedPdfs);
  } catch (error) {
    console.error('❌ Error fetching PDFs:', error);
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
};


export const getPdfDetails = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const pdfId = req.params.pdfId;

    if (!pdfId) {
      return res.status(400).json({ error: 'pdfId is required' });
    }

    const pdf = await PDF.findOne({ _id: pdfId, user: userId });
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found or access denied' });
    }

    // Format response to match frontend expectations
    const responseData = {
      _id: pdf._id,
      filename: pdf.filename,
      originalName: pdf.originalName,
      size: pdf.fileSize,
      uploadDate: pdf.createdAt,
      userId: pdf.user,
      extractedText: pdf.extractedText,
      images: pdf.images
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Error fetching PDF details:', error);
    res.status(500).json({ error: 'Failed to fetch PDF details' });
  }
};


export const deletePDF = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Use userId from JWT token
    const { pdfId } = req.params;

    const pdf = await PDF.findOne({ _id: pdfId, user: userId });
    if (!pdf) return res.status(404).json({ error: 'PDF not found or access denied' });

    const mainPath = path.join('uploads', pdf.filename);
    await fs.unlink(mainPath).catch(() => {});

    for (const img of pdf.images) {
      const imagePath = path.join('public', img.imageUrl);
      await fs.unlink(imagePath).catch(() => {});
    }

    await PDF.findByIdAndDelete(pdfId);

    // ✅ Redis Cache Invalidation
    try {
      const pattern = `answer:${pdf._id}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🧹 Cleared ${keys.length} cached entries for PDF ${pdf._id}`);
      }
    } catch (err) {
      console.warn('⚠️ Failed to clear Redis cache:', err.message);
    }

    res.status(200).json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting PDF:', error);
    res.status(500).json({ error: 'Failed to delete PDF' });
  }
};