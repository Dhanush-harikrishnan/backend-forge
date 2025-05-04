import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const resumesDir = path.join(uploadsDir, 'resumes');

// Log the paths for debugging
logger.info(`Uploads directory: ${uploadsDir}`);
logger.info(`Resumes directory: ${resumesDir}`);

if (!fs.existsSync(uploadsDir)) {
  logger.info('Creating uploads directory');
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(resumesDir)) {
  logger.info('Creating resumes directory');
  fs.mkdirSync(resumesDir, { recursive: true });
}

/**
 * Generate a PDF resume from resume data
 * @param {Object} resumeData - Resume data
 * @param {string} userId - User ID
 * @param {string} resumeId - Resume ID
 * @returns {Promise<string>} - Path to the generated PDF
 */
export const generateResumePDF = async (resumeData, userId, resumeId) => {
  return new Promise((resolve, reject) => {
    try {
      const pdfPath = path.join(resumesDir, `${resumeId}.pdf`);
      
      // Create a PDF document with letter size (8.5 x 11 inches) and smaller margins
      const doc = new PDFDocument({ 
        size: 'letter',
        margin: 40,
        bufferPages: true // Enable page buffering to count pages
      });
      
      // Pipe PDF to file
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      
      // Set default font
      doc.font('Helvetica');
      
      // Define colors
      const primaryColor = '#1e3a8a'; // Dark blue
      const secondaryColor = '#374151'; // Dark gray
      const accentColor = '#059669'; // Emerald
      
      // Calculate column widths
      const pageWidth = doc.page.width - 80; // Total width minus margins
      const leftColWidth = pageWidth * 0.65;
      const rightColWidth = pageWidth * 0.35;
      const rightColX = 40 + leftColWidth + 20; // Left margin + left column + gap
      
      // Header section with name and contact info
      doc.fontSize(22).fillColor(primaryColor).text(resumeData.personalInfo.name, 40, 40, { width: leftColWidth });
      
      // Professional title if available
      if (resumeData.personalInfo.title) {
        doc.fontSize(12).fillColor(secondaryColor).text(resumeData.personalInfo.title, 40, doc.y + 2);
      }
      
      // Contact information in right column
      let contactY = 40;
      doc.fontSize(10).fillColor(secondaryColor);
      
      if (resumeData.personalInfo.email) {
        doc.text(resumeData.personalInfo.email, rightColX, contactY, { align: 'right', width: rightColWidth });
        contactY += 15;
      }
      
      if (resumeData.personalInfo.phone) {
        doc.text(resumeData.personalInfo.phone, rightColX, contactY, { align: 'right', width: rightColWidth });
        contactY += 15;
      }
      
      // Links
      if (resumeData.personalInfo.linkedin) {
        doc.text(resumeData.personalInfo.linkedin, rightColX, contactY, { align: 'right', width: rightColWidth });
        contactY += 15;
      }
      
      if (resumeData.personalInfo.github) {
        doc.text(resumeData.personalInfo.github, rightColX, contactY, { align: 'right', width: rightColWidth });
        contactY += 15;
      }
      
      if (resumeData.personalInfo.website) {
        doc.text(resumeData.personalInfo.website, rightColX, contactY, { align: 'right', width: rightColWidth });
      }
      
      // Add a line
      doc.moveTo(40, doc.y + 15).lineTo(doc.page.width - 40, doc.y + 15).lineWidth(1).strokeColor(accentColor).stroke();
      doc.moveDown(0.5);
      
      // Summary section (if available) - keep it brief
      if (resumeData.summary) {
        const summaryText = resumeData.summary.length > 300 
          ? resumeData.summary.substring(0, 300) + '...' 
          : resumeData.summary;
          
        doc.fontSize(10).fillColor(secondaryColor).text(summaryText, { lineGap: 2 });
        doc.moveDown(0.5);
      }
      
      // Skills section - horizontal layout to save space
      if (resumeData.skills && resumeData.skills.length > 0) {
        doc.fontSize(12).fillColor(primaryColor).text('SKILLS', { underline: true });
        doc.moveDown(0.2);
        
        // Group skills into categories if possible
        const skillGroups = [];
        let currentGroup = [];
        
        resumeData.skills.forEach((skill, index) => {
          currentGroup.push(skill);
          if (currentGroup.length === 4 || index === resumeData.skills.length - 1) {
            skillGroups.push(currentGroup);
            currentGroup = [];
          }
        });
        
        skillGroups.forEach(group => {
          doc.fontSize(10).fillColor(secondaryColor).text(group.join(' • '), { lineGap: 2 });
        });
        
        doc.moveDown(0.5);
      }
      
      // Experience section - most important, give it more space
      if (resumeData.experience && resumeData.experience.length > 0) {
        doc.fontSize(12).fillColor(primaryColor).text('PROFESSIONAL EXPERIENCE', { underline: true });
        doc.moveDown(0.2);
        
        // Limit to 3 most recent experiences to fit on one page
        const limitedExperience = resumeData.experience.slice(0, 3);
        
        limitedExperience.forEach((exp, index) => {
          // Company and position on the same line with position in bold
          doc.fontSize(11).fillColor(accentColor).text(exp.company, { continued: true });
          doc.fillColor(secondaryColor).text(` — ${exp.position}`, { lineGap: 1 });
          
          // Dates right-aligned
          const dateText = `${exp.startDate} - ${exp.endDate || 'Present'}`;
          doc.fontSize(10).fillColor(secondaryColor).text(dateText, { align: 'right', lineGap: 2 });
          
          // Description - keep it brief
          if (exp.description) {
            const descText = exp.description.length > 100 
              ? exp.description.substring(0, 100) + '...' 
              : exp.description;
            doc.fontSize(10).fillColor(secondaryColor).text(descText, { lineGap: 2 });
          }
          
          // Bullets - most important part
          if (exp.bullets && exp.bullets.length > 0) {
            // Limit bullets to 3-4 per experience
            const limitedBullets = exp.bullets.slice(0, 4);
            limitedBullets.forEach(bullet => {
              // Truncate long bullets
              const bulletText = bullet.length > 100 ? bullet.substring(0, 100) + '...' : bullet;
              doc.fontSize(10).fillColor(secondaryColor).text(`• ${bulletText}`, { indent: 10, lineGap: 2 });
            });
          }
          
          // Add space between experiences
          if (index < limitedExperience.length - 1) {
            doc.moveDown(0.5);
          }
        });
        
        doc.moveDown(0.5);
      }
      
      // Education section - keep it compact
      if (resumeData.education && resumeData.education.length > 0) {
        doc.fontSize(12).fillColor(primaryColor).text('EDUCATION', { underline: true });
        doc.moveDown(0.2);
        
        // Limit to 2 most recent education entries
        const limitedEducation = resumeData.education.slice(0, 2);
        
        limitedEducation.forEach((edu, index) => {
          doc.fontSize(11).fillColor(accentColor).text(edu.institution, { lineGap: 1 });
          
          // Degree and dates on same line
          const degreeText = `${edu.degree} in ${edu.field}`;
          doc.fontSize(10).fillColor(secondaryColor).text(degreeText, { continued: true });
          
          // Dates right-aligned
          const dateText = `  ${edu.startDate} - ${edu.endDate || 'Present'}`;
          doc.fillColor(secondaryColor).text(dateText, { lineGap: 2 });
          
          // GPA if available
          if (edu.gpa) {
            doc.fontSize(10).fillColor(secondaryColor).text(`GPA: ${edu.gpa}`, { lineGap: 2 });
          }
          
          // Add space between education entries
          if (index < limitedEducation.length - 1) {
            doc.moveDown(0.3);
          }
        });
        
        doc.moveDown(0.5);
      }
      
      // Projects section - focus on most impressive projects
      if (resumeData.projects && resumeData.projects.length > 0) {
        doc.fontSize(12).fillColor(primaryColor).text('PROJECTS', { underline: true });
        doc.moveDown(0.2);
        
        // Limit to 2-3 most impressive projects
        const limitedProjects = resumeData.projects.slice(0, 2);
        
        limitedProjects.forEach((project, index) => {
          doc.fontSize(11).fillColor(accentColor).text(project.title, { lineGap: 1 });
          
          // Brief description
          const descText = project.description.length > 100 
            ? project.description.substring(0, 100) + '...' 
            : project.description;
          doc.fontSize(10).fillColor(secondaryColor).text(descText, { lineGap: 2 });
          
          // Technologies as bullet points to save space
          if (project.technologies && project.technologies.length > 0) {
            const techText = `Technologies: ${project.technologies.join(', ')}`;
            doc.fontSize(10).fillColor(secondaryColor).text(techText, { lineGap: 2 });
          }
          
          // Links on same line if possible
          let linkText = '';
          if (project.url) linkText += `Demo: ${project.url} `;
          if (project.github) linkText += `GitHub: ${project.github}`;
          
          if (linkText) {
            doc.fontSize(9).fillColor(secondaryColor).text(linkText, { lineGap: 2 });
          }
          
          // Add space between projects
          if (index < limitedProjects.length - 1) {
            doc.moveDown(0.3);
          }
        });
      }
      
      // Footer with subtle branding
      doc.fontSize(8).fillColor('#888888').text('Generated with TrackPro Resume Builder', {
        align: 'center',
        y: doc.page.height - 30
      });
      
      // Finalize and close the document
      doc.end();
      
      stream.on('finish', () => {
        logger.info(`PDF Resume created at ${pdfPath}`);
        resolve(pdfPath);
      });
      
      stream.on('error', (err) => {
        logger.error('Error creating PDF resume:', err);
        reject(err);
      });
    } catch (error) {
      logger.error('Error generating PDF resume:', error);
      reject(error);
    }
  });
};

export default { generateResumePDF }; 